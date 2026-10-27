import { useLayoutEffect, useState } from "react";
import { planDashboard } from "./dashboardLayout";
export function useDashboardLayout(ref, visible, focused) {
  const [size, setSize] = useState({ width: 1200, height: 600 });
  useLayoutEffect(() => {
    const element = ref.current;
    const chrome = element?.previousElementSibling;
    const measure = () => {
      if (!element || element.closest("[hidden]")) return;
      const rect = element.getBoundingClientRect();
      const next = {
        width: Math.round(rect.width),
        height: Math.max(
          410,
          window.innerHeight - (rect.top + window.scrollY) - 20,
        ),
      };
      setSize((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next,
      );
    };
    measure();
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    observer?.observe(element);
    if (chrome) observer?.observe(chrome);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref]);
  const ids = Object.keys(visible).filter(
    (id) => visible[id] && (!focused || focused === id),
  );
  return planDashboard(ids, size.width, size.height);
}
