import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="logo">NEXUS-7 <span>// COMMAND CENTER</span></h1>
          <div className="status-badge online">
            <span className="dot"></span> ONLINE
          </div>
        </div>
        <div className="header-right">
          <div className="stat-item">
            <span className="label">LATENCY</span>
            <span className="value">24ms</span>
          </div>
          <div className="stat-item">
            <span className="label">BATTERY</span>
            <span className="value battery-good">87%</span>
          </div>
          <div className="stat-item">
            <span className="label">SYS TIME</span>
            <span className="value">{time}</span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="dashboard-grid">
        
        {/* Camera Feed */}
        <section className="panel camera-panel">
          <div className="panel-header">
            <h2>MAIN OPTICS (CAM-01)</h2>
            <div className="panel-actions">
              <span className="rec-indicator">REC</span>
            </div>
          </div>
          <div className="camera-feed">
            <div className="crosshair">
              <div className="ch-line-h"></div>
              <div className="ch-line-v"></div>
            </div>
            <div className="overlay-data top-left">
              FOV: 120°<br/>
              MODE: INFRARED
            </div>
            <div className="overlay-data bottom-right">
              TARGET LOCK: NONE
            </div>
            {/* Generamos un degradado y grid para simular la vista de camara */}
            <div className="feed-bg"></div>
          </div>
        </section>

        {/* Diagnostics */}
        <section className="panel diagnostics-panel">
          <div className="panel-header">
            <h2>SYSTEM DIAGNOSTICS</h2>
          </div>
          <div className="panel-content">
            <div className="diag-group">
              <h3>CORE TEMPS</h3>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: '45%'}}></div>
              </div>
              <div className="diag-value">CPU: 45°C</div>
              
              <div className="progress-bar mt-2">
                <div className="progress-fill warning" style={{width: '78%'}}></div>
              </div>
              <div className="diag-value">MOTORS: 78°C</div>
            </div>

            <div className="diag-group">
              <h3>POWER DRAW</h3>
              <div className="power-stats">
                <div className="stat-box">
                  <span className="box-label">IDLE</span>
                  <span className="box-val">1.2 kW</span>
                </div>
                <div className="stat-box active">
                  <span className="box-label">PEAK</span>
                  <span className="box-val">3.4 kW</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Telemetry (IMU) */}
        <section className="panel telemetry-panel">
          <div className="panel-header">
            <h2>KINEMATICS & IMU</h2>
          </div>
          <div className="panel-content imu-grid">
            <div className="imu-item">
              <span className="imu-label">PITCH</span>
              <span className="imu-value">-2.4°</span>
            </div>
            <div className="imu-item">
              <span className="imu-label">ROLL</span>
              <span className="imu-value">0.1°</span>
            </div>
            <div className="imu-item">
              <span className="imu-label">YAW</span>
              <span className="imu-value">145.8°</span>
            </div>
            <div className="imu-item">
              <span className="imu-label">VELOCITY</span>
              <span className="imu-value">0.4 m/s</span>
            </div>
          </div>
        </section>

        {/* Console / Logs */}
        <section className="panel console-panel">
          <div className="panel-header">
            <h2>TERMINAL OUTPUT</h2>
          </div>
          <div className="console-content">
            <p className="log-line text-muted">[10:12:31] System initialized. All sub-routines active.</p>
            <p className="log-line text-muted">[10:12:35] Calibrating gyro sensors... OK.</p>
            <p className="log-line text-info">[10:12:40] Awaiting operator command.</p>
            <p className="log-line text-warning">[10:14:12] Minor slip detected on rear-left actuator. Compensating.</p>
            <p className="log-line text-info">[10:15:00] Standby mode engaged.</p>
            <div className="cursor">_</div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
