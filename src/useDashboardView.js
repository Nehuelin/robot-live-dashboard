import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import {
  defaultPanels,
  readPanelPreferences,
  savePanelPreferences,
} from "./dashboardPreferences";

function useLayoutAnimation(animationsAllowed) {
  const pending = useRef(null);
  useEffect(
    () => () => {
      if (pending.current) {
        pending.current.cancelled = true;
        pending.current.transition.skipTransition();
      }
    },
    [],
  );
  return useCallback(
    (update) => {
      // Finish an earlier pending update before accepting a rapid second action.
      if (pending.current) {
        pending.current.apply();
        pending.current.transition.skipTransition();
        pending.current = null;
      }
      if (
        !animationsAllowed() ||
        !document.startViewTransition ||
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ) {
        flushSync(update);
        return;
      }
      const entry = { applied: false, cancelled: false };
      entry.apply = () => {
        if (entry.applied || entry.cancelled) return;
        entry.applied = true;
        flushSync(update);
      };
      try {
        entry.transition = document.startViewTransition(entry.apply);
      } catch {
        entry.apply();
        return;
      }
      pending.current = entry;
      // Skipped transitions may reject `ready`; the DOM update still succeeds.
      entry.transition.ready.catch(() => {});
      entry.transition.finished
        .catch(() => {})
        .finally(() => {
          if (pending.current === entry) pending.current = null;
        });
    },
    [animationsAllowed],
  );
}

export function useDashboardView(active = true) {
  const [visible, setVisible] = useState(readPanelPreferences);
  const [focused, setFocused] = useState(null);
  const restoreTarget = useRef(null);
  const overlayOpen = useRef(false);
  const animationsAllowed = useCallback(() => !overlayOpen.current, []);
  const animate = useLayoutAnimation(animationsAllowed);
  const setOverlayOpen = useCallback(
    (open) => {
      overlayOpen.current = open;
      // Also finish a transition already running when the menu is opened.
      if (open) animate(() => {});
    },
    [animate],
  );
  useEffect(() => savePanelPreferences(visible), [visible]);

  const restore = useCallback(() => animate(() => setFocused(null)), [animate]);
  useEffect(() => {
    if (!focused || !active) return;
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        restore();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focused, restore, active]);

  useLayoutEffect(() => {
    if (focused)
      document
        .getElementById(`panel-${focused}`)
        ?.scrollIntoView?.({ block: "start", behavior: "instant" });
    else if (restoreTarget.current) {
      const { button, x, y } = restoreTarget.current;
      button?.focus({ preventScroll: true });
      if (window.scrollY !== y || window.scrollX !== x)
        window.scrollTo({ top: y, left: x, behavior: "instant" });
      restoreTarget.current = null;
    }
  }, [focused]);

  const toggleMaximize = (id, button) => {
    if (focused === id) {
      restore();
      return;
    }
    restoreTarget.current = { button, x: window.scrollX, y: window.scrollY };
    animate(() => setFocused(id));
  };
  const toggleVisible = (id) => {
    if (focused) return; // Restore first: the exact previous mask remains intact.
    animate(() => setVisible((prev) => ({ ...prev, [id]: !prev[id] })));
  };
  const reset = () =>
    animate(() => {
      setVisible(defaultPanels());
      setFocused(null);
    });
  const isActive = (id) => visible[id] && (!focused || focused === id);
  return {
    visible,
    focused,
    toggleVisible,
    toggleMaximize,
    reset,
    isActive,
    setOverlayOpen,
  };
}
