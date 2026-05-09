import fs from "node:fs";
import path from "node:path";

export type GraphNode = {
  id: string;
  type: "adr";
  label: string;
  status: string;
  sourceFile: string;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  kind: "declared_link" | "supersedes_hint";
  label?: string;
};

function parseAdrBasics(content: string, filename: string): {
  id: string;
  label: string;
  status: string;
} {
  const idMatch = filename.match(/^(\d{4})-/);
  const id = idMatch ? idMatch[1] : filename.replace(/\.md$/i, "");
  const lines = content.split(/\r?\n/);
  let label = filename;
  const h = lines.find((l) => l.startsWith("# "));
  if (h) label = h.replace(/^#\s+/, "").trim();
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
  return { id, label, status };
}

/** Link testuali tipo ADR-0002 o (0002-...) nel corpo → arco verso nodo 0002 */
function extractAdrLinks(body: string, fromId: string): { target: string; label?: string }[] {
  const out: { target: string; label?: string }[] = [];
  const re = /\bADR-(\d{4})\b/gi;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = re.exec(body)) !== null) {
    const target = m[1];
    if (target === fromId || seen.has(target)) continue;
    seen.add(target);
    out.push({ target, label: "ref" });
  }
  return out;
}

export function projectAdrGraph(adrDir: string | null): { nodes: GraphNode[]; edges: GraphEdge[] } {
  if (!adrDir || !fs.existsSync(adrDir)) return { nodes: [], edges: [] };
  const files = fs
    .readdirSync(adrDir)
    .filter((f) => /^\d{4}-.*\.md$/i.test(f))
    .sort();
  const nodes: GraphNode[] = [];
  for (const f of files) {
    const full = path.join(adrDir, f);
    const content = fs.readFileSync(full, "utf-8");
    const { id, label, status } = parseAdrBasics(content, f);
    nodes.push({ id, type: "adr", label, status, sourceFile: f });
  }
  const idSet = new Set(nodes.map((n) => n.id));
  const edges: GraphEdge[] = [];
  let ei = 0;
  for (const n of nodes) {
    const full = path.join(adrDir, n.sourceFile);
    const body = fs.readFileSync(full, "utf-8");
    for (const { target } of extractAdrLinks(body, n.id)) {
      if (!idSet.has(target)) continue;
      edges.push({
        id: `e-${ei++}`,
        source: n.id,
        target,
        kind: "declared_link",
        label: "menziona",
      });
    }
    if (/superseded|sostituit/i.test(n.status)) {
      /* hint only — senza target affidabile */
    }
  }
  return { nodes, edges };
}

export type ModuleNode = {
  id: string;
  label: string;
};

export type ModuleEdge = { id: string; source: string; target: string; kind: "depends_on" };

export function projectArchitectureGraph(repoRoot: string): {
  nodes: ModuleNode[];
  edges: ModuleEdge[];
} {
  const manifest = path.join(repoRoot, "hivedev.architecture.json");
  if (!fs.existsSync(manifest)) return { nodes: [], edges: [] };
  try {
    const j = JSON.parse(fs.readFileSync(manifest, "utf-8")) as {
      modules?: { id: string; label: string; dependsOn?: string[] }[];
    };
    const modules = j.modules ?? [];
    const nodes: ModuleNode[] = modules.map((m) => ({ id: m.id, label: m.label }));
    const edges: ModuleEdge[] = [];
    let i = 0;
    for (const m of modules) {
      for (const dep of m.dependsOn ?? []) {
        edges.push({
          id: `m-${i++}`,
          source: m.id,
          target: dep,
          kind: "depends_on",
        });
      }
    }
    return { nodes, edges };
  } catch {
    return { nodes: [], edges: [] };
  }
}
