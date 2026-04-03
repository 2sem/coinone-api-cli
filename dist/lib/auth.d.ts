import type { JsonRecord, PreparedPrivateRequest, PrivateAuthConfig, PrivateAuthEnv, PrivateAuthStatus } from './types.js';
export declare const REQUIRED_AUTH_ENV_VARS: readonly ["COINONE_ACCESS_TOKEN", "COINONE_SECRET_KEY"];
export declare function getPrivateAuthStatus(env?: PrivateAuthEnv): PrivateAuthStatus;
export declare function getPrivateAuthConfig(env?: PrivateAuthEnv): PrivateAuthConfig;
export declare function preparePrivateRequest(body: JsonRecord, auth: PrivateAuthConfig, nonce?: `${string}-${string}-${string}-${string}-${string}`): PreparedPrivateRequest;
