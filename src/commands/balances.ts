import { Command } from 'commander';

import type { CoinoneClient } from '../lib/client.js';
import { CoinoneCliError } from '../lib/errors.js';
import { renderKeyValueTable, renderTable, toCode } from '../lib/formatters.js';
import type { BalanceEntry, BalancesResponse, CommandResult, EmitResult, JsonRecord } from '../lib/types.js';

export function createBalancesCommand(client: CoinoneClient, emitResult: EmitResult): Command {
  const command = new Command('balances')
    .description('Query authenticated account balances')
    .addHelpText(
      'after',
      `\nExamples:\n  coinone balances list\n  coinone balances get btc\n  coinone balances list --json\n`
    );

  command
    .command('list')
    .description('List balances for the authenticated account')
    .addHelpText('after', `\nExample:\n  coinone balances list --json\n`)
    .action(async function () {
      const response = await client.listBalances();
      emitResult(this, buildBalancesListResult(normalizeBalanceEntries(response), response));
    });

  command
    .command('get')
    .argument('<currency>', 'Currency symbol, for example BTC')
    .description('Get one balance by currency')
    .addHelpText('after', `\nExample:\n  coinone balances get btc\n`)
    .action(async function (currency: string) {
      const response = await client.getBalance([currency.toLowerCase()]);
      const balance = normalizeBalanceEntries(response).find(
        (entry) => entry.currency === currency.toUpperCase()
      );

      if (!balance) {
        throw new CoinoneCliError(`Coinone returned no balance data for ${currency.toUpperCase()}.`);
      }

      emitResult(this, buildBalanceGetResult(balance, response));
    });

  return command;
}

interface NormalizedBalance {
  currency: string;
  available: string;
  locked: string;
  averagePrice?: string;
}

function buildBalancesListResult(
  balances: NormalizedBalance[],
  raw: unknown
): CommandResult<NormalizedBalance[]> {
  return {
    data: balances,
    raw,
    renderTable: () =>
      renderTable(balances, [
        { key: 'currency', label: 'CURRENCY' },
        { key: 'available', label: 'AVAILABLE' },
        { key: 'locked', label: 'LOCKED' },
        { key: 'averagePrice', label: 'AVG PRICE' }
      ])
  };
}

function buildBalanceGetResult(
  balance: NormalizedBalance,
  raw: unknown
): CommandResult<NormalizedBalance> {
  return {
    data: balance,
    raw,
    renderTable: () =>
      renderKeyValueTable([
        { field: 'Currency', value: balance.currency },
        { field: 'Available', value: balance.available },
        { field: 'Locked', value: balance.locked },
        { field: 'Average price', value: balance.averagePrice }
      ])
  };
}

function normalizeBalanceEntries(response: BalancesResponse): NormalizedBalance[] {
  const balances = response.balances;

  if (Array.isArray(balances)) {
    return balances.map((entry) => normalizeBalanceEntry(entry)).filter(isDefined);
  }

  if (isRecord(balances)) {
    return Object.entries(balances)
      .map(([currency, entry]) =>
        normalizeBalanceEntry({ currency, ...(isRecord(entry) ? entry : {}) })
      )
      .filter(isDefined);
  }

  return [];
}

function normalizeBalanceEntry(entry: BalanceEntry | JsonRecord): NormalizedBalance | undefined {
  const currency = readString(entry.currency);

  if (!currency) {
    return undefined;
  }

  return {
    currency: toCode(currency),
    available: readString(entry.available) ?? '0',
    locked: readString(entry.limit) ?? readString(entry.locked) ?? '0',
    averagePrice:
      readString(entry.average_price) ??
      readString(entry.averagePrice) ??
      readString(entry.avg_buy_price)
  };
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function readString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return undefined;
}
