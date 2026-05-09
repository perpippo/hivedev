import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AuditRunRecord } from "./audit.js";
import { logAudit } from "./audit.js";
import { publishRun } from "./runHub.js";
import type { RunRequestBody } from "./runHub.js";
import { isProviderKey, providerToRunner } from "./providers.js";
import { tryGetGitHead } from "./project.js";
import { loadRunnersForRepo, type RunnerProfile } from "./runners.js";

function pickRunners(ids: string[], catalog: RunnerProfile[]): RunnerProfile[] {
  const map = new Map(catalog.map((r) => [r.id, r]));
  return ids.map((id) => {
    const r = map.get(id);
    if (!r) throw new Error(`Runner sconosciuto: ${id}`);
    return r;
  });
}

function writeSpineTemp(spine: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hivedev-spine-"));
  const p = path.join(dir, "spine.md");
  fs.writeFileSync(p, spine, "utf-8");
  return p;
}

export async function executeRunAsync(runId: string, body: RunRequestBody): Promise<void> {
  const { repoRoot, task, spineContent } = body;
  const startedAt = new Date().toISOString();
  const stepsMeta: AuditRunRecord["steps"] = [];
  let ok = true;
  let error: string | undefined;
  const commit = tryGetGitHead(repoRoot);
  const spinePath = writeSpineTemp(spineContent);

  try {
    const steps: RunnerProfile[] =
      body.mode === "quick"
        ? isProviderKey(body.providerKey)
          ? [providerToRunner(body.providerKey)]
          : (() => {
              throw new Error(`Provider non valido: ${body.providerKey}`);
            })()
        : pickRunners(body.stepRunnerIds, loadRunnersForRepo(repoRoot));
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      publishRun(runId, {
        type: "step_start",
        index: i,
        command: step.command,
        role: String(step.role),
      });
      const t0 = Date.now();
      const exitCode = await runOneStep(repoRoot, step, spinePath, task, runId, i);
      const durationMs = Date.now() - t0;
      stepsMeta.push({
        index: i,
        command: step.command,
        role: String(step.role),
        exitCode,
        durationMs,
      });
      publishRun(runId, { type: "step_end", index: i, exitCode, durationMs });
      if (exitCode !== 0) {
        ok = false;
        error = `Passo ${i} terminato con codice ${exitCode}`;
        break;
      }
    }
  } catch (e) {
    ok = false;
    error = e instanceof Error ? e.message : String(e);
  } finally {
    try {
      fs.rmSync(path.dirname(spinePath), { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    publishRun(runId, { type: "run_end", ok, error });
    const rec: AuditRunRecord = {
      runId,
      repoRoot,
      startedAt,
      finishedAt: new Date().toISOString(),
      commit,
      steps: stepsMeta,
      ok,
    };
    logAudit(rec);
  }
}

function runOneStep(
  cwd: string,
  step: RunnerProfile,
  spinePath: string,
  task: string,
  runId: string,
  index: number,
): Promise<number | null> {
  return new Promise((resolve) => {
    const env = {
      ...process.env,
      HIVEDEV_SPINE_FILE: spinePath,
      HIVEDEV_TASK: task,
      HIVEDEV_RUN_ID: runId,
      HIVEDEV_STEP_INDEX: String(index),
    };
    const child = spawn(step.command, {
      cwd,
      env,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
    }, step.timeoutMs);
    child.stdout?.setEncoding("utf-8");
    child.stderr?.setEncoding("utf-8");
    child.stdout?.on("data", (chunk: string) => {
      for (const line of chunk.split(/\r?\n/)) {
        if (line) publishRun(runId, { type: "stdout", index, line });
      }
    });
    child.stderr?.on("data", (chunk: string) => {
      for (const line of chunk.split(/\r?\n/)) {
        if (line) publishRun(runId, { type: "stderr", index, line });
      }
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
    child.on("error", (err) => {
      clearTimeout(timeout);
      publishRun(runId, {
        type: "stderr",
        index,
        line: `[spawn error] ${err.message}`,
      });
      resolve(null);
    });
  });
}
