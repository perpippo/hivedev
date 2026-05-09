# ADR-0001: Repository deputato e gate ADR

## Stato

Accettato

## Contesto

HiveDev orchestra sviluppo e validazione ancorati a un progetto reale. Le sessioni con modelli o CLI sono episodiche: la memoria di sistema deve risiedere in artefatti versionati. Senza un vincolo esplicito, implementazione e decisioni architetturali divergono e non sono verificabili a posteriori.

## Decisione

1. **Repository deputato**: ogni progetto gestito da HiveDev è associato a **una cartella root di repository Git** (locale o clone) che è l’unica **fonte di verità** per codice, documentazione di prodotto e ADR.
2. **Percorso ADR**: gli ADR vivono sotto `docs/adr/` (path relativo alla root del repo deputato), salvo diverso ADR successivo che documenti una migrazione.
3. **Stati ADR** (campo obbligatorio in ogni file, es. frontmatter `status` o sezione iniziale): `draft` | `proposed` | `accepted` | `superseded` | `deprecated`.
4. **Gate di implementazione**: un intervento classificato come **implementazione** (modifica funzionale a codice o configurazione runtime del prodotto in esame) **non è considerato conforme** al processo HiveDev se non esiste almeno un ADR in stato **`accepted`** che copre esplicitamente la decisione o il vincolo architetturale pertinente, oppure se l’intervento contraddice un ADR `accepted` attivo.
5. **Eccezioni**: interventi puramente meccanici (formattazione, typo in commenti, aggiornamento dipendenze senza cambio semantico documentato altrove) possono essere esenti se il team definisce in questo repo una checklist esplicita in `docs/adr/exceptions.md` (da creare quando servirà); fino a quel momento le eccezioni richiedono comunque tracciamento in audit (ADR-0002).

## Conseguenze

- HiveDev deve sempre operare con un **path di repo** configurato e validato (presenza `.git` consigliata, ADR path atteso).
- Il prodotto in esame e HiveDev (strumento) possono coincidere o meno; il **repo deputato** è sempre quello del progetto sotto orchestrazione.
- Nuove idee o requisiti devono essere mappati su ADR esistenti o dare origine a nuovi ADR prima di implementazione sostanziale.
