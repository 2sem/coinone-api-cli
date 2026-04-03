import { Command } from 'commander';

import type { CoinoneClient } from '../lib/client.js';
import {
  maintenanceStatusLabel,
  marketPair,
  renderKeyValueTable,
  renderTable,
  tradeStatusLabel
} from '../lib/formatters.js';
import { CoinoneCliError } from '../lib/errors.js';
import type { CommandResult, EmitResult, Market } from '../lib/types.js';

const DEFAULT_QUOTE = 'KRW';

function normalizeQuote(value: string): string {
  return value.toLowerCase();
}

function normalizeCode(value: string): string {
  return value.toLowerCase();
}

export function createMarketsCommand(client: CoinoneClient, emitResult: EmitResult): Command {
  const command = new Command('markets')
    .description('Query market metadata')
    .addHelpText(
      'after',
      `\nExamples:\n  coinone markets list\n  coinone markets get btc --quote krw\n`
    );

  command
    .command('list')
    .description(`List markets for the default ${DEFAULT_QUOTE} quote currency`)
    .action(async function () {
      const response = await client.listMarkets(normalizeQuote(DEFAULT_QUOTE));
      emitResult(this, buildMarketsListResult(response.markets, response));
    });

  command
    .command('get')
    .argument('<targetCurrency>', 'Target currency symbol, for example BTC')
    .requiredOption('--quote <quoteCurrency>', 'Quote currency, for example KRW')
    .description('Get market metadata for one trading pair')
    .action(async function (targetCurrency: string, options: { quote: string }) {
      const response = await client.getMarket(
        normalizeQuote(options.quote),
        normalizeCode(targetCurrency)
      );
      emitResult(this, buildMarketGetResult(expectFirst(response.markets, 'market'), response));
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

function buildMarketsListResult(markets: Market[], raw: unknown): CommandResult<unknown[]> {
  const normalized = markets.map((market) => ({
    pair: marketPair(String(market.target_currency), String(market.quote_currency)),
    target: String(market.target_currency).toUpperCase(),
    quote: String(market.quote_currency).toUpperCase(),
    qtyUnit: market.qty_unit,
    minOrderAmount: market.min_order_amount,
    tradeStatus: market.trade_status,
    maintenanceStatus: market.maintenance_status,
    orderTypes: market.order_types
  }));

  return {
    data: normalized,
    raw,
    renderTable: () =>
      renderTable(normalized, [
        { key: 'pair', label: 'PAIR' },
        { key: 'qtyUnit', label: 'QTY UNIT' },
        { key: 'minOrderAmount', label: 'MIN ORDER' },
        { key: 'tradeStatus', label: 'TRADE' },
        { key: 'maintenanceStatus', label: 'MAINTENANCE' },
        { key: 'orderTypes', label: 'ORDER TYPES' }
      ])
  };
}

function buildMarketGetResult(market: Market, raw: unknown): CommandResult<unknown> {
  const normalized = {
    pair: marketPair(String(market.target_currency), String(market.quote_currency)),
    quote: String(market.quote_currency).toUpperCase(),
    target: String(market.target_currency).toUpperCase(),
    qtyUnit: market.qty_unit,
    minOrderAmount: market.min_order_amount,
    maxOrderAmount: market.max_order_amount,
    minPrice: market.min_price,
    maxPrice: market.max_price,
    minQty: market.min_qty,
    maxQty: market.max_qty,
    tradeStatus: Number(market.trade_status),
    tradeStatusLabel: tradeStatusLabel(Number(market.trade_status)),
    maintenanceStatus: Number(market.maintenance_status),
    maintenanceStatusLabel: maintenanceStatusLabel(Number(market.maintenance_status)),
    orderTypes: market.order_types,
    orderBookUnits: market.order_book_units
  };

  return {
    data: normalized,
    raw,
    renderTable: () =>
      renderKeyValueTable([
        { field: 'Pair', value: normalized.pair },
        { field: 'Qty unit', value: normalized.qtyUnit },
        { field: 'Min order amount', value: normalized.minOrderAmount },
        { field: 'Max order amount', value: normalized.maxOrderAmount },
        { field: 'Min price', value: normalized.minPrice },
        { field: 'Max price', value: normalized.maxPrice },
        { field: 'Min qty', value: normalized.minQty },
        { field: 'Max qty', value: normalized.maxQty },
        { field: 'Trade status', value: normalized.tradeStatusLabel },
        { field: 'Maintenance', value: normalized.maintenanceStatusLabel },
        { field: 'Order types', value: normalized.orderTypes },
        { field: 'Order book units', value: normalized.orderBookUnits }
      ])
  };
}
