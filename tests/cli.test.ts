import { describe, expect, it } from 'vitest';

import { runCli } from '../src/cli.js';

function createWritable() {
  let contents = '';
  return {
    write(chunk: string) {
      contents += chunk;
    },
    read() {
      return contents;
    }
  };
}

describe('runCli', () => {
  it('prints command output in json mode', async () => {
    const stdout = createWritable();
    const stderr = createWritable();

    const exitCode = await runCli(
      ['node', 'coinone', '--json', 'ticker', 'get', 'btc', '--quote', 'krw'],
      {
        stdout,
        stderr,
        fetchImplementation: async () =>
          new Response(
            JSON.stringify({
              result: 'success',
              error_code: '0',
              server_time: 1,
              tickers: [
                {
                  quote_currency: 'krw',
                  target_currency: 'btc',
                  timestamp: 1,
                  high: '110',
                  low: '90',
                  first: '100',
                  last: '105',
                  quote_volume: '1000',
                  target_volume: '10',
                  best_asks: [{ price: '106', qty: '1' }],
                  best_bids: [{ price: '104', qty: '2' }],
                  id: 'abc'
                }
              ]
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          )
      }
    );

    expect(exitCode).toBe(0);
    expect(stderr.read()).toBe('');
    expect(stdout.read()).toContain('"pair": "BTC/KRW"');
  });

  it('returns a non-zero exit code on API error', async () => {
    const stdout = createWritable();
    const stderr = createWritable();

    const exitCode = await runCli(['node', 'coinone', 'currencies', 'get', 'bad'], {
      stdout,
      stderr,
      fetchImplementation: async () =>
        new Response(
          JSON.stringify({
            result: 'error',
            error_code: '400',
            error_msg: 'bad request'
          }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        )
    });

    expect(exitCode).toBe(1);
    expect(stdout.read()).toBe('');
    expect(stderr.read()).toContain('Error: bad request');
  });

  it('prints private balances in json mode with mocked auth and response', async () => {
    const stdout = createWritable();
    const stderr = createWritable();

    const exitCode = await runCli(['node', 'coinone', '--json', 'balances', 'list'], {
      env: {
        COINONE_ACCESS_TOKEN: 'token',
        COINONE_SECRET_KEY: 'secret'
      },
      stdout,
      stderr,
      fetchImplementation: async () =>
        new Response(
          JSON.stringify({
            result: 'success',
            error_code: '0',
            balances: [
              {
                currency: 'btc',
                available: '0.42',
                limit: '0.05',
                average_price: '100000000'
              }
            ]
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
    });

    expect(exitCode).toBe(0);
    expect(stderr.read()).toBe('');
    expect(stdout.read()).toContain('"currency": "BTC"');
    expect(stdout.read()).toContain('"available": "0.42"');
  });

  it('returns a clear error when private auth env vars are missing', async () => {
    const stdout = createWritable();
    const stderr = createWritable();

    const exitCode = await runCli(['node', 'coinone', 'balances', 'list'], {
      env: {},
      stdout,
      stderr,
      fetchImplementation: async () => {
        throw new Error('should not be called');
      }
    });

    expect(exitCode).toBe(1);
    expect(stdout.read()).toBe('');
    expect(stderr.read()).toContain('Missing Coinone private API credentials');
    expect(stderr.read()).toContain('COINONE_ACCESS_TOKEN');
    expect(stderr.read()).toContain('COINONE_SECRET_KEY');
  });
});
