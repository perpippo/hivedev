import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function hivedevDataDir(): string {
  const base =
    process.platform === "win32"
      ? path.join(process.env.USERPROFILE ?? os.homedir(), ".hivedev")
      : path.join(os.homedir(), ".hivedev");
  fs.mkdirSync(base, { recursive: true });
  return base;
}

export function statePath(): string {
  return path.join(hivedevDataDir(), "state.json");
}

export function auditPath(): string {
  return path.join(hivedevDataDir(), "audit.jsonl");
}
