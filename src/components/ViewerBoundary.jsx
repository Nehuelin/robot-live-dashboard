import { Component } from "react";
import { Icon } from "./Icon";

// Also wraps the lazy import, so a failed JS download cannot take down the panels.
export class ViewerBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.warn("Visor 3D no disponible:", error.message);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="viewer-message" role="status">
        <Icon name="cube" />
        <strong>No se pudo iniciar el visor</strong>
        <span>
          {this.props.onRetry
            ? "La telemetría sigue disponible. Comprueba WebGL y los recursos del modelo."
            : "Los paneles siguen disponibles. Exporta tus muestras antes de recargar la página."}
        </span>
        {this.props.onRetry && (
          <button className="button-secondary" onClick={this.props.onRetry}>
            Reintentar visor
          </button>
        )}
      </div>
    );
  }
}
