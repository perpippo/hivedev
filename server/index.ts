import { randomUUID } from "node:crypto";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { readRecentAudits } from "./audit.js";
import { executeRunAsync } from "./runChain.js";
import { projectAdrGraph, projectArchitectureGraph } from "./graph.js";
import { validateRepoRoot } from "./project.js";
import { subscribeRun } from "./runHub.js";
import type { RunRequestBody } from "./runHub.js";
import { loadRunnersForRepo } from "./runners.js";
import { buildMacroFromAdrDir, composeSpineFile } from "./spine.js";
import { readState, writeState } from "./state.js";

const app = new Hono();

app.use(
  "/api/*",
  cors({
    origin: ["http://127.0.0.1:5173", "http://localhost:5173"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

app.get("/api/health", (c) => c.json({ ok: true, service: "hivedev-api" }));

app.get("/api/state", (c) => c.json(readState()));

app.post("/api/state", async (c) => {
  const body = (await c.req.json()) as { lastRepoRoot?: string | null };
  if (body.lastRepoRoot != null && body.lastRepoRoot !== "") {
    const v = validateRepoRoot(body.lastRepoRoot);
    if (!v.ok) {
      return c.json({ error: v.errors[0] ?? "Repo non valido" }, 400);
    }
  }
  const next = writeState({ lastRepoRoot: body.lastRepoRoot ?? null });
  return c.json(next);
});

app.get("/api/repo/validate", (c) => {
  const root = c.req.query("path") ?? "";
  const v = validateRepoRoot(root);
  return c.json(v);
});

app.get("/api/runners", (c) => {
  const repo = c.req.query("repo") ?? "";
  if (!repo) return c.json({ runners: [] as unknown[], warnings: ["Parametro repo mancante"] });
  const v = validateRepoRoot(repo);
  const runners = v.ok ? loadRunnersForRepo(repo) : [];
  return c.json({ runners, validation: v });
});

app.get("/api/spine/preview", (c) => {
  const repo = c.req.query("repo") ?? "";
  const task = c.req.query("task") ?? "";
  const v = validateRepoRoot(repo);
  const macro = buildMacroFromAdrDir(v.adrDir);
  const full = composeSpineFile(macro, task);
  return c.json({ macro, task, full, validation: v });
});

app.get("/api/graph/adrs", (c) => {
  const repo = c.req.query("repo") ?? "";
  const v = validateRepoRoot(repo);
  if (!v.ok || !v.adrDir) return c.json({ nodes: [], edges: [], validation: v });
  const { nodes, edges } = projectAdrGraph(v.adrDir);
  return c.json({ nodes, edges, validation: v });
});

app.get("/api/graph/modules", (c) => {
  const repo = c.req.query("repo") ?? "";
  const v = validateRepoRoot(repo);
  if (!v.ok) return c.json({ nodes: [], edges: [], validation: v });
  const { nodes, edges } = projectArchitectureGraph(repo);
  return c.json({ nodes, edges, validation: v });
});

app.get("/api/audit", async (c) => {
  const runs = await readRecentAudits(100);
  return c.json({ runs });
});

app.post("/api/run", async (c) => {
  let body: RunRequestBody;
  try {
    body = (await c.req.json()) as RunRequestBody;
  } catch {
    return c.json({ error: "JSON non valido" }, 400);
  }
  const v = validateRepoRoot(body.repoRoot);
  if (!v.ok) {
    return c.json({ error: v.errors[0] ?? "Repo non valido", validation: v }, 400);
  }
  if (!body.stepRunnerIds?.length) {
    return c.json({ error: "stepRunnerIds richiesto" }, 400);
  }
  const runId = randomUUID();
  void executeRunAsync(runId, body);
  return c.json({ runId });
});

app.get("/api/run/:runId/stream", (c) => {
  const runId = c.req.param("runId");
  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      data: JSON.stringify({ type: "connected", runId }),
      event: "message",
    });
    await new Promise<void>((resolve) => {
      const unsub = subscribeRun(runId, async (ev) => {
        await stream.writeSSE({ data: JSON.stringify(ev), event: "message" });
        if (ev.type === "run_end") {
          unsub();
          resolve();
        }
      });
      const onAbort = () => {
        unsub();
        resolve();
      };
      c.req.raw.signal.addEventListener("abort", onAbort);
    });
  });
});

const port = Number(process.env.HIVEDEV_API_PORT ?? 8787);
serve({ fetch: app.fetch, port, hostname: "127.0.0.1" }, (info) => {
  console.log(`[HiveDev] API http://127.0.0.1:${info.port}`);
});
