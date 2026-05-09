# ADR-0002: Contratto runner e catene HiveDev

## Stato

Accettato

## Contesto

HiveDev invoca strumenti esterni (CLI o wrapper) per esecuzione e revisione. Senza un contratto stabile, ogni integrazione diventa ad hoc e l’audit perde significato. Serve separare **orchestrazione a livello HiveDev** (catene tra runner) da **composizione interna** al singolo runner (vedi ADR-0004).

## Decisione

1. **Runner**: un runner è un processo invocabile (es. binario CLI) identificato da nome, comando base, e policy (timeout, working directory).
2. **Working directory**: la working directory di ogni invocazione runner è la **root del repository deputato** (ADR-0001), salvo override documentato per runner specifici in configurazione progetto.
3. **Ingresso minimo**: HiveDev passa al runner (a) il **pacchetto context spine** definito in ADR-0003, (b) argomenti o payload specifici del passo di catena, (c) metadati di run (id run, id passo, ruolo: `executor` | `reviewer` | altro profilo).
4. **Uscita minima**: il runner deve terminare con **codice di uscita** processabile (`0` successo convenzionale; non-zero = fallimento o rifiuto esplicito). Output testuale su stdout/stderr è catturato e associato al passo in **audit log** (timestamp, repo snapshot o commit hash se disponibile, id runner, esito).
5. **Catene**: HiveDev orchestra **sequenze o grafi semplici** di runner (es. Esecutore → Revisore). Il revisore legge lo **stesso tree** del repo dopo (o incluso) l’esito dell’esecutor, senza assumere stato parallelo non versionato.
6. **Black box**: HiveDev non richiede di controllare le chiamate interne del runner verso API di terzi, purché siano rispettati vincoli di sicurezza e segreti definiti a livello progetto.

## Conseguenze

- Ogni nuova integrazione CLI richiede documentazione del contratto (env vars, flag, formato opzionale JSON) accanto alla configurazione.
- L’audit è la prova ricostruibile di cosa è stato eseguito e con quale esito.
- I runner possono evolvere internamente (es. Hive, ADR-0004) senza cambiare la superficie verso HiveDev, se l’ingresso/uscita restano conformi.
