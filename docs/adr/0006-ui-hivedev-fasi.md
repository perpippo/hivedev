# ADR-0006: UI HiveDev — fasi e fuori-scope

## Stato

Accettato

## Contesto

Serve una roadmap esplicita per l’interfaccia HiveDev così le implementazioni restano allineate agli ADR 0001–0005 senza diluire il valore in un dashboard prematuro.

## Decisione

### Fase 1 — MVP (collegare i fili)

Obiettivo: flusso end-to-end **repo deputato → catena runner → esecuzione con stream → audit → anteprima context spine**.

In scope:

1. Registrazione **path repository** con validazione minima (`.git`, cartella `docs/adr/` attesa salvo override documentato).
2. **Catalogo runner** configurabile (file di progetto o default applicativo).
3. **Builder catena lineare** (ordine Esecutore → Revisore o equivalente), avvio run, stream **stdout/stderr** e codice uscita.
4. **Pannello audit** per run (id, timestamp, hash commit se disponibile, esito per passo).
5. **Anteprima context spine** prima/durante invio: blocco **Macro** (sintesi da ADR accettati nel repo) e blocco **Task** (input utente).

Fuori scope Fase 1:

- Grafo moduli architettura; editor grafi; UI per eventi Hive per-persona (ADR-0004 resta black box).

### Fase 2 — Grafi

Dopo run/audit stabili:

1. **Projection** lato applicazione: parsing ADR → modello grafo minimo (`adr` + archi dichiarati o dedotti con legenda).
2. **Vista requisiti/ADR** (tab o modalità dedicata), senza mescolare layer “modulo codice” senza manifest.
3. **Vista architettura** quando esiste manifest dichiarato (es. `hivedev.architecture.json`); archi derivati etichettati.

### Fase 3 — Rifinitura

- UX run: annulla, timeout visibile, retry passo.
- Eventi Hive opzionali se esposti dal runner.
- Template UI per ruolo (enfasi revisore vs esecutore) senza mutare ADR-0003.

## Conseguenze

- L’implementazione tecnologica della shell UI è descritta in **ADR-0007** (stack v1).
- Feature UI non elencate in questa fase richiedono ADR o emendamento di questo documento prima del gate implementazione (ADR-0001).
