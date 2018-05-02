#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("core-js/shim");
const graphql_1 = require("graphql");
const graphqlHTTP = require("express-graphql");
const lodash_1 = require("lodash");
const proxy_1 = require("./proxy");
const fake_definition_graphql_1 = require("./fake_definition_graphql");
function buildServerSchema(idl) {
    const fakeIDL = new graphql_1.Source(fake_definition_graphql_1.default, "Fake definition AST");
    const fakeAST = graphql_1.parse(fakeIDL);
    var ast = graphql_1.concatAST([graphql_1.parse(idl), fakeAST]);
    return graphql_1.buildASTSchema(ast);
}
exports.fakerProxy = (fakedSchema, url) => graphqlHTTP(req => {
    const fakeIDL = new graphql_1.Source(fakedSchema, `Introspection from faked schema`);
    return proxy_1.proxyMiddleware(url, [])
        .then(([schemaIDL, cb]) => {
        schemaIDL = new graphql_1.Source(schemaIDL, `Inrospection from "${url}"`);
        if (fakeIDL) {
            const schema = buildServerSchema(schemaIDL);
            fakeIDL.body = fakeIDL.body.replace("<RootTypeName>", schema.getQueryType().name);
        }
        const schema = buildServerSchema(schemaIDL);
        const forwardHeaders = lodash_1.pick(req.headers, []);
        return Object.assign({}, cb(schema, fakeIDL, forwardHeaders), { graphiql: true });
    })
        .catch(error => {
        console.log(error);
    });
});
//# sourceMappingURL=index.js.map