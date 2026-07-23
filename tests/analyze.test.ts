import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProject } from '../src/analyze.js';
import { renderHtmlReport } from '../src/report.js';

const fixture = path.resolve('examples/demo-angular-dotnet');

test('reconstructs a cross-stack flow from Angular to .NET', async () => {
  const graph = await analyzeProject(fixture, { projectName: 'Demo' });
  const names = graph.nodes.map(node => node.name);

  assert.equal(graph.stats.files, 7);
  assert.ok(names.includes('Ricerca posizioni'));
  assert.ok(names.includes('Eseguire ricerca posizioni'));
  assert.ok(names.includes('POST /api/positions/search'));
  assert.ok(names.includes('SearchPageComponent.onSearch()'));
  assert.ok(names.includes('SearchPositionsHandler.HandleAsync()'));
  assert.ok(names.includes('PositionsRepository.SearchAsync()'));

  const flow = graph.flows.find(item => item.name === 'Eseguire ricerca posizioni');
  assert.ok(flow);
  const flowNames = flow.steps.map(id => graph.nodes.find(node => node.id === id)?.name);
  for (const expected of [
    'SearchPageComponent.onSearch()',
    'SearchFacade.search()',
    'PositionsApiClient.search()',
    'POST /api/positions/search',
    'PositionsController.Search()',
    'SearchPositionsHandler.HandleAsync()',
    'PositionsRepository.SearchAsync()',
    'Database'
  ]) {
    assert.ok(flowNames.includes(expected), `Expected flow to contain ${expected}; got ${flowNames.join(' -> ')}`);
  }
});

test('renders a self-contained interactive report', async () => {
  const graph = await analyzeProject(fixture);
  const html = renderHtmlReport(graph);
  assert.match(html, /<!doctype html>/);
  assert.match(html, /Code Atlas/);
  assert.match(html, /Ricerca posizioni/);
  assert.match(html, /const graph=/);
});
