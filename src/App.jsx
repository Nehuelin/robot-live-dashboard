import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

const SAMPLE_TELEMETRY = {
  modelo: 'g1', ts: 14.77,
  motores: Array.from({ length: 29 }, (_, id) => ({
    id,
    nombre: ['L_hip_yaw', 'L_hip_roll', 'L_hip_pitch', 'L_knee', 'L_ankle_pitch', 'L_ankle_roll', 'R_hip_yaw', 'R_hip_roll', 'R_hip_pitch', 'R_knee', 'R_ankle_pitch', 'R_ankle_roll', 'torso_yaw', 'torso_roll', 'torso_pitch', 'L_shoulder_pitch', 'L_shoulder_roll', 'L_shoulder_yaw', 'L_elbow', 'L_wrist_roll', 'L_wrist_pitch', 'L_wrist_yaw', 'R_shoulder_pitch', 'R_shoulder_roll', 'R_shoulder_yaw', 'R_elbow', 'R_wrist_roll', 'R_wrist_pitch', 'R_wrist_yaw'][id],
    angulo: Number((-29 + id * 2.11).toFixed(2)), velocidad: Number((Math.sin(id) * 2.1).toFixed(3)),
    torque: Number((1 + (id * 1.17) % 8).toFixed(2)), temperatura: 34 + (id % 9),
  })),
  imu: { roll: 0, pitch: 2.02, yaw: 0, ax: 0.124, ay: -0.056, az: 9.81 },
  bms: { soc: 92, corriente: 7.64, temperatura: 32.3, celdas: [3.724, 3.719, 3.705, 3.695, 3.699, 3.712, 3.723, 3.722] },
  fuerzas: { R_foot: 0, L_foot: 1 },
};

const fmt = (value, digits = 1) => Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—';

function Panel({ title, meta, className = '', children }) {
  return <section className={`panel ${className}`}><div className="panel-header"><h2>{title}</h2>{meta && <span className="panel-meta">{meta}</span>}</div>{children}</section>;
}

function Metric({ label, value, unit, tone = '' }) {
  return <div className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong><small>{unit}</small></div>;
}

function ConnectionBar({ url, onUrlChange, status, onConnect, model, timestamp }) {
  return <div className="connection-bar">
    <label htmlFor="robot-url">ROBOT API</label>
    <input id="robot-url" value={url} onChange={(e) => onUrlChange(e.target.value)} placeholder="http://10.0.0.5:8001" />
    <button type="button" onClick={onConnect}>{status === 'live' ? 'RECONECTAR' : 'CONECTAR'}</button>
    <span className={`connection-status ${status}`}><i />{status === 'live' ? 'EN VIVO' : status === 'connecting' ? 'CONECTANDO' : status === 'error' ? 'SIN SEÑAL' : 'DATOS DEMO'}</span>
    <span className="connection-meta">{model?.toUpperCase() || '—'} · T+{fmt(timestamp, 2)}s</span>
  </div>;
}

function Orientation({ imu = {} }) {
  const pitch = Math.max(-35, Math.min(35, Number(imu.pitch) || 0));
  const roll = Math.max(-35, Math.min(35, Number(imu.roll) || 0));
  return <div className="orientation-wrap">
    <div className="attitude" aria-label={`Roll ${fmt(imu.roll)} grados, pitch ${fmt(imu.pitch)} grados`}>
      <div className="attitude-world" style={{ transform: `translateY(${pitch * 1.15}px) rotate(${-roll}deg)` }}><div className="sky" /><div className="ground" /><div className="horizon-line" /></div>
      <div className="reticle">⌁</div>
    </div>
    <div className="orientation-metrics"><Metric label="ROLL" value={fmt(imu.roll)} unit="°"/><Metric label="PITCH" value={fmt(imu.pitch)} unit="°"/><Metric label="YAW" value={fmt(imu.yaw)} unit="°"/></div>
    <div className="accel-row"><span>ACCEL</span><b>X {fmt(imu.ax, 2)}</b><b>Y {fmt(imu.ay, 2)}</b><b>Z {fmt(imu.az, 2)} m/s²</b></div>
  </div>;
}

function Battery({ bms = {} }) {
  const soc = Math.max(0, Math.min(100, Number(bms.soc) || 0));
  const cells = Array.isArray(bms.celdas) ? bms.celdas : [];
  const delta = cells.length ? Math.max(...cells) - Math.min(...cells) : null;
  return <div className="battery-content">
    <div className="battery-main"><div className="battery-gauge"><div style={{ height: `${soc}%` }} /></div><div><strong>{fmt(soc, 0)}<small>%</small></strong><span>ESTADO DE CARGA</span></div></div>
    <div className="battery-stats"><Metric label="CORRIENTE" value={fmt(bms.corriente, 2)} unit="A"/><Metric label="TEMP. BMS" value={fmt(bms.temperatura)} unit="°C"/><Metric label="BALANCE" value={delta == null ? '—' : fmt(delta * 1000, 0)} unit="mV"/></div>
  </div>;
}

