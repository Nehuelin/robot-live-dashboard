import { useEffect, useRef, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

import './App.css';
import { EMPTY_TELEMETRY, normalizeTelemetry, buildApiUrl, sanitizeBaseUrl, fmt } from './utils';
import { Panel, Metric } from './components/Shared';
import { ConnectionBar } from './components/ConnectionBar';
import { BatteryPanel } from './components/BatteryPanel';
import { FootForces } from './components/FootForces';
import { MotorTable } from './components/MotorTable';
import { OrientationPanel } from './components/OrientationPanel';
import RobotViewer from './RobotViewer';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function TelemetryDashboard() {
  const [telemetry, setTelemetry] = useState(EMPTY_TELEMETRY);
  const [muestras, setMuestras] = useState([]);
  const [url, setUrl] = useState(() => localStorage.getItem('robot-api-url') || 'http://10.100.45.68:8001');
  const [status, setStatus] = useState('connecting');
  const [robotInfo, setRobotInfo] = useState(null);
  const socketRef = useRef(null);
  const retryRef = useRef(null);
  const intentionalClose = useRef(false);

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

  const fetchInfo = async (baseUrl) => {
    const apiUrl = buildApiUrl(baseUrl, '/info');
    if (!apiUrl) return;
    try {
      const response = await fetch(apiUrl);
      if (response.ok) {
        setRobotInfo(await response.json());
      }
    } catch (error) {
      console.warn('Could not fetch /info', error);
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
    await fetchInfo(baseUrl);
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

  const captureSample = () => {
    setMuestras(prev => [...prev, telemetry]);
  };

  const exportCSV = () => {
    if (muestras.length === 0) return;
    const headers = ['ts', 'modelo', 'imu_roll', 'imu_pitch', 'imu_yaw', 'bms_soc', 'bms_corriente', 'bms_temp'];
    const rows = muestras.map(m => [
      m.ts, m.modelo, m.imu.roll, m.imu.pitch, m.imu.yaw, m.bms.soc, m.bms.corriente, m.bms.temperatura
    ].join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const urlBlob = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlBlob;
    a.download = `muestras_telemetria_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(urlBlob);
  };

  const isG1 = robotInfo
    ? (robotInfo.tipo?.toLowerCase() === 'g1' || robotInfo.nombre?.toLowerCase() === 'g1' || robotInfo.modelo?.toLowerCase() === 'g1')
    : (telemetry.modelo?.toLowerCase() === 'g1');

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <p>UNITREE · LIVE SYSTEMS</p>
          <h1>TELEMETRÍA <span>// MOTION LAB</span></h1>
        </div>
        <div className="header-summary" style={{ alignItems: 'center' }}>
          <button type="button" onClick={captureSample} style={{ background: '#26313b', color: '#fff', fontSize: '11px', padding: '6px 12px' }}>
            📸 CAPTURAR ({muestras.length})
          </button>
          {muestras.length > 0 && (
            <button type="button" onClick={exportCSV} style={{ fontSize: '11px', padding: '6px 12px' }}>
              📥 EXPORTAR CSV
            </button>
          )}
          <Metric label="MOTORES" value={motors.length} unit="activos" />
          <Metric label="TEMP. MEDIA" value={fmt(avgTemp)} unit="°C" />
          <Metric label="TORQUE PICO" value={fmt(maxTorque, 2)} unit="Nm" />
        </div>
      </header>

      <ConnectionBar
        url={url}
        onUrlChange={setUrl}
        status={status}
        onConnect={connect}
        model={telemetry.modelo}
        timestamp={telemetry.ts}
      />

      <main className="telemetry-layout">
        <Panel title="ORIENTACIÓN / IMU" meta="6-AXIS" className="orientation-panel">
          <OrientationPanel imu={telemetry.imu} timestamp={telemetry.ts} />
        </Panel>

        <Panel title="SISTEMA DE ENERGÍA" meta="BMS" className="battery-panel">
          <BatteryPanel bms={telemetry.bms} />
        </Panel>

        <Panel title="CONTACTO CON SUPERFICIE" meta={telemetry.modelo?.toUpperCase()} className="forces-panel">
          <FootForces forces={telemetry.fuerzas} model={telemetry.modelo} />
        </Panel>

        <Panel title="ACTUADORES" meta="STREAM 10 HZ" className="motors-panel">
          <MotorTable motors={motors} />
        </Panel>

        {isG1 ? (
          <Panel title="VISOR 3D (OTTOMAN)" meta="MODELO G1" className="model-panel">
            <RobotViewer motors={motors} modelType="g1" />
          </Panel>
        ) : (
          <Panel title="VISOR 3D (PERRO)" meta={telemetry.modelo?.toUpperCase() || 'CUADRÚPEDO'} className="model-panel">
            <RobotViewer motors={motors} modelType="quadruped" />
          </Panel>
        )}
      </main>
    </div>
  );
}

export default TelemetryDashboard;
