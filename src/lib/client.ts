import { getPrivateAuthConfig, preparePrivateRequest } from './auth.js';
import { CoinoneCliError, rateLimitHint } from './errors.js';
import type {
  ActiveOrdersResponse,
  BalancesResponse,
  CancelOrderResponse,
  CoinoneEnvelope,
  CompletedOrdersResponse,
  CurrenciesResponse,
  JsonRecord,
  MarketsResponse,
  OrderBookResponse,
  OrderDetailResponse,
  PlaceOrderResponse,
  PrivateAuthEnv,
  RangeUnitsResponse,
  TradeFeeResponse,
  TradeFeesResponse,
  TickersResponse,
  TradesResponse
} from './types.js';

export interface FetchLike {
  (input: string | URL | Request, init?: RequestInit): Promise<Response>;
}

export function buildUrl(
  baseUrl: string,
  path: string,
  query: Record<string, string | number | boolean | undefined> = {}
): string {
  const url = new URL(path.replace(/^\//, ''), `${baseUrl.replace(/\/$/, '')}/`);

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

function normalizeApiFailure(
  response: Response,
  payload: Partial<CoinoneEnvelope> | undefined,
  rawBody: string
): CoinoneCliError {
  const code = payload?.error_code;
  const message = payload?.error_msg ?? `Coinone API request failed with ${response.status}`;
  const limitHint = rateLimitHint(response.headers);

  let causeHint: string | undefined;

  if (response.status === 429) {
    causeHint = limitHint
      ? `Rate limit reached. ${limitHint}`
      : 'Rate limit reached. Retry after a short delay.';
  } else if (response.status >= 500) {
    causeHint = 'Coinone API is unavailable or returned a temporary server error.';
  } else if (response.status === 404) {
    causeHint = 'Check the resource path and currency symbols.';
  } else if (code && code !== '0') {
    causeHint = 'Coinone returned an application-level error for this request.';
  }

  return new CoinoneCliError(message, {
    code,
    status: response.status,
    causeHint,
    details: rawBody ? rawBody.slice(0, 300) : undefined
  });
}

function normalizeNetworkFailure(error: unknown, timeoutMs?: number): CoinoneCliError {
  if (error instanceof Error && error.name === 'TimeoutError') {
    return new CoinoneCliError(
      timeoutMs ? `Request timed out after ${timeoutMs}ms.` : 'Request timed out.',
      {
        causeHint: 'Increase `--timeout` or retry when the Coinone API is responding normally.',
        details: error.message
      }
    );
  }

  return new CoinoneCliError('Unable to reach Coinone API.', {
    causeHint: 'Check your network connection and try again.',
    details: error instanceof Error ? error.message : String(error)
  });
}

function buildRequestSignal(
  signal: AbortSignal | null | undefined,
  timeoutMs: number | undefined
): AbortSignal | undefined {
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
  private baseUrl: string;
  private timeoutMs: number | undefined;
  private readonly env: PrivateAuthEnv;
  private readonly fetchImplementation: FetchLike;

  constructor(
    options: {
      baseUrl?: string;
      timeoutMs?: number;
      env?: PrivateAuthEnv;
      fetchImplementation?: FetchLike;
    } = {}
  ) {
    this.baseUrl = options.baseUrl ?? 'https://api.coinone.co.kr';
    this.timeoutMs = options.timeoutMs;
    this.env = options.env ?? process.env;
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  setRuntimeOptions(options: { baseUrl?: string; timeoutMs?: number }): void {
    if (options.baseUrl !== undefined) {
      this.baseUrl = options.baseUrl;
    }

    if (options.timeoutMs !== undefined) {
      this.timeoutMs = options.timeoutMs;
    }
  }

  async listMarkets(quoteCurrency: string): Promise<MarketsResponse> {
    return this.getJson<MarketsResponse>(`/public/v2/markets/${quoteCurrency}`);
  }

  async getMarket(quoteCurrency: string, targetCurrency: string): Promise<MarketsResponse> {
    return this.getJson<MarketsResponse>(
      `/public/v2/markets/${quoteCurrency}/${targetCurrency}`
    );
  }

  async listCurrencies(): Promise<CurrenciesResponse> {
    return this.getJson<CurrenciesResponse>('/public/v2/currencies');
  }

  async getCurrency(currency: string): Promise<CurrenciesResponse> {
    return this.getJson<CurrenciesResponse>(`/public/v2/currencies/${currency}`);
  }

  async listTickers(quoteCurrency: string): Promise<TickersResponse> {
    return this.getJson<TickersResponse>(`/public/v2/ticker_new/${quoteCurrency}`);
  }

  async getTicker(quoteCurrency: string, targetCurrency: string): Promise<TickersResponse> {
    return this.getJson<TickersResponse>(
      `/public/v2/ticker_new/${quoteCurrency}/${targetCurrency}`
    );
  }

  async getOrderBook(
    quoteCurrency: string,
    targetCurrency: string,
    size?: number
  ): Promise<OrderBookResponse> {
    return this.getJson<OrderBookResponse>(
      `/public/v2/orderbook/${quoteCurrency}/${targetCurrency}`,
      { size }
    );
  }

  async listTrades(
    quoteCurrency: string,
    targetCurrency: string,
    size?: number
  ): Promise<TradesResponse> {
    return this.getJson<TradesResponse>(`/public/v2/trades/${quoteCurrency}/${targetCurrency}`, {
      size
    });
  }

  async getRangeUnits(
    quoteCurrency: string,
    targetCurrency: string
  ): Promise<RangeUnitsResponse> {
    return this.getJson<RangeUnitsResponse>(
      `/public/v2/range_units/${quoteCurrency}/${targetCurrency}`
    );
  }

  async listBalances(): Promise<BalancesResponse> {
    return this.postPrivateJson<BalancesResponse>('/v2.1/account/balance/all');
  }

  async getBalance(currencies: string[]): Promise<BalancesResponse> {
    return this.postPrivateJson<BalancesResponse>('/v2.1/account/balance', {
      currencies
    });
  }

  async listTradeFees(): Promise<TradeFeesResponse> {
    return this.postPrivateJson<TradeFeesResponse>('/v2.1/account/trade_fee');
  }

  async getTradeFee(quoteCurrency: string, targetCurrency: string): Promise<TradeFeeResponse> {
    return this.postPrivateJson<TradeFeeResponse>(
      `/v2.1/account/trade_fee/${quoteCurrency}/${targetCurrency}`
    );
  }

  async listActiveOrders(filters: {
    quoteCurrency?: string;
    targetCurrency?: string;
    orderTypes?: string[];
  }): Promise<ActiveOrdersResponse> {
    return this.postPrivateJson<ActiveOrdersResponse>('/v2.1/order/active_orders', {
      ...(filters.quoteCurrency ? { quote_currency: filters.quoteCurrency } : {}),
      ...(filters.targetCurrency ? { target_currency: filters.targetCurrency } : {}),
      ...(filters.orderTypes && filters.orderTypes.length > 0
        ? { order_type: filters.orderTypes }
        : {})
    });
  }

  async getOrderDetail(filters: {
    orderId: string;
    quoteCurrency: string;
    targetCurrency: string;
    userOrderId?: string;
  }): Promise<OrderDetailResponse> {
    return this.postPrivateJson<OrderDetailResponse>('/v2.1/order/detail', {
      order_id: filters.orderId,
      quote_currency: filters.quoteCurrency,
      target_currency: filters.targetCurrency,
      ...(filters.userOrderId ? { user_order_id: filters.userOrderId } : {})
    });
  }

  async listCompletedOrders(filters: {
    fromTs: number;
    toTs: number;
    size: number;
    toTradeId?: string;
    quoteCurrency?: string;
    targetCurrency?: string;
  }): Promise<CompletedOrdersResponse> {
    const path =
      filters.quoteCurrency && filters.targetCurrency
        ? '/v2.1/order/completed_orders'
        : '/v2.1/order/completed_orders/all';

    return this.postPrivateJson<CompletedOrdersResponse>(path, {
      size: filters.size,
      from_ts: filters.fromTs,
      to_ts: filters.toTs,
      ...(filters.toTradeId ? { to_trade_id: filters.toTradeId } : {}),
      ...(filters.quoteCurrency ? { quote_currency: filters.quoteCurrency } : {}),
      ...(filters.targetCurrency ? { target_currency: filters.targetCurrency } : {})
    });
  }

  async placeOrder(order: {
    quoteCurrency: string;
    targetCurrency: string;
    side: 'buy' | 'sell';
    orderType: 'limit';
    price: string;
    qty: string;
    postOnly?: boolean;
    userOrderId?: string;
  }): Promise<PlaceOrderResponse> {
    return this.postPrivateJson<PlaceOrderResponse>('/v2.1/order', {
      quote_currency: order.quoteCurrency.toUpperCase(),
      target_currency: order.targetCurrency.toUpperCase(),
      side: order.side.toUpperCase(),
      type: order.orderType.toUpperCase(),
      price: order.price,
      qty: order.qty,
      post_only: order.postOnly ?? true,
      ...(order.userOrderId ? { user_order_id: order.userOrderId } : {})
    });
  }

  async cancelOrder(order: {
    orderId: string;
    quoteCurrency: string;
    targetCurrency: string;
    userOrderId?: string;
  }): Promise<CancelOrderResponse> {
    return this.postPrivateJson<CancelOrderResponse>('/v2.1/order/cancel', {
      order_id: order.orderId,
      quote_currency: order.quoteCurrency,
      target_currency: order.targetCurrency,
      ...(order.userOrderId ? { user_order_id: order.userOrderId } : {})
    });
  }

  private async getJson<TResponse extends CoinoneEnvelope>(
    path: string,
    query: Record<string, string | number | boolean | undefined> = {}
  ): Promise<TResponse> {
    const url = buildUrl(this.baseUrl, path, query);

    return this.requestJson<TResponse>(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': 'coinone-api-cli'
      }
    });
  }

  private async postPrivateJson<TResponse extends CoinoneEnvelope & JsonRecord>(
    path: string,
    body: JsonRecord = {}
  ): Promise<TResponse> {
    const url = buildUrl(this.baseUrl, path);
    const auth = getPrivateAuthConfig(this.env);
    const request = preparePrivateRequest(body, auth);

    return this.requestJson<TResponse>(url, {
      method: 'POST',
      headers: request.headers,
      body: request.body
    });
  }

  private async requestJson<TResponse extends CoinoneEnvelope>(
    url: string,
    init: RequestInit
  ): Promise<TResponse> {
    const signal = buildRequestSignal(init.signal, this.timeoutMs);
    const requestInit = signal ? { ...init, signal } : init;

    let response: Response;
    try {
      response = await this.fetchImplementation(url, requestInit);
    } catch (error) {
      throw normalizeNetworkFailure(error, this.timeoutMs);
    }

    const rawBody = await response.text();
    let payload: TResponse | undefined;

    if (rawBody.length > 0) {
      try {
        payload = JSON.parse(rawBody) as TResponse;
      } catch {
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
