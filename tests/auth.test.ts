import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { getPrivateAuthConfig, getPrivateAuthStatus, preparePrivateRequest } from '../src/lib/auth.js';
import { CoinoneCliError } from '../src/lib/errors.js';

describe('private auth helpers', () => {
  it('reports local auth status without exposing secrets', () => {
    expect(
      getPrivateAuthStatus({
        COINONE_ACCESS_TOKEN: 'token-value',
        COINONE_SECRET_KEY: ''
      })
    ).toEqual({
      configured: false,
      accessTokenConfigured: true,
      secretKeyConfigured: false,
      missing: ['COINONE_SECRET_KEY']
    });
  });

  it('throws a clear error when auth env vars are missing', () => {
    expect(() => getPrivateAuthConfig({})).toThrowError(CoinoneCliError);
    expect(() => getPrivateAuthConfig({})).toThrowError(
      'Missing Coinone private API credentials: COINONE_ACCESS_TOKEN, COINONE_SECRET_KEY'
    );
  });

  it('builds the Coinone V2.1 signed payload and signature', () => {
    const request = preparePrivateRequest(
      { currencies: ['btc'] },
      {
        accessToken: 'test-access-token',
        secretKey: 'test-secret-key'
      },
      '123e4567-e89b-12d3-a456-426614174000'
    );

    const expectedBody = JSON.stringify({
      currencies: ['btc'],
      access_token: 'test-access-token',
      nonce: '123e4567-e89b-12d3-a456-426614174000'
    });
    const expectedPayload = Buffer.from(expectedBody, 'utf8').toString('base64');
    const expectedSignature = createHmac('sha512', 'test-secret-key')
      .update(expectedPayload)
      .digest('hex');

    expect(request.body).toBe(expectedBody);
    expect(request.payload).toBe(expectedPayload);
    expect(request.signature).toBe(expectedSignature);
    expect(request.headers['X-COINONE-PAYLOAD']).toBe(expectedPayload);
    expect(request.headers['X-COINONE-SIGNATURE']).toBe(expectedSignature);
  });
});
