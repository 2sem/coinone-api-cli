import { Command } from 'commander';

import type { CoinoneClient } from '../lib/client.js';
import { CoinoneCliError } from '../lib/errors.js';
import { renderKeyValueTable, renderTable } from '../lib/formatters.js';
import type { CommandResult, Currency, EmitResult } from '../lib/types.js';

export function createCurrenciesCommand(client: CoinoneClient, emitResult: EmitResult): Command {
  const command = new Command('currencies')
    .description('Query currency metadata')
    .addHelpText(
      'after',
      `\nExamples:\n  coinone currencies list\n  coinone currencies get btc\n`
    );

  command
    .command('list')
    .description('List supported currencies')
    .action(async function () {
      const response = await client.listCurrencies();
      emitResult(this, buildCurrenciesListResult(response.currencies, response));
    });

  command
    .command('get')
    .argument('<currency>', 'Currency symbol, for example BTC')
    .description('Get metadata for one currency')
    .action(async function (currency: string) {
      const response = await client.getCurrency(currency.toLowerCase());
      emitResult(this, buildCurrencyGetResult(expectFirst(response.currencies, 'currency'), response));
    });

  return command;
}

function expectFirst<T>(items: T[], name: string): T {
  const value = items[0];
  if (!value) {
    throw new CoinoneCliError(`Coinone returned no ${name} data.`);
  }

  return value;
}

function buildCurrenciesListResult(currencies: Currency[], raw: unknown): CommandResult<unknown[]> {
  const normalized = currencies.map((currency) => ({
    symbol: String(currency.symbol).toUpperCase(),
    name: currency.name,
    depositStatus: currency.deposit_status,
    withdrawStatus: currency.withdraw_status,
    maxPrecision: currency.max_precision,
    withdrawalFee: currency.withdrawal_fee
  }));

  return {
    data: normalized,
    raw,
    renderTable: () =>
      renderTable(normalized, [
        { key: 'symbol', label: 'SYMBOL' },
        { key: 'name', label: 'NAME' },
        { key: 'depositStatus', label: 'DEPOSIT' },
        { key: 'withdrawStatus', label: 'WITHDRAW' },
        { key: 'maxPrecision', label: 'PRECISION' },
        { key: 'withdrawalFee', label: 'WITHDRAWAL FEE' }
      ])
  };
}

function buildCurrencyGetResult(currency: Currency, raw: unknown): CommandResult<unknown> {
  const normalized = {
    symbol: String(currency.symbol).toUpperCase(),
    name: currency.name,
    depositStatus: currency.deposit_status,
    withdrawStatus: currency.withdraw_status,
    depositConfirmCount: currency.deposit_confirm_count,
    maxPrecision: currency.max_precision,
    depositFee: currency.deposit_fee,
    withdrawalMinAmount: currency.withdrawal_min_amount,
    withdrawalFee: currency.withdrawal_fee
  };

  return {
    data: normalized,
    raw,
    renderTable: () =>
      renderKeyValueTable([
        { field: 'Symbol', value: normalized.symbol },
        { field: 'Name', value: normalized.name },
        { field: 'Deposit status', value: normalized.depositStatus },
        { field: 'Withdraw status', value: normalized.withdrawStatus },
        { field: 'Deposit confirms', value: normalized.depositConfirmCount },
        { field: 'Precision', value: normalized.maxPrecision },
        { field: 'Deposit fee', value: normalized.depositFee },
        { field: 'Withdrawal min amount', value: normalized.withdrawalMinAmount },
        { field: 'Withdrawal fee', value: normalized.withdrawalFee }
      ])
  };
}
