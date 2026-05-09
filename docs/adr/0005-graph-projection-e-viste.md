# ADR-0005: Graph projection e viste

## Stato

Accettato

## Contesto

HiveDev deve supportare comprensione **visiva** dell’architettura e dello stato di avanzamento. Mescolare in un’unica tela senza regole grafi di natura diversa (dipendenze di codice, relazioni tra ADR, dipendenze tra requisiti) produce confusione. Serve un modulo che **proietta** dati del repo in un **modello grafo** consumabile dalla UI.

## Decisione

1. **Graph projection**: componente logico che legge il repo deputato (e opzionalmente esiti audit/runner) e produce un **snapshot di grafo** (formato interno: es. lista nodi/archi tipizzati) **separato** dal rendering grafico.
2. **Tipi di nodo (iniziale)**: almeno `adr`, `requirement` (o epic), `module` (componente architetturale). Ogni nodo ha `id` stabile, `label`, `type`, attributi di **stato** quando applicabile (derivati da frontmatter, convenzioni file, o manifest).
3. **Tipi di arco (iniziale)**: almeno `depends_on`, `supersedes`, `implements`, `relates_to` (semantica documentata nella proiezione o in manifest curato).
4. **Due viste UI** (non obbligatoriamente due schermate fisiche, ma **layer o modalità** distinte):
   - **Vista architettura**: primariamente nodi `module` e dipendenze tecniche (da manifest dichiarato e/o analisi statica quando disponibile).
   - **Vista requisiti / delivery**: nodi `adr` / `requirement` e archi di dipendenza o successione; stato di sviluppo evidenziato con codifica visiva coerente.
5. **Provenienza arco**: la UI o la legenda deve indicare se l’arco è **dichiarato** (es. frontmatter) o **derivato** (es. import), per evitare interpretazioni errate.
6. **Metriche di complessità**: opzionalmente calcolate sulla proiezione (es. grado uscente, lunghezza cammino verso nodi foglia) e mostrate come etichette o pannello, non come unica verità assoluta.

## Conseguenze

- La scelta della libreria di rendering (React Flow, Cytoscape, D3, ecc.) è **implementazione** successiva a questo ADR.
- Nuove convenzioni nel repo (es. `architecture.yaml`) richiedono estensione della proiezione e documentazione del mapping.
- Lo stato “vivo” dopo una catena runner si aggiorna se le convenzioni collegano audit o file a nodi del grafo.
