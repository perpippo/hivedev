import { ReactFlowProvider } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdrGraphView } from "./AdrGraphView.js";
import { ModuleGraphView } from "./ModuleGraphView.js";

type Tab = "workspace" | "graphs" | "audit";

type RepoValidation = {
  ok: boolean;
  errors: string[];
  adrDir: string | null;
};

type RunnerProfile = {
  id: string;
  command: string;
  role: string;
  timeoutMs: number;
};

type ProviderInfo = {
  key: string;
  label: string;
  hint: string;
  timeoutMs: number;
};

type AuditRun = {
  runId: string;
  repoRoot: string;
  startedAt: string;
  finishedAt?: string;
  commit?: string | null;
  ok: boolean;
  steps: { index: number; command: string; role: string; exitCode: number | null; durationMs: number }[];
};

export default function App() {
  const [tab, setTab] = useState<Tab>("workspace");
  const [repo, setRepo] = useState("");
  const [task, setTask] = useState("Esegui verifica di esempio sulla catena runner.");
  const [validation, setValidation] = useState<RepoValidation | null>(null);
  const [runners, setRunners] = useState<RunnerProfile[]>([]);
  const [inChain, setInChain] = useState<Record<string, boolean>>({});
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [providerKey, setProviderKey] = useState("claude-code");
  const [useCustomChain, setUseCustomChain] = useState(false);
  const [spinePreview, setSpinePreview] = useState<{ macro: string; full: string } | null>(null);
  const [log, setLog] = useState("");
  const [running, setRunning] = useState(false);
  const [audits, setAudits] = useState<AuditRun[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/state");
      const j = (await r.json()) as { lastRepoRoot: string | null };
      if (j.lastRepoRoot) setRepo(j.lastRepoRoot);
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/providers");
      const j = (await r.json()) as { providers: ProviderInfo[] };
      setProviders(j.providers);
    })();
  }, []);

  const validate = useCallback(async () => {
    const r = await fetch(`/api/repo/validate?path=${encodeURIComponent(repo)}`);
    const v = (await r.json()) as RepoValidation;
    setValidation(v);
  }, [repo]);

  const saveRepo = useCallback(async () => {
    const r = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastRepoRoot: repo || null }),
    });
    if (!r.ok) {
      const e = (await r.json()) as { error?: string };
      alert(e.error ?? "Errore salvataggio");
      return;
    }
    await validate();
  }, [repo, validate]);

  const loadRunners = useCallback(async () => {
    if (!repo.trim()) {
      setRunners([]);
      return;
    }
    const r = await fetch(`/api/runners?repo=${encodeURIComponent(repo)}`);
    const j = (await r.json()) as { runners: RunnerProfile[] };
    setRunners(j.runners);
    setInChain((prev) => {
      const next: Record<string, boolean> = {};
      for (const x of j.runners) {
        next[x.id] = prev[x.id] ?? true;
      }
      return next;
    });
  }, [repo]);

  const refreshSpine = useCallback(async () => {
    if (!repo.trim()) {
      setSpinePreview(null);
      return;
    }
    const r = await fetch(
      `/api/spine/preview?repo=${encodeURIComponent(repo)}&task=${encodeURIComponent(task)}`,
    );
    const j = (await r.json()) as { macro: string; full: string };
    setSpinePreview({ macro: j.macro, full: j.full });
  }, [repo, task]);

  useEffect(() => {
    void validate();
  }, [validate]);

  useEffect(() => {
    void loadRunners();
  }, [loadRunners]);

  useEffect(() => {
    const t = setTimeout(() => void refreshSpine(), 300);
    return () => clearTimeout(t);
  }, [refreshSpine]);

  const stepRunnerIds = useMemo(() => runners.filter((r) => inChain[r.id]).map((r) => r.id), [runners, inChain]);

  const loadAudit = useCallback(async () => {
    const r = await fetch("/api/audit");
    const j = (await r.json()) as { runs: AuditRun[] };
    setAudits(j.runs);
  }, []);

  useEffect(() => {
    if (tab === "audit") void loadAudit();
  }, [tab, loadAudit]);

  const runChain = useCallback(async () => {
    if (!repo.trim()) return;
    if (useCustomChain && stepRunnerIds.length === 0) return;
    esRef.current?.close();
    setRunning(true);
    setLog("");
    await refreshSpine();
    const spRes = await fetch(
      `/api/spine/preview?repo=${encodeURIComponent(repo)}&task=${encodeURIComponent(task)}`,
    );
    const sj = (await spRes.json()) as { full: string };
    const payload = useCustomChain
      ? {
          mode: "chain" as const,
          repoRoot: repo,
          task,
          spineContent: sj.full,
          stepRunnerIds,
        }
      : {
          mode: "quick" as const,
          repoRoot: repo,
          task,
          spineContent: sj.full,
          providerKey,
        };
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      setLog(`Errore: ${err.error ?? res.statusText}`);
      setRunning(false);
      return;
    }
    const { runId } = (await res.json()) as { runId: string };
    const es = new EventSource(`/api/run/${runId}/stream`);
    esRef.current = es;
    es.addEventListener("message", (ev) => {
      try {
        const data = JSON.parse(ev.data) as Record<string, unknown>;
        if (data.type === "connected") return;
        setLog((prev) => prev + JSON.stringify(data) + "\n");
        if (data.type === "run_end") {
          setRunning(false);
          es.close();
          esRef.current = null;
          void loadAudit();
        }
      } catch {
        setLog((prev) => prev + String(ev.data) + "\n");
      }
    });
    es.onerror = () => {
      es.close();
      esRef.current = null;
      setRunning(false);
    };
  }, [repo, task, stepRunnerIds, refreshSpine, loadAudit, useCustomChain, providerKey]);

  return (
    <ReactFlowProvider>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "1rem 1.25rem 2rem" }}>
        <header style={{ marginBottom: "1rem" }}>
          <h1>HiveDev</h1>
          <p className="muted" style={{ margin: 0 }}>
            Repo deputato, CLI predefinite (Claude / Codex / Gemini / Cursor) o catena da file, stream, audit, spine; grafi ADR.
          </p>
        </header>

        <div className="tabs">
          <button type="button" className={tab === "workspace" ? "active" : ""} onClick={() => setTab("workspace")}>
            Progetto e run
          </button>
          <button type="button" className={tab === "graphs" ? "active" : ""} onClick={() => setTab("graphs")}>
            Grafi
          </button>
          <button type="button" className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")}>
            Audit
          </button>
        </div>

        {tab === "workspace" ? (
          <>
            <section>
              <h2>Repository deputato</h2>
              <label htmlFor="repo">Path assoluto repository</label>
              <input
                id="repo"
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="/percorso/al/tuo/repo"
              />
              <div style={{ marginTop: "0.6rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" className="secondary" onClick={() => void validate()}>
                  Valida
                </button>
                <button type="button" onClick={() => void saveRepo()}>
                  Salva preferenza
                </button>
              </div>
              {validation ? (
                <div style={{ marginTop: "0.6rem" }}>
                  <div className={validation.ok ? "muted" : "warn"}>
                    {validation.ok ? "OK" : "Problemi"} —{" "}
                    {validation.errors.length ? validation.errors.join(" · ") : "nessun avviso bloccante"}
                  </div>
                </div>
              ) : null}
            </section>

            <section>
              <h2>Task (blocco TASK della context spine)</h2>
              <label htmlFor="task">Descrizione compito per i runner</label>
              <textarea id="task" value={task} onChange={(e) => setTask(e.target.value)} />
            </section>

            <section>
              <h2>Anteprima context spine</h2>
              <p className="muted">Macro da ADR accettati + task (ADR-0003). Variabile d&apos;ambiente per i runner: HIVEDEV_SPINE_FILE.</p>
              <button type="button" className="secondary" onClick={() => void refreshSpine()}>
                Aggiorna anteprima
              </button>
              {spinePreview ? (
                <div style={{ marginTop: "0.6rem" }}>
                  <h3 style={{ fontSize: "0.95rem" }}>Macro</h3>
                  <pre className="log" style={{ maxHeight: 160 }}>
                    {spinePreview.macro}
                  </pre>
                  <h3 style={{ fontSize: "0.95rem" }}>File spine completo</h3>
                  <pre className="log" style={{ maxHeight: 200 }}>
                    {spinePreview.full}
                  </pre>
                </div>
              ) : (
                <p className="muted">Imposta un repository valido.</p>
              )}
            </section>

            <section>
              <h2>Strumento CLI</h2>
              <p className="muted">
                Un solo passo: il prompt inviato allo strumento è il <strong>file spine</strong> (macro ADR + task), via
                sostituzione shell su <code>$HIVEDEV_SPINE_FILE</code>.
              </p>
              <label htmlFor="provider">Scegli CLI</label>
              <select
                id="provider"
                value={providerKey}
                disabled={useCustomChain}
                onChange={(e) => setProviderKey(e.target.value)}
                style={{ width: "100%", maxWidth: 420, padding: "0.5rem", font: "inherit", borderRadius: 6 }}
              >
                {providers.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
              {providers.find((p) => p.key === providerKey) ? (
                <p className="muted" style={{ marginTop: "0.35rem" }}>
                  {providers.find((p) => p.key === providerKey)!.hint}
                </p>
              ) : null}

              <label style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={useCustomChain}
                  onChange={(e) => setUseCustomChain(e.target.checked)}
                />
                <span>
                  Usa invece la <strong>catena</strong> da <code>hivedev.config.json</code> (avanzato)
                </span>
              </label>

              {useCustomChain ? (
                <>
                  <p className="muted" style={{ marginTop: "0.5rem" }}>
                    Ordine = ordine nel file, filtrato dai checkbox.
                  </p>
                  {runners.length === 0 ? (
                    <p className="muted">Nessun runner — verifica il path del repository.</p>
                  ) : (
                    <div className="runner-list">
                      {runners.map((r) => (
                        <label key={r.id}>
                          <input
                            type="checkbox"
                            checked={!!inChain[r.id]}
                            onChange={() =>
                              setInChain((prev) => ({
                                ...prev,
                                [r.id]: !prev[r.id],
                              }))
                            }
                          />
                          <span>
                            <strong>{r.id}</strong> ({r.role}) — <code>{r.command}</code>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  <p className="muted">Passi attivi: {stepRunnerIds.join(" → ") || "(nessuno)"}</p>
                </>
              ) : null}

              <button
                type="button"
                disabled={
                  running ||
                  !repo.trim() ||
                  (useCustomChain && stepRunnerIds.length === 0)
                }
                onClick={() => void runChain()}
                style={{ marginTop: "0.65rem" }}
              >
                {running ? "Run in corso…" : useCustomChain ? "Avvia catena" : "Avvia con CLI selezionata"}
              </button>
              <h3 style={{ fontSize: "0.95rem", marginTop: "0.75rem" }}>Stream eventi</h3>
              <pre className="log">{log || "(nessun output)"}</pre>
            </section>
          </>
        ) : null}

        {tab === "graphs" ? (
          <>
            <section>
              <h2>Grafo ADR</h2>
              <AdrGraphView repo={repo} />
            </section>
            <section>
              <h2>Architettura moduli</h2>
              <ModuleGraphView repo={repo} />
            </section>
          </>
        ) : null}

        {tab === "audit" ? (
          <section>
            <h2>Ultime esecuzioni</h2>
            <button type="button" className="secondary" onClick={() => void loadAudit()} style={{ marginBottom: "0.5rem" }}>
              Ricarica
            </button>
            {audits.length === 0 ? (
              <p className="muted">Nessun run registrato ancora.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "0.35rem" }}>Quando</th>
                    <th style={{ padding: "0.35rem" }}>OK</th>
                    <th style={{ padding: "0.35rem" }}>Commit</th>
                    <th style={{ padding: "0.35rem" }}>Passi</th>
                  </tr>
                </thead>
                <tbody>
                  {[...audits].reverse().map((a) => (
                    <tr key={a.runId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.35rem", verticalAlign: "top" }}>{a.startedAt}</td>
                      <td style={{ padding: "0.35rem" }}>{a.ok ? "sì" : "no"}</td>
                      <td style={{ padding: "0.35rem", fontFamily: "monospace" }}>{a.commit ?? "—"}</td>
                      <td style={{ padding: "0.35rem", fontFamily: "monospace", fontSize: "0.78rem" }}>
                        {a.steps.map((s) => `${s.index}:${s.exitCode}`).join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ) : null}
      </div>
    </ReactFlowProvider>
  );
}
