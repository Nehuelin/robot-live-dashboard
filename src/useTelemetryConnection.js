import { useCallback, useEffect, useRef, useState } from "react";
import {
  EMPTY_TELEMETRY,
  normalizeTelemetry,
  sanitizeBaseUrl,
  saveUrl,
  resolveRobotModel,
} from "./utils";

export const STALE_MS = 2500;
export const RETRY_MS = 3000;
export const REQUEST_TIMEOUT_MS = 5000;
function stop(session) {
  if (!session) return;
  session.cancelled = true;
  session.timers.forEach(clearTimeout);
  session.controllers.forEach((controller) => controller.abort());
  if (session.socket) {
    session.socket.onopen =
      session.socket.onmessage =
      session.socket.onerror =
      session.socket.onclose =
        null;
    session.socket.close();
  }
}

export function useTelemetryConnection(initialUrl) {
  const initial = useRef(initialUrl);
  const sessionRef = useRef(null);
  const [state, setState] = useState({
    telemetry: EMPTY_TELEMETRY,
    robotInfo: null,
    status: "connecting",
    error: "",
    hasCurrentData: false,
    receivedAt: null,
    sequence: 0,
    sessionId: 0,
    activeUrl: "",
  });
  const connect = useCallback(function begin(value) {
    stop(sessionRef.current);
    const session = {
      cancelled: false,
      timers: new Set(),
      controllers: new Set(),
      socket: null,
      wsData: false,
      retry: null,
      freshness: null,
    };
    sessionRef.current = session;
    const current = () => sessionRef.current === session && !session.cancelled;
    const update = (patch) => {
      if (current()) setState((prev) => ({ ...prev, ...patch }));
    };
    const timer = (fn, ms) => {
      const id = setTimeout(() => {
        session.timers.delete(id);
        if (current()) fn();
      }, ms);
      session.timers.add(id);
      return id;
    };
    const clear = (id) => {
      clearTimeout(id);
      session.timers.delete(id);
    };
    const baseUrl = sanitizeBaseUrl(value);
    setState((prev) => ({
      ...prev,
      robotInfo: null,
      status: baseUrl ? "connecting" : "error",
      error: baseUrl
        ? ""
        : "Introduce una URL HTTP o HTTPS válida, sin credenciales.",
      hasCurrentData: false,
      sessionId: prev.sessionId + 1,
      activeUrl: baseUrl,
    }));
    if (!baseUrl) return;
    saveUrl(baseUrl);
    const retry = () => {
      if (!current() || session.retry !== null) return;
      if (session.socket) {
        session.socket.onopen =
          session.socket.onmessage =
          session.socket.onerror =
          session.socket.onclose =
            null;
        session.socket.close();
      }
      session.retry = timer(() => begin(baseUrl), RETRY_MS);
    };
    const accept = (raw, source) => {
      if (!current() || (source === "rest" && session.wsData)) return;
      const payload = normalizeTelemetry(raw);
      if (!payload) {
        update({ error: "Se recibió un mensaje sin mediciones válidas." });
        return;
      }
      if (source === "ws") session.wsData = true;
      clear(session.freshness);
      clear(session.handshake);
      clear(session.retry);
      session.retry = null;
      setState((prev) => ({
        ...prev,
        telemetry: payload,
        hasCurrentData: true,
        receivedAt: Date.now(),
        sequence: prev.sequence + 1,
        status: "live",
        error: "",
      }));
      session.freshness = timer(() => {
        update({
          status: "stale",
          error: "No llegan datos recientes. Reconexión automática en curso.",
        });
        retry();
      }, STALE_MS);
    };
    const request = async (path, onData) => {
      const controller = new AbortController();
      session.controllers.add(controller);
      let expired = false;
      const timeout = timer(() => {
        expired = true;
        controller.abort();
      }, REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(`${baseUrl}${path}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (current() && !expired) onData(data);
      } catch {
        if (current() && path === "/telemetria" && !session.wsData)
          update({ error: "Esperando telemetría del servidor…" });
      } finally {
        clear(timeout);
        session.controllers.delete(controller);
      }
    };
    void request("/info", (info) =>
      update({
        robotInfo:
          info && typeof info === "object" && !Array.isArray(info)
            ? info
            : null,
      }),
    );
    void request("/telemetria", (data) => accept(data, "rest"));
    try {
      const wsUrl = new URL("/ws", baseUrl);
      wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(wsUrl.toString());
      session.socket = ws;
      ws.onmessage = (event) => {
        if (!current()) return;
        try {
          accept(JSON.parse(event.data), "ws");
        } catch {
          update({
            error: "El servidor envió un mensaje que no es JSON válido.",
          });
        }
      };
      ws.onerror = ws.onclose = () => {
        update({
          status: "error",
          error: "Conexión interrumpida. Reintentando automáticamente…",
        });
        retry();
      };
      session.handshake = timer(() => {
        update({
          status: "error",
          error: "El servidor no responde. Reintentando automáticamente…",
        });
        retry();
      }, REQUEST_TIMEOUT_MS);
    } catch {
      update({
        status: "error",
        error: "No se pudo abrir WebSocket. Revisa la dirección y HTTP/HTTPS.",
      });
      retry();
    }
  }, []);
  useEffect(() => {
    connect(initial.current);
    return () => stop(sessionRef.current);
  }, [connect]);
  const canCapture = () =>
    state.hasCurrentData &&
    state.status === "live" &&
    Date.now() - state.receivedAt < STALE_MS;
  return {
    ...state,
    connect,
    canCapture,
    model: resolveRobotModel(
      state.hasCurrentData ? state.telemetry : null,
      state.robotInfo,
    ),
  };
}
