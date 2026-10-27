import { Icon } from "./Icon";
export function Panel({
  title,
  meta,
  icon,
  className = "",
  children,
  id,
  hidden = false,
  maximized = false,
  onMaximize,
  style,
}) {
  return (
    <section
      id={id ? `panel-${id}` : undefined}
      data-panel={id}
      className={`panel ${className} ${maximized ? "is-maximized" : ""}`}
      aria-label={title}
      hidden={hidden}
      style={{ ...(id ? { viewTransitionName: `panel-${id}` } : {}), ...style }}
    >
      <div className="panel-header">
        <h2>
          {icon && <Icon name={icon} />}
          {title}
        </h2>
        <div className="panel-heading-actions">
          {meta && <span className="panel-meta">{meta}</span>}
          {onMaximize && (
            <button
              type="button"
              className="panel-control"
              aria-label={`${maximized ? "Restaurar" : "Maximizar"} ${title}`}
              aria-expanded={maximized}
              title={maximized ? "Restaurar panel (Escape)" : "Maximizar panel"}
              onClick={(event) => onMaximize(event.currentTarget)}
            >
              <Icon name={maximized ? "restore" : "maximize"} />
            </button>
          )}
        </div>
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}
export function Metric({ label, value, unit, tone = "", icon, detail }) {
  return (
    <div className={`metric ${tone}`}>
      <span className="metric-label">
        {label}
        {icon && <Icon name={icon} />}
      </span>
      <div className="metric-reading">
        <strong>{value}</strong>
        <small>{unit}</small>
      </div>
      {detail && <span className="metric-detail">{detail}</span>}
    </div>
  );
}
