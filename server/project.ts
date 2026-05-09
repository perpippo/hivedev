import fs from "node:fs";
import path from "node:path";

export type RepoValidation = {
  ok: boolean;
  errors: string[];
  adrDir: string | null;
};

export function validateRepoRoot(repoRoot: string): RepoValidation {
  const errors: string[] = [];
  if (!repoRoot.trim()) {
    return { ok: false, errors: ["Path vuoto"], adrDir: null };
  }
  const resolved = path.resolve(repoRoot);
  if (!fs.existsSync(resolved)) {
    return { ok: false, errors: ["La cartella non esiste"], adrDir: null };
  }
  if (!fs.statSync(resolved).isDirectory()) {
    return { ok: false, errors: ["Il path non è una cartella"], adrDir: null };
  }
  const gitDir = path.join(resolved, ".git");
  if (!fs.existsSync(gitDir)) {
    errors.push("Avviso: cartella `.git` non trovata (repository Git consigliato, ADR-0001).");
  }
  const adrDir = path.join(resolved, "docs", "adr");
  if (!fs.existsSync(adrDir) || !fs.statSync(adrDir).isDirectory()) {
    errors.push("Avviso: `docs/adr/` non trovata — la context spine macro sarà vuota o limitata.");
  }
  return { ok: true, errors, adrDir: fs.existsSync(adrDir) ? adrDir : null };
}

export function tryGetGitHead(repoRoot: string): string | null {
  const headFile = path.join(repoRoot, ".git", "HEAD");
  try {
    if (!fs.existsSync(headFile)) return null;
    const head = fs.readFileSync(headFile, "utf-8").trim();
    if (head.startsWith("ref: ")) {
      const ref = head.slice(5).trim();
      const refPath = path.join(repoRoot, ".git", ref);
      if (fs.existsSync(refPath)) {
        return fs.readFileSync(refPath, "utf-8").trim().slice(0, 12);
      }
    }
    return head.slice(0, 12);
  } catch {
    return null;
  }
}
