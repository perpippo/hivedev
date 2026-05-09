import fs from "node:fs";
import path from "node:path";

/** Estrae titolo da prima riga `# ADR-...` e stato da sezione ## Stato */
function parseAdrFile(content: string): { title: string; status: string } {
  const lines = content.split(/\r?\n/);
  let title = "ADR";
  const h = lines.find((l) => l.startsWith("# "));
  if (h) title = h.replace(/^#\s+/, "").trim();
  let status = "";
  let inStato = false;
  for (const line of lines) {
    if (/^##\s+Stato\s*$/i.test(line.trim())) {
      inStato = true;
      continue;
    }
    if (inStato) {
      if (line.startsWith("##")) break;
      const t = line.trim();
      if (t) {
        status = t;
        break;
      }
    }
  }
  return { title, status };
}

function isAcceptedStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes("accettato") || s.includes("accepted");
}

export function buildMacroFromAdrDir(adrDir: string | null): string {
  if (!adrDir || !fs.existsSync(adrDir)) {
    return "(Nessun ADR indicizzato: cartella `docs/adr/` assente o non leggibile.)";
  }
  const files = fs
    .readdirSync(adrDir)
    .filter((f) => /^\d{4}-.*\.md$/i.test(f) && f.toLowerCase() !== "readme.md")
    .sort();
  const bullets: string[] = [];
  for (const f of files) {
    const full = path.join(adrDir, f);
    const content = fs.readFileSync(full, "utf-8");
    const { title, status } = parseAdrFile(content);
    if (isAcceptedStatus(status)) {
      bullets.push(`- **${title}** (${f}) — _${status}_`);
    }
  }
  if (bullets.length === 0) {
    return "(Nessun ADR in stato Accettato trovato nei file `docs/adr/`.)";
  }
  return ["## ADR accettati (sintesi HiveDev)", "", ...bullets].join("\n");
}

export function composeSpineFile(macro: string, task: string): string {
  return ["### MACRO", "", macro.trim(), "", "### TASK", "", (task || "(task vuoto)").trim(), ""].join("\n");
}
