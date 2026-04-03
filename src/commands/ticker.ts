import { Command } from 'commander';

import type { CoinoneClient } from '../lib/client.js';
import { CoinoneCliError } from '../lib/errors.js';
import { formatTimestamp, marketPair, renderKeyValueTable, renderTable } from '../lib/formatters.js';
import type { CommandResult, EmitResult, Ticker } from '../lib/types.js';

const DEFAULT_QUOTE = 'KRW';

export function createTickerCommand(client: CoinoneClient, emitResult: EmitResult): Command {
  const command = new Command('ticker')
    .description('Query ticker data')
    .addHelpText(
      'after',
      `\nExamples:\n  coinone ticker list\n  coinone ticker list --quote krw\n  coinone ticker get btc --quote krw --json\n`
    );

  command
    .command('list')
    .option('--quote <quoteCurrency>', `Quote currency, defaults to ${DEFAULT_QUOTE}`)
    .description('List tickers for a quote currency')
    .action(async function (options: { quote?: string }) {
      const response = await client.listTickers((options.quote ?? DEFAULT_QUOTE).toLowerCase());
      emitResult(this, buildTickerListResult(response.tickers, response));
    });

  command
    .command('get')
    .argument('<targetCurrency>', 'Target currency symbol, for example BTC')
    .requiredOption('--quote <quoteCurrency>', 'Quote currency, for example KRW')
    .description('Get ticker data for one trading pair')
    .action(async function (targetCurrency: string, options: { quote: string }) {
      const response = await client.getTicker(options.quote.toLowerCase(), targetCurrency.toLowerCase());
      emitResult(this, buildTickerGetResult(expectFirst(response.tickers, 'ticker'), response));
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

function normalizeTicker(ticker: Ticker) {
  const bestAsk = ticker.best_asks[0];
  const bestBid = ticker.best_bids[0];

  return {
    pair: marketPair(String(ticker.target_currency), String(ticker.quote_currency)),
    target: String(ticker.target_currency).toUpperCase(),
    quote: String(ticker.quote_currency).toUpperCase(),
    timestamp: Number(ticker.timestamp),
    isoTime: formatTimestamp(Number(ticker.timestamp)),
    first: ticker.first,
    last: ticker.last,
    high: ticker.high,
    low: ticker.low,
    quoteVolume: ticker.quote_volume,
    targetVolume: ticker.target_volume,
    bestAskPrice: bestAsk?.price,
    bestAskQty: bestAsk?.qty,
    bestBidPrice: bestBid?.price,
    bestBidQty: bestBid?.qty,
    id: ticker.id
  };
}

function buildTickerListResult(tickers: Ticker[], raw: unknown): CommandResult<unknown[]> {
  const normalized = tickers.map(normalizeTicker);

  return {
    data: normalized,
    raw,
    renderTable: () =>
      renderTable(normalized, [
        { key: 'pair', label: 'PAIR' },
        { key: 'last', label: 'LAST' },
        { key: 'high', label: '24H HIGH' },
        { key: 'low', label: '24H LOW' },
        { key: 'quoteVolume', label: '24H QUOTE VOL' },
        { key: 'bestBidPrice', label: 'BEST BID' },
        { key: 'bestAskPrice', label: 'BEST ASK' }
      ])
  };
}

function buildTickerGetResult(ticker: Ticker, raw: unknown): CommandResult<unknown> {
  const normalized = normalizeTicker(ticker);

  return {
    data: normalized,
    raw,
    renderTable: () =>
      renderKeyValueTable([
        { field: 'Pair', value: normalized.pair },
        { field: 'Time', value: normalized.isoTime },
        { field: 'Open', value: normalized.first },
        { field: 'Last', value: normalized.last },
        { field: '24h high', value: normalized.high },
        { field: '24h low', value: normalized.low },
        { field: '24h quote volume', value: normalized.quoteVolume },
        { field: '24h target volume', value: normalized.targetVolume },
        { field: 'Best bid', value: `${normalized.bestBidPrice ?? '-'} (${normalized.bestBidQty ?? '-'})` },
        { field: 'Best ask', value: `${normalized.bestAskPrice ?? '-'} (${normalized.bestAskQty ?? '-'})` },
        { field: 'Ticker id', value: normalized.id }
      ])
  };
}
