import { describe, expect, it } from 'vitest';

import { createCli, runCli } from '../src/cli.js';

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

  it('prints order detail in json mode with mocked private response', async () => {
    const stdout = createWritable();
    const stderr = createWritable();

    const exitCode = await runCli(
      ['node', 'coinone', '--json', 'orders', 'get', '12345', '--quote', 'krw', '--target', 'btc'],
      {
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
              order_detail: {
                order_id: '12345',
                quote_currency: 'krw',
                target_currency: 'btc',
                side: 'buy',
                order_type: 'limit',
                status: 'done',
                price: '1000',
                qty: '2',
                filled_qty: '2',
                remain_qty: '0',
                created_at: 1735689600000
              }
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          )
      }
    );

    expect(exitCode).toBe(0);
    expect(stderr.read()).toBe('');
    expect(stdout.read()).toContain('"orderId": "12345"');
    expect(stdout.read()).toContain('"pair": "BTC/KRW"');
  });

  it('prints completed orders in json mode for all pairs', async () => {
    const stdout = createWritable();
    const stderr = createWritable();

    const exitCode = await runCli(
      [
        'node',
        'coinone',
        '--json',
        'orders',
        'completed',
        '--from',
        '2026-01-01T00:00:00Z',
        '--to',
        '2026-01-02T00:00:00Z'
      ],
      {
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
              completed_orders: [
                {
                  trade_id: '900',
                  order_id: '12345',
                  quote_currency: 'krw',
                  target_currency: 'btc',
                  side: 'sell',
                  order_type: 'limit',
                  price: '1000',
                  qty: '0.1',
                  fee: '10',
                  fee_currency: 'krw',
                  completed_at: 1767225600000
                }
              ]
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          )
      }
    );

    expect(exitCode).toBe(0);
    expect(stderr.read()).toBe('');
    expect(stdout.read()).toContain('"size": 50');
    expect(stdout.read()).toContain('"tradeId": "900"');
    expect(stdout.read()).toContain('"pair": "BTC/KRW"');
  });

  it('prints pair-specific trade fee in json mode', async () => {
    const stdout = createWritable();
    const stderr = createWritable();

    const exitCode = await runCli(
      ['node', 'coinone', '--json', 'fees', 'get', '--quote', 'krw', '--target', 'btc'],
      {
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
              quote_currency: 'krw',
              target_currency: 'btc',
              fee_rate: '0.002',
              maker_fee_rate: '0.001',
              taker_fee_rate: '0.002'
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          )
      }
    );

    expect(exitCode).toBe(0);
    expect(stderr.read()).toBe('');
    expect(stdout.read()).toContain('"pair": "BTC/KRW"');
    expect(stdout.read()).toContain('"feeRate": "0.002"');
  });

  it('returns a clear error for incomplete completed order pair filters', async () => {
    const stdout = createWritable();
    const stderr = createWritable();

    const exitCode = await runCli(
      [
        'node',
        'coinone',
        'orders',
        'completed',
        '--from',
        '2026-01-01T00:00:00Z',
        '--to',
        '2026-01-02T00:00:00Z',
        '--quote',
        'krw'
      ],
      {
        env: {
          COINONE_ACCESS_TOKEN: 'token',
          COINONE_SECRET_KEY: 'secret'
        },
        stdout,
        stderr,
        fetchImplementation: async () => {
          throw new Error('should not be called');
        }
      }
    );

    expect(exitCode).toBe(1);
    expect(stdout.read()).toBe('');
    expect(stderr.read()).toContain('Incomplete market pair filter');
    expect(stderr.read()).toContain('Pass both `--quote` and `--target`');
  });

  it('shows clear help for completed orders', async () => {
    const cli = createCli();
    const ordersCommand = cli.commands.find((command) => command.name() === 'orders');
    const completedCommand = ordersCommand?.commands.find((command) => command.name() === 'completed');
    const helpText = completedCommand?.helpInformation() ?? '';

    expect(helpText).toContain('--from <timestampMsOrIso>');
    expect(helpText).toContain('--to <timestampMsOrIso>');
    expect(helpText).toContain('List completed orders for a time window');
  });

  it('shows clear help for pair-specific fees', async () => {
    const cli = createCli();
    const feesCommand = cli.commands.find((command) => command.name() === 'fees');
    const getCommand = feesCommand?.commands.find((command) => command.name() === 'get');
    const helpText = getCommand?.helpInformation() ?? '';

    expect(helpText).toContain('--quote <quoteCurrency>');
    expect(helpText).toContain('--target <targetCurrency>');
    expect(helpText).toContain('Get trade fee for one market pair');
  });
});
