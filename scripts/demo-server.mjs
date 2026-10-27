import { createServer } from "vite";
import { WebSocketServer } from "ws";
import { demoTelemetry } from "./demo-telemetry.mjs";

// Development-only fixtures. This server never forwards traffic to a robot.
const model = process.argv.includes("--g1") ? "g1" : "go2";
const portIndex = process.argv.indexOf("--port");
const port = portIndex < 0 ? 5173 : Number(process.argv[portIndex + 1]);
const fixed = process.argv.includes("--static");
const started = Date.now();
let silent = false;
const sample = () =>
  demoTelemetry(model, (Date.now() - started) / 1000, { static: fixed });
const wss = new WebSocketServer({ noServer: true });
const server = await createServer({
  server: { host: "127.0.0.1", port, strictPort: true },
  plugins: [
    {
      name: "local-telemetry-fixture",
      transformIndexHtml: {
        order: "pre",
        handler: (html) =>
          html.replace(
            "<head>",
            `<head><script>try { const saved = new URL(localStorage.getItem('robot-api-url')); if (!['localhost','127.0.0.1','[::1]'].includes(saved.hostname)) localStorage.setItem('robot-api-url', location.origin); } catch { try { localStorage.setItem('robot-api-url', location.origin); } catch {} }</script>`,
          ),
      },
      configureServer(vite) {
        vite.middlewares.use((req, res, next) => {
          const path = new URL(req.url, "http://localhost").pathname;
          if (["/telemetria", "/info"].includes(path)) {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Cache-Control", "no-store");
          }
          if (
            path === "/__simulation/silent" ||
            path === "/__simulation/resume"
          ) {
            silent = path.endsWith("silent");
            res.end(JSON.stringify({ silent }));
          } else if (path === "/__simulation/disconnect") {
            for (const client of wss.clients) client.close();
            res.end("disconnected");
          } else if (path === "/telemetria" || path === "/info") {
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify(
                path === "/info"
                  ? {
                      tipo: model,
                      nombre: model,
                      simulation: true,
                      source: "motion-lab-demo",
                    }
                  : sample(),
              ),
            );
          } else next();
        });
        vite.httpServer.on("upgrade", (req, socket, head) => {
          if (new URL(req.url, "http://localhost").pathname === "/ws") {
            wss.handleUpgrade(req, socket, head, (ws) =>
              wss.emit("connection", ws, req),
            );
          }
        });
      },
    },
  ],
});
wss.on("connection", (ws) => {
  const timer = setInterval(() => {
    if (!silent && ws.readyState === 1) ws.send(JSON.stringify(sample()));
  }, 100);
  ws.on("close", () => clearInterval(timer));
});
await server.listen();
console.log(
  `SIMULACIÓN ${model.toUpperCase()} · http://127.0.0.1:${port} · ${fixed ? "estática" : "dinámica"} · sin hardware`,
);
const shutdown = async () => {
  for (const ws of wss.clients) ws.close();
  wss.close();
  await server.close();
  process.exit();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
