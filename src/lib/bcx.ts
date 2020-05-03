import { subscribe, unsubscribe, flush as _flushWs, send } from "./socket";
import { TickerResponse, MarketResponse, OrderCreationRequest, Order, BalancesResponse, Channel, ChannelEvent, OrderCreationResponse, OrderUpdated, MarketLevel, TradingSubscriptionCallback, Action, OrderStatus } from "./types";


export default class Bcx {
    private apiSecret?: string;
    private isSubscribedTrading = false;

    /**
     * Constructor
     * @param apiSecret the API secret generated on https://exchange.blockchain.com (optional)
     * The API secret is only required for authenticated endpoints 
     */
    constructor(apiSecret?: string) {
        this.apiSecret = apiSecret;
    }

    private enforceAuthToken(method: string) {
        if(!this.apiSecret) {
            throw new Error(method + " requires an api secret to be supplied as an argument during the Bcx class initialisation.")
        }
    }

    // ** Anonymous Methods (don't require an apiSecret) ** // 

     /**
     * Fetches a ticker with a symbol (e.g. BTC-USD)
     * @param symbol 
     */
    async getTicker(symbol: string): Promise<TickerResponse> {
        
        return new Promise(async (resolve, reject) => {
            try {
                await subscribe(Channel.TICKER, async (res) => {
                    if(res.event === ChannelEvent.SNAPSHOT) {
                        await unsubscribe(Channel.TICKER, { symbol : symbol})
                        resolve(res as TickerResponse)
                    }
                }, { symbol : symbol} )
            } catch(err) { reject(err) }
        })
    }


