import { Command, CommanderError, InvalidArgumentError } from 'commander';
import { createAuthCommand } from './commands/auth.js';
import { createBalancesCommand } from './commands/balances.js';
import { createCurrenciesCommand } from './commands/currencies.js';
import { createDoctorCommand } from './commands/doctor.js';
import { createFeesCommand } from './commands/fees.js';
import { createMarketsCommand } from './commands/markets.js';
import { createOrderbookCommand } from './commands/orderbook.js';
import { createOrdersCommand } from './commands/orders.js';
import { createRangeUnitsCommand } from './commands/range-units.js';
import { createTickerCommand } from './commands/ticker.js';
import { createTradesCommand } from './commands/trades.js';
import { CoinoneClient } from './lib/client.js';
import { formatError, normalizeError } from './lib/errors.js';
import { isColorEnabled, renderOutput, resolveOutputMode } from './lib/output.js';
import { CLI_VERSION } from './lib/runtime.js';
function parseBaseUrlOption(value) {
    let url;
    try {
        url = new URL(value);
    }
    catch {
        throw new InvalidArgumentError('Base URL must be an absolute http(s) URL.');
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
        throw new InvalidArgumentError('Base URL must use http or https.');
    }
    return url.toString().replace(/\/$/, '');
}
function parseTimeoutOption(value) {
    const timeoutMs = Number(value);
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
        throw new InvalidArgumentError('Timeout must be a positive integer in milliseconds.');
    }
    return timeoutMs;
}
function parseMaxRetriesOption(value) {
    const retries = Number(value);
    if (!Number.isInteger(retries) || retries < 0 || retries > 5) {
        throw new InvalidArgumentError('Max retries must be a whole number between 0 and 5.');
    }
    return retries;
}
function readGlobalOptions(command) {
    return command.optsWithGlobals();
}
function emitResult(stdout, command, result) {
    const options = readGlobalOptions(command);
    const mode = resolveOutputMode(options);
    stdout.write(renderOutput(result, mode));
}
export function createCli(dependencies = {}) {
    const stdout = dependencies.stdout ?? process.stdout;
    const stderr = dependencies.stderr ?? process.stderr;
    const env = dependencies.env ?? process.env;
    const client = new CoinoneClient({
        env,
        fetchImplementation: dependencies.fetchImplementation,
        baseUrl: dependencies.baseUrl,
        timeoutMs: dependencies.timeoutMs
    });
    const root = new Command()
        .name('coinone')
        .description('Developer-friendly CLI for Coinone public and private APIs')
        .version(CLI_VERSION)
        .showHelpAfterError()
        .showSuggestionAfterError()
        .option('--json', 'Output normalized JSON')
        .option('--output <mode>', 'Output mode: table, json, raw', 'table')
        .option('--color', 'Force color output when printing errors')
        .option('--base-url <url>', 'Override the Coinone API base URL', parseBaseUrlOption)
        .option('--timeout <ms>', 'Set request timeout in milliseconds', parseTimeoutOption)
        .option('--max-retries <n>', 'Retry safe read requests on 429/5xx responses (0-5)', parseMaxRetriesOption, 0)
        .addHelpText('after', [
        '',
        'Examples:',
        '  coinone doctor',
        '  coinone doctor --json',
        '  coinone markets list',
        '  coinone auth status',
        '  coinone balances list',
        '  coinone --timeout 10000 ticker get btc --quote krw',
        '  coinone --base-url https://api.coinone.co.kr ticker list --quote krw',
        '  coinone markets get btc --quote krw',
        '  coinone currencies get eth --json',
        '  coinone fees list --json',
        '  coinone fees get --quote krw --target btc',
        '  coinone orders get 12345 --quote krw --target btc',
        '  coinone orders place --quote krw --target btc --side buy --type limit --price 1000 --qty 0.01 --dry-run',
        '  coinone orders cancel --order-id 12345 --quote krw --target btc --confirm live',
        '  coinone orders completed --from 2026-01-01T00:00:00Z --to 2026-01-07T00:00:00Z',
        '  coinone ticker list --quote krw',
        '  coinone trades list btc --quote krw --size 50',
        '  coinone orders active --quote krw --target btc',
        '  coinone orderbook get btc --quote krw --output raw'
    ].join('\n'))
        .configureOutput({
        writeOut: (message) => stdout.write(message),
        writeErr: (message) => stderr.write(message)
    })
        .hook('preAction', (_thisCommand, actionCommand) => {
        const options = readGlobalOptions(actionCommand);
        client.setRuntimeOptions({
            baseUrl: options.baseUrl,
            timeoutMs: options.timeout,
            maxRetries: options.maxRetries
        });
    })
        .exitOverride();
    root.addCommand(createDoctorCommand({
        env,
        argv: dependencies.argv,
        cwd: dependencies.cwd,
        execPath: dependencies.execPath
    }, (command, result) => emitResult(stdout, command, result)));
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
export async function runCli(argv = process.argv, dependencies = {}) {
    const stderr = dependencies.stderr ?? process.stderr;
    const cli = createCli(dependencies);
    try {
        await cli.parseAsync(argv);
        return 0;
    }
    catch (error) {
        if (error instanceof CommanderError) {
            return error.code === 'commander.helpDisplayed' || argv.includes('--help') || argv.includes('-h')
                ? 0
                : error.exitCode;
        }
        const normalized = normalizeError(error);
        const options = cli.opts();
        stderr.write(formatError(normalized, isColorEnabled(options)));
        return normalized.exitCode;
    }
}
//# sourceMappingURL=cli.js.map