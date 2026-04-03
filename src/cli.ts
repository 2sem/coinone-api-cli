import { Command, CommanderError } from 'commander';

import { createAuthCommand } from './commands/auth.js';
import { createBalancesCommand } from './commands/balances.js';
import { createCurrenciesCommand } from './commands/currencies.js';
import { createFeesCommand } from './commands/fees.js';
import { createMarketsCommand } from './commands/markets.js';
import { createOrderbookCommand } from './commands/orderbook.js';
import { createOrdersCommand } from './commands/orders.js';
import { createRangeUnitsCommand } from './commands/range-units.js';
import { createTickerCommand } from './commands/ticker.js';
import { createTradesCommand } from './commands/trades.js';
import { CoinoneClient, type FetchLike } from './lib/client.js';
import { formatError, normalizeError } from './lib/errors.js';
import { isColorEnabled, renderOutput, resolveOutputMode } from './lib/output.js';
import type { CommandResult, OutputOptions, PrivateAuthEnv } from './lib/types.js';

interface RunCliDependencies {
  env?: PrivateAuthEnv;
  fetchImplementation?: FetchLike;
  stdout?: { write(chunk: string): void };
  stderr?: { write(chunk: string): void };
  baseUrl?: string;
}

function readGlobalOptions(command: Command): OutputOptions {
  return command.optsWithGlobals<OutputOptions>();
}

function emitResult(stdout: { write(chunk: string): void }, command: Command, result: CommandResult<unknown>): void {
  const options = readGlobalOptions(command);
  const mode = resolveOutputMode(options);
  stdout.write(renderOutput(result, mode));
}

export function createCli(dependencies: RunCliDependencies = {}): Command {
  const stdout = dependencies.stdout ?? process.stdout;
  const stderr = dependencies.stderr ?? process.stderr;
  const env = dependencies.env ?? process.env;
  const client = new CoinoneClient({
    env,
    fetchImplementation: dependencies.fetchImplementation,
    baseUrl: dependencies.baseUrl
  });

  const root = new Command()
    .name('coinone')
    .description('Developer-friendly CLI for Coinone public and private APIs')
    .version('0.1.0')
    .showHelpAfterError()
    .showSuggestionAfterError()
    .option('--json', 'Output normalized JSON')
    .option('--output <mode>', 'Output mode: table, json, raw', 'table')
    .option('--color', 'Force color output when printing errors')
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
         '  coinone markets list',
         '  coinone auth status',
         '  coinone balances list',
         '  coinone markets get btc --quote krw',
         '  coinone currencies get eth --json',
         '  coinone fees list --json',
         '  coinone ticker list --quote krw',
         '  coinone trades list btc --quote krw --size 50',
         '  coinone orders active --quote krw --target btc',
         '  coinone orderbook get btc --quote krw --output raw'
       ].join('\n')
     )
    .configureOutput({
      writeOut: (message) => stdout.write(message),
      writeErr: (message) => stderr.write(message)
    })
    .exitOverride();

  root.addCommand(createAuthCommand(env, (command, result) => emitResult(stdout, command, result)));
  root.addCommand(createBalancesCommand(client, (command, result) => emitResult(stdout, command, result)));
  root.addCommand(createMarketsCommand(client, (command, result) => emitResult(stdout, command, result)));
  root.addCommand(createCurrenciesCommand(client, (command, result) => emitResult(stdout, command, result)));
  root.addCommand(createFeesCommand(client, (command, result) => emitResult(stdout, command, result)));
  root.addCommand(createOrdersCommand(client, (command, result) => emitResult(stdout, command, result)));
  root.addCommand(createTickerCommand(client, (command, result) => emitResult(stdout, command, result)));
  root.addCommand(createOrderbookCommand(client, (command, result) => emitResult(stdout, command, result)));
  root.addCommand(createTradesCommand(client, (command, result) => emitResult(stdout, command, result)));
  root.addCommand(createRangeUnitsCommand(client, (command, result) => emitResult(stdout, command, result)));

  return root;
}

export async function runCli(
  argv: string[] = process.argv,
  dependencies: RunCliDependencies = {}
): Promise<number> {
  const stderr = dependencies.stderr ?? process.stderr;
  const cli = createCli(dependencies);

  try {
    await cli.parseAsync(argv);
    return 0;
  } catch (error) {
    if (error instanceof CommanderError) {
      return error.code === 'commander.helpDisplayed' ? 0 : error.exitCode;
    }

    const normalized = normalizeError(error);
    const options = cli.opts<OutputOptions>();
    stderr.write(formatError(normalized, isColorEnabled(options)));
    return normalized.exitCode;
  }
}