    /**
     * Subscribe to a particular symbol's ticker using a callback. 
     * The promise resolves when the subscription has been created.
     * @param symbol the market to subscribe to (e.g. BTC-USD)
     * @param callback the callback will receive a stream of TickerResponses
     */
    async subscribeTicker(symbol: string, callback: (ticker: TickerResponse) => void): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                await subscribe(Channel.TICKER, async (res) => {
                    callback(res as TickerResponse)
                    resolve()
                }, { symbol : symbol} )
            } catch(err) { reject(err) }
        })
    }

    /**
     * Unsubscribe from a previously subscribed ticker
     * The promise resolves when the subscription has been removed.
     * @param symbol the market that you subscribed to (e.g. BTC-USD)
     */
    async unsubscribeTicker(symbol: string): Promise<void> {
        return unsubscribe(Channel.TICKER, { symbol : symbol});
    }

    /**
     * Fetches a level 2 or level 3 snapshot of the orderbook
     * @param symbol the market to fetch (e.g. BTC-USD)
     * @param level MarketLevel: 'l2' or 'l3'
     */
    async getMarket(symbol: string, level: MarketLevel = 'l2'): Promise<MarketResponse> {
        return new Promise(async (resolve, reject) => {
            try {
                await subscribe(level as Channel, async (res) => {
                    if(res.event === ChannelEvent.SNAPSHOT) {
                        await unsubscribe(level as Channel, { symbol : symbol})
                        resolve(res as MarketResponse)
                    }
                }, { symbol : symbol} )
            } catch(err) { reject(err) }
        })
    }

    /**
     * Subscribe to a particular symbol's orderbook updates. 
     * The promise resolves when the subscription has been created.
     * @param symbol the market to subscribe to (e.g. BTC-USD)
     * @param level MarketLevel: 'l2' or 'l3'
     * @param callback he callback will receive a stream of MarketResponse
     */
    async subscribeMarket(symbol: string, level: MarketLevel = 'l2', callback: (market: MarketResponse) => void): Promise<void> {
          return new Promise(async (resolve, reject) => {
            try {
                await subscribe(level as Channel, async (res) => {
                    callback(res as MarketResponse)
                    resolve()
                }, { symbol : symbol} )
            } catch(err) { reject(err) }
        })
    }
    
     /**
     * Unsubscribe from a previously subscribed market
     * The promise resolves when the subscription has been removed.
     * @param symbol the market that you subscribed to (e.g. BTC-USD)
     * @param level MarketLevel: 'l2' or 'l3'
     */
    async unsubscribeMarket(symbol: string, level: MarketLevel = 'l2'): Promise<void> {
        return unsubscribe(level as Channel, { symbol : symbol});
    }
    
    /**
     * Fetches the account balance
     */
    async getBalances(): Promise<BalancesResponse> {
        this.enforceAuthToken("getBalances()");
        
        return new Promise(async (resolve, reject) => {
            try {
                await subscribe(Channel.BALANCES, async (res) => {
                    if(res.event === ChannelEvent.SNAPSHOT) {
                        await unsubscribe(Channel.BALANCES)
                        resolve(res as BalancesResponse)
                    }
                }, {}, this.apiSecret)
            } catch(err) { reject(err) }
        })
    }
    
    /**
     * Subscribe to changes in your account balances. 
     * The promise resolves when the subscription has been created.
     * @param callback receives a stream of BalancesResponse as they change
     */
    async subscribeBalances(callback: (balances: BalancesResponse) => void): Promise<void> {
        this.enforceAuthToken("subscribeBalances()");

        return new Promise(async (resolve, reject) => {
            try {
                console.log("ABOUT TO SUBCRIBE BALANCES")
                await subscribe(Channel.BALANCES, async (res) => {
                    console.log("SUCCESS SUBSCRIBE BALANCE")
                    callback(res as BalancesResponse)
                    resolve()
                }, {}, this.apiSecret)
            } catch(err) { 
                reject(err) 
                console.log("FAIL SUBSCRIBE BALANCE", err)
            }
        })
    }

    /**
     * Unsubscribe from a previously subscribed balances
     * The promise resolves when the subscription has been removed.
     */
    unsubscribeBalances(): Promise<void> {
        this.enforceAuthToken("unsubscribeBalances()");
        return unsubscribe(Channel.BALANCES);
    }

    /**
     * Subscribes to the trading channel. 
     * The trading channel is used for submitting orders and listening to updates to them.  
     * @param callback receives a stream of TradingSubscriptionCallback, including order updates and snapshots of open orders
     */
    subscribeTrading(callback: (trading: TradingSubscriptionCallback) => void): Promise<void> {
        this.enforceAuthToken("createOrder()");
        return new Promise(async (resolve, reject) => {
            if(this.isSubscribedTrading) {
                reject(new Error("You are already subscribed to trading"))
            }
            try {
                await subscribe(Channel.TRADING, async (res) => {
                    if(res.event == ChannelEvent.SUBSCRIBED) {
                        this.isSubscribedTrading = true;
                    }
                    callback(res as TradingSubscriptionCallback)
                    resolve()
                }, {}, this.apiSecret)
            } catch(err) { reject(err) }
        })
    }

    /**
     * Removes a trading channel subscription
     * The promise resolves when the subscription has been removed.
     */
    unsubcribeTrading(): Promise<void> {
        this.enforceAuthToken("unsubcribeTrading()");

        if(!this.isSubscribedTrading) {
            return Promise.reject("You not subscribed to trading");
        }

        return unsubscribe(Channel.TRADING).then(() => { this.isSubscribedTrading = false })
    }

    /**
     * Creates an order.
     * IF you were previously subscribed to trading, the promise will resolve when the order has been submitted. You'd get a notification in your existing subscription.
     * 
     * Otherwise, it will subscribe for you (temporarily) and return an OrderCreationResponse with the details of your order. 
     * @param order an OrderCreationRequest. This can be either a market, limit, stop or a stop limit order type.
     */
    async createOrder(order: OrderCreationRequest): Promise<OrderCreationResponse> {
        this.enforceAuthToken("createOrder()");

        if(this.isSubscribedTrading) {
            await send({
                action: Action.NEW_ORDER_SINGLE,
                channel: Channel.TRADING,            
                ...order
            }, this.apiSecret)
            return Promise.resolve(undefined);
        } else {
            return new Promise((resolve, reject) => {
                try {
                    this.subscribeTrading(async (trading: TradingSubscriptionCallback) => {
                        switch(trading.event) {
                            case ChannelEvent.SUBSCRIBED: 
                            case ChannelEvent.UNSUBSCRIBED:
                            case ChannelEvent.SNAPSHOT:
                                break;
                            case ChannelEvent.UPDATED:
                                if(order.clOrdID === (trading as OrderUpdated).clOrdID) {
                                    await unsubscribe(Channel.TRADING)
                                    return resolve(trading as OrderUpdated)
                                }
                                return;
                            case ChannelEvent.REJECTED: 
                            default:
                                await unsubscribe(Channel.TRADING)
                                return reject(new Error("Order " + order.clOrdID + " rejected because " + trading.text));
        
                        }
                    })    
                } catch (err) {
                    reject(err)
                }
            });
        }
    }
    
    /**
     * Utility method. Allows you to fetch an order by the client order Id (clOrdID).
     * @param clOrdID The clientOrderId to fetch an order by (string)
     */
    async getOrderByClientOrderId(clOrdID: string): Promise<Order> {
        this.enforceAuthToken("getOrder()");
        
        const orders = await this.getOpenOrders();

        const order = orders.find(order => order.clOrdID === clOrdID)

        if(!order) {
            throw new Error("Order with clOrdID " + clOrdID + " not found")
        }

        return order;
    }

    /**
     * Allows you to fetch an order by the Blockchain Exchange order id 
     * @param orderID string
     */
    async getOrder(orderID: string): Promise<Order> {
        this.enforceAuthToken("getOrder()");
        
        const orders = await this.getOpenOrders();

        const order = orders.find(order => order.orderID === orderID)

        if(!order) {
            throw new Error("Order with orderId " + orderID + " not found")
        }

        return order;
    }

    /**
     * Fetches all open orders by client. This call will not work if the client is subscribed to trading already.
     * To use this method, either end your subscription and make this call or restart it catching the 'SNAPSHOT' event sent to the callback which includes your open orders
     */
    async getOpenOrders(): Promise<Order[]> {
        this.enforceAuthToken("getOpenOrders()");

        if(this.isSubscribedTrading) {
            throw new Error("You can't fetch open orders if you're subscribed to trading. Either end your subscription and make this call or restart it catching the 'SNAPSHOT' event which includes your open orders")
        }

        return new Promise(async (resolve, reject) => {
            try {
                await this.subscribeTrading(trading => {
                    switch(trading.event) {
                        case ChannelEvent.SNAPSHOT:
                            // @ts-ignore
                            return resolve(trading.orders as Order[])
                        default:
                            return;
                    }
                });
            } catch (err) {
                reject(err)
            }
        });
    }

    /**
     * Allows you to cancel an order by orderID
     * 
     * IF you were previously subscribed to trading, the promise will resolve when the order cancellation request has been submitted. You'd get a notification in your existing subscription.
     * 
     * Otherwise, it will subscribe for you (temporarily) and return an OrderCreationResponse with the details of your now cancelled order. 
     *
     * 
     * @param orderID string
     */
    async cancelOrder(orderID: string): Promise<OrderCreationResponse> {
        this.enforceAuthToken("cancelOrder()");
        
        if(this.isSubscribedTrading) {
            await send({
                action: Action.CANCEL_ORDER_REQUEST,
                channel: Channel.TRADING,            
                orderID: orderID
            }, this.apiSecret)
            return Promise.resolve(undefined);
        } else {
            return new Promise(async (resolve, reject) => {
                try {
                    await this.subscribeTrading(async (trading: TradingSubscriptionCallback) => {
                        switch(trading.event) {
                            case ChannelEvent.SUBSCRIBED: 
                            case ChannelEvent.UNSUBSCRIBED:
                            case ChannelEvent.SNAPSHOT:
                                break;
                            case ChannelEvent.UPDATED:
                                if(orderID === (trading as OrderUpdated).orderID && (trading as OrderUpdated).ordStatus === OrderStatus.CANCELLED) {
                                    await unsubscribe(Channel.TRADING)
                                    return resolve(trading as OrderUpdated)
                                }
                                break;
                            case ChannelEvent.REJECTED: 
                                await unsubscribe(Channel.TRADING)
                                reject(new Error("Cancelling order " + orderID + " rejected because " + trading.text));
                                break;
                            default:
                                break;
        
                        }
                    })
                    await send({
                        action: Action.CANCEL_ORDER_REQUEST,
                        channel: Channel.TRADING,            
                        orderID: orderID
                    }, this.apiSecret)    
                } catch (err) {
                    reject(err)
                }
            });
        }   
    }

    /**
     * Utility method. Cancels ALL open orders by client. This call will not work if the client is subscribed to trading already.
     * To use this method, either end your subscription and make this call or restart it catching the 'SNAPSHOT' event sent to the callback which includes your open orders, then cancel them individually using the cancel order method.
     */
    async cancelAllOrders(): Promise<Order[]> {
        this.enforceAuthToken("cancelAllOrders()");

        if(this.isSubscribedTrading) {
            throw new Error("You can't cancel all open orders if you're subscribed to trading. Either end your subscription and make this call again or restart it catching the 'SNAPSHOT' event which includes your open orders, then cancel them individually")
        }

        return new Promise(async (resolve, reject) => {
            try {
                const orders = await this.getOpenOrders();

                if(orders.length === 0) {
                    resolve();
                }

                await this.subscribeTrading(async (trading: TradingSubscriptionCallback) => {
                    switch(trading.event) {
                        case ChannelEvent.SUBSCRIBED: 
                        case ChannelEvent.UNSUBSCRIBED:
                        case ChannelEvent.SNAPSHOT:
                            break;
                        case ChannelEvent.UPDATED:
                            if((trading as OrderUpdated).ordStatus === OrderStatus.CANCELLED) {
                                const order = orders.find(order => order.orderID === (trading as OrderUpdated).orderID);
                                // @ts-ignore
                                order.ordStatus = OrderStatus.CANCELLED;
                            }

                            if(orders.filter(order => order.ordStatus !== OrderStatus.CANCELLED).length === 0) {
                                // if there are no more open orders, resolve the promise
                                await unsubscribe(Channel.TRADING)
                                resolve(orders)
                            }
                            break;
                        case ChannelEvent.REJECTED: 
                        default:
                            reject(new Error("Cancelling all orders rejected because " + trading.text));
    
                    }
                })   
                 
                for(let i = 0; i < orders.length; i++) {
                    await send({action: Action.CANCEL_ORDER_REQUEST,
                        channel: Channel.TRADING,            
                        orderID: orders[i].orderID})
                }
            } catch (err) {
                reject(err)
            }
        });
    }

     // ** Utility Methods ** // 
    
     /**
      * Resets internal state
      */
     flush(): void {
        this.apiSecret = undefined;
        this.isSubscribedTrading = false;
        _flushWs()
    }

    /**
     * Sets the authentication token (in case it wasn't passed in the constructor)
     * @param authenticationToken 
     */
    setAuthenticationToken(authenticationToken: string): void {
        this.apiSecret = authenticationToken;
    }
}