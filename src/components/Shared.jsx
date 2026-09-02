import React from 'react';

export function Panel({ title, meta, className = '', children }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-header">
        <h2>{title}</h2>
        {meta && <span className="panel-meta">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

export function Metric({ label, value, unit, tone = '' }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{unit}</small>
    </div>
  );
}
