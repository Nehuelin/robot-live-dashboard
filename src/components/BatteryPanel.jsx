import React from 'react';
import { Metric } from './Shared';
import { fmt } from '../utils';

export function BatteryPanel({ bms = {} }) {
  const soc = Math.max(0, Math.min(100, Number(bms.soc) || 0));
  const cells = Array.isArray(bms.celdas) ? bms.celdas : [];
  const delta = cells.length ? Math.max(...cells) - Math.min(...cells) : null;
  
  return (
    <div className="battery-content" style={{ display: 'flex', flexDirection: 'column', padding: '16px', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: '14px' }}>
        <div className="battery-main">
          <div className="battery-gauge">
            <div style={{ height: `${soc}%` }} />
          </div>
          <div>
            <strong>{fmt(soc, 0)}<small>%</small></strong>
            <span>ESTADO DE CARGA</span>
          </div>
        </div>
        <div className="battery-stats" style={{ flex: 1 }}>
          <Metric label="CORRIENTE" value={fmt(Number(bms.corriente) || 0, 0)} unit="mA"/>
          <Metric label="TEMP. BMS" value={fmt(bms.temperatura)} unit="°C"/>
          <Metric label="BALANCE" value={delta == null ? '—' : fmt(delta * 1000, 0)} unit="mV"/>
        </div>
      </div>
      
      {/* Grid container to prevent overflow and keep it responsive */}
      <div className="cell-voltages" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(55px, 1fr))', 
        gap: '6px', 
        marginTop: '16px',
        overflowY: 'auto',
        flex: 1,
        alignContent: 'start'
      }}>
        {cells.map((v, i) => (
          <div key={i} style={{ background: '#090d11', border: '1px solid #26313b', padding: '4px', fontSize: '10px', color: '#42e8e0', borderRadius: '4px', textAlign: 'center' }}>
            C{i+1}: <br/><span style={{ color: '#e7edf2' }}>{fmt(v, 2)}V</span>
          </div>
        ))}
      </div>
    </div>
  );
}
