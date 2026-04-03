export declare class CoinoneCliError extends Error {
    readonly exitCode: number;
    readonly code?: string;
    readonly status?: number;
    readonly causeHint?: string;
    readonly details?: string;
    constructor(message: string, options?: {
        exitCode?: number;
        code?: string;
        status?: number;
        causeHint?: string;
        details?: string;
    });
}
export declare function normalizeError(error: unknown): CoinoneCliError;
export declare function formatError(error: CoinoneCliError, colorEnabled: boolean): string;
export declare function rateLimitHint(headers: Headers): string | undefined;
