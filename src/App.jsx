import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "./App.css";
import "./DashboardLayout.css";
import { readSavedUrl, sanitizeBaseUrl, fmt } from "./utils";
import { readProfiles, saveProfiles, DEMO_URLS } from "./connectionProfiles";
import { MainNavigation } from "./components/MainNavigation";
import { RobotInformation } from "./components/RobotInformation";
import { useTelemetryConnection } from "./useTelemetryConnection";
import { downloadSamples } from "./csv";
import { Panel, Metric } from "./components/Shared";
import { PanelSettings } from "./components/PanelSettings";
import { useDashboardView } from "./useDashboardView";
import { useDashboardLayout } from "./useDashboardLayout";
import { resolveViewerSelection } from "./dashboardPreferences";
import { ViewerBoundary } from "./components/ViewerBoundary";
import { ConnectionBar } from "./components/ConnectionBar";
import { BatteryPanel } from "./components/BatteryPanel";
import { FootForces } from "./components/FootForces";
import { MotorTable } from "./components/MotorTable";
import { OrientationPanel } from "./components/OrientationPanel";
const RobotViewer = lazy(() => import("./RobotViewer"));
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

export default function TelemetryDashboard() {
  const [url, setUrl] = useState(readSavedUrl);
  const [profiles, setProfiles] = useState(readProfiles);
  const [activeProfile, setActiveProfile] = useState(
    () => readProfiles().selected,
  );
  const [section, setSection] = useState("dashboard");
  useEffect(() => saveProfiles(profiles), [profiles]);
  const [muestras, setMuestras] = useState([]);
  const [viewerMode, setViewerMode] = useState("auto");
  const [viewerInitialized, setViewerInitialized] = useState(false);
  const view = useDashboardView(section === "dashboard");
  const layoutRef = useRef(null);
  const layout = useDashboardLayout(layoutRef, view.visible, view.focused);
  const connection = useTelemetryConnection(url);
  const { telemetry, status, model } = connection;
  const connectProfile = (value, id = profiles.selected) => {
    const base = sanitizeBaseUrl(value);
    if (base) {
      setUrl(base);
      setProfiles((prev) => ({
        ...prev,
        selected: id,
        urls: { ...prev.urls, [id]: base },
      }));
      setActiveProfile(id);
    }
    connection.connect(value);
  };
  const selectProfile = (id) => {
    setProfiles((prev) => ({ ...prev, selected: id }));
    const value = profiles.urls[id];
    setUrl(value);
    if (value) connectProfile(value, id);
  };
  const dashboardActive = section === "dashboard";
  const motors = telemetry.motores;
  const temperatures = motors
    .map((m) => m.temperatura)
    .filter((v) => v !== null);
  const torques = motors.map((m) => m.torque).filter((v) => v !== null);
  const avgTemp = temperatures.length
    ? temperatures.reduce((a, b) => a + b, 0) / temperatures.length
    : null;
  const maxTorque = torques.length ? Math.max(...torques.map(Math.abs)) : null;
  const captureSample = () => {
    if (connection.canCapture()) setMuestras((prev) => [...prev, telemetry]);
  };
  const selection = resolveViewerSelection(
    viewerMode,
    model,
    connection.hasCurrentData,
  );
  const viewerActive = dashboardActive && view.isActive("model");
  const mountViewer =
    Boolean(selection.model) && (viewerInitialized || viewerActive);
  // Retain an already visited scene, but never load a model for an initially hidden panel.
  if (mountViewer && !viewerInitialized) setViewerInitialized(true);
  const panelProps = (id) => ({
    id,
    style: layout.panels[id],
    hidden: !view.isActive(id),
    maximized: view.focused === id,
    onMaximize: (button) => view.toggleMaximize(id, button),
  });
  const visibleCount = Object.values(view.visible).filter(Boolean).length;

  return (
    <div className={`dashboard-container ${view.focused ? "is-focused" : ""}`}>
      <a
        className="skip-link"
        href={dashboardActive ? "#telemetry" : "#robot-information"}
      >
        Ir al contenido
      </a>
      <header className="dashboard-header">
        <div>
          <p>UNITREE · LIVE SYSTEMS</p>
          <h1>
            TELEMETRÍA <span>// MOTION LAB</span>
          </h1>
        </div>
        <div className="header-summary" hidden={!dashboardActive}>
          <button
            type="button"
            className="capture-button"
            aria-label={`Capturar muestra (${muestras.length})`}
            disabled={!connection.canCapture()}
            onClick={captureSample}
            title="Capturar la última muestra válida y reciente"
          >
            📸 CAPTURAR ({muestras.length})
          </button>
          <button
            type="button"
            className="export-button"
            aria-label="Exportar CSV"
            disabled={!muestras.length}
            onClick={() => downloadSamples(muestras)}
          >
            📥 EXPORTAR CSV
          </button>
          <PanelSettings
            key={`${view.focused || "layout"}-${section}`}
            visible={view.visible}
            focused={view.focused}
            onToggle={view.toggleVisible}
            onReset={view.reset}
            onOpenChange={view.setOverlayOpen}
          />
          <Metric label="MOTORES" value={motors.length || "—"} unit="activos" />
          <Metric label="TEMP. MEDIA" value={fmt(avgTemp)} unit="°C" />
          <Metric label="TORQUE PICO" value={fmt(maxTorque, 2)} unit="Nm" />
        </div>
      </header>
      <MainNavigation active={section} onChange={setSection} />
      <section
        role="tabpanel"
        id="section-dashboard"
        aria-labelledby="tab-dashboard"
        hidden={!dashboardActive}
      >
        <ConnectionBar
          url={url}
          onUrlChange={setUrl}
          status={status}
          onConnect={() => connectProfile(url)}
          model={model}
          timestamp={telemetry.ts}
          error={connection.error}
          profile={profiles.selected}
          activeProfile={activeProfile}
          activeUrl={connection.activeUrl}
          onProfileChange={selectProfile}
          onUseDemo={() => connectProfile(DEMO_URLS[profiles.selected])}
          simulation={connection.robotInfo?.simulation === true}
        />
        <main
          ref={layoutRef}
          id="telemetry"
          className={`telemetry-layout ${view.focused ? "focused-layout" : ""} ${visibleCount === 1 ? "single-panel" : ""}`}
        >
          <Panel
            {...panelProps("orientation")}
            title="Orientación / IMU"
            meta="6-AXIS"
            className="orientation-panel"
          >
            <OrientationPanel
              key={connection.sessionId}
              imu={telemetry.imu}
              timestamp={telemetry.ts}
              valid={connection.hasCurrentData}
              sequence={connection.sequence}
              active={dashboardActive && view.isActive("orientation")}
            />
          </Panel>
          <Panel
            {...panelProps("battery")}
            title="Sistema de energía"
            meta="BMS"
            className="battery-panel"
          >
            <BatteryPanel bms={telemetry.bms} />
          </Panel>
          <Panel
            {...panelProps("forces")}
            title="Contacto con superficie"
            meta={model ? model.toUpperCase() : "—"}
            className="forces-panel"
          >
            <FootForces forces={telemetry.fuerzas} model={model} />
          </Panel>
          <Panel
            {...panelProps("motors")}
            title="Actuadores"
            meta="TELEMETRÍA"
            className="motors-panel"
          >
            <MotorTable motors={motors} />
          </Panel>
          <Panel
            {...panelProps("model")}
            title={
              selection.model === "g1"
                ? "Visor 3D (Ottoman)"
                : "Visor 3D (Perro)"
            }
            meta={selection.model ? selection.model.toUpperCase() : "3D"}
            className="model-panel"
          >
            <div className="viewer-toolbar">
              <label htmlFor="viewer-mode">VISUALIZACIÓN</label>
              <select
                id="viewer-mode"
                aria-label="Modelo del visor 3D"
                value={viewerMode}
                onChange={(event) => setViewerMode(event.target.value)}
              >
                <option value="auto">Automático</option>
                <option value="g1">Humanoide (G1)</option>
                <option value="go2">Perro (Go2)</option>
              </select>
            </div>
            {selection.manual && (
              <p className="viewer-mode-note">
                Manual: {selection.model.toUpperCase()} · Telemetría:{" "}
                {model ? model.toUpperCase() : "sin identificar"}
                {selection.neutral
                  ? " · Pose neutral; sin movimientos de telemetría incompatibles."
                  : ""}
              </p>
            )}
            {mountViewer ? (
              <ViewerBoundary>
                <Suspense
                  fallback={
                    <div className="viewer-message">
                      <span className="loader" />
                      Preparando visor 3D…
                    </div>
                  }
                >
                  <RobotViewer
                    motors={selection.neutral ? [] : motors}
                    modelType={selection.model === "g1" ? "g1" : "quadruped"}
                    imu={selection.neutral ? undefined : telemetry.imu}
                    neutral={selection.neutral}
                    active={viewerActive}
                  />
                </Suspense>
              </ViewerBoundary>
            ) : (
              <div className="viewer-message">
                <strong>Esperando al robot</strong>
                <span>
                  Selecciona un modelo manual para explorarlo sin conexión.
                </span>
              </div>
            )}
            <div className="viewer-caption">
              <span>Arrastra para orbitar · Scroll para acercar</span>
              <span>
                {selection.manual ? "VISTA MANUAL" : "VISTA AUTOMÁTICA"}
              </span>
            </div>
          </Panel>
          {visibleCount === 0 && (
            <div className="dashboard-empty" role="status">
              <h2>Todos los paneles están ocultos</h2>
              <p>La conexión y las capturas siguen disponibles.</p>
              <button type="button" onClick={view.reset}>
                Restablecer paneles
              </button>
            </div>
          )}
        </main>
      </section>
      <section
        role="tabpanel"
        id="section-information"
        aria-labelledby="tab-information"
        hidden={dashboardActive}
      >
        <RobotInformation />
      </section>
    </div>
  );
}
