import { Command } from 'commander';

import type { CoinoneClient } from '../lib/client.js';
import { CoinoneCliError } from '../lib/errors.js';
import { formatTimestamp, marketPair, renderKeyValueTable, renderTable, sideLabel } from '../lib/formatters.js';
import type { CommandResult, EmitResult, TradesResponse } from '../lib/types.js';

const ALLOWED_SIZES = new Set([10, 50, 100, 150, 200]);

function parseTradeSize(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || !ALLOWED_SIZES.has(parsed)) {
    throw new CoinoneCliError('Invalid trades size.', {
      causeHint: 'Use one of: 10, 50, 100, 150, 200.'
    });
  }

  return parsed;
}

export function createTradesCommand(client: CoinoneClient, emitResult: EmitResult): Command {
  const command = new Command('trades')
    .description('Query recent trade history')
    .addHelpText(
      'after',
      `\nExamples:\n  coinone trades list btc --quote krw\n  coinone trades list btc --quote krw --size 50\n`
    );

  command
    .command('list')
    .argument('<targetCurrency>', 'Target currency symbol, for example BTC')
    .requiredOption('--quote <quoteCurrency>', 'Quote currency, for example KRW')
    .option('--size <n>', 'Number of trades: 10, 50, 100, 150, or 200', parseTradeSize)
    .description('List recent completed trades for one trading pair')
    .action(async function (
      targetCurrency: string,
      options: { quote: string; size?: number }
    ) {
      const response = await client.listTrades(
        options.quote.toLowerCase(),
        targetCurrency.toLowerCase(),
        options.size
      );

      emitResult(this, buildTradesResult(response, response));
    });

  return command;
}

function buildTradesResult(response: TradesResponse, raw: unknown): CommandResult<unknown> {
  const transactions = response.transactions.map((transaction) => ({
    id: transaction.id,
    time: formatTimestamp(Number(transaction.timestamp)),
    price: transaction.price,
    qty: transaction.qty,
    side: sideLabel(Boolean(transaction.is_seller_maker))
  }));
  const pair = marketPair(String(response.target_currency), String(response.quote_currency));

  return {
    data: {
      pair,
      transactions
    },
    raw,
    renderTable: () => {
      const summary = renderKeyValueTable([{ field: 'Pair', value: pair }]);
      return `${summary}\n${renderTable(transactions, [
        { key: 'time', label: 'TIME' },
        { key: 'price', label: 'PRICE' },
        { key: 'qty', label: 'QTY' },
        { key: 'side', label: 'SIDE' },
        { key: 'id', label: 'ID' }
      ])}`;
    }
  };
}
