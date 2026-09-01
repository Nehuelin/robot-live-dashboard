import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import RobotViewer from './RobotViewer';

const EMPTY_TELEMETRY = { modelo: '', ts: 0, motores: [], imu: {}, bms: {}, fuerzas: {} };

const normalizeTelemetry = (payload = {}) => ({
  modelo: payload.modelo || '',
  ts: Number(payload.ts ?? 0),
  motores: Array.isArray(payload.motores)
    ? payload.motores.map((motor, idx) => ({
        id: Number(motor.id ?? idx),
        nombre: motor.nombre || `motor_${idx}`,
        angulo: Number(motor.angulo ?? 0),
        velocidad: Number(motor.velocidad ?? 0),
        torque: Number(motor.torque ?? 0),
        temperatura: Number(motor.temperatura ?? 0),
      }))
    : [],
  imu: payload.imu || {},
  bms: payload.bms || {},
  fuerzas: payload.fuerzas || {},
});

const sanitizeBaseUrl = (value = '') => {
  const cleaned = String(value).trim().replace(/\/+$/, '');
  if (!cleaned) return '';
  try {
    return new URL(cleaned).origin;
  } catch {
    return cleaned;
  }
};

const buildApiUrl = (baseUrl, path) => {
  const origin = sanitizeBaseUrl(baseUrl);
  if (!origin) return '';
  return `${origin}${path}`;
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
  return <div className="feet-grid">{entries.map(([name, active]) => {
    const grounded = Number(active) > 0;
    const label = String(name).replace(/_foot|_FOOT/gi, '').replace(/_/g, ' ');
    return <div className={`foot ${grounded ? 'grounded' : ''}`} key={name}><i /><span>{label}</span><b>{grounded ? 'APOYO' : 'AIRE'}</b></div>;
  })}</div>;
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
  const [telemetry, setTelemetry] = useState(EMPTY_TELEMETRY);
  const [url, setUrl] = useState(() => localStorage.getItem('robot-api-url') || 'http://10.100.10.14:8001');
  const [status, setStatus] = useState('connecting');
  const socketRef = useRef(null); const retryRef = useRef(null); const intentionalClose = useRef(false);

  const fetchTelemetry = async (baseUrl) => {
    const apiUrl = buildApiUrl(baseUrl, '/telemetria');
    if (!apiUrl) {
      setStatus('error');
      return null;
    }

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = normalizeTelemetry(await response.json());
      setTelemetry(payload);
      setStatus('live');
      return payload;
    } catch (error) {
      setStatus('error');
      return null;
    }
  };

  const connect = async () => {
    clearTimeout(retryRef.current);
    intentionalClose.current = false;
    if (socketRef.current) {
      socketRef.current.onclose = null;
      socketRef.current.close();
    }

    const baseUrl = sanitizeBaseUrl(url);
    if (!baseUrl) {
      setStatus('error');
      return;
    }

    setStatus('connecting');
    localStorage.setItem('robot-api-url', baseUrl);
    await fetchTelemetry(baseUrl);

    let wsUrl;
    try {
      const parsed = new URL(baseUrl);
      parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      parsed.pathname = '/ws';
      wsUrl = parsed.toString();
    } catch {
      setStatus('error');
      return;
    }

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;
    ws.onopen = () => setStatus('live');
    ws.onmessage = (event) => {
      try {
        const nextTelemetry = normalizeTelemetry(JSON.parse(event.data));
        setTelemetry(nextTelemetry);
        setStatus('live');
      } catch {
        setStatus('error');
      }
    };
    ws.onerror = () => setStatus('error');
    ws.onclose = () => {
      if (!intentionalClose.current) {
        setStatus('error');
        retryRef.current = setTimeout(() => {
          connect();
        }, 3000);
      }
    };
  };

  useEffect(() => {
    connect();
    return () => {
      intentionalClose.current = true;
      clearTimeout(retryRef.current);
      socketRef.current?.close();
    };
  }, []);

  const motors = Array.isArray(telemetry.motores) ? telemetry.motores : [];
  const avgTemp = motors.length ? motors.reduce((sum, motor) => sum + Number(motor.temperatura || 0), 0) / motors.length : 0;
  const maxTorque = motors.length ? Math.max(...motors.map((motor) => Math.abs(Number(motor.torque || 0)))) : 0;

  return <div className="dashboard-container">
    <header className="dashboard-header"><div><p>UNITREE · LIVE SYSTEMS</p><h1>TELEMETRÍA <span>// MOTION LAB</span></h1></div><div className="header-summary"><Metric label="MOTORES" value={motors.length} unit="activos"/><Metric label="TEMP. MEDIA" value={fmt(avgTemp)} unit="°C"/><Metric label="TORQUE PICO" value={fmt(maxTorque, 2)} unit="Nm"/></div></header>
    <ConnectionBar url={url} onUrlChange={setUrl} status={status} onConnect={connect} model={telemetry.modelo} timestamp={telemetry.ts} />
    <main className="telemetry-layout">
      <Panel title="ORIENTACIÓN / IMU" meta="6-AXIS" className="orientation-panel"><Orientation imu={telemetry.imu}/></Panel>
      <Panel title="SISTEMA DE ENERGÍA" meta="BMS" className="battery-panel"><Battery bms={telemetry.bms}/></Panel>
      <Panel title="CONTACTO CON SUPERFICIE" meta={telemetry.modelo?.toUpperCase()} className="forces-panel"><FootForces forces={telemetry.fuerzas} model={telemetry.modelo}/></Panel>
      <Panel title="ACTUADORES" meta="STREAM 10 HZ" className="motors-panel"><MotorTable motors={motors}/></Panel>
      {telemetry.modelo?.toLowerCase() === 'g1' && (
        <Panel title="VISOR 3D (OTTOMAN)" meta="MODELO G1" className="model-panel">
          <RobotViewer motors={motors} />
        </Panel>
      )}
    </main>
  </div>;
}

export default TelemetryDashboard;
