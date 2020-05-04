export enum Channel {
    AUTH = 'auth',
    BALANCES = 'balances',
    HEARTBEAT = 'heartbeat',
    MARKET_L2 = 'l2',
    MARKET_L3 = 'l3',
    PRICES = 'prices',
    SYMBOLS = 'symbols',
    TICKER = 'ticker',
    TRADES = 'trades',
    TRADING = 'trading',
  }

  export enum OrderType{
    LIMIT = 'limit',
    MARKET = 'market',
    STOP = 'stop',
    STOP_LIMIT = 'stopLimit'
  }

  export enum OrderStatus {
    CANCELLED = 'cancelled',
    EXPIRED = 'expired',
    OPEN = 'open',
    PARTIAL = 'partial',
    PENDING = 'pending',
    REJECTED = 'rejected',
  }

  export enum ExecType {
    NEW = "0",
    CANCELLED = "4",
    EXPIRED = "C",
    REJECTED = "8",
    PARTIAL_FILL = "F",
    PENDING = "A",
    TRADE_BREAK = "H",
    ORDER_STATUS = "I"
  }

  export enum OrderTimeInForce {
    GOOD_TILL_CANCEL = 'GTC',
    GOOD_TILL_DATE = 'GTD',
    FILL_OR_KILL = 'FOK',
    IMMEDIATE_OR_CANCEL = 'IOC'
  }

  export enum Action {
    SUBSCRIBE = 'subscribe',
    UNSUBSCRIBE = 'unsubscribe',
    NEW_ORDER_SINGLE = 'NewOrderSingle',
    CANCEL_ORDER_REQUEST = "CancelOrderRequest",
  }

export enum ChannelEvent {
    SUBSCRIBED = 'subscribed',
    UNSUBSCRIBED = 'unsubscribed',
    REJECTED = 'rejected',
    SNAPSHOT = 'snapshot',
    UPDATED = 'updated'
  }

export interface BaseResponse {
    seqnum: number
    event: ChannelEvent,
    channel: Channel,
    // timestamp?: Date | string
    text?: string
}

export interface BaseRequest {
    action: Action,
    channel: Channel
}

export interface BaseSubscribeRequest {
    action: Action.SUBSCRIBE,
    channel: Channel
}

export interface BaseUnsubscribeRequest {
    action: Action.UNSUBSCRIBE,
    channel: Channel
}

export interface HeartbeatResponse extends BaseResponse { } 

export interface MarketL2SubscribeRequest extends BaseSubscribeRequest {
    symbol: string
}

type RestingOrder = {
    px: number,
    qty: number,
    num: number
}

export interface    MarketResponse extends BaseResponse {
    symbol: string,
    bids: RestingOrder[],
    asks: RestingOrder[]
}

export interface MarketL3SubscribeRequest extends MarketL2SubscribeRequest {}

export interface PricesSubscribeRequest extends BaseSubscribeRequest {
    symbol: string,
    granularity: 60 | 300 | 900 | 3600 | 21600 | 86400
}

// The price data is an array consisting of [timestamp, open, high, low, close, volume]
// this was added to the prices key
// the other values were broken down as separate keys for convenience
export interface PriceResponse extends BaseResponse { 
    symbol: string,
    prices: number[],
    timestamp: Date | string
    open: number,
    high: number,
    low: number,
    close: number,
    volume: number
} 

type SymbolProps = {
    base_currency: string, 
    base_currency_scale: number,
    counter_currency: string, 
    counter_currency_scale: number,
    min_price_increment: number,
    min_price_increment_scale: number,
    min_order_size: number,
    min_order_size_scale: number,
    max_order_size: 0,
    max_order_size_scale: number,
    lot_size: number,
    lot_size_scale: number,
    status: 'open' | 'close' | 'suspend' | 'halt' | 'halt-freeze',
    id: number,
    auction_price: number,
    auction_size: number,
    auction_time: string,
    imbalance: number
}

export interface SymbolResponse extends BaseResponse {
    symbols: {
        [symbol: string]: SymbolProps
    }
}

export interface TickerSubscribeRequest extends BaseSubscribeRequest {
    symbol: string
}

export interface TickerResponse extends BaseResponse {
    symbol: string,
    price_24h: number,
    volume_24h: number,
    last_trade_price: number
}

export interface TradesSubscribeRequest extends BaseSubscribeRequest {
    symbol: string
}

export interface TickerResponse extends BaseResponse {
    symbol: string,
    timestamp: Date | string
    side: OrderSide,
    qty: number,
    price: number,
    trade_id: string
}

type OrderSide = 'buy' | 'sell'

export interface TradesSubscribeRequest extends BaseSubscribeRequest {
    symbol: string
}

export interface AuthenticatedSubscribeRequest extends BaseSubscribeRequest {
    token: string,
}

export type Order = {
    orderID: string,
    clOrdID: string,
    symbol: string,
    side: OrderSide,
    ordType: OrderType,
    orderQty: number,
    leavesQty: number,
    cumQty: number,
    avgPx: number,
    ordStatus: OrderStatus,
    timeInForce: OrderTimeInForce,
    text?: string,
    execType: string,
    execID: string,
    transactTime: Date | string,
    msgType: number,
    lastPx: number,
    lastShares: number,
    tradeId: string,
    price: number
}

export interface BaseOrderCreationRequest {
    clOrdID: string,
    symbol: string,
    orderQty: number,
    ordType: OrderType,
    side: OrderSide,
}

export interface MarketOrderCreationRequest extends BaseOrderCreationRequest {
    timeInForce?: OrderTimeInForce,
    minQty?: number
}

export interface LimitOrderCreationRequest extends BaseOrderCreationRequest {
    execInst?: 'ALO'
    expireDate?: Date | string,
    minQty?: number
    price: number,
    timeInForce: OrderTimeInForce,
}

export interface StopOrderCreationRequest extends BaseOrderCreationRequest {
    timeInForce: OrderTimeInForce,
    stopPx: number
}

export interface StopLimitOrderCreationRequest extends BaseOrderCreationRequest {
    timeInForce: OrderTimeInForce,
    price: number,
    stopPx: number
}

export type OrderCreationRequest = 
    MarketOrderCreationRequest |
    LimitOrderCreationRequest |
    StopOrderCreationRequest |
    StopLimitOrderCreationRequest;

export type OrderCreationResponse = undefined | OrderUpdated;

export type CancelOrderRequest = {
    action: 'CancelOrderRequest',
    channel: 'trading',
    orderID: string  
}

type Balance = {
    currency: string,
    balance: number,
    available: number,
    balance_local: number,
    available_local: number,
    rate: number
}

export interface BalancesResponse extends BaseResponse {
    balances: Balance[]
    total_available_local: number,
    total_balance_local: number
}

export type MarketLevel = 'l2' | 'l3';

export interface OrderSnapshot extends BaseResponse {
    orders: Order[]
}

export interface OrderUpdated extends BaseResponse {
    execType: ExecType,
    ordStatus: OrderStatus,
    orderID: string,
    clOrdID: string,
    orderQty: number,
    ordType: OrderType,
    side: OrderSide,
    symbol: string,
    transactTime?: string,
    text?: string,
}

export type TradingSubscriptionCallback = OrderSnapshot | OrderUpdated | BaseResponse