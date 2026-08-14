import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const workflowDir = resolve(root, 'automation/n8n/workflows');
const files = readdirSync(workflowDir)
  .filter((file) => file.endsWith('.json'))
  .sort();

if (files.length !== 7) {
  throw new Error(`Expected 7 workflows, found ${files.length}`);
}

const names = new Set();
for (const file of files) {
  const raw = readFileSync(resolve(workflowDir, file), 'utf8');
  const workflow = JSON.parse(raw);
  if (workflow.active !== false) throw new Error(`${file}: workflow must be inactive`);
  if (typeof workflow.name !== 'string' || workflow.name.length < 5) {
    throw new Error(`${file}: invalid name`);
  }
  if (names.has(workflow.name)) throw new Error(`${file}: duplicate workflow name`);
  names.add(workflow.name);
  if (!Array.isArray(workflow.nodes) || workflow.nodes.length < 2) {
    throw new Error(`${file}: expected at least two nodes`);
  }
  const nodeNames = new Set();
  for (const node of workflow.nodes) {
    if (nodeNames.has(node.name)) throw new Error(`${file}: duplicate node ${node.name}`);
    nodeNames.add(node.name);
    if (node.credentials) throw new Error(`${file}: credential IDs must not be committed`);
  }
  for (const [source, outputs] of Object.entries(workflow.connections ?? {})) {
    if (!nodeNames.has(source)) throw new Error(`${file}: unknown connection source ${source}`);
    for (const channel of Object.values(outputs)) {
      for (const branch of channel) {
        for (const target of branch ?? []) {
          if (!nodeNames.has(target.node)) {
            throw new Error(`${file}: unknown connection target ${target.node}`);
          }
        }
      }
    }
  }
  if (/(bearer\s+[a-z0-9_-]{20,}|sk-[a-z0-9_-]{16,})/i.test(raw)) {
    throw new Error(`${file}: possible hard-coded secret`);
  }
}

console.log(`Validated ${files.length} inactive automation workflows.`);