function FootForces({ forces = {}, model }) {
  const entries = Object.entries(forces);
  if (!entries.length) return <div className="empty-state">Sin datos de apoyo para {model?.toUpperCase() || 'este modelo'}.</div>;
  return <div className="feet-grid">{entries.map(([name, active]) => <div className={`foot ${active ? 'grounded' : ''}`} key={name}><i /><span>{name.replace('_foot', '')}</span><b>{active ? 'APOYO' : 'AIRE'}</b></div>)}</div>;
}

function MotorTable({ motors }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => motors.filter((m) => m.nombre.toLowerCase().includes(query.toLowerCase())), [motors, query]);
  return <div className="motors-content">
    <div className="motor-toolbar"><span>{filtered.length} ACTUADORES</span><input aria-label="Filtrar motores" placeholder="Filtrar articulación…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
    <div className="table-scroll"><table><thead><tr><th>ID / ARTICULACIÓN</th><th>ÁNGULO</th><th>VELOCIDAD</th><th>TORQUE</th><th>TEMP.</th></tr></thead><tbody>{filtered.map((motor) => {
      const hot = motor.temperatura >= 55; const load = Math.min(100, Math.abs(motor.torque) * 10);
      return <tr key={motor.id}><td><small>{String(motor.id).padStart(2, '0')}</small><b>{motor.nombre}</b></td><td>{fmt(motor.angulo, 2)}°</td><td>{fmt(motor.velocidad, 2)} <small>rad/s</small></td><td><span className="torque-bar"><i style={{ width: `${load}%` }} /></span>{fmt(motor.torque, 2)} <small>Nm</small></td><td className={hot ? 'hot' : ''}>{fmt(motor.temperatura, 0)}°C</td></tr>;
    })}</tbody></table></div>
  </div>;
}

function TelemetryDashboard() {
  const [telemetry, setTelemetry] = useState(SAMPLE_TELEMETRY);
  const [url, setUrl] = useState(() => localStorage.getItem('robot-api-url') || 'http://10.0.0.5:8001');
  const [status, setStatus] = useState('demo');
  const socketRef = useRef(null); const retryRef = useRef(null); const intentionalClose = useRef(false);

  const connect = () => {
    clearTimeout(retryRef.current);
    intentionalClose.current = false;
    if (socketRef.current) { socketRef.current.onclose = null; socketRef.current.close(); }
    setStatus('connecting'); localStorage.setItem('robot-api-url', url);
    let wsUrl;
    try { const parsed = new URL(url); parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:'; parsed.pathname = '/ws'; wsUrl = parsed.toString(); } catch { setStatus('error'); return; }
    const ws = new WebSocket(wsUrl); socketRef.current = ws;
    ws.onopen = () => setStatus('live');
    ws.onmessage = (event) => { try { setTelemetry(JSON.parse(event.data)); setStatus('live'); } catch { setStatus('error'); } };
    ws.onerror = () => setStatus('error');
    ws.onclose = () => { if (!intentionalClose.current) { setStatus('error'); retryRef.current = setTimeout(connect, 3000); } };
  };
  useEffect(() => () => { intentionalClose.current = true; clearTimeout(retryRef.current); socketRef.current?.close(); }, []);

  const motors = Array.isArray(telemetry.motores) ? telemetry.motores : [];
  const avgTemp = motors.length ? motors.reduce((sum, motor) => sum + Number(motor.temperatura || 0), 0) / motors.length : 0;
  const maxTorque = motors.length ? Math.max(...motors.map((motor) => Math.abs(Number(motor.torque || 0)))) : 0;

  return <div className="dashboard-container">
    <header className="dashboard-header"><div><p>UNITREE · LIVE SYSTEMS</p><h1>TELEMETRÍA <span>// MOTION LAB</span></h1></div><div className="header-summary"><Metric label="MOTORES" value={motors.length} unit="activos"/><Metric label="TEMP. MEDIA" value={fmt(avgTemp)} unit="°C"/><Metric label="TORQUE PICO" value={fmt(maxTorque, 2)} unit="Nm"/></div></header>
    <ConnectionBar url={url} onUrlChange={setUrl} status={status} onConnect={connect} model={telemetry.modelo} timestamp={telemetry.ts}/>
    <main className="telemetry-layout">
      <Panel title="ORIENTACIÓN / IMU" meta="6-AXIS" className="orientation-panel"><Orientation imu={telemetry.imu}/></Panel>
      <Panel title="SISTEMA DE ENERGÍA" meta="BMS" className="battery-panel"><Battery bms={telemetry.bms}/></Panel>
      <Panel title="CONTACTO CON SUPERFICIE" meta={telemetry.modelo?.toUpperCase()} className="forces-panel"><FootForces forces={telemetry.fuerzas} model={telemetry.modelo}/></Panel>
      <Panel title="ACTUADORES" meta="STREAM 10 HZ" className="motors-panel"><MotorTable motors={motors}/></Panel>
    </main>
  </div>;
}

export default TelemetryDashboard;
