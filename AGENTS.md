# Istruzioni per l’Agent (HiveDev)

Questo repository è il progetto **HiveDev**: orchestratore di sviluppo ancorato a un **repository deputato**, decisioni in **ADR**, catene di **runner** CLI, **context spine** (macro + task), sottosistema **Hive** (personas interne ai runner) e **graph projection** per le viste.

## Fonte di verità

- **Architettura e processo**: leggere e rispettare gli ADR in `docs/adr/`. Indice: `docs/adr/README.md`.
- **Prima di implementare** funzionalità o cambi strutturali: verificare **ADR-0001** (gate implementazione) e gli altri ADR pertinenti; se serve una nuova decisione, **proporre o redigere un ADR** (stato `draft` / `proposed`) invece di aggirare il processo.
- **Non duplicare** nei file di codice lunghe spiegazioni già presenti negli ADR: rimanda con link o nome ADR.

## Lessico (obbligatorio)

- **HiveDev** = prodotto (questo orchestratore / tooling).
- **Hive** = sottosistema concettuale: sub-agent / **personas** *dentro* un singolo runner CLI, non la catena esterna tra CLI diverse.

## Convenzioni di lavoro

- **Scope**: modifiche mirate al task; niente refactor non richiesti.
- **ADR**: nuovi file `docs/adr/NNNN-titolo-kebab.md`; aggiornare la tabella in `docs/adr/README.md`.
- **Runner / integrazioni**: allinearsi a **ADR-0002** (contratto, cwd repo, audit); composizione prompt a **ADR-0003** (spine); grafi e UI a **ADR-0005**.
- **UI applicativa**: fasi e fuori-scope in **ADR-0006**; stack (Vite + React + Hono + SSE) in **ADR-0007**.

## Lingua

- Documentazione di prodotto in questo repo (ADR, AGENTS): **italiano**, salvo ADR che fissino esplicitamente una lingua diversa per integrazione esterna.
