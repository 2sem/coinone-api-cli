import { Command } from 'commander';

import type { CoinoneClient } from '../lib/client.js';
import { formatTimestamp, marketPair, renderTable, toCode } from '../lib/formatters.js';
import type {
  ActiveOrderEntry,
  ActiveOrdersResponse,
  CommandResult,
  EmitResult,
  JsonRecord
} from '../lib/types.js';

function collectValues(value: string, previous: string[]): string[] {
  return previous.concat(
    value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
  );
}

export function createOrdersCommand(client: CoinoneClient, emitResult: EmitResult): Command {
  const command = new Command('orders')
    .description('Query authenticated active orders')
    .addHelpText(
      'after',
      `\nExamples:\n  coinone orders active\n  coinone orders active --quote krw --target btc\n  coinone orders active --type limit --type stop_limit --json\n`
    );

  command
    .command('active')
    .option('--quote <quoteCurrency>', 'Quote currency, for example KRW')
    .option('--target <targetCurrency>', 'Target currency, for example BTC')
    .option('--type <type>', 'Order type filter; repeat or pass comma-separated values', collectValues, [])
    .description('List active orders with optional filters')
    .addHelpText(
      'after',
      `\nExamples:\n  coinone orders active\n  coinone orders active --quote krw --target btc --type limit\n`
    )
    .action(async function (options: { quote?: string; target?: string; type: string[] }) {
      const response = await client.listActiveOrders({
        quoteCurrency: options.quote?.toLowerCase(),
        targetCurrency: options.target?.toLowerCase(),
        orderTypes: options.type.map((value) => value.toLowerCase())
      });

      emitResult(this, buildActiveOrdersResult(normalizeActiveOrders(response), response));
    });

  return command;
}

interface NormalizedActiveOrder {
  orderId?: string;
  pair?: string;
  side?: string;
  orderType?: string;
  price?: string;
  qty?: string;
  remainingQty?: string;
  createdAt?: string;
}

function buildActiveOrdersResult(
  orders: NormalizedActiveOrder[],
  raw: unknown
): CommandResult<NormalizedActiveOrder[]> {
  return {
    data: orders,
    raw,
    renderTable: () =>
      renderTable(orders, [
        { key: 'orderId', label: 'ORDER ID' },
        { key: 'pair', label: 'PAIR' },
        { key: 'side', label: 'SIDE' },
        { key: 'orderType', label: 'TYPE' },
        { key: 'price', label: 'PRICE' },
        { key: 'qty', label: 'QTY' },
        { key: 'remainingQty', label: 'REMAINING' },
        { key: 'createdAt', label: 'CREATED' }
      ])
  };
}

function normalizeActiveOrders(response: ActiveOrdersResponse): NormalizedActiveOrder[] {
  const orders = response.active_orders ?? response.orders ?? [];
  return orders.map((order) => normalizeActiveOrder(order));
}

function normalizeActiveOrder(order: ActiveOrderEntry | JsonRecord): NormalizedActiveOrder {
  const quoteCurrency = readString(order.quote_currency) ?? readString(order.quoteCurrency);
  const targetCurrency = readString(order.target_currency) ?? readString(order.targetCurrency);
  const createdAtValue = readString(order.created_at) ?? readString(order.timestamp);

  return {
    orderId: readString(order.order_id) ?? readString(order.orderId),
    pair:
      quoteCurrency && targetCurrency
        ? marketPair(toCode(targetCurrency), toCode(quoteCurrency))
        : undefined,
    side: readString(order.side) ?? readString(order.order_side) ?? readString(order.type),
    orderType: readString(order.order_type) ?? readString(order.orderType),
    price: readString(order.price),
    qty: readString(order.qty) ?? readString(order.original_qty) ?? readString(order.originalQty),
    remainingQty:
      readString(order.remain_qty) ??
      readString(order.remaining_qty) ??
      readString(order.remainingQty),
    createdAt: formatTime(createdAtValue)
  };
}

function formatTime(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? formatTimestamp(numeric) : value;
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
