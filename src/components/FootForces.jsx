import React from 'react';

export function FootForces({ forces = {}, model }) {
  const keys = Object.keys(forces);
  
  let feet = [];
  if (keys.length > 0) {
    feet = keys.map(k => ({
      key: k,
      label: k.replace('_foot', '').replace('foot_', '').toUpperCase()
    }));
  } else {
    feet = model?.toLowerCase() === 'g1'
      ? [ { key: 'R_foot', label: 'R' }, { key: 'L_foot', label: 'L' } ]
      : [ { key: 'FR', label: 'FR' }, { key: 'FL', label: 'FL' }, { key: 'RR', label: 'RR' }, { key: 'RL', label: 'RL' } ];
  }
  
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
