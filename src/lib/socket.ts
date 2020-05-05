import { Channel, BaseSubscribeRequest, Action, BaseResponse, ChannelEvent, BaseUnsubscribeRequest, BaseRequest } from './types';
import WebSocket from 'isomorphic-ws';

const API = 'wss://ws.prod.blockchain.info/mercury-gateway/v1/ws'
interface Listener {
    channel: Channel,
    params? : any,
    clientListener: (data: any ) => void
    socketHandler: (event: any) => void
}

let listeners: Listener[] = [];
let isAuthed = false;

// @ts-ignore
let _ws: WebSocket = undefined;

function flush(): void {
    // @ts-ignore
    _ws = undefined;
    listeners = [];
    isAuthed = false;
}

async function authenticate(ws: WebSocket, authToken: string): Promise<void> {
    const req: {token: string} & BaseSubscribeRequest = {
        action: Action.SUBSCRIBE,
        channel: Channel.AUTH,
        token: authToken
    }

    if(isAuthed) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {

        const authHandler = (res: any) => {
            if(!res) {
                return;
            }
            const json = JSON.parse(res.data);

            if(json.channel !== Channel.AUTH) {
                return;
            }

            if(json.event === ChannelEvent.SUBSCRIBED) {
                isAuthed = true;
                ws.removeEventListener('message', authHandler)
                resolve()
            } else if (json.event === ChannelEvent.REJECTED) {
                console.error("Authentication failed. Have you activated your API key via email? Response received: " + json.text)
                reject(new Error(json.text))
            }
        };

        ws.addEventListener('message', authHandler);

        // send authenticated message
        _ws.send(JSON.stringify(req), (err) => {
            if(err) {
                console.error("Error when authenticating", err);
                return reject(err);
            }
        })
    })
}

async function send<Request extends BaseRequest>(
    request: Request, 
    authToken?: string): Promise<void> {

    if(!_ws) {
        _ws = await getSocket()
    }

    if(authToken) {
        await authenticate(_ws, authToken);
    }

    return new Promise((resolve, reject) => {
        _ws.send(JSON.stringify(request), (err) => {
            if(err) {
                console.error("Error when sending to channel " + request.channel, err);
                return reject(err);
            }
            resolve();
        })
    });
}


function getSocket(): Promise<WebSocket> {

    return new Promise((resolve, reject) => {

        const ws = new WebSocket(API, {
            origin: 'https://exchange.blockchain.com'
        });
    
        ws.onopen = () => {
            resolve(ws);
        };

        ws.onerror = (event) => {
            console.error("There was an error connecting to the websockets ", JSON.stringify(event, undefined, 2))
            reject(new Error(event.error));
        }
          
        ws.onclose = () => {
            // console.log("ws closed (onClose handler)");
            reject(new Error("ws closed"));
        };
    });
}

function getListener(channel: Channel, params: {} = {}): Listener | undefined {
    return listeners.find(l => l.channel === channel && JSON.stringify(l.params) === JSON.stringify(params))
}

async function unsubscribe(channel: Channel, params?: {}): Promise<void>{

    const listener = getListener(channel, params);
    
    if(!_ws || !listener) {
        throw new Error("You are not subscribed to the channel " + channel)
    }

    // remove all listeners pointers from array and their accompanying socket handlers
    listeners = listeners.filter(l => l.channel !== channel && JSON.stringify(l.params) !== JSON.stringify(params));
    _ws.removeEventListener('message', listener.socketHandler);
    
    return new Promise((resolve, reject) => {

        // this tmpSocketHandler will just handle the unsubscription event
        const tmpSocketHandler = (data: any) => {
            if(!data) {
                return;
            }
            const json = JSON.parse(data.data);

            if(json.event === ChannelEvent.UNSUBSCRIBED) {
                // console.log("Unsubscribed from channel " + channel);

                // remove tmp socket handler from ws event listener
                _ws.removeEventListener('message', tmpSocketHandler);

                return resolve()
            } else if (json.event === ChannelEvent.REJECTED) {
                console.error("Unsubscribing from channel failed. Response received " + json.text)

                // re add listener to mantain invariants
                listeners.push(listener)
                _ws.addEventListener('message', listener.socketHandler);
                
                // remove tmp socket handler from ws event listener
                _ws.removeEventListener('message', tmpSocketHandler);

                return reject(new Error(json.text));
            }   

        }

        _ws.addEventListener('message', tmpSocketHandler)

        const req: BaseUnsubscribeRequest = {
            action: Action.UNSUBSCRIBE,
            channel: channel,
            ...params
        }

        // send usubscribe request
        _ws.send(JSON.stringify(req), (err) => {
            if(err) {
                console.error("Error when subscribing to channel " + channel, err);
                return reject(err);
            }
        })
    });
}

async function subscribe<Response extends BaseResponse>(
        channel: Channel, 
        listener: (data: Response ) => void, 
        params: {} = {}, 
        authToken?: string): Promise<void> {

    if(!_ws) {
       _ws = await getSocket()
    }

    if(!listener) {
        return Promise.reject(new Error("You must pass a valid listener to the subscription event"))
    }

    // enforce that there's not already a listener for this channel
    if(getListener(channel, params)) {
        return Promise.reject(new Error("You already have a listener set for channel " + channel));
    }

    // if this channel requires auth and the user hasn't authenticated (enforced by authenticate() call) then do so
    if(authToken) {
        await authenticate(_ws, authToken);
    }

    // create a set of listeners, add it to array. Wrap it in a promise, so that the subscribed/rejected call the top level promise
    return new Promise((resolve, reject) => {
        const handler: Listener = {
            channel: channel,
            params: params,
            clientListener: listener, 
            socketHandler: (data: any) => {
                if(!data) {
                    return;
                }

                let json = data.data? data.data : JSON.parse(data);
                
                if(json.channel === channel) {
                    const clientListener = getListener(channel, params)?.clientListener;
                    if(!clientListener) {
                        return resolve()
                    }
                    switch(json.event) {
                        case ChannelEvent.SUBSCRIBED: 
                            // console.debug("Subscribed to channel " + channel);
                            return resolve();
                        case ChannelEvent.REJECTED:
                            console.error("Joining the channel " + json.channel + " failed due to " + json.text);
                            return reject(new Error(json.text));
                        default:
                            // console.log("Subscribe handler, log event " + JSON.stringify(json))
                            return clientListener(json);
                    }
                }
            }
        }

        listeners.push(handler);
        
        const req: {} & BaseSubscribeRequest = {
            action: Action.SUBSCRIBE,
            channel: channel,
            ...params
        }
        
        _ws.on('message', handler.socketHandler);

        // send subscribe message. Pass a callback to handle network errors
        _ws.send(JSON.stringify(req), (err) => {
            if(err) {
                console.error("Error when subscribing to channel " + channel, err);
                return reject(err);
            }
        })
    });
}

export {
    send,
    subscribe,
    unsubscribe,
    flush
}