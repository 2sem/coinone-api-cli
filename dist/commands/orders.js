import { Command } from 'commander';
import { CoinoneCliError } from '../lib/errors.js';
import { formatTimestamp, marketPair, renderKeyValueTable, renderTable, toCode } from '../lib/formatters.js';
import { validateTimeWindow } from '../lib/time.js';
function collectValues(value, previous) {
    return previous.concat(value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean));
}
function parseCompletedOrderSize(value) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
        throw new CoinoneCliError('Invalid completed orders size.', {
            causeHint: 'Use a whole number between 1 and 100.'
        });
    }
    return parsed;
}
function normalizePairOptions(options) {
    const quoteCurrency = options.quote?.toLowerCase();
    const targetCurrency = options.target?.toLowerCase();
    if ((quoteCurrency && !targetCurrency) || (!quoteCurrency && targetCurrency)) {
        throw new CoinoneCliError('Incomplete market pair filter.', {
            causeHint: 'Pass both `--quote` and `--target` for pair-specific history, or omit both to query all completed orders.'
        });
    }
    return { quoteCurrency, targetCurrency };
}
function requireOption(value, flagName) {
    if (!value) {
        throw new CoinoneCliError(`Missing required option ${flagName}.`, {
            causeHint: `Run with ${flagName} and try again.`
        });
    }
    return value;
}
function normalizeTradingSide(value) {
    const side = value.toLowerCase();
    if (side !== 'buy' && side !== 'sell') {
        throw new CoinoneCliError('Invalid order side.', {
            causeHint: 'Use `--side buy` or `--side sell`.'
        });
    }
    return side;
}
function normalizeLimitOrderType(value) {
    const orderType = value.toLowerCase();
    if (orderType !== 'limit') {
        throw new CoinoneCliError('Only limit orders are supported for `coinone orders place` in this MVP.', {
            causeHint: 'Pass `--type limit`.'
        });
    }
    return orderType;
}
function parseDecimal(value, fieldName) {
    const trimmed = value.trim();
    if (!/^\d+(?:\.\d+)?$/.test(trimmed)) {
        throw new CoinoneCliError(`Invalid ${fieldName} decimal string.`, {
            causeHint: `Pass \`--${fieldName}\` as digits with an optional decimal fraction.`
        });
    }
    const [integerPart, fractionPart = ''] = trimmed.split('.');
    const normalizedFraction = fractionPart.replace(/0+$/, '');
    const digits = `${integerPart}${normalizedFraction}`.replace(/^0+(?=\d)/, '') || '0';
    return {
        raw: trimmed,
        units: BigInt(digits),
        scale: normalizedFraction.length
    };
}
function formatDecimal(value) {
    if (value.scale === 0) {
        return value.units.toString();
    }
    const negative = value.units < 0n;
    const digits = (negative ? -value.units : value.units).toString().padStart(value.scale + 1, '0');
    const integerPart = digits.slice(0, -value.scale) || '0';
    const fractionPart = digits.slice(-value.scale).replace(/0+$/, '');
    return `${negative ? '-' : ''}${integerPart}${fractionPart ? `.${fractionPart}` : ''}`;
}
function compareDecimals(left, right) {
    const scale = Math.max(left.scale, right.scale);
    const leftUnits = left.units * 10n ** BigInt(scale - left.scale);
    const rightUnits = right.units * 10n ** BigInt(scale - right.scale);
    if (leftUnits < rightUnits) {
        return -1;
    }
    if (leftUnits > rightUnits) {
        return 1;
    }
    return 0;
}
function multiplyDecimals(left, right) {
    return {
        raw: `${left.raw}*${right.raw}`,
        units: left.units * right.units,
        scale: left.scale + right.scale
    };
}
function validateMinDecimal(value, minimum, label, pair) {
    const minimumValue = parseDecimal(minimum, label);
    if (minimumValue.units === 0n) {
        return;
    }
    if (compareDecimals(value, minimumValue) < 0) {
        throw new CoinoneCliError(`Order ${label} is below the minimum for ${pair}.`, {
            causeHint: `Use --${label} at least ${formatDecimal(minimumValue)}.`
        });
    }
}
function validateMaxDecimal(value, maximum, label, pair) {
    const maximumValue = parseDecimal(maximum, label);
    if (maximumValue.units === 0n) {
        return;
    }
    if (compareDecimals(value, maximumValue) > 0) {
        throw new CoinoneCliError(`Order ${label} is above the maximum for ${pair}.`, {
            causeHint: `Use --${label} at most ${formatDecimal(maximumValue)}.`
        });
    }
}
function validatePlaceOrderAgainstMarket(order, market) {
    const pair = marketPair(toCode(order.targetCurrency), toCode(order.quoteCurrency));
    const price = parseDecimal(order.price, 'price');
    const qty = parseDecimal(order.qty, 'qty');
    if (price.units <= 0n) {
        throw new CoinoneCliError('Price must be greater than zero.', {
            causeHint: 'Pass `--price` as a positive decimal string.'
        });
    }
    if (qty.units <= 0n) {
        throw new CoinoneCliError('Quantity must be greater than zero.', {
            causeHint: 'Pass `--qty` as a positive decimal string.'
        });
    }
    if (!market.order_types.includes(order.orderType)) {
        throw new CoinoneCliError(`Limit orders are not available for ${pair}.`, {
            causeHint: `Coinone reports supported order types: ${market.order_types.join(', ') || 'none'}.`
        });
    }
    if (market.trade_status !== 1) {
        throw new CoinoneCliError(`Trading is not enabled for ${pair}.`, {
            causeHint: `Coinone market trade_status is ${market.trade_status}.`
        });
    }
    if (market.maintenance_status !== 0) {
        throw new CoinoneCliError(`Market ${pair} is under maintenance.`, {
            causeHint: `Coinone market maintenance_status is ${market.maintenance_status}.`
        });
    }
    validateMinDecimal(price, market.min_price, 'price', pair);
    validateMaxDecimal(price, market.max_price, 'price', pair);
    validateMinDecimal(qty, market.min_qty, 'qty', pair);
    validateMaxDecimal(qty, market.max_qty, 'qty', pair);
    const notional = multiplyDecimals(price, qty);
    const minimumOrderAmount = parseDecimal(market.min_order_amount, 'min order amount');
    if (compareDecimals(notional, minimumOrderAmount) < 0) {
        throw new CoinoneCliError(`Order notional is below the market minimum for ${pair}.`, {
            causeHint: `price * qty = ${formatDecimal(notional)}, but Coinone requires at least ${formatDecimal(minimumOrderAmount)}.`
        });
    }
}
function validatePlaceSafetyMode(options) {
    const confirm = options.confirm?.trim().toLowerCase();
    if (options.dryRun && confirm) {
        throw new CoinoneCliError('Choose exactly one safety mode for `orders place`.', {
            causeHint: 'Use either `--dry-run` or `--confirm live`, but not both.'
        });
    }
    if (!options.dryRun && !confirm) {
        throw new CoinoneCliError('Missing required safety mode for `orders place`.', {
            causeHint: 'Use `--dry-run` for local validation or `--confirm live` to submit a real order.'
        });
    }
    if (confirm && confirm !== 'live') {
        throw new CoinoneCliError('Invalid confirm value for `orders place`.', {
            causeHint: 'Use `--confirm live` for real submissions.'
        });
    }
    return { dryRun: Boolean(options.dryRun) };
}
function validateCancelConfirmation(confirm) {
    if (!confirm) {
        throw new CoinoneCliError('Missing required live confirmation for `orders cancel`.', {
            causeHint: 'Use `--confirm live` to cancel an order.'
        });
    }
    if (confirm.trim().toLowerCase() !== 'live') {
        throw new CoinoneCliError('Invalid confirm value for `orders cancel`.', {
            causeHint: 'Use `--confirm live` to cancel an order.'
        });
    }
}
function expectPlaceOrderMarket(markets, order) {
    const market = markets[0];
    if (!market) {
        throw new CoinoneCliError('Coinone returned no market metadata for this order.', {
            causeHint: `Check whether ${marketPair(toCode(order.targetCurrency), toCode(order.quoteCurrency))} is a valid trading pair.`
        });
    }
    return market;
}
export function createOrdersCommand(client, emitResult) {
    const command = new Command('orders')
        .description('Query authenticated order data and submit guarded order actions')
        .addHelpText('after', [
        '',
        'Examples:',
        '  coinone orders active',
        '  coinone orders get 12345 --quote krw --target btc',
        '  coinone orders place --quote krw --target btc --side buy --type limit --price 1000 --qty 0.01 --dry-run',
        '  coinone orders place --quote krw --target btc --side buy --type limit --price 1000 --qty 0.01 --confirm live',
        '  coinone orders cancel --order-id 12345 --quote krw --target btc --confirm live',
        '  coinone orders completed --from 2026-01-01T00:00:00Z --to 2026-01-07T00:00:00Z',
        '  coinone orders completed --from 1735689600000 --to 1736294400000 --quote krw --target btc --json'
    ].join('\n'));
    command
        .command('active')
        .option('--quote <quoteCurrency>', 'Quote currency, for example KRW')
        .option('--target <targetCurrency>', 'Target currency, for example BTC')
        .option('--type <type>', 'Order type filter; repeat or pass comma-separated values', collectValues, [])
        .description('List active orders with optional filters')
        .addHelpText('after', `\nExamples:\n  coinone orders active\n  coinone orders active --quote krw --target btc --type limit\n`)
        .action(async function (options) {
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
        .addHelpText('after', [
        '',
        'Examples:',
        '  coinone orders get 12345 --quote krw --target btc',
        '  coinone orders get 12345 --quote krw --target btc --user-order-id client-1 --json'
    ].join('\n'))
        .action(async function (orderId, options) {
        const response = await client.getOrderDetail({
            orderId,
            quoteCurrency: options.quote.toLowerCase(),
            targetCurrency: options.target.toLowerCase(),
            userOrderId: options.userOrderId
        });
        emitResult(this, buildOrderDetailResult(normalizeOrderDetail(response), response));
    });
    command
        .command('place')
        .requiredOption('--quote <quoteCurrency>', 'Quote currency, for example KRW')
        .requiredOption('--target <targetCurrency>', 'Target currency, for example BTC')
        .requiredOption('--side <buy|sell>', 'Order side: buy or sell')
        .requiredOption('--type <type>', 'Order type; MVP currently supports limit only')
        .requiredOption('--price <string>', 'Limit price as a decimal string')
        .requiredOption('--qty <string>', 'Order quantity as a decimal string')
        .option('--post-only', 'Submit the order as post-only')
        .option('--user-order-id <id>', 'Optional user-provided order id')
        .option('--dry-run', 'Validate locally only; do not call Coinone')
        .option('--confirm <mode>', 'Required for live submission; use `live`')
        .description('Place a guarded private limit order')
        .addHelpText('after', [
        '',
        'Safety:',
        '  Use `--dry-run` to validate locally without a network request.',
        '  Use `--confirm live` for real submission.',
        '',
        'Examples:',
        '  coinone orders place --quote krw --target btc --side buy --type limit --price 1000 --qty 0.01 --dry-run',
        '  coinone orders place --quote krw --target btc --side sell --type limit --price 1200 --qty 0.01 --post-only --confirm live',
        '  coinone orders place --quote krw --target btc --side buy --type limit --price 1000 --qty 0.01 --user-order-id client-1 --confirm live'
    ].join('\n'))
        .action(async function (options) {
        const { dryRun } = validatePlaceSafetyMode(options);
        const side = normalizeTradingSide(options.side);
        const orderType = normalizeLimitOrderType(options.type);
        const orderRequest = {
            quoteCurrency: options.quote.toLowerCase(),
            targetCurrency: options.target.toLowerCase(),
            side,
            orderType,
            price: options.price,
            qty: options.qty,
            postOnly: Boolean(options.postOnly),
            userOrderId: options.userOrderId
        };
        const marketResponse = await client.getMarket(orderRequest.quoteCurrency, orderRequest.targetCurrency);
        const market = expectPlaceOrderMarket(marketResponse.markets, orderRequest);
        validatePlaceOrderAgainstMarket(orderRequest, market);
        if (dryRun) {
            const result = buildPlaceOrderDryRunResult(orderRequest);
            emitResult(this, result);
            return;
        }
        const submittedAt = new Date().toISOString();
        const response = await client.placeOrder(orderRequest);
        emitResult(this, buildPlaceOrderLiveResult(orderRequest, response, submittedAt));
    });
    command
        .command('cancel')
        .requiredOption('--order-id <id>', 'Coinone order id to cancel')
        .requiredOption('--quote <quoteCurrency>', 'Quote currency, for example KRW')
        .requiredOption('--target <targetCurrency>', 'Target currency, for example BTC')
        .option('--confirm <mode>', 'Required for live cancel; use `live`')
        .option('--user-order-id <id>', 'Optional user-provided order id')
        .description('Cancel an order with explicit live confirmation')
        .addHelpText('after', [
        '',
        'Safety:',
        '  Cancellation is live-only in this MVP.',
        '  You must pass `--confirm live`.',
        '',
        'Examples:',
        '  coinone orders cancel --order-id 12345 --quote krw --target btc --confirm live',
        '  coinone orders cancel --order-id 12345 --quote krw --target btc --user-order-id client-1 --confirm live --json'
    ].join('\n'))
        .action(async function (options) {
        validateCancelConfirmation(options.confirm);
        const orderRequest = {
            orderId: options.orderId,
            quoteCurrency: options.quote.toLowerCase(),
            targetCurrency: options.target.toLowerCase(),
            userOrderId: options.userOrderId
        };
        const canceledAt = new Date().toISOString();
        const response = await client.cancelOrder(orderRequest);
        emitResult(this, buildCancelOrderResult(orderRequest, response, canceledAt));
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
        .addHelpText('after', [
        '',
        'Examples:',
        '  coinone orders completed --from 2026-01-01T00:00:00Z --to 2026-01-07T00:00:00Z',
        '  coinone orders completed --from 1735689600000 --to 1736294400000 --size 100 --to-trade-id 98765',
        '  coinone orders completed --from 2026-01-01T00:00:00Z --to 2026-01-07T00:00:00Z --quote krw --target btc'
    ].join('\n'))
        .action(async function (options) {
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
        emitResult(this, buildCompletedOrdersResult({
            fromTs,
            toTs,
            size: options.size,
            toTradeId: options.toTradeId,
            quoteCurrency,
            targetCurrency,
            orders: normalizeCompletedOrders(response)
        }, response));
    });
    return command;
}
function buildActiveOrdersResult(orders, raw) {
    return {
        data: orders,
        raw,
        renderTable: () => renderTable(orders, [
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
function buildOrderDetailResult(order, raw) {
    return {
        data: order,
        raw,
        renderTable: () => renderKeyValueTable([
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
function buildCompletedOrdersResult(result, raw) {
    const pair = result.quoteCurrency && result.targetCurrency
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
function buildPlaceOrderDryRunResult(order) {
    const data = {
        action: 'place',
        dryRun: true,
        submitted: false,
        orderId: null,
        pair: marketPair(toCode(order.targetCurrency), toCode(order.quoteCurrency)),
        side: order.side,
        orderType: order.orderType,
        price: order.price,
        qty: order.qty,
        postOnly: order.postOnly,
        userOrderId: order.userOrderId ?? null,
        validation: 'passed',
        submittedAt: null
    };
    return {
        data,
        raw: data,
        renderTable: () => renderKeyValueTable([
            { field: 'Action', value: data.action },
            { field: 'Dry run', value: data.dryRun },
            { field: 'Submitted', value: data.submitted },
            { field: 'Pair', value: data.pair },
            { field: 'Side', value: data.side },
            { field: 'Type', value: data.orderType },
            { field: 'Price', value: data.price },
            { field: 'Quantity', value: data.qty },
            { field: 'Post only', value: data.postOnly },
            { field: 'User order id', value: data.userOrderId },
            { field: 'Validation', value: data.validation }
        ])
    };
}
function buildPlaceOrderLiveResult(order, response, requestedAt) {
    const normalized = normalizePlacedOrder(response);
    const data = {
        action: 'place',
        dryRun: false,
        submitted: true,
        orderId: normalized.orderId,
        pair: normalized.pair ?? marketPair(toCode(order.targetCurrency), toCode(order.quoteCurrency)),
        side: normalized.side ?? order.side,
        orderType: normalized.orderType ?? order.orderType,
        price: normalized.price ?? order.price,
        qty: normalized.qty ?? order.qty,
        postOnly: normalized.postOnly ?? order.postOnly,
        userOrderId: normalized.userOrderId ?? order.userOrderId ?? null,
        submittedAt: normalized.submittedAt ?? requestedAt
    };
    return {
        data,
        raw: response,
        renderTable: () => renderKeyValueTable([
            { field: 'Action', value: data.action },
            { field: 'Submitted', value: data.submitted },
            { field: 'Order id', value: data.orderId },
            { field: 'Pair', value: data.pair },
            { field: 'Side', value: data.side },
            { field: 'Type', value: data.orderType },
            { field: 'Price', value: data.price },
            { field: 'Quantity', value: data.qty },
            { field: 'Post only', value: data.postOnly },
            { field: 'User order id', value: data.userOrderId },
            { field: 'Submitted at', value: data.submittedAt }
        ])
    };
}
function buildCancelOrderResult(order, response, requestedAt) {
    const normalized = normalizeCanceledOrder(response);
    const data = {
        action: 'cancel',
        submitted: true,
        orderId: normalized.orderId ?? order.orderId,
        pair: normalized.pair ?? marketPair(toCode(order.targetCurrency), toCode(order.quoteCurrency)),
        userOrderId: normalized.userOrderId ?? order.userOrderId ?? null,
        status: normalized.status ?? null,
        canceledAt: normalized.canceledAt ?? requestedAt,
        canceledQty: normalized.canceledQty ?? null,
        remainQty: normalized.remainQty ?? null
    };
    return {
        data,
        raw: response,
        renderTable: () => renderKeyValueTable([
            { field: 'Action', value: data.action },
            { field: 'Submitted', value: data.submitted },
            { field: 'Order id', value: data.orderId },
            { field: 'Pair', value: data.pair },
            { field: 'User order id', value: data.userOrderId },
            { field: 'Status', value: data.status },
            { field: 'Canceled at', value: data.canceledAt },
            { field: 'Canceled quantity', value: data.canceledQty },
            { field: 'Remaining quantity', value: data.remainQty }
        ])
    };
}
function normalizeActiveOrders(response) {
    const orders = response.active_orders ?? response.orders ?? [];
    return orders.map((order) => normalizeActiveOrder(order));
}
function normalizeOrderDetail(response) {
    const entry = response.order_detail ?? response.order;
    if (!entry) {
        throw new CoinoneCliError('Coinone returned no order detail for this request.');
    }
    return normalizeOrderDetailEntry(entry);
}
function normalizeCompletedOrders(response) {
    const orders = response.completed_orders ?? response.orders ?? response.transactions ?? [];
    return orders.map((order) => normalizeCompletedOrder(order));
}
function normalizePlacedOrder(response) {
    const order = readRecord(response.order);
    const quoteCurrency = readString(response.quote_currency) ?? readString(order?.quote_currency) ?? readString(order?.quoteCurrency);
    const targetCurrency = readString(response.target_currency) ?? readString(order?.target_currency) ?? readString(order?.targetCurrency);
    const side = readString(response.side) ?? readString(order?.side) ?? readString(order?.order_side) ?? readString(order?.type);
    const orderType = readString(response.order_type) ?? readString(order?.order_type) ?? readString(order?.orderType);
    return {
        orderId: readString(response.order_id) ?? readString(order?.order_id) ?? readString(order?.orderId) ?? null,
        userOrderId: readString(response.user_order_id) ??
            readString(order?.user_order_id) ??
            readString(order?.userOrderId) ??
            null,
        pair: quoteCurrency && targetCurrency
            ? marketPair(toCode(targetCurrency), toCode(quoteCurrency))
            : undefined,
        side: side === 'buy' || side === 'sell' ? side : undefined,
        orderType: orderType === 'limit' ? orderType : undefined,
        price: readString(response.price) ?? readString(order?.price),
        qty: readString(response.qty) ?? readString(order?.qty),
        postOnly: readBoolean(response.post_only) ?? readBoolean(order?.post_only) ?? readBoolean(order?.postOnly),
        submittedAt: formatTime(readString(response.submitted_at) ??
            readString(order?.submitted_at) ??
            readString(order?.created_at) ??
            readString(response.server_time)) ?? undefined
    };
}
function normalizeCanceledOrder(response) {
    const order = readRecord(response.order);
    const quoteCurrency = readString(response.quote_currency) ?? readString(order?.quote_currency) ?? readString(order?.quoteCurrency);
    const targetCurrency = readString(response.target_currency) ?? readString(order?.target_currency) ?? readString(order?.targetCurrency);
    return {
        orderId: readString(response.order_id) ?? readString(order?.order_id) ?? readString(order?.orderId) ?? null,
        userOrderId: readString(response.user_order_id) ??
            readString(order?.user_order_id) ??
            readString(order?.userOrderId) ??
            null,
        pair: quoteCurrency && targetCurrency
            ? marketPair(toCode(targetCurrency), toCode(quoteCurrency))
            : undefined,
        status: readString(response.status) ?? readString(order?.status),
        canceledAt: formatTime(readString(response.canceled_at) ??
            readString(order?.canceled_at) ??
            readString(response.server_time)) ?? undefined,
        canceledQty: readString(response.canceled_qty) ??
            readString(response.cancel_qty) ??
            readString(order?.canceled_qty) ??
            readString(order?.cancel_qty),
        remainQty: readString(response.remain_qty) ?? readString(order?.remain_qty)
    };
}
function normalizeActiveOrder(order) {
    const quoteCurrency = readString(order.quote_currency) ?? readString(order.quoteCurrency);
    const targetCurrency = readString(order.target_currency) ?? readString(order.targetCurrency);
    const createdAtValue = readString(order.created_at) ?? readString(order.timestamp);
    return {
        orderId: readString(order.order_id) ?? readString(order.orderId),
        pair: quoteCurrency && targetCurrency
            ? marketPair(toCode(targetCurrency), toCode(quoteCurrency))
            : undefined,
        side: readString(order.side) ?? readString(order.order_side) ?? readString(order.type),
        orderType: readString(order.order_type) ?? readString(order.orderType),
        price: readString(order.price),
        qty: readString(order.qty) ?? readString(order.original_qty) ?? readString(order.originalQty),
        remainingQty: readString(order.remain_qty) ??
            readString(order.remaining_qty) ??
            readString(order.remainingQty),
        createdAt: formatTime(createdAtValue)
    };
}
function normalizeOrderDetailEntry(order) {
    const quoteCurrency = readString(order.quote_currency) ?? readString(order.quoteCurrency);
    const targetCurrency = readString(order.target_currency) ?? readString(order.targetCurrency);
    return {
        orderId: readString(order.order_id) ?? readString(order.orderId),
        userOrderId: readString(order.user_order_id) ?? readString(order.userOrderId),
        pair: quoteCurrency && targetCurrency
            ? marketPair(toCode(targetCurrency), toCode(quoteCurrency))
            : undefined,
        side: readString(order.side) ?? readString(order.order_side) ?? readString(order.type),
        orderType: readString(order.order_type) ?? readString(order.orderType),
        status: readString(order.status),
        price: readString(order.price),
        qty: readString(order.qty) ?? readString(order.original_qty) ?? readString(order.originalQty),
        filledQty: readString(order.filled_qty) ??
            readString(order.executed_qty) ??
            readString(order.filledQty) ??
            readString(order.executedQty),
        remainingQty: readString(order.remain_qty) ??
            readString(order.remaining_qty) ??
            readString(order.remainingQty),
        averageExecutedPrice: readString(order.average_executed_price) ?? readString(order.averageExecutedPrice),
        fee: readString(order.fee),
        feeRate: readString(order.fee_rate) ?? readString(order.feeRate),
        createdAt: formatTime(readString(order.created_at) ?? readString(order.createdAt)),
        updatedAt: formatTime(readString(order.updated_at) ?? readString(order.updatedAt))
    };
}
function normalizeCompletedOrder(order) {
    const quoteCurrency = readString(order.quote_currency) ?? readString(order.quoteCurrency);
    const targetCurrency = readString(order.target_currency) ?? readString(order.targetCurrency);
    const feeCurrency = readString(order.fee_currency) ?? readString(order.feeCurrency);
    return {
        tradeId: readString(order.trade_id) ?? readString(order.tradeId),
        orderId: readString(order.order_id) ?? readString(order.orderId),
        userOrderId: readString(order.user_order_id) ?? readString(order.userOrderId),
        pair: quoteCurrency && targetCurrency
            ? marketPair(toCode(targetCurrency), toCode(quoteCurrency))
            : undefined,
        side: readString(order.side) ?? readString(order.order_side) ?? readString(order.type),
        orderType: readString(order.order_type) ?? readString(order.orderType),
        price: readString(order.price),
        qty: readString(order.qty),
        fee: readString(order.fee),
        feeCurrency: feeCurrency ? toCode(feeCurrency) : undefined,
        completedAt: formatTime(readString(order.completed_at) ?? readString(order.completedAt) ?? readString(order.timestamp))
    };
}
function formatTime(value) {
    if (!value) {
        return undefined;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? formatTimestamp(numeric) : value;
}
function readString(value) {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number') {
        return String(value);
    }
    return undefined;
}
function readBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        if (value === 'true') {
            return true;
        }
        if (value === 'false') {
            return false;
        }
    }
    return undefined;
}
function readRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}
//# sourceMappingURL=orders.js.map