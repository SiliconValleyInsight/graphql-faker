#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("core-js/shim");
const graphql_1 = require("graphql");
const fs = require("fs");
const path = require("path");
const graphqlHTTP = require("express-graphql");
// import chalk from "chalk";
const lodash_1 = require("lodash");
const proxy_1 = require("./proxy");
const fakeDefinitionAST = readAST(path.join(__dirname, "fake_definition.graphql"));
function readIDL(filepath) {
    return new graphql_1.Source(fs.readFileSync(filepath, "utf-8"), filepath);
}
function readAST(filepath) {
    return graphql_1.parse(readIDL(filepath));
}
function buildServerSchema(idl) {
    var ast = graphql_1.concatAST([graphql_1.parse(idl), fakeDefinitionAST]);
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