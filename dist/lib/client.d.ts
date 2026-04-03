import type { ActiveOrdersResponse, BalancesResponse, CancelOrderResponse, CompletedOrdersResponse, CurrenciesResponse, MarketsResponse, OrderBookResponse, OrderDetailResponse, PlaceOrderResponse, PrivateAuthEnv, RangeUnitsResponse, TradeFeeResponse, TradeFeesResponse, TickersResponse, TradesResponse } from './types.js';
export interface FetchLike {
    (input: string | URL | Request, init?: RequestInit): Promise<Response>;
}
export declare function buildUrl(baseUrl: string, path: string, query?: Record<string, string | number | boolean | undefined>): string;
export declare class CoinoneClient {
    private baseUrl;
    private timeoutMs;
    private readonly env;
    private readonly fetchImplementation;
    constructor(options?: {
        baseUrl?: string;
        timeoutMs?: number;
        env?: PrivateAuthEnv;
        fetchImplementation?: FetchLike;
    });
    setRuntimeOptions(options: {
        baseUrl?: string;
        timeoutMs?: number;
    }): void;
    listMarkets(quoteCurrency: string): Promise<MarketsResponse>;
    getMarket(quoteCurrency: string, targetCurrency: string): Promise<MarketsResponse>;
    listCurrencies(): Promise<CurrenciesResponse>;
    getCurrency(currency: string): Promise<CurrenciesResponse>;
    listTickers(quoteCurrency: string): Promise<TickersResponse>;
    getTicker(quoteCurrency: string, targetCurrency: string): Promise<TickersResponse>;
    getOrderBook(quoteCurrency: string, targetCurrency: string, size?: number): Promise<OrderBookResponse>;
    listTrades(quoteCurrency: string, targetCurrency: string, size?: number): Promise<TradesResponse>;
    getRangeUnits(quoteCurrency: string, targetCurrency: string): Promise<RangeUnitsResponse>;
    listBalances(): Promise<BalancesResponse>;
    getBalance(currencies: string[]): Promise<BalancesResponse>;
    listTradeFees(): Promise<TradeFeesResponse>;
    getTradeFee(quoteCurrency: string, targetCurrency: string): Promise<TradeFeeResponse>;
    listActiveOrders(filters: {
        quoteCurrency?: string;
        targetCurrency?: string;
        orderTypes?: string[];
    }): Promise<ActiveOrdersResponse>;
    getOrderDetail(filters: {
        orderId: string;
        quoteCurrency: string;
        targetCurrency: string;
        userOrderId?: string;
    }): Promise<OrderDetailResponse>;
    listCompletedOrders(filters: {
        fromTs: number;
        toTs: number;
        size: number;
        toTradeId?: string;
        quoteCurrency?: string;
        targetCurrency?: string;
    }): Promise<CompletedOrdersResponse>;
    placeOrder(order: {
        quoteCurrency: string;
        targetCurrency: string;
        side: 'buy' | 'sell';
        orderType: 'limit';
        price: string;
        qty: string;
        postOnly?: boolean;
        userOrderId?: string;
    }): Promise<PlaceOrderResponse>;
    cancelOrder(order: {
        orderId: string;
        quoteCurrency: string;
        targetCurrency: string;
        userOrderId?: string;
    }): Promise<CancelOrderResponse>;
    private getJson;
    private postPrivateJson;
    private requestJson;
}
