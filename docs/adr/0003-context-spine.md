# ADR-0003: Context spine (pacchetto macro + task)

## Stato

Accettato

## Contesto

Nei flussi conversazionali o agentici il **dettaglio corrente** tende a monopolizzare l’attenzione del modello; il **disegno complessivo** (decisioni già accettate, vincoli, obiettivo della sessione) si indebolisce se non reiniettato esplicitamente. HiveDev deve mitigare ciò a livello di **ogni invocazione runner**, non solo nella UI.

## Decisione

1. **Context spine**: per ogni passo di catena HiveDev assembla un input strutturato in due blocchi logici:
   - **Blocco A — Macro (obbligatorio)**: sintesi del disegno d’insieme rilevante per il passo (estratti o riferimenti ad ADR `accepted`, obiettivo della catena o della sessione, **non-negotiables** espliciti, scope di file o moduli toccabili se definito).
   - **Blocco B — Task (variabile)**: il compito fine del passo (bug, feature atomica, file mirati, domanda di review).
2. **Ordine di presentazione**: il blocco macro **precede** sempre il blocco task nel payload effettivo verso il runner (testo concatenato, file temporaneo, o schema JSON concordato per quel runner).
3. **Ruoli**: i template possono differenziare enfasi per `executor` (scope e modifiche ammesse) vs `reviewer` (coerenza con ADR e architettura accettata) senza omettere il blocco macro.
4. **Aggiornamento**: quando cambiano ADR `accepted` pertinenti al progetto, la macro della spine deve essere **ricalcolata** o invalidata per i run successivi (nessuna cache silenziosa che serva decisioni obsolete).

## Conseguenze

- La UI e i log devono poter mostrare **cosa** è stato inviato come macro (anche in forma ridotta per privacy) per debug e fiducia.
- I runner che non supportano payload strutturato ricevono comunque una **unica stringa** o file con sezioni delimitate convenzionalmente (`### MACRO` / `### TASK` o equivalente documentato).
- Questa decisione non riguarda la sicurezza “prompt injection” avversaria; riguarda **governance del contesto** fornito agli agenti.
