/**
 * scripts/build-catalog.ts
 *
 * Genera src/components/CATALOG.md a partir del estado físico del repo:
 * - Recorre src/features/<feature>/components/**, src/components/ui/, src/components/layout/.
 * - Para cada componente .tsx/.ts:
 *   - Detecta `'use client'` → kind = client (default server).
 *   - Extrae la primera línea de TSDoc del export principal como descripción.
 *   - Cuenta LOC.
 * - Emite tabla por feature en CATALOG.md.
 *
 * Uso: `npm run catalog`. Idempotente.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

type ComponentRow = {
  readonly name: string;
  readonly path: string;
  readonly kind: 'client' | 'server';
  readonly description: string;
  readonly loc: number;
};

type Bucket = {
  readonly title: string;
  readonly path: string;
  readonly rows: ComponentRow[];
};

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

function listFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listFiles(full));
    } else if (st.isFile() && (e.endsWith('.tsx') || e.endsWith('.ts'))) {
      out.push(full);
    }
  }
  return out;
}

function detectKind(content: string): 'client' | 'server' {
  // 'use client' must be the first non-empty, non-comment line within the first ~3 lines.
  const head = content.slice(0, 200);
  return /^['"]use client['"]/m.test(head) ? 'client' : 'server';
}

function extractDescription(content: string): string {
  // Find the first TSDoc block in the file. We don't enforce what follows,
  // because we accept multiple patterns:
  //  - `/** ... */ \n function Foo()` (TSDoc above internal fn re-exported by shadcn pattern)
  //  - `/** ... */ \n export function Foo()`
  //  - `/** ... */ \n export const Foo = ...`
  //  - `/** ... */ \n export { Foo as default } from '...'` (re-export)
  //  - `/** ... */ \n export type Foo = ...` (constants module header)
  const blockRe = /\/\*\*\s*\n([\s\S]*?)\*\//;
  const match = blockRe.exec(content);
  if (match) {
    const block = match[1];
    const firstLine = block
      .split('\n')
      .map((l) => l.replace(/^\s*\*\s?/, '').trim())
      .find((l) => l.length > 0 && !l.startsWith('@'));
    if (firstLine) return firstLine;
  }
  return '_pendiente TSDoc_';
}

function detectName(filePath: string, content: string): string {
  const fileName = filePath.split(sep).pop() ?? '';
  const baseName = fileName.replace(/\.(tsx|ts)$/, '');
  // Prefer named export matching filename.
  const namedExport = new RegExp(`export\\s+(?:function|const|class|type)\\s+(${baseName})\\b`).test(content);
  if (namedExport) return baseName;
  // Fallback: first named export.
  const m = content.match(/export\s+(?:function|const|class)\s+([A-Z]\w*)/);
  if (m) return m[1];
  return baseName;
}

function countLoc(content: string): number {
  return content.split('\n').length;
}

function buildRow(filePath: string): ComponentRow {
  const content = readFileSync(filePath, 'utf8');
  const rel = relative(ROOT, filePath).replace(/\\/g, '/');
  return {
    name: detectName(filePath, content),
    path: rel,
    kind: detectKind(content),
    description: extractDescription(content),
    loc: countLoc(content),
  };
}

function bucket(title: string, path: string, files: string[]): Bucket {
  return {
    title,
    path,
    rows: files.map(buildRow).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

function renderBucket(b: Bucket): string {
  if (b.rows.length === 0) {
    return `### ${b.title} (\`${b.path}\`)\n\n_vacío_\n`;
  }
  const lines = [`### ${b.title} (\`${b.path}\`)`, ''];
  lines.push('| Componente | Path | Kind | LOC | Descripción |');
  lines.push('|---|---|---|---:|---|');
  for (const r of b.rows) {
    const desc = r.description.replace(/\|/g, '\\|');
    const flag = r.loc > 500 ? ` 🚨` : r.loc > 300 ? ` ⚠️` : '';
    lines.push(`| \`${r.name}\` | \`${r.path}\` | ${r.kind} | ${r.loc}${flag} | ${desc} |`);
  }
  return lines.join('\n') + '\n';
}

function buildCatalog(): string {
  const buckets: Bucket[] = [
    bucket('UI primitives', 'src/components/ui/', listFiles(join(SRC, 'components', 'ui'))),
    bucket('Layout / Chrome', 'src/components/layout/', listFiles(join(SRC, 'components', 'layout'))),
  ];

  // Top-level features.
  const featuresRoot = join(SRC, 'features');
  let topFeatures: string[];
  try {
    topFeatures = readdirSync(featuresRoot).filter((f) => f !== 'admin');
  } catch {
    topFeatures = [];
  }
  topFeatures.sort();
  for (const f of topFeatures) {
    const dir = join(featuresRoot, f, 'components');
    buckets.push(bucket(f, `src/features/${f}/components/`, listFiles(dir)));
  }

  // Admin sub-features.
  const adminRoot = join(featuresRoot, 'admin');
  let adminSubs: string[];
  try {
    adminSubs = readdirSync(adminRoot);
  } catch {
    adminSubs = [];
  }
  adminSubs.sort();
  for (const s of adminSubs) {
    const dir = join(adminRoot, s, 'components');
    buckets.push(bucket(`admin/${s}`, `src/features/admin/${s}/components/`, listFiles(dir)));
  }

  const total = buckets.reduce((acc, b) => acc + b.rows.length, 0);
  const oversize300 = buckets.flatMap((b) => b.rows).filter((r) => r.loc > 300).length;
  const oversize500 = buckets.flatMap((b) => b.rows).filter((r) => r.loc > 500).length;

  const header = `# Component Catalog — SocialPro

> **Manifest autogenerado** por \`npm run catalog\`. Lista canónica de todos
> los componentes en \`src/\`. Las reglas de ubicación viven en
> \`AGENTS.md\` sección "Component Conventions".

## Cómo leer este catálogo

| Columna | Significado |
|---|---|
| **Componente** | Nombre del export PascalCase (deriva del archivo). |
| **Path** | Ruta relativa desde el root del repo. |
| **Kind** | \`server\` (default) o \`client\` (\`'use client'\` detectado). |
| **LOC** | Líneas. ⚠️ >300 (objetivo) · 🚨 >500 (hard limit). |
| **Descripción** | Primera línea del bloque TSDoc del export. |

## Estado

- **Total componentes:** ${total}
- **Componentes >300 LOC:** ${oversize300} ${oversize300 > 0 ? '⚠️' : '✅'}
- **Componentes >500 LOC:** ${oversize500} ${oversize500 > 0 ? '🚨 violan AGENTS.md' : '✅'}
- **Generado:** ${new Date().toISOString()}

> **Cómo se descubre un componente para un LLM:**
> 1. Busca por nombre en la columna "Componente".
> 2. Lee el README de la feature (\`src/features/<f>/README.md\`).
> 3. Lee el TSDoc del componente.
> 4. Solo entonces abre el \`.tsx\`.

## Tabla de componentes
`;

  return header + '\n' + buckets.map(renderBucket).join('\n');
}

const out = buildCatalog();
const target = join(SRC, 'components', 'CATALOG.md');
writeFileSync(target, out, 'utf8');
console.log(`[catalog] wrote ${target}`);
