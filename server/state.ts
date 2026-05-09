import fs from "node:fs";
import { statePath } from "./paths.js";

export type AppState = {
  lastRepoRoot: string | null;
};

const defaultState: AppState = { lastRepoRoot: null };

export function readState(): AppState {
  try {
    const raw = fs.readFileSync(statePath(), "utf-8");
    return { ...defaultState, ...JSON.parse(raw) } as AppState;
  } catch {
    return { ...defaultState };
  }
}

export function writeState(partial: Partial<AppState>): AppState {
  const next = { ...readState(), ...partial };
  fs.writeFileSync(statePath(), JSON.stringify(next, null, 2), "utf-8");
  return next;
}
