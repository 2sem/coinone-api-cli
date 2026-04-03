import { getPrivateAuthConfig, preparePrivateRequest } from './auth.js';
import { CoinoneCliError, rateLimitHint } from './errors.js';
export function buildUrl(baseUrl, path, query = {}) {
    const url = new URL(path.replace(/^\//, ''), `${baseUrl.replace(/\/$/, '')}/`);
    for (const [key, value] of Object.entries(query)) {
        if (value === undefined) {
            continue;
        }
        url.searchParams.set(key, String(value));
    }
    return url.toString();
}
function normalizeApiFailure(response, payload, rawBody) {
    const code = payload?.error_code;
    const message = payload?.error_msg ?? `Coinone API request failed with ${response.status}`;
    const limitHint = rateLimitHint(response.headers);
    let causeHint;
    if (response.status === 429) {
        causeHint = limitHint
            ? `Rate limit reached. ${limitHint}`
            : 'Rate limit reached. Retry after a short delay.';
    }
    else if (response.status >= 500) {
        causeHint = 'Coinone API is unavailable or returned a temporary server error.';
    }
    else if (response.status === 404) {
        causeHint = 'Check the resource path and currency symbols.';
    }
    else if (code && code !== '0') {
        causeHint = 'Coinone returned an application-level error for this request.';
    }
    return new CoinoneCliError(message, {
        code,
        status: response.status,
        causeHint,
        details: rawBody ? rawBody.slice(0, 300) : undefined
    });
}
function normalizeNetworkFailure(error, timeoutMs) {
    if (error instanceof Error && error.name === 'TimeoutError') {
        return new CoinoneCliError(timeoutMs ? `Request timed out after ${timeoutMs}ms.` : 'Request timed out.', {
            causeHint: 'Increase `--timeout` or retry when the Coinone API is responding normally.',
            details: error.message
        });
    }
    return new CoinoneCliError('Unable to reach Coinone API.', {
        causeHint: 'Check your network connection and try again.',
        details: error instanceof Error ? error.message : String(error)
    });
}
function buildRequestSignal(signal, timeoutMs) {
    if (!signal && timeoutMs === undefined) {
        return undefined;
    }
    if (timeoutMs === undefined) {
        return signal ?? undefined;
    }
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    if (!signal) {
        return timeoutSignal;
    }
    return AbortSignal.any([signal, timeoutSignal]);
}
export class CoinoneClient {
    baseUrl;
    timeoutMs;
    env;
    fetchImplementation;
    constructor(options = {}) {
        this.baseUrl = options.baseUrl ?? 'https://api.coinone.co.kr';
        this.timeoutMs = options.timeoutMs;
        this.env = options.env ?? process.env;
        this.fetchImplementation = options.fetchImplementation ?? fetch;
    }
    setRuntimeOptions(options) {
        if (options.baseUrl !== undefined) {
            this.baseUrl = options.baseUrl;
        }
        if (options.timeoutMs !== undefined) {
            this.timeoutMs = options.timeoutMs;
        }
    }
    async listMarkets(quoteCurrency) {
        return this.getJson(`/public/v2/markets/${quoteCurrency}`);
    }
    async getMarket(quoteCurrency, targetCurrency) {
        return this.getJson(`/public/v2/markets/${quoteCurrency}/${targetCurrency}`);
    }
    async listCurrencies() {
        return this.getJson('/public/v2/currencies');
    }
    async getCurrency(currency) {
        return this.getJson(`/public/v2/currencies/${currency}`);
    }
    async listTickers(quoteCurrency) {
        return this.getJson(`/public/v2/ticker_new/${quoteCurrency}`);
    }
    async getTicker(quoteCurrency, targetCurrency) {
        return this.getJson(`/public/v2/ticker_new/${quoteCurrency}/${targetCurrency}`);
    }
    async getOrderBook(quoteCurrency, targetCurrency, size) {
        return this.getJson(`/public/v2/orderbook/${quoteCurrency}/${targetCurrency}`, { size });
    }
    async listTrades(quoteCurrency, targetCurrency, size) {
        return this.getJson(`/public/v2/trades/${quoteCurrency}/${targetCurrency}`, {
            size
        });
    }
    async getRangeUnits(quoteCurrency, targetCurrency) {
        return this.getJson(`/public/v2/range_units/${quoteCurrency}/${targetCurrency}`);
    }
    async listBalances() {
        return this.postPrivateJson('/v2.1/account/balance/all');
    }
    async getBalance(currencies) {
        return this.postPrivateJson('/v2.1/account/balance', {
            currencies
        });
    }
    async listTradeFees() {
        return this.postPrivateJson('/v2.1/account/trade_fee');
    }
    async getTradeFee(quoteCurrency, targetCurrency) {
        return this.postPrivateJson(`/v2.1/account/trade_fee/${quoteCurrency}/${targetCurrency}`);
    }
    async listActiveOrders(filters) {
        return this.postPrivateJson('/v2.1/order/active_orders', {
            ...(filters.quoteCurrency ? { quote_currency: filters.quoteCurrency } : {}),
            ...(filters.targetCurrency ? { target_currency: filters.targetCurrency } : {}),
            ...(filters.orderTypes && filters.orderTypes.length > 0
                ? { order_type: filters.orderTypes }
                : {})
        });
    }
    async getOrderDetail(filters) {
        return this.postPrivateJson('/v2.1/order/detail', {
            order_id: filters.orderId,
            quote_currency: filters.quoteCurrency,
            target_currency: filters.targetCurrency,
            ...(filters.userOrderId ? { user_order_id: filters.userOrderId } : {})
        });
    }
    async listCompletedOrders(filters) {
        const path = filters.quoteCurrency && filters.targetCurrency
            ? '/v2.1/order/completed_orders'
            : '/v2.1/order/completed_orders/all';
        return this.postPrivateJson(path, {
            size: filters.size,
            from_ts: filters.fromTs,
            to_ts: filters.toTs,
            ...(filters.toTradeId ? { to_trade_id: filters.toTradeId } : {}),
            ...(filters.quoteCurrency ? { quote_currency: filters.quoteCurrency } : {}),
            ...(filters.targetCurrency ? { target_currency: filters.targetCurrency } : {})
        });
    }
    async placeOrder(order) {
        return this.postPrivateJson('/v2.1/order', {
            quote_currency: order.quoteCurrency,
            target_currency: order.targetCurrency,
            side: order.side,
            order_type: order.orderType,
            price: order.price,
            qty: order.qty,
            ...(order.postOnly ? { post_only: true } : {}),
            ...(order.userOrderId ? { user_order_id: order.userOrderId } : {})
        });
    }
    async cancelOrder(order) {
        return this.postPrivateJson('/v2.1/order/cancel', {
            order_id: order.orderId,
            quote_currency: order.quoteCurrency,
            target_currency: order.targetCurrency,
            ...(order.userOrderId ? { user_order_id: order.userOrderId } : {})
        });
    }
    async getJson(path, query = {}) {
        const url = buildUrl(this.baseUrl, path, query);
        return this.requestJson(url, {
            method: 'GET',
            headers: {
                accept: 'application/json',
                'user-agent': 'coinone-api-cli'
            }
        });
    }
    async postPrivateJson(path, body = {}) {
        const url = buildUrl(this.baseUrl, path);
        const auth = getPrivateAuthConfig(this.env);
        const request = preparePrivateRequest(body, auth);
        return this.requestJson(url, {
            method: 'POST',
            headers: request.headers,
            body: request.body
        });
    }
    async requestJson(url, init) {
        const signal = buildRequestSignal(init.signal, this.timeoutMs);
        const requestInit = signal ? { ...init, signal } : init;
        let response;
        try {
            response = await this.fetchImplementation(url, requestInit);
        }
        catch (error) {
            throw normalizeNetworkFailure(error, this.timeoutMs);
        }
        const rawBody = await response.text();
        let payload;
        if (rawBody.length > 0) {
            try {
                payload = JSON.parse(rawBody);
            }
            catch {
                throw new CoinoneCliError('Coinone API returned invalid JSON.', {
                    status: response.status,
                    details: rawBody.slice(0, 300)
                });
            }
        }
        if (!response.ok || (payload?.result && payload.result !== 'success')) {
            throw normalizeApiFailure(response, payload, rawBody);
        }
        if (!payload) {
            throw new CoinoneCliError('Coinone API returned an empty response.', {
                status: response.status
            });
        }
        return payload;
    }
}
//# sourceMappingURL=client.js.map