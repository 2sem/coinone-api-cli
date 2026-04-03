import { createHmac, randomUUID } from 'node:crypto';
import { CoinoneCliError } from './errors.js';
export const REQUIRED_AUTH_ENV_VARS = ['COINONE_ACCESS_TOKEN', 'COINONE_SECRET_KEY'];
function readEnvValue(value) {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
}
export function getPrivateAuthStatus(env = process.env) {
    const accessTokenConfigured = Boolean(readEnvValue(env.COINONE_ACCESS_TOKEN));
    const secretKeyConfigured = Boolean(readEnvValue(env.COINONE_SECRET_KEY));
    const missing = REQUIRED_AUTH_ENV_VARS.filter((name) => !readEnvValue(env[name]));
    return {
        configured: missing.length === 0,
        accessTokenConfigured,
        secretKeyConfigured,
        missing: [...missing]
    };
}
export function getPrivateAuthConfig(env = process.env) {
    const status = getPrivateAuthStatus(env);
    if (!status.configured) {
        throw new CoinoneCliError(`Missing Coinone private API credentials: ${status.missing.join(', ')}`, {
            causeHint: 'Set the missing environment variables and retry. Never pass secrets on the command line.'
        });
    }
    return {
        accessToken: readEnvValue(env.COINONE_ACCESS_TOKEN),
        secretKey: readEnvValue(env.COINONE_SECRET_KEY)
    };
}
export function preparePrivateRequest(body, auth, nonce = randomUUID()) {
    const requestBody = {
        ...body,
        access_token: auth.accessToken,
        nonce
    };
    const jsonBody = JSON.stringify(requestBody);
    const payload = Buffer.from(jsonBody, 'utf8').toString('base64');
    const signature = createHmac('sha512', auth.secretKey).update(payload).digest('hex');
    return {
        body: jsonBody,
        nonce,
        payload,
        signature,
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'user-agent': 'coinone-api-cli',
            'X-COINONE-PAYLOAD': payload,
            'X-COINONE-SIGNATURE': signature
        }
    };
}
//# sourceMappingURL=auth.js.map