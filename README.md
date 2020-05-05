# Blockchain Exchange JS

An opinionated Promise-based Typescript library for the [Blockchain.com Exchange](https://exchange.blockchain.com). 💪

It is compatible on both browsers and NodeJs environments via the [isomorphic-ws](https://www.npmjs.com/package/isomorphic-ws) package. It uses:

- [ws](https://github.com/websockets/ws) on Node
- [global.WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) in browsers

This library supports streaming via callbacks or simpler promise-based methods.

## Getting started

**1. Get the package:**

  *Via NPM ->*
```s
npm install blockchain-exchange --save
```

  *Via Yarn ->*
```s
yarn install blockchain-exchange
```

**2. Instantiate the class**

```javascript
import Bcx from "blockchain-exchange"

// note: the API_SECRET is only required if you're planning to make authenticated calls.
// You can generate an api key on https://exchange.blockchain.com
const bcx = new Bcx(API_SECRET);
```

**3. Trade away and don't get wrecked!** 💸

```javascript
try {
    // use async / await to make promises 'feel' synchronous
    // let TS and the IDE guide you through the arguments allowed to speed up development!
    const order = await bcx.createOrder({
        clOrdID: "my_order_id",
        symbol: "BTC-USD",
        orderQty: 0.15,
        ordType: OrderType.LIMIT,
        side: "buy",
        price: 100000,
        timeInForce: OrderTimeInForce.GOOD_TILL_CANCEL
   });

    // A part of the order immediately filled! Let's check our balances.
   if(order.ordStatus === OrderStatus.PARTIAL) {
       console.log(`My balance is: ${JSON.stringify(await bcx.getBalances())}`);
   }
} catch (error) {
    console.error("There was an error", error);
}

```

## Anonymous Methods
These methods do not require an `apiSecret` to be passed in to the class.

```javascript
/**
 * Constructor
 * @param apiSecret the API secret generated on https://exchange.blockchain.com (optional)
 * The API secret is only required for authenticated endpoints
 */
constructor(apiSecret?: string);

/**
* Fetches a ticker with a symbol (e.g. BTC-USD)
* @param symbol
*/
getTicker(symbol: string): Promise<TickerResponse>;

/**
 * Subscribe to a particular symbol's ticker using a callback.
 * The promise resolves when the subscription has been created.
 * @param symbol the market to subscribe to (e.g. BTC-USD)
 * @param callback the callback will receive a stream of TickerResponses
 */
subscribeTicker(symbol: string, callback: (ticker: TickerResponse) => void): Promise<void>;

/**
 * Unsubscribe from a previously subscribed ticker
 * The promise resolves when the subscription has been removed.
 * @param symbol the market that you subscribed to (e.g. BTC-USD)
 */
unsubscribeTicker(symbol: string): Promise<void>;

/**
 * Fetches a level 2 or level 3 snapshot of the orderbook
 * @param symbol the market to fetch (e.g. BTC-USD)
 * @param level MarketLevel: 'l2' or 'l3'
 */
getMarket(symbol: string, level?: MarketLevel): Promise<MarketResponse>;

/**
 * Subscribe to a particular symbol's orderbook updates.
 * The promise resolves when the subscription has been created.
 * @param symbol the market to subscribe to (e.g. BTC-USD)
 * @param level MarketLevel: 'l2' or 'l3'
 * @param callback he callback will receive a stream of MarketResponse
 */
subscribeMarket(symbol: string, level: MarketLevel, callback: (market: MarketResponse) => void): Promise<void>;

/**
* Unsubscribe from a previously subscribed market
* The promise resolves when the subscription has been removed.
* @param symbol the market that you subscribed to (e.g. BTC-USD)
* @param level MarketLevel: 'l2' or 'l3'
*/
unsubscribeMarket(symbol: string, level?: MarketLevel): Promise<void>;

/**
 * Resets internal state
 */
flush(): void;

/**
 * Sets the authentication token (in case it wasn't passed in the constructor)
 * @param authenticationToken
 */
setAuthenticationToken(authenticationToken: string): void;
```

## Authenticated methods
These methods require an `apiSecret` either on instatiation of the class or via the `setAuthenticationToken()` method.

```javascript
/**
* Fetches the account balance
*/
getBalances(): Promise<BalancesResponse>;

/**
* Subscribe to changes in your account balances.
* The promise resolves when the subscription has been created.
* @param callback receives a stream of BalancesResponse as they change
*/
subscribeBalances(callback: (balances: BalancesResponse) => void): Promise<void>;

/**
* Unsubscribe from a previously subscribed balances
* The promise resolves when the subscription has been removed.
*/
unsubscribeBalances(): Promise<void>;

/**
* Subscribes to the trading channel.
* The trading channel is used for submitting orders and listening to updates to them.
* @param callback receives a stream of TradingSubscriptionCallback, including order updates and snapshots of open orders
*/
subscribeTrading(callback: (trading: TradingSubscriptionCallback) => void): Promise<void>;

/**
* Removes a trading channel subscription
* The promise resolves when the subscription has been removed.
*/
unsubcribeTrading(): Promise<void>;

/**
* Creates an order.
* IF you were previously subscribed to trading, the promise will resolve when the order has been submitted. You'd get a notification in your existing subscription.
*
* Otherwise, it will subscribe for you (temporarily) and return an OrderCreationResponse with the details of your order.
* @param order an OrderCreationRequest. This can be either a market, limit, stop or a stop limit order type.
*/
createOrder(order: OrderCreationRequest): Promise<OrderCreationResponse>;

/**
* Utility method. Allows you to fetch an order by the client order Id (clOrdID).
* @param clOrdID The clientOrderId to fetch an order by (string)
*/
getOrderByClientOrderId(clOrdID: string): Promise<Order>;

/**
* Allows you to fetch an order by the Blockchain Exchange order id
* @param orderID string
*/
getOrder(orderID: string): Promise<Order>;

/**
* Fetches all open orders by client. This call will not work if the client is subscribed to trading already.
* To use this method, either end your subscription and make this call or restart it catching the 'SNAPSHOT' event sent to the callback which includes your open orders
*/
getOpenOrders(): Promise<Order[]>;

/**
* Allows you to cancel an order by orderID
*
* IF you were previously subscribed to trading, the promise will resolve when the order cancellation request has been submitted. You'd get a notification in your existing subscription.
*
* Otherwise, it will subscribe for you (temporarily) and return an OrderCreationResponse with the details of your now cancelled order.
*
* @param orderID string
*/
cancelOrder(orderID: string): Promise<OrderCreationResponse>;

/**
* Utility method. Cancels ALL open orders by client. This call will not work if the client is subscribed to trading already.
* To use this method, either end your subscription and make this call or restart it catching the 'SNAPSHOT' event sent to the callback which includes your open orders, then cancel them individually using the cancel order method.
*/
cancelAllOrders(): Promise<Order[]>;
```

## Notes
- A series of integration tests have been added, you can run them by running `npm run test`. You will need an `API_SECRET` for some of them. 

- All PRs are welcome! 