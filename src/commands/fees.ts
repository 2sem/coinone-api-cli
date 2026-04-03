import { Command } from 'commander';

import type { CoinoneClient } from '../lib/client.js';
import { renderTable, toCode } from '../lib/formatters.js';
import type { CommandResult, EmitResult, JsonRecord, TradeFeeEntry, TradeFeesResponse } from '../lib/types.js';

export function createFeesCommand(client: CoinoneClient, emitResult: EmitResult): Command {
  const command = new Command('fees')
    .description('Query authenticated trade fee data')
    .addHelpText('after', `\nExamples:\n  coinone fees list\n  coinone fees list --json\n`);

  command
    .command('list')
    .description('List trade fees for the authenticated account')
    .addHelpText('after', `\nExample:\n  coinone fees list --json\n`)
    .action(async function () {
      const response = await client.listTradeFees();
      emitResult(this, buildFeeListResult(normalizeFeeEntries(response), response));
    });

  return command;
}

interface NormalizedFee {
  currency: string;
  feeRate?: string;
  makerFeeRate?: string;
  takerFeeRate?: string;
}

function buildFeeListResult(fees: NormalizedFee[], raw: unknown): CommandResult<NormalizedFee[]> {
  return {
    data: fees,
    raw,
    renderTable: () =>
      renderTable(fees, [
        { key: 'currency', label: 'CURRENCY' },
        { key: 'feeRate', label: 'FEE RATE' },
        { key: 'makerFeeRate', label: 'MAKER' },
        { key: 'takerFeeRate', label: 'TAKER' }
      ])
  };
}

function normalizeFeeEntries(response: TradeFeesResponse): NormalizedFee[] {
  const fees = response.fees ?? response.fee_rates;

  if (Array.isArray(fees)) {
    return fees.map((entry) => normalizeFeeEntry(entry)).filter(isDefined);
  }

  if (isRecord(fees)) {
    return Object.entries(fees)
      .map(([currency, entry]) => {
        if (isRecord(entry)) {
          return normalizeFeeEntry({ currency, ...entry });
        }

        if (typeof entry === 'string' || typeof entry === 'number') {
          return normalizeFeeEntry({ currency, fee_rate: String(entry) });
        }

        return undefined;
      })
      .filter(isDefined);
  }

  return [];
}

function normalizeFeeEntry(entry: TradeFeeEntry | JsonRecord): NormalizedFee | undefined {
  const currency = readString(entry.currency);

  if (!currency) {
    return undefined;
  }

  return {
    currency: toCode(currency),
    feeRate: readString(entry.fee_rate) ?? readString(entry.feeRate),
    makerFeeRate: readString(entry.maker_fee_rate) ?? readString(entry.makerFeeRate),
    takerFeeRate: readString(entry.taker_fee_rate) ?? readString(entry.takerFeeRate)
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
