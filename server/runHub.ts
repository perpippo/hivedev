export type RunEvent =
  | { type: "step_start"; index: number; command: string; role: string }
  | { type: "stdout"; index: number; line: string }
  | { type: "stderr"; index: number; line: string }
  | { type: "step_end"; index: number; exitCode: number | null; durationMs: number }
  | { type: "run_end"; ok: boolean; error?: string };

type Subscriber = (ev: RunEvent) => void;

const buffers = new Map<string, RunEvent[]>();
const subs = new Map<string, Set<Subscriber>>();

const MAX_BUFFER = 500;

export function subscribeRun(runId: string, fn: Subscriber): () => void {
  let set = subs.get(runId);
  if (!set) {
    set = new Set();
    subs.set(runId, set);
  }
  set.add(fn);
  const buf = buffers.get(runId);
  if (buf) {
    for (const ev of buf) fn(ev);
    buffers.delete(runId);
  }
  return () => {
    set!.delete(fn);
    if (set!.size === 0) subs.delete(runId);
  };
}

export function publishRun(runId: string, ev: RunEvent) {
  const set = subs.get(runId);
  if (set && set.size > 0) {
    for (const fn of set) fn(ev);
    return;
  }
  let buf = buffers.get(runId);
  if (!buf) {
    buf = [];
    buffers.set(runId, buf);
  }
  buf.push(ev);
  if (buf.length > MAX_BUFFER) buf.splice(0, buf.length - MAX_BUFFER);
}

export type RunRequestBody =
  | {
      mode: "quick";
      repoRoot: string;
      task: string;
      spineContent: string;
      providerKey: string;
    }
  | {
      mode: "chain";
      repoRoot: string;
      task: string;
      spineContent: string;
      stepRunnerIds: string[];
    };
