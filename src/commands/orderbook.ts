import { Command } from 'commander';

import type { CoinoneClient } from '../lib/client.js';
import { marketPair, renderKeyValueTable, renderTable } from '../lib/formatters.js';
import { CoinoneCliError } from '../lib/errors.js';
import type { CommandResult, EmitResult, OrderBookResponse } from '../lib/types.js';

const ALLOWED_SIZES = new Set([5, 10, 15, 16]);

function parseOrderbookSize(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || !ALLOWED_SIZES.has(parsed)) {
    throw new CoinoneCliError('Invalid orderbook size.', {
      causeHint: 'Use one of: 5, 10, 15, 16.'
    });
  }

  return parsed;
}

export function createOrderbookCommand(client: CoinoneClient, emitResult: EmitResult): Command {
  const command = new Command('orderbook')
    .description('Query orderbook data')
    .addHelpText(
      'after',
      `\nExamples:\n  coinone orderbook get btc --quote krw\n  coinone orderbook get btc --quote krw --size 10\n`
    );

  command
    .command('get')
    .argument('<targetCurrency>', 'Target currency symbol, for example BTC')
    .requiredOption('--quote <quoteCurrency>', 'Quote currency, for example KRW')
    .option('--size <n>', 'Depth size: 5, 10, 15, or 16', parseOrderbookSize)
    .description('Get orderbook for one trading pair')
    .action(async function (
      targetCurrency: string,
      options: { quote: string; size?: number }
    ) {
      const response = await client.getOrderBook(
        options.quote.toLowerCase(),
        targetCurrency.toLowerCase(),
        options.size
      );

      emitResult(this, buildOrderbookResult(response, response));
    });

  return command;
}

function buildOrderbookResult(response: OrderBookResponse, raw: unknown): CommandResult<unknown> {
  const normalized = {
    pair: marketPair(String(response.target_currency), String(response.quote_currency)),
    timestamp: Number(response.timestamp),
    id: response.id,
    orderBookUnit: response.order_book_unit,
    bids: response.bids,
    asks: response.asks
  };

  return {
    data: normalized,
    raw,
    renderTable: () => {
      const summary = renderKeyValueTable([
        { field: 'Pair', value: normalized.pair },
        { field: 'Timestamp', value: normalized.timestamp },
        { field: 'Orderbook id', value: normalized.id },
        { field: 'Unit', value: normalized.orderBookUnit }
      ]);
      const levels = [
        ...(normalized.asks.map((level) => ({
          side: 'ask',
          price: level.price,
          qty: level.qty
        })) ?? []),
        ...(normalized.bids.map((level) => ({
          side: 'bid',
          price: level.price,
          qty: level.qty
        })) ?? [])
      ];

      return `${summary}\n${renderTable(levels, [
        { key: 'side', label: 'SIDE' },
        { key: 'price', label: 'PRICE' },
        { key: 'qty', label: 'QTY' }
      ])}`;
    }
  };
}
