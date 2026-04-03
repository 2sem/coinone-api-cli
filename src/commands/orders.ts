import { Command } from 'commander';

import type { CoinoneClient } from '../lib/client.js';
import { CoinoneCliError } from '../lib/errors.js';
import { formatTimestamp, marketPair, renderKeyValueTable, renderTable, toCode } from '../lib/formatters.js';
import { validateTimeWindow } from '../lib/time.js';
import type {
  ActiveOrderEntry,
  ActiveOrdersResponse,
  CommandResult,
  CompletedOrderEntry,
  CompletedOrdersResponse,
  EmitResult,
  JsonRecord,
  OrderDetailEntry,
  OrderDetailResponse
} from '../lib/types.js';

function collectValues(value: string, previous: string[]): string[] {
  return previous.concat(
    value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
  );
}

function parseCompletedOrderSize(value: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new CoinoneCliError('Invalid completed orders size.', {
      causeHint: 'Use a whole number between 1 and 100.'
    });
  }

  return parsed;
}

function normalizePairOptions(options: { quote?: string; target?: string }): {
  quoteCurrency?: string;
  targetCurrency?: string;
} {
  const quoteCurrency = options.quote?.toLowerCase();
  const targetCurrency = options.target?.toLowerCase();

  if ((quoteCurrency && !targetCurrency) || (!quoteCurrency && targetCurrency)) {
    throw new CoinoneCliError('Incomplete market pair filter.', {
      causeHint:
        'Pass both `--quote` and `--target` for pair-specific history, or omit both to query all completed orders.'
    });
  }

  return { quoteCurrency, targetCurrency };
}

function requireOption(value: string | undefined, flagName: string): string {
  if (!value) {
    throw new CoinoneCliError(`Missing required option ${flagName}.`, {
      causeHint: `Run with ${flagName} and try again.`
    });
  }

  return value;
}

