import React from 'react';
import { fmt } from '../utils';

export function ConnectionBar({ url, onUrlChange, status, onConnect, model, timestamp }) {
  return (
    <div className="connection-bar">
      <label htmlFor="robot-url">ROBOT API</label>
      <input 
        id="robot-url" 
        value={url} 
        onChange={(e) => onUrlChange(e.target.value)} 
        placeholder="http://10.0.0.5:8001" 
      />
      <button type="button" onClick={onConnect}>
        {status === 'live' ? 'RECONECTAR' : 'CONECTAR'}
      </button>
      <span className={`connection-status ${status}`}>
        <i />
        {status === 'live' ? 'EN VIVO' : status === 'connecting' ? 'CONECTANDO' : status === 'error' ? 'SIN SEÑAL' : 'DATOS DEMO'}
      </span>
      <span className="connection-meta">
        {model?.toUpperCase() || '—'} · T+{fmt(timestamp, 2)}s
      </span>
    </div>
  );
}
