import { finiteNumber } from "../utils";
export function FootForces({ forces = {}, model }) {
  const keys = Object.keys(forces);
  const feet = keys.length
    ? keys.map((key) => ({
        key,
        label: key.replace("_foot", "").replace("foot_", "").toUpperCase(),
      }))
    : model === "g1"
      ? [
          { key: "R_foot", label: "R" },
          { key: "L_foot", label: "L" },
        ]
      : ["FR", "FL", "RR", "RL"].map((key) => ({ key, label: key }));
  return (
    <div className="contact-content">
      <p className="contact-intro">Estado de apoyo</p>
      <div className="feet-grid" style={{ "--contacts": feet.length }}>
        {feet.map((foot) => {
          const value = finiteNumber(
            forces[foot.key] ??
              forces[foot.key.toLowerCase()] ??
              forces[foot.key.toUpperCase()],
          );
          const grounded = value !== null && value > 0;
          return (
            <div
              className={`foot ${grounded ? "grounded" : ""}`}
              key={foot.key}
            >
              <span className="foot-label">{foot.label}</span>
              <i className="foot-mark" aria-hidden="true" />
              <b>
                {value === null ? "SIN DATOS" : grounded ? "APOYO" : "AIRE"}
              </b>
              <span className="foot-ground" aria-hidden="true" />
            </div>
          );
        })}
      </div>
      <span className="contact-note">
        <i className="status-dot live" />
        Contacto detectado
      </span>
    </div>
  );
}
