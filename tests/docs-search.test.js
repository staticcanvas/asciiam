/**
 * @jest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { readFileSync } from 'node:fs';

const searchSource = readFileSync(new URL('../docs/static/js/docs.js', import.meta.url), 'utf8')
  .replace(/^import\s+[\s\S]*?;/gm, '');
const searchIndex = [
  {
    title: 'Animation sequences',
    description: 'Compose ordered steps with snapshot morph transitions.',
    tags: ['sequences', 'transitions', 'morph'],
    keywords: ['animation playlist', 'cross-fade'],
    text: 'Sequence steps can repeat or transition with a morph.',
    url: 'guides/sequences/',
  },
  {
    title: 'Getting started',
    description: 'Install the package and import its ESM module.',
    tags: ['installation', 'ESM'],
    keywords: ['setup', 'mjs import'],
    text: 'Use npm or a direct browser module.',
    url: 'getting-started/',
  },
];

const settleSearch = async () => {
  await jest.advanceTimersByTimeAsync(120);
};

describe('documentation search interaction', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = `
      <div data-search-index="../index.json">
        <input id="docs-search" type="search" aria-expanded="false">
        <div id="docs-search-results" hidden></div>
      </div>`;
    const response = { ok: true, json: jest.fn(async () => searchIndex) };
    global.fetch = jest.fn(async () => response);
    window.fetch = global.fetch;
    window.eval(searchSource);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves search aliases and marks the matching metadata tag', async () => {
    const input = document.getElementById('docs-search');
    input.value = 'crossfade';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settleSearch();

    const result = document.querySelector('[role="option"]');
    expect(result.querySelector('strong').textContent).toBe('Animation sequences');
    expect(result.querySelector('.search-tag[data-match="true"]').textContent).toBe('transitions');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('highlights literal query words without injecting index HTML', async () => {
    const input = document.getElementById('docs-search');
    input.value = 'sequence';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settleSearch();

    expect(document.querySelector('[role="option"] strong mark').textContent.toLowerCase()).toBe('sequence');
    expect(document.querySelector('[role="option"] strong').innerHTML).not.toContain('<script');
  });
});
