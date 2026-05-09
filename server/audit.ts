import fs from "node:fs";
import readline from "node:readline";
import { auditPath } from "./paths.js";

export type AuditRunRecord = {
  runId: string;
  repoRoot: string;
  startedAt: string;
  finishedAt?: string;
  commit?: string | null;
  steps: { index: number; command: string; role: string; exitCode: number | null; durationMs: number }[];
  ok: boolean;
};

function appendLine(obj: unknown) {
  fs.appendFileSync(auditPath(), JSON.stringify(obj) + "\n", "utf-8");
}

export function logAudit(record: AuditRunRecord) {
  appendLine({ type: "run", ...record });
}

export async function readRecentAudits(limit = 50): Promise<AuditRunRecord[]> {
  const p = auditPath();
  if (!fs.existsSync(p)) return [];
  const out: AuditRunRecord[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(p, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line) as { type?: string } & AuditRunRecord;
      if (o.type === "run") out.push(o);
    } catch {
      /* skip */
    }
  }
  return out.slice(-limit);
}
