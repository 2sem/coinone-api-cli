import { describe, expect, it } from 'vitest';

import { createCli, runCli } from '../src/cli.js';
import { CLI_VERSION } from '../src/lib/runtime.js';

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
  it('prints doctor output in json mode without exposing secret values', async () => {
    const stdout = createWritable();
    const stderr = createWritable();

    const exitCode = await runCli(['node', 'coinone', 'doctor', '--json'], {
      env: {
        COINONE_ACCESS_TOKEN: 'token-value',
        COINONE_SECRET_KEY: 'secret-value'
      },
      stdout,
      stderr,
      argv: ['/opt/homebrew/bin/node', '/usr/local/bin/coinone', 'doctor', '--json'],
      cwd: '/tmp/coinone-doctor',
      execPath: '/opt/homebrew/bin/node'
    });

    expect(exitCode).toBe(0);
    expect(stderr.read()).toBe('');
    expect(stdout.read()).toContain(`"cliVersion": "${CLI_VERSION}"`);
    expect(stdout.read()).toContain('"nodeExecutablePath": "/opt/homebrew/bin/node"');
    expect(stdout.read()).toContain('"cliExecutablePath": "/usr/local/bin/coinone"');
    expect(stdout.read()).toContain('"currentWorkingDirectory": "/tmp/coinone-doctor"');
    expect(stdout.read()).toContain('"privateAuthConfigured": true');
    expect(stdout.read()).not.toContain('token-value');
    expect(stdout.read()).not.toContain('secret-value');
  });

  it('prints doctor output in table mode without failing when auth is missing', async () => {
    const stdout = createWritable();
    const stderr = createWritable();

    const exitCode = await runCli(['node', 'coinone', 'doctor'], {
      env: {},
      stdout,
      stderr,
      argv: ['/opt/homebrew/bin/node', '/usr/local/bin/coinone', 'doctor'],
      cwd: '/tmp/coinone-doctor',
      execPath: '/opt/homebrew/bin/node'
    });

    expect(exitCode).toBe(0);
    expect(stderr.read()).toBe('');
    expect(stdout.read()).toContain('COINONE_ACCESS_TOKEN set');
    expect(stdout.read()).toContain('Private auth configured');
    expect(stdout.read()).toContain('needs-auth');
    expect(stdout.read()).toContain('CLI runtime looks healthy, but private auth is not fully configured yet.');
    expect(stdout.read()).toContain('COINONE_ACCESS_TOKEN');
    expect(stdout.read()).toContain('COINONE_SECRET_KEY');
  });

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

  it('validates order placement locally in dry-run mode without calling fetch', async () => {
    const stdout = createWritable();
    const stderr = createWritable();
    let fetchCalled = false;

    const exitCode = await runCli(
      [
        'node',
        'coinone',
        '--json',
        'orders',
        'place',
        '--quote',
        'krw',
        '--target',
        'btc',
        '--side',
        'buy',
        '--type',
        'limit',
        '--price',
        '1000',
        '--qty',
        '0.01',
        '--dry-run'
      ],
      {
        stdout,
        stderr,
        fetchImplementation: async () => {
          fetchCalled = true;
          throw new Error('should not be called');
        }
      }
    );

    expect(exitCode).toBe(0);
    expect(fetchCalled).toBe(false);
    expect(stderr.read()).toBe('');
    expect(stdout.read()).toContain('"action": "place"');
    expect(stdout.read()).toContain('"dryRun": true');
    expect(stdout.read()).toContain('"submitted": false');
    expect(stdout.read()).toContain('"validation": "passed"');
  });

  it('requires an explicit safety mode for order placement', async () => {
    const stdout = createWritable();
    const stderr = createWritable();

    const exitCode = await runCli(
      [
        'node',
        'coinone',
        'orders',
        'place',
        '--quote',
        'krw',
        '--target',
        'btc',
        '--side',
        'buy',
        '--type',
        'limit',
        '--price',
        '1000',
        '--qty',
        '0.01'
      ],
      {
        stdout,
        stderr,
        fetchImplementation: async () => {
          throw new Error('should not be called');
        }
      }
    );

    expect(exitCode).toBe(1);
    expect(stdout.read()).toBe('');
    expect(stderr.read()).toContain('Missing required safety mode for `orders place`');
    expect(stderr.read()).toContain('Use `--dry-run` for local validation or `--confirm live`');
  });

  it('rejects conflicting order placement safety flags', async () => {
    const stdout = createWritable();
    const stderr = createWritable();

    const exitCode = await runCli(
      [
        'node',
        'coinone',
        'orders',
        'place',
        '--quote',
        'krw',
        '--target',
        'btc',
        '--side',
        'buy',
        '--type',
        'limit',
        '--price',
        '1000',
        '--qty',
        '0.01',
        '--dry-run',
        '--confirm',
        'live'
      ],
      {
        stdout,
        stderr,
        fetchImplementation: async () => {
          throw new Error('should not be called');
        }
      }
    );

    expect(exitCode).toBe(1);
    expect(stdout.read()).toBe('');
    expect(stderr.read()).toContain('Choose exactly one safety mode for `orders place`');
  });

  it('rejects non-limit order placement requests', async () => {
    const stdout = createWritable();
    const stderr = createWritable();

    const exitCode = await runCli(
      [
        'node',
        'coinone',
        'orders',
        'place',
        '--quote',
        'krw',
        '--target',
        'btc',
        '--side',
        'buy',
        '--type',
        'market',
        '--price',
        '1000',
        '--qty',
        '0.01',
        '--dry-run'
      ],
      {
        stdout,
        stderr,
        fetchImplementation: async () => {
          throw new Error('should not be called');
        }
      }
    );

    expect(exitCode).toBe(1);
    expect(stdout.read()).toBe('');
    expect(stderr.read()).toContain('Only limit orders are supported');
  });

  it('requires explicit live confirmation for order cancellation', async () => {
    const stdout = createWritable();
    const stderr = createWritable();

    const exitCode = await runCli(
      [
        'node',
        'coinone',
        'orders',
        'cancel',
        '--order-id',
        '12345',
        '--quote',
        'krw',
        '--target',
        'btc'
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
    expect(stderr.read()).toContain('required live confirmation');
  });

  it('prints successful live order placement in json mode', async () => {
    const stdout = createWritable();
    const stderr = createWritable();

    const exitCode = await runCli(
      [
        'node',
        'coinone',
        '--json',
        'orders',
        'place',
        '--quote',
        'krw',
        '--target',
        'btc',
        '--side',
        'buy',
        '--type',
        'limit',
        '--price',
        '1000',
        '--qty',
        '0.01',
        '--post-only',
        '--confirm',
        'live'
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
              order_id: 'new-order-1',
              quote_currency: 'krw',
              target_currency: 'btc',
              side: 'buy',
              order_type: 'limit',
              price: '1000',
              qty: '0.01',
              post_only: true,
              user_order_id: 'client-1',
              submitted_at: 1767225600000
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          )
      }
    );

    expect(exitCode).toBe(0);
    expect(stderr.read()).toBe('');
    expect(stdout.read()).toContain('"action": "place"');
    expect(stdout.read()).toContain('"submitted": true');
    expect(stdout.read()).toContain('"orderId": "new-order-1"');
    expect(stdout.read()).toContain('"postOnly": true');
    expect(stdout.read()).toContain('"submittedAt": "2026-01-01T00:00:00.000Z"');
  });

  it('prints successful live order cancellation in json mode', async () => {
    const stdout = createWritable();
    const stderr = createWritable();

    const exitCode = await runCli(
      [
        'node',
        'coinone',
        '--json',
        'orders',
        'cancel',
        '--order-id',
        '12345',
        '--quote',
        'krw',
        '--target',
        'btc',
        '--confirm',
        'live'
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
              order_id: '12345',
              quote_currency: 'krw',
              target_currency: 'btc',
              status: 'canceled',
              canceled_at: 1767225600000,
              canceled_qty: '0.01',
              remain_qty: '0'
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          )
      }
    );

    expect(exitCode).toBe(0);
    expect(stderr.read()).toBe('');
    expect(stdout.read()).toContain('"action": "cancel"');
    expect(stdout.read()).toContain('"submitted": true');
    expect(stdout.read()).toContain('"orderId": "12345"');
    expect(stdout.read()).toContain('"status": "canceled"');
    expect(stdout.read()).toContain('"canceledQty": "0.01"');
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

  it('shows clear help for guarded order placement', async () => {
    const cli = createCli();
    const ordersCommand = cli.commands.find((command) => command.name() === 'orders');
    const placeCommand = ordersCommand?.commands.find((command) => command.name() === 'place');
    const helpText = placeCommand?.helpInformation() ?? '';

    expect(helpText).toContain('--dry-run');
    expect(helpText).toContain('--confirm <mode>');
    expect(helpText).toContain('Place a guarded private limit order');
  });

  it('shows global base-url and timeout options in help', async () => {
    const cli = createCli();
    const helpText = cli.helpInformation();

    expect(helpText).toContain('doctor');
    expect(helpText).toContain('--base-url <url>');
    expect(helpText).toContain('--timeout <ms>');
  });

  it('wires the global base-url option into client requests', async () => {
    const stdout = createWritable();
    const stderr = createWritable();
    let requestUrl = '';

    const exitCode = await runCli(
      [
        'node',
        'coinone',
        '--base-url',
        'https://sandbox.coinone.test/api',
        '--json',
        'ticker',
        'get',
        'btc',
        '--quote',
        'krw'
      ],
      {
        stdout,
        stderr,
        fetchImplementation: async (input) => {
          requestUrl = String(input);
          return new Response(
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
          );
        }
      }
    );

    expect(exitCode).toBe(0);
    expect(stderr.read()).toBe('');
    expect(requestUrl).toBe('https://sandbox.coinone.test/api/public/v2/ticker_new/krw/btc');
  });
});
