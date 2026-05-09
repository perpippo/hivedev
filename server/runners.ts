import fs from "node:fs";
import path from "node:path";

export type RunnerRole = "executor" | "reviewer" | string;

export type RunnerProfile = {
  id: string;
  /** Comando eseguito nella shell del repo (es. `node -e "..."` o path a script) */
  command: string;
  role: RunnerRole;
  timeoutMs: number;
};

const defaultRunners: RunnerProfile[] = [
  {
    id: "demo-executor",
    command: 'node -e "console.log(\\"[HiveDev executor] ok\\"); process.exit(0)"',
    role: "executor",
    timeoutMs: 30_000,
  },
  {
    id: "demo-reviewer",
    command: 'node -e "console.log(\\"[HiveDev reviewer] ok\\"); process.exit(0)"',
    role: "reviewer",
    timeoutMs: 30_000,
  },
];

type HiveDevConfigFile = {
  runners?: RunnerProfile[];
};

export function loadRunnersForRepo(repoRoot: string): RunnerProfile[] {
  const cfgPath = path.join(repoRoot, "hivedev.config.json");
  if (!fs.existsSync(cfgPath)) return defaultRunners;
  try {
    const raw = fs.readFileSync(cfgPath, "utf-8");
    const j = JSON.parse(raw) as HiveDevConfigFile;
    if (Array.isArray(j.runners) && j.runners.length > 0) return j.runners;
  } catch {
    /* fallthrough */
  }
  return defaultRunners;
}
