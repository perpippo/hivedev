# HiveDev

Orchestratore di sviluppo ancorato a un **repository deputato**, con **ADR** come gate di coerenza, **catene di runner** CLI, **context spine** (macro + task), sottosistema **Hive** (personas nei runner) e **graph projection** per le viste.

- Istruzioni per gli agenti: [`AGENTS.md`](AGENTS.md)
- Decisioni architetturali: [`docs/adr/README.md`](docs/adr/README.md)

## Avvio sviluppo (UI + API locale)

Requisiti: **Node.js ≥ 20**.

```bash
npm install
npm run dev
```

Il client Vite attende che l’API risponda su `/api/health` (evita errori proxy `ECONNREFUSED` all’avvio).

- UI: [http://127.0.0.1:5173](http://127.0.0.1:5173) (proxy verso API)
- API: `http://127.0.0.1:8787` (override con `HIVEDEV_API_PORT`)

Imposta in UI il **path assoluto** del repository da orchestrare (può essere questo stesso repo per prova). Stato e audit persistono in `~/.hivedev/` (vedi ADR-0007).

### Configurazione opzionale nel repo orchestrato

- `hivedev.config.json` — array `runners` (`id`, `command`, `role`, `timeoutMs`). Variabili d’ambiente per ogni passo: `HIVEDEV_SPINE_FILE`, `HIVEDEV_TASK`, `HIVEDEV_RUN_ID`, `HIVEDEV_STEP_INDEX`.
- `hivedev.architecture.json` — grafo moduli per la vista architettura (`modules[].id`, `label`, `dependsOn`).

```bash
npm run build   # solo client statico in dist/
npm run typecheck
```