export function createOrdersCommand(client: CoinoneClient, emitResult: EmitResult): Command {
  const command = new Command('orders')
    .description('Query authenticated order data')
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  coinone orders active',
        '  coinone orders get 12345 --quote krw --target btc',
        '  coinone orders completed --from 2026-01-01T00:00:00Z --to 2026-01-07T00:00:00Z',
        '  coinone orders completed --from 1735689600000 --to 1736294400000 --quote krw --target btc --json'
      ].join('\n')
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

  command
    .command('get')
    .argument('<orderId>', 'Coinone order id')
    .requiredOption('--quote <quoteCurrency>', 'Quote currency, for example KRW')
    .requiredOption('--target <targetCurrency>', 'Target currency, for example BTC')
    .option('--user-order-id <id>', 'Optional user-provided order id filter')
    .description('Get one order detail by order id and market pair')
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  coinone orders get 12345 --quote krw --target btc',
        '  coinone orders get 12345 --quote krw --target btc --user-order-id client-1 --json'
      ].join('\n')
    )
    .action(async function (
      orderId: string,
      options: { quote: string; target: string; userOrderId?: string }
    ) {
      const response = await client.getOrderDetail({
        orderId,
        quoteCurrency: options.quote.toLowerCase(),
        targetCurrency: options.target.toLowerCase(),
        userOrderId: options.userOrderId
      });

      emitResult(this, buildOrderDetailResult(normalizeOrderDetail(response), response));
    });

  command
    .command('completed')
    .option('--from <timestampMsOrIso>', 'Window start in UTC milliseconds or ISO-8601')
    .option('--to <timestampMsOrIso>', 'Window end in UTC milliseconds or ISO-8601')
    .option('--size <n>', 'Number of completed orders to return (1-100)', parseCompletedOrderSize, 50)
    .option('--to-trade-id <id>', 'Cursor to continue from an older trade id')
    .option('--quote <quoteCurrency>', 'Quote currency, for example KRW')
    .option('--target <targetCurrency>', 'Target currency, for example BTC')
    .description('List completed orders for a time window')
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  coinone orders completed --from 2026-01-01T00:00:00Z --to 2026-01-07T00:00:00Z',
        '  coinone orders completed --from 1735689600000 --to 1736294400000 --size 100 --to-trade-id 98765',
        '  coinone orders completed --from 2026-01-01T00:00:00Z --to 2026-01-07T00:00:00Z --quote krw --target btc'
      ].join('\n')
    )
    .action(async function (options: {
      from?: string;
      to?: string;
      size: number;
      toTradeId?: string;
      quote?: string;
      target?: string;
    }) {
      const from = requireOption(options.from, '--from');
      const to = requireOption(options.to, '--to');
      const { fromTs, toTs } = validateTimeWindow(from, to);
      const { quoteCurrency, targetCurrency } = normalizePairOptions(options);
      const response = await client.listCompletedOrders({
        fromTs,
        toTs,
        size: options.size,
        toTradeId: options.toTradeId,
        quoteCurrency,
        targetCurrency
      });

      emitResult(
        this,
        buildCompletedOrdersResult(
          {
            fromTs,
            toTs,
            size: options.size,
            toTradeId: options.toTradeId,
            quoteCurrency,
            targetCurrency,
            orders: normalizeCompletedOrders(response)
          },
          response
        )
      );
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

interface NormalizedOrderDetail {
  orderId?: string;
  userOrderId?: string;
  pair?: string;
  side?: string;
  orderType?: string;
  status?: string;
  price?: string;
  qty?: string;
  filledQty?: string;
  remainingQty?: string;
  averageExecutedPrice?: string;
  fee?: string;
  feeRate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface NormalizedCompletedOrder {
  tradeId?: string;
  orderId?: string;
  userOrderId?: string;
  pair?: string;
  side?: string;
  orderType?: string;
  price?: string;
  qty?: string;
  fee?: string;
  feeCurrency?: string;
  completedAt?: string;
}

interface CompletedOrdersResultData {
  fromTs: number;
  toTs: number;
  from: string;
  to: string;
  size: number;
  toTradeId?: string;
  pair?: string;
  orders: NormalizedCompletedOrder[];
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

function buildOrderDetailResult(
  order: NormalizedOrderDetail,
  raw: unknown
): CommandResult<NormalizedOrderDetail> {
  return {
    data: order,
    raw,
    renderTable: () =>
      renderKeyValueTable([
        { field: 'Order id', value: order.orderId },
        { field: 'User order id', value: order.userOrderId },
        { field: 'Pair', value: order.pair },
        { field: 'Side', value: order.side },
        { field: 'Type', value: order.orderType },
        { field: 'Status', value: order.status },
        { field: 'Price', value: order.price },
        { field: 'Quantity', value: order.qty },
        { field: 'Filled quantity', value: order.filledQty },
        { field: 'Remaining quantity', value: order.remainingQty },
        { field: 'Average executed price', value: order.averageExecutedPrice },
        { field: 'Fee', value: order.fee },
        { field: 'Fee rate', value: order.feeRate },
        { field: 'Created', value: order.createdAt },
        { field: 'Updated', value: order.updatedAt }
      ])
  };
}

function buildCompletedOrdersResult(
  result: {
    fromTs: number;
    toTs: number;
    size: number;
    toTradeId?: string;
    quoteCurrency?: string;
    targetCurrency?: string;
    orders: NormalizedCompletedOrder[];
  },
  raw: unknown
): CommandResult<CompletedOrdersResultData> {
  const pair =
    result.quoteCurrency && result.targetCurrency
      ? marketPair(toCode(result.targetCurrency), toCode(result.quoteCurrency))
      : undefined;

  return {
    data: {
      fromTs: result.fromTs,
      toTs: result.toTs,
      from: formatTimestamp(result.fromTs),
      to: formatTimestamp(result.toTs),
      size: result.size,
      toTradeId: result.toTradeId,
      pair,
      orders: result.orders
    },
    raw,
    renderTable: () => {
      const summary = renderKeyValueTable([
        { field: 'From', value: formatTimestamp(result.fromTs) },
        { field: 'To', value: formatTimestamp(result.toTs) },
        { field: 'Size', value: result.size },
        { field: 'To trade id', value: result.toTradeId },
        { field: 'Pair', value: pair }
      ]);

      return `${summary}\n${renderTable(result.orders, [
        { key: 'completedAt', label: 'COMPLETED' },
        { key: 'pair', label: 'PAIR' },
        { key: 'side', label: 'SIDE' },
        { key: 'orderType', label: 'TYPE' },
        { key: 'price', label: 'PRICE' },
        { key: 'qty', label: 'QTY' },
        { key: 'fee', label: 'FEE' },
        { key: 'feeCurrency', label: 'FEE CUR' },
        { key: 'tradeId', label: 'TRADE ID' },
        { key: 'orderId', label: 'ORDER ID' }
      ])}`;
    }
  };
}

function normalizeActiveOrders(response: ActiveOrdersResponse): NormalizedActiveOrder[] {
  const orders = response.active_orders ?? response.orders ?? [];
  return orders.map((order) => normalizeActiveOrder(order));
}

function normalizeOrderDetail(response: OrderDetailResponse): NormalizedOrderDetail {
  const entry = response.order_detail ?? response.order;

  if (!entry) {
    throw new CoinoneCliError('Coinone returned no order detail for this request.');
  }

  return normalizeOrderDetailEntry(entry);
}

function normalizeCompletedOrders(response: CompletedOrdersResponse): NormalizedCompletedOrder[] {
  const orders = response.completed_orders ?? response.orders ?? response.transactions ?? [];
  return orders.map((order) => normalizeCompletedOrder(order));
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

function normalizeOrderDetailEntry(order: OrderDetailEntry | JsonRecord): NormalizedOrderDetail {
  const quoteCurrency = readString(order.quote_currency) ?? readString(order.quoteCurrency);
  const targetCurrency = readString(order.target_currency) ?? readString(order.targetCurrency);

  return {
    orderId: readString(order.order_id) ?? readString(order.orderId),
    userOrderId: readString(order.user_order_id) ?? readString(order.userOrderId),
    pair:
      quoteCurrency && targetCurrency
        ? marketPair(toCode(targetCurrency), toCode(quoteCurrency))
        : undefined,
    side: readString(order.side) ?? readString(order.order_side) ?? readString(order.type),
    orderType: readString(order.order_type) ?? readString(order.orderType),
    status: readString(order.status),
    price: readString(order.price),
    qty: readString(order.qty) ?? readString(order.original_qty) ?? readString(order.originalQty),
    filledQty:
      readString(order.filled_qty) ??
      readString(order.executed_qty) ??
      readString(order.filledQty) ??
      readString(order.executedQty),
    remainingQty:
      readString(order.remain_qty) ??
      readString(order.remaining_qty) ??
      readString(order.remainingQty),
    averageExecutedPrice:
      readString(order.average_executed_price) ?? readString(order.averageExecutedPrice),
    fee: readString(order.fee),
    feeRate: readString(order.fee_rate) ?? readString(order.feeRate),
    createdAt: formatTime(readString(order.created_at) ?? readString(order.createdAt)),
    updatedAt: formatTime(readString(order.updated_at) ?? readString(order.updatedAt))
  };
}

function normalizeCompletedOrder(order: CompletedOrderEntry | JsonRecord): NormalizedCompletedOrder {
  const quoteCurrency = readString(order.quote_currency) ?? readString(order.quoteCurrency);
  const targetCurrency = readString(order.target_currency) ?? readString(order.targetCurrency);
  const feeCurrency = readString(order.fee_currency) ?? readString(order.feeCurrency);

  return {
    tradeId: readString(order.trade_id) ?? readString(order.tradeId),
    orderId: readString(order.order_id) ?? readString(order.orderId),
    userOrderId: readString(order.user_order_id) ?? readString(order.userOrderId),
    pair:
      quoteCurrency && targetCurrency
        ? marketPair(toCode(targetCurrency), toCode(quoteCurrency))
        : undefined,
    side: readString(order.side) ?? readString(order.order_side) ?? readString(order.type),
    orderType: readString(order.order_type) ?? readString(order.orderType),
    price: readString(order.price),
    qty: readString(order.qty),
    fee: readString(order.fee),
    feeCurrency: feeCurrency ? toCode(feeCurrency) : undefined,
    completedAt:
      formatTime(
        readString(order.completed_at) ?? readString(order.completedAt) ?? readString(order.timestamp)
      )
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
