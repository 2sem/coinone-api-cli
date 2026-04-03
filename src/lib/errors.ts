export class CoinoneCliError extends Error {
  readonly exitCode: number;
  readonly code?: string;
  readonly status?: number;
  readonly causeHint?: string;
  readonly details?: string;

  constructor(
    message: string,
    options: {
      exitCode?: number;
      code?: string;
      status?: number;
      causeHint?: string;
      details?: string;
    } = {}
  ) {
    super(message);
    this.name = 'CoinoneCliError';
    this.exitCode = options.exitCode ?? 1;
    this.code = options.code;
    this.status = options.status;
    this.causeHint = options.causeHint;
    this.details = options.details;
  }
}

export function normalizeError(error: unknown): CoinoneCliError {
  if (error instanceof CoinoneCliError) {
    return error;
  }

  if (error instanceof Error) {
    return new CoinoneCliError(error.message, {
      details: error.stack
    });
  }

  return new CoinoneCliError('Unknown error', {
    details: String(error)
  });
}

function colorize(value: string, color: number, enabled: boolean): string {
  if (!enabled) {
    return value;
  }

  return `\u001B[${color}m${value}\u001B[0m`;
}

export function formatError(error: CoinoneCliError, colorEnabled: boolean): string {
  const lines = [colorize(`Error: ${error.message}`, 31, colorEnabled)];

  if (error.code) {
    lines.push(`Code: ${error.code}`);
  }

  if (typeof error.status === 'number') {
    lines.push(`HTTP status: ${error.status}`);
  }

  if (error.causeHint) {
    lines.push(`Likely cause: ${error.causeHint}`);
  }

  if (error.details) {
    lines.push(`Details: ${error.details}`);
  }

  return `${lines.join('\n')}\n`;
}

export function rateLimitHint(headers: Headers): string | undefined {
  const reset =
    headers.get('x-ratelimit-reset') ??
    headers.get('ratelimit-reset') ??
    headers.get('retry-after');
  const remaining =
    headers.get('x-ratelimit-remaining') ?? headers.get('ratelimit-remaining');

  if (!reset && !remaining) {
    return undefined;
  }

  const parts: string[] = [];

  if (remaining) {
    parts.push(`remaining=${remaining}`);
  }

  if (reset) {
    parts.push(`reset=${reset}`);
  }

  return parts.join(', ');
}
