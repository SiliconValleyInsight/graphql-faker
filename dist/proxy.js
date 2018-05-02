"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = require("node-fetch");
const node_fetch_2 = require("node-fetch");
const lodash_1 = require("lodash");
const graphql_1 = require("graphql");
const fake_schema_1 = require("./fake_schema");
function proxyMiddleware(url, headers) {
    const remoteServer = requestFactory(url, headers);
    return getIntrospection().then(introspection => {
        const introspectionSchema = graphql_1.buildClientSchema(introspection.data);
        const introspectionIDL = graphql_1.printSchema(introspectionSchema);
        return [introspectionIDL, (serverSchema, extensionIDL, forwardHeaders) => {
                const extensionAST = graphql_1.parse(extensionIDL);
                const extensionFields = getExtensionFields(extensionAST);
                const schema = graphql_1.extendSchema(serverSchema, extensionAST);
                fake_schema_1.fakeSchema(schema);
                //TODO: proxy extensions
                return {
                    schema,
                    formatError: error => (Object.assign({}, graphql_1.formatError(error), lodash_1.get(error, 'originalError.extraProps', {}))),
                    rootValue: (info) => {
                        const operationName = info.operationName;
                        const variables = info.variables;
                        const query = stripQuery(schema, info.document, operationName, extensionFields);
                        return remoteServer(query, variables, operationName, forwardHeaders)
                            .then(buildRootValue);
                    },
                };
            }];
    });
    function getIntrospection() {
        return remoteServer(graphql_1.introspectionQuery)
            .then(introspection => {
            if (introspection.errors)
                throw Error(JSON.stringify(introspection.errors, null, 2));
            return introspection;
        })
            .catch(error => {
            throw Error(`Can't get introspection from ${url}:\n${error.message}`);
        });
    }
}
exports.proxyMiddleware = proxyMiddleware;
function buildRootValue(response) {
    const rootValue = response.data;
    const globalErrors = [];
    for (const error of (response.errors || [])) {
        if (!error.path)
            globalErrors.push(error);
        const { message, locations: _1, path: _2 } = error, extraProps = __rest(error, ["message", "locations", "path"]);
        const errorObj = new Error(error.message);
        errorObj.extraProps = extraProps;
        // Recreate root value up to a place where original error was thrown
        // and place error as field value.
        lodash_1.set(rootValue, error.path, errorObj);
    }
    // TODO proxy global errors
    if (globalErrors.length !== 0)
        console.error('Global Errors:\n', globalErrors);
    return rootValue;
}
function getExtensionFields(extensionAST) {
    const extensionFields = {};
    (extensionAST.definitions || []).forEach(def => {
        if (def.kind !== graphql_1.Kind.TYPE_EXTENSION_DEFINITION)
            return;
        const typeName = def.definition.name.value;
        // FIXME: handle multiple extends of the same type
        extensionFields[typeName] = def.definition.fields.map(field => field.name.value);
    });
    return extensionFields;
}
function injectTypename(node) {
    return Object.assign({}, node, { selections: [
            ...node.selections,
            {
                kind: graphql_1.Kind.FIELD,
                name: {
                    kind: graphql_1.Kind.NAME,
                    value: '__typename',
                },
            },
        ] });
}
function stripQuery(schema, queryAST, operationName, extensionFields) {
    const typeInfo = new graphql_1.TypeInfo(schema);
    const changedAST = graphql_1.visit(queryAST, graphql_1.visitWithTypeInfo(typeInfo, {
        [graphql_1.Kind.FIELD]: () => {
            const typeName = typeInfo.getParentType().name;
            const fieldName = typeInfo.getFieldDef().name;
            if (fieldName.startsWith('__'))
                return null;
            if ((extensionFields[typeName] || []).includes(fieldName))
                return null;
        },
        [graphql_1.Kind.SELECTION_SET]: {
            leave(node) {
                const type = typeInfo.getParentType();
                if (graphql_1.isAbstractType(type) || node.selections.length === 0)
                    return injectTypename(node);
            }
        },
    }));
    let operation = extractOperation(changedAST, operationName);
    operation = removeUnusedVariables(operation);
    return graphql_1.print(operation);
}
function removeUnusedVariables(queryAST) {
    const seenVariables = {};
    graphql_1.visit(queryAST, {
        [graphql_1.Kind.VARIABLE_DEFINITION]: () => false,
        [graphql_1.Kind.VARIABLE]: (node) => {
            seenVariables[node.name.value] = true;
        },
    });
    // Need to second visit to account for variables used in fragments
    // so we make modification only when we seen all variables.
    return graphql_1.visit(queryAST, {
        [graphql_1.Kind.OPERATION_DEFINITION]: {
            leave(node) {
                const variableDefinitions = (node.variableDefinitions || []).filter(def => seenVariables[def.variable.name.value]);
                return Object.assign({}, node, { variableDefinitions });
            },
        },
    });
}
function extractOperation(queryAST, operationName) {
    const operations = graphql_1.separateOperations(queryAST);
    if (operationName)
        return operations[operationName];
    return Object.values(operations)[0];
}
function requestFactory(url, headersObj) {
    return (query, variables, operationName, forwardHeaders) => {
        return node_fetch_1.default(url, {
            method: 'POST',
            headers: new node_fetch_2.Headers(Object.assign({ "content-type": 'application/json' }, headersObj, forwardHeaders)),
            body: JSON.stringify({
                operationName,
                query,
                variables,
            })
        }).then(responce => {
            if (responce.ok)
                return responce.json();
            return responce.text().then(body => {
                throw Error(`${responce.status} ${responce.statusText}\n${body}`);
            });
        });
    };
}
//# sourceMappingURL=proxy.js.map