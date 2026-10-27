import "./RobotInformation.css";
function Architecture({ humanoid }) {
  return (
    <svg
      className="architecture-diagram"
      viewBox="0 0 300 140"
      role="img"
      aria-label={
        humanoid
          ? "Esquema de dos piernas y dos brazos"
          : "Esquema de cuatro apoyos articulados"
      }
    >
      {humanoid ? (
        <g>
          <circle cx="150" cy="20" r="12" />
          <path d="M130 40h40v42h-40z M130 47l-24 16-10 25 M170 47l24 16 10 25 M137 82l-8 22-7 24 M163 82l8 22 7 24" />
          <path className="diagram-joints" d="M124 130h-12 M174 130h12" />
        </g>
      ) : (
        <g>
          <path d="M85 40h125v38H85z M210 46h25l5 17h-30 M99 78l-9 24 10 26 M125 78l-6 24 12 26 M174 78l-8 24 11 26 M198 78l-5 24 13 26" />
          <path
            className="diagram-joints"
            d="M94 130h12 M125 130h12 M171 130h12 M200 130h12"
          />
        </g>
      )}
      <path className="diagram-ground" d="M50 134h200" />
    </svg>
  );
}
export function RobotInformation() {
  return (
    <main className="robot-information" id="robot-information">
      <div className="information-intro">
        <p className="eyebrow">CONOCÉ LOS ROBOTS</p>
        <h2>
          Dos arquitecturas.
          <br />
          <span>Un mismo desafío: moverse en equilibrio.</span>
        </h2>
        <p>
          Motores, sensores y control trabajan juntos para decidir dónde apoyar
          y cómo mover cada articulación. La telemetría permite observar una
          parte de ese trabajo.
        </p>
      </div>
      <div className="robot-cards">
        <article className="information-card">
          <div className="robot-card-heading">
            <span>01 / CUADRÚPEDO</span>
            <h3>Unitree Go2</h3>
          </div>
          <Architecture />
          <p>
            Cuatro patas articuladas coordinan los apoyos para avanzar y
            adaptarse al terreno. Go2 incorpora percepción mediante LiDAR 4D;
            sus funciones y accesorios dependen de la versión.
          </p>
          <dl>
            <div>
              <dt>Arquitectura</dt>
              <dd>Cuatro patas</dd>
            </div>
            <div>
              <dt>Versiones</dt>
              <dd>Air, Pro, X y EDU</dd>
            </div>
          </dl>
          <a
            href="https://www.unitree.com/go2/"
            target="_blank"
            rel="noreferrer"
          >
            Ficha oficial de Go2 ↗
          </a>
        </article>
        <article className="information-card">
          <div className="robot-card-heading">
            <span>02 / HUMANOIDE</span>
            <h3>Unitree G1</h3>
          </div>
          <Architecture humanoid />
          <p>
            Dos piernas sostienen un cuerpo con torso y brazos. La coordinación
            del equilibrio y la manipulación requiere controlar varias cadenas
            articulares a la vez.
          </p>
          <dl>
            <div>
              <dt>Altura de pie</dt>
              <dd>Aprox. 1,32 m</dd>
            </div>
            <div>
              <dt>Configuración</dt>
              <dd>G1: 23 grados de libertad; G1 EDU: 23–43</dd>
            </div>
          </dl>
          <a
            href="https://www.unitree.com/g1/"
            target="_blank"
            rel="noreferrer"
          >
            Ficha oficial de G1 ↗
          </a>
        </article>
      </div>
      <section
        className="information-section"
        aria-labelledby="architectures-title"
      >
        <p className="eyebrow">CUADRÚPEDO VS. HUMANOIDE</p>
        <h3 id="architectures-title">El apoyo cambia la estrategia</h3>
        <div className="architecture-comparison">
          <article>
            <h4>Cuatro patas</h4>
            <p>
              La secuencia de apoyos reparte el peso entre las extremidades. La
              estabilidad depende de la postura, la marcha y el terreno; tener
              cuatro patas no elimina la necesidad de control.
            </p>
          </article>
          <article>
            <h4>Dos piernas y brazos</h4>
            <p>
              Al caminar cambia continuamente la base de apoyo. Torso, piernas y
              brazos se coordinan para mantener el equilibrio y alcanzar
              objetos.
            </p>
          </article>
        </div>
        <p className="information-note">
          En este TP, el simulador representa 12 motores Go2 o 29 motores G1. Es
          un contrato académico: 29 no es una especificación universal de G1. El
          dashboard muestra los actuadores que realmente informa cada servidor.
        </p>
      </section>
      <section
        className="information-section"
        aria-labelledby="telemetry-title"
      >
        <p className="eyebrow">CÓMO LEER EL DASHBOARD</p>
        <h3 id="telemetry-title">De las mediciones a una vista en vivo</h3>
        <ol className="telemetry-flow">
          <li>Robot o simulador</li>
          <li>Servidor de telemetría</li>
          <li>REST + WebSocket</li>
          <li>Dashboard y captura CSV</li>
        </ol>
        <div className="telemetry-explain">
          <article>
            <span>01</span>
            <h4>Actuadores</h4>
            <p>
              Ángulo, velocidad, torque y temperatura describen el estado de
              cada motor. El semáforo ayuda a reconocer temperaturas elevadas.
            </p>
          </article>
          <article>
            <span>02</span>
            <h4>IMU</h4>
            <p>
              Roll, pitch y yaw describen orientación; la aceleración aporta
              información sobre el movimiento. El gráfico permite ver cómo
              cambian con el tiempo.
            </p>
          </article>
          <article>
            <span>03</span>
            <h4>BMS</h4>
            <p>
              El sistema de gestión de batería informa carga, corriente,
              temperatura y voltaje de las celdas. El balance muestra la
              diferencia entre los voltajes disponibles.
            </p>
          </article>
          <article>
            <span>04</span>
            <h4>Contactos</h4>
            <p>
              Indican apoyo o ausencia de contacto según los valores recibidos.
              Un campo ausente aparece sin datos; no se interpreta como un apoyo
              real.
            </p>
          </article>
        </div>
        <p className="information-note">
          “En vivo” significa que llegaron mediciones recientes. El perfil elige
          el servidor; el selector del visor elige el modelo 3D. Explorar un
          modelo o activar su animación local no envía órdenes de movimiento al
          robot.
        </p>
      </section>
      <section
        className="information-section unitree-about"
        aria-labelledby="unitree-title"
      >
        <div>
          <p className="eyebrow">ACERCA DE UNITREE</p>
          <h3 id="unitree-title">Robótica con patas y percepción</h3>
        </div>
        <p>
          Unitree Robotics desarrolla y fabrica robots cuadrúpedos y humanoides,
          además de componentes como motores, controladores y sensores. Su
          trabajo integra hardware, percepción y algoritmos de movimiento para
          plataformas de consumo, educación e industria.
        </p>
      </section>
      <footer className="information-sources">
        <span>FUENTES OFICIALES · CONSULTADAS EL 27/10/2026</span>
        <a href="https://www.unitree.com/" target="_blank" rel="noreferrer">
          Unitree Robotics ↗
        </a>
        <a
          href="https://www.unitree.com/mobile/about/"
          target="_blank"
          rel="noreferrer"
        >
          Acerca de Unitree ↗
        </a>
        <p>
          Las configuraciones comerciales pueden cambiar. Consultá la ficha de
          la versión concreta antes de comparar especificaciones. Los diagramas
          son esquemas educativos, no planos mecánicos.
        </p>
      </footer>
    </main>
  );
}
