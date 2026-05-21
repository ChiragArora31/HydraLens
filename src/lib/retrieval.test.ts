import { describe, expect, it } from 'vitest';
import { benchmarkQueries } from '../data/hydraDataset';
import { runAllModes, runRetrieval, summarizeAccuracy } from './retrieval';

function byText(text: string) {
  const query = benchmarkQueries.find((item) => item.text === text);
  if (!query) throw new Error(`Missing query: ${text}`);
  return query;
}

describe('HydraLens retrieval engine', () => {
  it('answers current residence from the temporal graph without losing historical NYC', () => {
    const now = runRetrieval('Where do I live now?', 'graph', byText('Where do I live now?'));
    const then = runRetrieval('Where did I live in 2022?', 'graph', byText('Where did I live in 2022?'));

    expect(now.answer).toContain('London');
    expect(now.graphPath.map((edge) => edge.id)).toContain('e03');
    expect(then.answer).toContain('NYC');
    expect(then.graphPath.map((edge) => edge.id)).toContain('e01');
  });

  it('uses sliding-window enrichment to resolve the React orphan pronoun', () => {
    const results = runAllModes(byText('Did I always dislike React?'));

    expect(results.naive.verdict).not.toBe('correct');
    expect(results.enriched.answer).toContain('liked React');
    expect(results.graph.answer).toContain('liked React');
  });

  it('traverses the Atlas dependency chain across multiple sessions', () => {
    const result = runRetrieval('Why is Project Atlas blocked?', 'graph', byText('Why is Project Atlas blocked?'));

    expect(result.graphPath.map((edge) => edge.id)).toEqual(expect.arrayContaining(['e09', 'e10', 'e11', 'e13']));
    expect(result.answer).toContain('schema-change-ticket');
  });

  it('abstains when memory has no support', () => {
    const result = runRetrieval('What is my favorite coffee order?', 'graph', byText('What is my favorite coffee order?'));

    expect(result.verdict).toBe('correct');
    expect(result.answer.toLowerCase()).toContain("don't know");
  });

  it('shows graph retrieval beating naive retrieval on the mini benchmark', () => {
    const summary = summarizeAccuracy();
    const naiveAverage = summary.reduce((sum, row) => sum + row.naive, 0) / summary.length;
    const graphAverage = summary.reduce((sum, row) => sum + row.graph, 0) / summary.length;

    expect(graphAverage).toBeGreaterThan(naiveAverage);
    expect(graphAverage).toBeGreaterThan(0.85);
  });
});
