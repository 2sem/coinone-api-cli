import { describe, expect, it } from 'vitest';

import { buildUrl, CoinoneClient } from '../src/lib/client.js';
import { CoinoneCliError } from '../src/lib/errors.js';

describe('buildUrl', () => {
  it('builds endpoint URLs with query params', () => {
    expect(
      buildUrl('https://api.coinone.co.kr', '/public/v2/orderbook/krw/btc', { size: 10 })
    ).toBe('https://api.coinone.co.kr/public/v2/orderbook/krw/btc?size=10');
  });
});

describe('CoinoneClient', () => {
  it('calls the ticker endpoint with normalized path segments', async () => {
    const calls: string[] = [];
    const client = new CoinoneClient({
      fetchImplementation: async (input) => {
        calls.push(String(input));
        return new Response(
          JSON.stringify({
            result: 'success',
            error_code: '0',
            server_time: 1,
            tickers: []
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
    });

    await client.getTicker('krw', 'btc');
    expect(calls).toEqual(['https://api.coinone.co.kr/public/v2/ticker_new/krw/btc']);
  });

  it('normalizes API failures into a cli error', async () => {
    const client = new CoinoneClient({
      fetchImplementation: async () =>
        new Response(
          JSON.stringify({
            result: 'error',
            error_code: '104',
            error_msg: 'invalid currency'
          }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        )
    });

    await expect(client.getCurrency('bad')).rejects.toBeInstanceOf(CoinoneCliError);
  });

  it('signs private POST requests and includes auth fields in the body', async () => {
    let requestUrl = '';
    let requestInit: RequestInit | undefined;

    const client = new CoinoneClient({
      env: {
        COINONE_ACCESS_TOKEN: 'access-token',
        COINONE_SECRET_KEY: 'secret-key'
      },
      fetchImplementation: async (input, init) => {
        requestUrl = String(input);
        requestInit = init;

        return new Response(
          JSON.stringify({
            result: 'success',
            error_code: '0',
            balances: []
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
    });

    await client.getBalance(['btc']);

    expect(requestUrl).toBe('https://api.coinone.co.kr/v2.1/account/balance');
    expect(requestInit?.method).toBe('POST');
    expect(requestInit?.headers).toMatchObject({
      'content-type': 'application/json'
    });

    const parsedBody = JSON.parse(String(requestInit?.body));
    expect(parsedBody).toMatchObject({
      currencies: ['btc'],
      access_token: 'access-token'
    });
    expect(parsedBody.nonce).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });
});
