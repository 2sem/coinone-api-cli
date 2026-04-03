export type OutputMode = 'table' | 'json' | 'raw';

export interface CoinoneEnvelope {
  result?: string;
  error_code?: string;
  error_msg?: string;
  server_time?: number;
}

export type JsonRecord = Record<string, unknown>;

export interface PrivateAuthEnv {
  COINONE_ACCESS_TOKEN?: string;
  COINONE_SECRET_KEY?: string;
}

export interface PrivateAuthConfig {
  accessToken: string;
  secretKey: string;
}

export interface PrivateAuthStatus {
  configured: boolean;
  accessTokenConfigured: boolean;
  secretKeyConfigured: boolean;
  missing: string[];
}

export interface PreparedPrivateRequest {
  body: string;
  nonce: string;
  payload: string;
  signature: string;
  headers: Record<string, string>;
}

export interface Market {
  quote_currency: string;
  target_currency: string;
  price_unit?: string;
  qty_unit: string;
  max_order_amount: string;
  max_price: string;
  max_qty: string;
  min_order_amount: string;
  min_price: string;
  min_qty: string;
  order_book_units: string[];
  maintenance_status: number;
  trade_status: number;
  order_types: string[];
}

export interface MarketsResponse extends CoinoneEnvelope {
  markets: Market[];
  server_time: number;
}

export interface Currency {
  name: string;
  symbol: string;
  deposit_status: string;
  withdraw_status: string;
  deposit_confirm_count: number;
  max_precision: number;
  deposit_fee: string;
  withdrawal_min_amount: string;
  withdrawal_fee: string;
}

export interface CurrenciesResponse extends CoinoneEnvelope {
  currencies: Currency[];
  server_time: number;
}

export interface OrderBookLevel {
  price: string;
  qty: string;
}

export interface Ticker {
  quote_currency: string;
  target_currency: string;
  timestamp: number;
  high: string;
  low: string;
  first: string;
  last: string;
  quote_volume: string;
  target_volume: string;
  best_asks: OrderBookLevel[];
  best_bids: OrderBookLevel[];
  id: string;
}

export interface TickersResponse extends CoinoneEnvelope {
  tickers: Ticker[];
  server_time: number;
}

export interface OrderBookResponse extends CoinoneEnvelope {
  timestamp: number;
  id: string;
  quote_currency: string;
  target_currency: string;
  order_book_unit: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface Trade {
  id: string;
  timestamp: number;
  price: string;
  qty: string;
  is_seller_maker: boolean;
}

export interface TradesResponse extends CoinoneEnvelope {
  quote_currency: string;
  target_currency: string;
  transactions: Trade[];
  server_time: number;
}

export interface RangeUnit {
  range_min: number;
  next_range_min: number;
  price_unit: number;
}

export interface RangeUnitsResponse extends CoinoneEnvelope {
  range_price_units: RangeUnit[];
}

export interface BalanceEntry extends JsonRecord {
  currency?: string;
  available?: string;
  limit?: string;
  average_price?: string;
}

export interface BalancesResponse extends CoinoneEnvelope, JsonRecord {
  balances?: BalanceEntry[] | Record<string, BalanceEntry | undefined>;
}

export interface TradeFeeEntry extends JsonRecord {
  currency?: string;
  fee_rate?: string;
  maker_fee_rate?: string;
  taker_fee_rate?: string;
}

export interface TradeFeesResponse extends CoinoneEnvelope, JsonRecord {
  fees?: TradeFeeEntry[] | Record<string, TradeFeeEntry | string | number | undefined>;
  fee_rates?: TradeFeeEntry[] | Record<string, TradeFeeEntry | string | number | undefined>;
}

export interface TradeFeeResponse extends CoinoneEnvelope, JsonRecord {
  quote_currency?: string;
  target_currency?: string;
  fee?: TradeFeeEntry;
  trade_fee?: TradeFeeEntry;
  fee_rate?: string;
  maker_fee_rate?: string;
  taker_fee_rate?: string;
}

export interface ActiveOrderEntry extends JsonRecord {
  order_id?: string;
  quote_currency?: string;
  target_currency?: string;
  side?: string;
  order_type?: string;
  price?: string;
  qty?: string;
  remain_qty?: string;
  created_at?: number | string;
}

export interface ActiveOrdersResponse extends CoinoneEnvelope, JsonRecord {
  active_orders?: ActiveOrderEntry[];
  orders?: ActiveOrderEntry[];
}

export interface OrderDetailEntry extends JsonRecord {
  order_id?: string;
  user_order_id?: string;
  quote_currency?: string;
  target_currency?: string;
  side?: string;
  order_type?: string;
  status?: string;
  price?: string;
  qty?: string;
  remain_qty?: string;
  filled_qty?: string;
  fee?: string;
  fee_rate?: string;
  average_executed_price?: string;
  created_at?: number | string;
  updated_at?: number | string;
}

export interface OrderDetailResponse extends CoinoneEnvelope, JsonRecord {
  order?: OrderDetailEntry;
  order_detail?: OrderDetailEntry;
}

export interface CompletedOrderEntry extends JsonRecord {
  trade_id?: string;
  order_id?: string;
  user_order_id?: string;
  quote_currency?: string;
  target_currency?: string;
  side?: string;
  order_type?: string;
  price?: string;
  qty?: string;
  fee?: string;
  fee_currency?: string;
  timestamp?: number | string;
  completed_at?: number | string;
}

export interface CompletedOrdersResponse extends CoinoneEnvelope, JsonRecord {
  completed_orders?: CompletedOrderEntry[];
  orders?: CompletedOrderEntry[];
  transactions?: CompletedOrderEntry[];
}

export interface OutputOptions {
  json?: boolean;
  output?: OutputMode;
  color?: boolean;
}

export interface CommandResult<TNormalized> {
  data: TNormalized;
  raw: unknown;
  renderTable: () => string;
}

export type EmitResult = (command: import('commander').Command, result: CommandResult<unknown>) => void;
