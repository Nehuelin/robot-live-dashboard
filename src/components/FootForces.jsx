import React from 'react';

export function FootForces({ forces = {}, model }) {
  const feet = [
    { key: 'FR', label: 'FR' },
    { key: 'FL', label: 'FL' },
    { key: 'RR', label: 'RR' },
    { key: 'RL', label: 'RL' }
  ];
  
  return (
    <div className="feet-grid">
      {feet.map((foot) => {
        const k = foot.key;
        const val = forces[k] || forces[k.toLowerCase()] || forces[k.toUpperCase()] || 0;
        const grounded = Number(val) > 0;
        return (
          <div className={`foot ${grounded ? 'grounded' : ''}`} key={foot.key}>
            <i />
            <span>{foot.label}</span>
            <b>{grounded ? 'APOYO' : 'AIRE'}</b>
          </div>
        );
      })}
    </div>
  );
}
