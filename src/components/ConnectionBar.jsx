import { fmt } from "../utils";
import { Icon } from "./Icon";
import { PROFILE_LABELS } from "../connectionProfiles";
const labels = {
  live: "EN VIVO",
  connecting: "CONECTANDO",
  stale: "DATOS DESACTUALIZADOS",
  error: "SIN SEÑAL",
};
export function ConnectionBar({
  url,
  onUrlChange,
  status,
  onConnect,
  model,
  timestamp,
  error,
  profile = "custom",
  activeProfile = "custom",
  activeUrl,
  onProfileChange,
  onUseDemo,
  simulation = false,
}) {
  const mismatch =
    (activeProfile === "g1" || activeProfile === "go2") &&
    model &&
    model !== activeProfile;
  return (
    <div className={`connection-section ${status}`}>
      <form
        className="connection-bar"
        onSubmit={(e) => {
          e.preventDefault();
          onConnect();
        }}
      >
        <label htmlFor="connection-profile">FUENTE</label>
        <select
          id="connection-profile"
          aria-label="Fuente de telemetría"
          value={profile}
          onChange={(event) => onProfileChange(event.target.value)}
        >
          {Object.entries(PROFILE_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <label htmlFor="robot-url">
          <Icon name="link" />
          ROBOT API
        </label>
        <input
          id="robot-url"
          type="url"
          required
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="http://10.0.0.5:8001"
          autoComplete="off"
          spellCheck={false}
          aria-describedby="connection-help"
        />
        <button type="submit" className="button-secondary">
          {status === "live" ? "Reconectar" : "Conectar"}
          <span aria-hidden="true">↗</span>
        </button>
        <span className={`connection-status ${status}`} role="status">
          <i className={`status-dot ${status}`} />
          {labels[status]}
        </span>
        <span className="connection-meta">
          {model?.toUpperCase() || "—"}
          <span> / </span>T+{fmt(timestamp, 2)}s
        </span>
      </form>
      <div className="source-summary">
        <span>
          Sesión: <b>{PROFILE_LABELS[activeProfile]}</b> ·{" "}
          <span className="active-origin">
            {activeUrl || "Sin dirección válida"}
          </span>
        </span>
        <span className={`source-kind ${simulation ? "is-demo" : ""}`}>
          {simulation ? "SIMULACIÓN DECLARADA" : "ORIGEN NO VERIFICADO"}
        </span>
        {profile !== "custom" && (
          <button type="button" className="source-demo" onClick={onUseDemo}>
            Usar demo local {profile.toUpperCase()}
          </button>
        )}
      </div>
      {profile !== activeProfile && !url && (
        <p className="source-notice" role="status">
          Perfil {profile.toUpperCase()} sin dirección. Configurá ROBOT API y
          conectá una vez; se guardará para la próxima selección. La sesión
          actual continúa.
        </p>
      )}
      {mismatch && (
        <p className="source-notice" role="status">
          El perfil {activeProfile.toUpperCase()} recibió un modelo{" "}
          {model.toUpperCase()}. Se muestran los datos reportados por el
          servidor.
        </p>
      )}
      {(status === "error" || status === "stale") && (
        <p className="source-notice">
          Verificá la dirección y que el backend esté iniciado. Para el demo,
          ejecutá el simulador antes de conectar.
        </p>
      )}
      <p
        id="connection-help"
        className={`connection-help ${error ? "has-message" : ""}`}
      >
        {error ||
          (status === "live"
            ? "Recibiendo telemetría. Las capturas se guardan en esta sesión."
            : "Los últimos valores se conservan; la captura requiere datos recientes.")}
      </p>
    </div>
  );
}
