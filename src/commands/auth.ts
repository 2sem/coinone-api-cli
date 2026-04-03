import { Command } from 'commander';

import { getPrivateAuthStatus } from '../lib/auth.js';
import { renderKeyValueTable } from '../lib/formatters.js';
import type { EmitResult, PrivateAuthEnv } from '../lib/types.js';

export function createAuthCommand(env: PrivateAuthEnv, emitResult: EmitResult): Command {
  const command = new Command('auth')
    .description('Inspect private API auth configuration')
    .addHelpText(
      'after',
      `\nExamples:\n  coinone auth status\n  COINONE_ACCESS_TOKEN=... COINONE_SECRET_KEY=... coinone auth status --json\n`
    );

  command
    .command('status')
    .description('Validate local auth env vars without calling the API')
    .addHelpText('after', `\nExample:\n  coinone auth status --json\n`)
    .action(function () {
      const status = getPrivateAuthStatus(env);
      emitResult(this, {
        data: status,
        raw: status,
        renderTable: () =>
          renderKeyValueTable([
            { field: 'Configured', value: status.configured },
            { field: 'Access token configured', value: status.accessTokenConfigured },
            { field: 'Secret key configured', value: status.secretKeyConfigured },
            { field: 'Missing env vars', value: status.missing.length > 0 ? status.missing : '-' }
          ])
      });
    });

  return command;
}
