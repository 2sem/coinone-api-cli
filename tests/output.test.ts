import { describe, expect, it } from 'vitest';

import { renderTable } from '../src/lib/formatters.js';
import { renderOutput } from '../src/lib/output.js';

describe('renderTable', () => {
  it('renders simple rows into a table', () => {
    const output = renderTable(
      [
        { pair: 'BTC/KRW', last: '100.0' },
        { pair: 'ETH/KRW', last: '50.0' }
      ],
      [
        { key: 'pair', label: 'PAIR' },
        { key: 'last', label: 'LAST' }
      ]
    );

    expect(output).toContain('PAIR');
    expect(output).toContain('BTC/KRW');
    expect(output).toContain('ETH/KRW');
  });
});

describe('renderOutput', () => {
  it('renders normalized json mode', () => {
    const output = renderOutput(
      {
        data: { pair: 'BTC/KRW' },
        raw: { result: 'success' },
        renderTable: () => 'table\n'
      },
      'json'
    );

    expect(output).toBe('{\n  "pair": "BTC/KRW"\n}\n');
  });
});
