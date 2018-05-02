#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("core-js/shim");
const graphql_1 = require("graphql");
const express = require("express");
const graphqlHTTP = require("express-graphql");
const lodash_1 = require("lodash");
const proxy_1 = require("./proxy");
const fake_definition_graphql_1 = require("./fake_definition_graphql");
const app = express();
function buildServerSchema(idl) {
  const fakeIDL = new graphql_1.Source(
    fake_definition_graphql_1.default,
    "Fake definition AST"
  );
  const fakeAST = graphql_1.parse(fakeIDL);
  var ast = graphql_1.concatAST([graphql_1.parse(idl), fakeAST]);
  return graphql_1.buildASTSchema(ast);
}
const fakerProxy = (fakedSchema, url) =>
  graphqlHTTP(req => {
    const fakeIDL = new graphql_1.Source(
      fakedSchema,
      `Introspection from faked schema`
    );
    return proxy_1
      .proxyMiddleware(url, [])
      .then(([schemaIDL, cb]) => {
        schemaIDL = new graphql_1.Source(
          schemaIDL,
          `Inrospection from "${url}"`
        );
        if (fakeIDL) {
          const schema = buildServerSchema(schemaIDL);
          fakeIDL.body = fakeIDL.body.replace(
            "<RootTypeName>",
            schema.getQueryType().name
          );
        }
        const schema = buildServerSchema(schemaIDL);
        const forwardHeaders = lodash_1.pick(req.headers, []);
        return Object.assign({}, cb(schema, fakeIDL, forwardHeaders), {
          graphiql: true
        });
      })
      .catch(error => {
        console.log(error);
      });
  });
const url =
  "https://59y35kj8hj.execute-api.us-east-1.amazonaws.com/develop/graphql";
const fakedSchema = `
  extend type <RootTypeName> {
    assets: [Asset]
    symbols: [Symbol]
    exchanges: [Exchange]
    exchange(id: ID!): Exchange
    trades(symbol: ID!): [Trade]
    ticker(symbol: ID!): Ticker
    orderBook: OrderBook
    candlestick(from: String, to: String): Candlestick
  }

  type Asset {
    name: String @examples(values: ["Bitcoin", "EOS", "Ethereum"])
    symbol: String @examples(values: ["BTC", "EOS", "ETH"])
  }

  type Symbol {
    base: Asset!
    quote: Asset!
  }

  type Exchange {
      name: String @examples(values: ["Huobi", "Bitfinex", "Binance", "Poloniex", "Bittrex"])
      url: String @fake(type: url)
  }

  enum TradeType {
      BUY
      SELL
  }

  type Trade {
    timestamp: String! @fake(type: recentDate, options: {dateFormat: "YYYY-MM-DD"})
    symbol: Symbol!
    price: Float @fake(type: money, options: {minMoney: 10, maxMoney: 1000, decimalPlaces: 2})
    amount: Int
    exchange: Exchange!
    tradeType: TradeType
  }

  type Ticker {
    symbol: Symbol!
    timestamp: String! @fake(type: recentDate, options: {dateFormat: "YYYY-MM-DD"})
    mid: Float!
    bid: Float!
    ask: Float!
    lastPrice: Float @fake(type: money, options: {minMoney: 10, maxMoney: 1000, decimalPlaces: 2})
    highestPrice: Float @fake(type: money, options: {minMoney: 10, maxMoney: 1000, decimalPlaces: 2})
    lowestPrice: Float @fake(type: money, options: {minMoney: 10, maxMoney: 1000, decimalPlaces: 2})
    volume: Float
  }

  type Order {
      price: Float!
      amount: Float!
  }

  type OrderBook {
      symbol: Symbol
      bids: [Order]
      asks: [Order]
      timestamp: String! @fake(type: recentDate, options: {dateFormat: "YYYY-MM-DD"})
  }

  type DataPoint {
    timestamp: String! @fake(type: recentDate, options: {dateFormat: "YYYY-MM-DD"})
    open: Float!
    close: Float!
    high: Float!
    low: Float!
    volume: Float!
  }

  type Candlestick {
    dataPoints: [DataPoint!]!
  }
`;
app.use("/graphql", fakerProxy(fakedSchema, url));
app.listen(3001);
//# sourceMappingURL=index.js.map
