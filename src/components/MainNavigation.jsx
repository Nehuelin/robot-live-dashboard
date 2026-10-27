const sections = [
  { id: "dashboard", label: "Dashboard" },
  { id: "information", label: "Información" },
];
export function MainNavigation({ active, onChange }) {
  return (
    <nav className="main-navigation" aria-label="Secciones principales">
      <div role="tablist" aria-label="Motion Lab">
        {sections.map(({ id, label }, index) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-controls={`section-${id}`}
            aria-selected={active === id}
            tabIndex={active === id ? 0 : -1}
            onClick={() => onChange(id)}
            onKeyDown={(event) => {
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? 1
                    : ["ArrowRight", "ArrowLeft"].includes(event.key)
                      ? 1 - index
                      : null;
              if (next !== null) {
                event.preventDefault();
                onChange(sections[next].id);
                document.getElementById(`tab-${sections[next].id}`)?.focus();
              }
            }}
          >
            <span aria-hidden="true">0{index + 1}</span>
            {label}
          </button>
        ))}
      </div>
      <span className="navigation-note">MOTION LAB / EXPLORAR · OBSERVAR</span>
    </nav>
  );
}
