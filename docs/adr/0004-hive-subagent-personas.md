# ADR-0004: Hive — sub-agent e personas per runner

## Stato

Accettato

## Contesto

Il nome **HiveDev** include **Hive**: la capacità, lato integrazione runner, di **scomporre** un lavoro in più passaggi interni con **personas** (ruoli cognitivi distinti: esplorazione, stesura ADR, implementazione, verifica) adatti a **fasi** diverse della stessa richiesta. Senza questa distinzione nominale, si confonde la composizione interna della CLI con la catena esterna HiveDev.

## Decisione

1. **Lessico**: **HiveDev** è il prodotto orchestratore. **Hive** è il **sottosistema concettuale** che descrive l’uso di **sub-agent / personas** all’interno di un singolo **runner**, orchestrati dalla CLI stessa (o dal suo runtime), non da N API separate verso HiveDev.
2. **Responsabilità**: la CLI/runner decide **quante** personas, **in che ordine**, e con quali prompt; HiveDev fornisce la **context spine** (ADR-0003) una volta per invocazione (o secondo policy di re-invio definita in configurazione).
3. **Contratto esterno invariato**: verso HiveDev ogni invocazione resta **un’unità** con ingresso/uscita come in ADR-0002; lo Hive non moltiplica i nodi della catena HiveDev salvo configurazione esplicita di **sub-passi** tracciati (opzionale, futuro).
4. **Audit opzionale**: se il runner espone eventi strutturati (es. JSON line per persona: `persona_id`, `phase`, `summary`), HiveDev li allega all’audit del passo. Se non esposti, si registra solo l’aggregato.
5. **Profilo progetto**: per ogni runner registrato può esistere documentazione o configurazione che elenca **fasi Hive** previste (per operatori umani e per tuning parametri), senza obbligare HiveDev a interpretarle semanticamente nella v1.

## Conseguenze

- Le integrazioni “ricche” (es. agenti multi-fase) restano compatibili con un **unico** slot nella catena.
- La documentazione utente deve usare **Hive** solo in senso HiveDev, per evitare ambiguità con usi generici del termine nel settore.
- Eventuali UI che visualizzano “sciame interno” dipendono dalla cooperazione del runner.
