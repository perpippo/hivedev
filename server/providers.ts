import type { RunnerProfile } from "./runners.js";

/** CLI predefiniti: devono essere nel PATH. Il prompt è il file spine (MACRO+TASK) via HIVEDEV_SPINE_FILE. */
export const PROVIDER_KEYS = ["claude-code", "codex", "gemini-cli", "cursor"] as const;
export type ProviderKey = (typeof PROVIDER_KEYS)[number];

export function isProviderKey(s: string): s is ProviderKey {
  return (PROVIDER_KEYS as readonly string[]).includes(s);
}

type ProviderSpec = {
  key: ProviderKey;
  label: string;
  /** Comando eseguito in shell nel repo; legge il file in $HIVEDEV_SPINE_FILE */
  command: string;
  timeoutMs: number;
  hint: string;
};

const PROVIDERS: ProviderSpec[] = [
  {
    key: "claude-code",
    label: "Claude Code",
    command: 'claude --bare -p "$(cat "$HIVEDEV_SPINE_FILE")"',
    timeoutMs: 900_000,
    hint: "Richiede `claude` installato (PATH). Modalità headless `-p`.",
  },
  {
    key: "codex",
    label: "OpenAI Codex",
    command: 'codex exec "$(cat "$HIVEDEV_SPINE_FILE")"',
    timeoutMs: 900_000,
    hint: "Richiede `codex` nel PATH (`npm i -g @openai/codex` o equivalente).",
  },
  {
    key: "gemini-cli",
    label: "Gemini CLI",
    command: 'gemini -p "$(cat "$HIVEDEV_SPINE_FILE")"',
    timeoutMs: 900_000,
    hint: "Richiede `gemini` nel PATH (es. `@google/gemini-cli`).",
  },
  {
    key: "cursor",
    label: "Cursor (agent CLI)",
    command: 'agent -p "$(cat "$HIVEDEV_SPINE_FILE")"',
    timeoutMs: 900_000,
    hint: "Richiede la CLI `agent` di Cursor installata e autenticata.",
  },
];

export function listProviders(): Omit<ProviderSpec, "command">[] {
  return PROVIDERS.map(({ command: _command, ...rest }) => rest);
}

export function providerToRunner(key: ProviderKey): RunnerProfile {
  const p = PROVIDERS.find((x) => x.key === key);
  if (!p) throw new Error(`Provider sconosciuto: ${key}`);
  return {
    id: `provider:${p.key}`,
    command: p.command,
    role: "executor",
    timeoutMs: p.timeoutMs,
  };
}
