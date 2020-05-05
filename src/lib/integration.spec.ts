// tslint:disable:no-expression-statement
import {serial as test} from 'ava';
import Bcx from './bcx';

// Default = undefined;
// initialise it as a string e.g. 'ey[...]='
const BCX_API_SECRET = undefined;

test.afterEach.always(t => {
  // This runs after each test and other test hooks, even if they failed
  // cleans up the static network caching layer that's there for performance
  new Bcx().flush()

  return new Promise((resolve) => {
    setTimeout(() => resolve(t.pass()), 300)
  })
});

test('Get ticker', async t => {

  const bcx = new Bcx();
  const symbol = 'BTC-USD'
  const ticker = await bcx.getTicker(symbol);

  t.is(ticker.symbol, symbol);
});

test('Subscribe to ticker', async t => {

  const bcx = new Bcx();
  const symbol = 'BTC-USD'
  return bcx.subscribeTicker(symbol, (ticker => {
    return t.is(ticker.symbol, symbol);
  }));
});

test('Subscribe to different tickers in parallel', async t => {

  const bcx = new Bcx();

  let aPassed = false, bPassed = false;

  const subA = bcx.subscribeTicker('BTC-USD', (ticker => {
    aPassed = ticker.symbol === 'BTC-USD'
  }));

  const subB = bcx.subscribeTicker('ETH-USD', (ticker => {
    bPassed = ticker.symbol === 'ETH-USD'
  }));

  await Promise.all([subA, subB]).then(() => {
    return t.is(aPassed && bPassed, true)
  })
});

test('Unsubcribing from ticker', async t => {

  const bcx = new Bcx();
  const symbol = 'BTC-USD'

  // not as useful of a test, but ensures it doesn't throw

  let _ticker: any;
  await bcx.subscribeTicker(symbol, ticker => {
    _ticker = ticker;
  });

  await bcx.unsubscribeTicker(symbol);

  if (!_ticker) {
    return t.fail();
  }
  return t.is(_ticker.symbol, symbol);
});

test('Unsubscribe ticker rejects when not subscribed', async t => {
  const bcx = new Bcx();
  const symbol = 'BTC-USD'
  try {
    await bcx.unsubscribeTicker(symbol);
  } catch (err) {
    return t.pass()
  }
  return t.fail()
});


test('Get Market', async t => {

  const bcx = new Bcx();
  const symbol = 'BTC-USD'
  const level = 'l2';
  const market = await bcx.getMarket(symbol, level);
  let passed = market.symbol === symbol;
  passed = passed && market.bids.length > 0;
  passed = passed && market.asks.length > 0;
  t.is(passed, true)
});


test('Subscribe to market', async t => {

  const bcx = new Bcx();
  const symbol = 'BTC-USD'
  const level = 'l3';

  return bcx.subscribeMarket(symbol, level, (market => {
    t.is(market.symbol, symbol)
  }));
});

test('Unsubcribing from market', async t => {

  const bcx = new Bcx();
  const symbol = 'BTC-USD'
  const level = 'l3';
  // not as useful of a test, but ensures it doesn't throw

  let _market: any;
  await bcx.subscribeMarket(symbol, level, market => {
    _market = market;
  });

  await bcx.unsubscribeMarket(symbol, level);

  if (!_market) {
    return t.fail();
  }
  t.is(_market.symbol, symbol)
});

test('Test Auth Fail', async t => {
  const bcx = new Bcx('Foo'); // fake
  try {
    await bcx.getBalances(); // should fail
  } catch (err) {
    return t.pass()
  }  
});

test('Unsubscribe market rejects when not subscribed', async t => {
  const bcx = new Bcx();
  const symbol = 'BTC-USD'
  const level = 'l3';
  try {
    await bcx.unsubscribeMarket(symbol, level);
  } catch (err) {
    return t.pass()
  }
  return t.fail()
});

test('Get Balances > 0', async t => {
  if(!BCX_API_SECRET) {
    t.fail("There is no API secret defined in the file")
  }

  const bcx = new Bcx(BCX_API_SECRET);
  try {
    const res = await bcx.getBalances();
    t.is(res.channel, 'balances')
  } catch (err) {
    console.error("Error fetching balances in test", err);
    return t.fail()
  }  
});

test('Subscribing balances', async t => {
  if(!BCX_API_SECRET) {
    t.fail("There is no API secret defined in the file")
  }

  const bcx = new Bcx(BCX_API_SECRET);

  return bcx.subscribeBalances(res => {
    t.is(res.channel, 'balances')
  });
});

test('Unsuscribe balances', async t => {
  if(!BCX_API_SECRET) {
    t.fail("There is no API secret defined in the file")
  }

  const bcx = new Bcx(BCX_API_SECRET);

  let _balances: any;

  await bcx.subscribeBalances(res => {
    _balances = res;
  });

  await bcx.unsubscribeBalances();

  if (!_balances) {
    return t.fail();
  }
  
  t.is(_balances.channel, 'balances')
});

test('Unsuscribe balances rejects when not subscribe', async t => {
  if(!BCX_API_SECRET) {
    t.fail("There is no API secret defined in the file")
  }

  const bcx = new Bcx(BCX_API_SECRET);

  try {
    await bcx.unsubscribeBalances();
  } catch (err) {
    t.pass();
  }
});

test('Subscribing trading', async t => {
  if(!BCX_API_SECRET) {
    t.fail("There is no API secret defined in the file")
  }

  const bcx = new Bcx(BCX_API_SECRET);

  return bcx.subscribeTrading(res => {
    t.is(res.channel, 'trading')
  });
});

test('Unsuscribe trading', async t => {
  if(!BCX_API_SECRET) {
    t.fail("There is no API secret defined in the file")
  }

  const bcx = new Bcx(BCX_API_SECRET);

  await bcx.subscribeTrading(async (res) => {
    if(res.event === 'subscribed') {
      await bcx.unsubcribeTrading();
    }
    t.is(res.channel, 'trading')
  });
});

test('Unsuscribe trading rejects when not subscribe', async t => {
  if(!BCX_API_SECRET) {
    t.fail("There is no API secret defined in the file")
  }

  const bcx = new Bcx(BCX_API_SECRET);

  try {
    await bcx.unsubcribeTrading();
  } catch (err) {
    t.pass();
  }
});



// test('Post limit order', async t => {
//   const bcx = new Bcx(BCX_API_SECRET);

//   const clOrdID = "Foo1";
//   await bcx.createOrder({
//     clOrdID: clOrdID,
//     symbol: "ETH-USD",
//     orderQty: 0.0001,
//     ordType: OrderType.LIMIT,
//     side: 'sell',
//     price: 100000,
//     timeInForce: OrderTimeInForce.GOOD_TILL_CANCEL
//   })
// })


