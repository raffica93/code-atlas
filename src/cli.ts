#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { analyzeProject } from './analyze.js';
import { renderHtmlReport } from './report.js';

async function main(): Promise<void> {
  const [, , command, rootArg, ...args] = process.argv;
  if (command !== 'analyze' || !rootArg) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  const out = valueAfter(args, '--out') ?? 'atlas.json';
  const html = valueAfter(args, '--html');
  const projectName = valueAfter(args, '--name');
  const graph = await analyzeProject(rootArg, { projectName });

  await fs.mkdir(path.dirname(path.resolve(out)), { recursive: true });
  await fs.writeFile(out, JSON.stringify(graph, null, 2), 'utf8');

  if (html) {
    await fs.mkdir(path.dirname(path.resolve(html)), { recursive: true });
    await fs.writeFile(html, renderHtmlReport(graph), 'utf8');
  }

  console.log(`Code Atlas analyzed ${graph.stats.files} files.`);
  console.log(`Nodes: ${graph.stats.nodes} · Edges: ${graph.stats.edges} · Flows: ${graph.flows.length}`);
  console.log(`JSON: ${path.resolve(out)}`);
  if (html) console.log(`HTML: ${path.resolve(html)}`);
  if (graph.diagnostics.length) console.log(`Diagnostics: ${graph.diagnostics.join(' ')}`);
}

function valueAfter(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function printHelp(): void {
  console.log(`Usage:\n  code-atlas analyze <project-root> [--out atlas.json] [--html report.html] [--name Project]`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
