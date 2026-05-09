# ADR-0007: Stack applicazione HiveDev v1

## Stato

Accettato

## Contesto

HiveDev deve eseguire **processi esterni** (runner CLI) con **stream** di output e mantenere **stato locale** (progetto, catene, log audit). Un’app solo browser senza backend non può spawnare processi arbitrari sul filesystem dell’utente con le API standard.

## Decisione

Per la **v1** si adotta:

1. **Frontend**: [Vite](https://vitejs.dev/) + [React](https://react.dev/) + **TypeScript**, UI reattiva e leggera.
2. **Backend locale**: processo **Node.js** (runtime ≥ 20) con **[Hono](https://hono.dev/)** su porta dedicata (default `8787`), avviato in parallelo al dev server Vite o come unico entry in produzione con static file serviti da Hono.
3. **Subprocess**: API server che usa `child_process.spawn` con `cwd` = repository deputato (ADR-0002), streaming su **Server-Sent Events (SSE)** verso il client.
4. **Persistenza locale v1**: file JSON sotto la directory di configurazione utente (`~/.hivedev/` su Unix, `%USERPROFILE%\.hivedev\` su Windows) per `state.json` (ultimo repo, runner overrides) e `audit.jsonl` (append-only per run).
5. **Grafi Fase 2**: [@xyflow/react](https://reactflow.dev/) (React Flow) per visualizzare il grafo prodotto dalla projection; nessun editor topologico in v1.

**Non scelti per v1**: Tauri/Electron (valutabili in ADR futuro se serve packaging desktop unificato senza terminale).

## Conseguenze

- L’utente avvia `npm run dev` (o script documentato) per avere API + UI insieme.
- La sicurezza dei comandi runner resta responsabilità dell’utente e della configurazione; il server non espone su rete pubblica in v1 (bind `127.0.0.1`).
