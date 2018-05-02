"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const fake_1 = require("./fake");
const stdTypeNames = Object.keys(fake_1.typeFakers);
function astToJSON(ast) {
    switch (ast.kind) {
        case graphql_1.Kind.NULL:
            return null;
        case graphql_1.Kind.INT:
            return parseInt(ast.value, 10);
        case graphql_1.Kind.FLOAT:
            return parseFloat(ast.value);
        case graphql_1.Kind.STRING:
        case graphql_1.Kind.BOOLEAN:
            return ast.value;
        case graphql_1.Kind.LIST:
            return ast.values.map(astToJSON);
        case graphql_1.Kind.OBJECT:
            return ast.fields.reduce((object, { name, value }) => {
                object[name.value] = astToJSON(value);
                return object;
            }, {});
    }
}
function fakeSchema(schema) {
    const mutationType = schema.getMutationType();
    const jsonType = schema.getTypeMap()['examples__JSON'];
    jsonType['parseLiteral'] = astToJSON;
    for (const type of Object.values(schema.getTypeMap())) {
        if (type instanceof graphql_1.GraphQLScalarType && !stdTypeNames.includes(type.name)) {
            type.serialize = (value => value);
            type.parseLiteral = astToJSON;
            type.parseValue = (x => x);
        }
        if (type instanceof graphql_1.GraphQLObjectType && !type.name.startsWith('__'))
            addFakeProperties(type);
        if (graphql_1.isAbstractType(type))
            type.resolveType = (obj => obj.__typename);
    }
    ;
    function addFakeProperties(objectType) {
        const isMutation = (objectType === mutationType);
        for (const field of Object.values(objectType.getFields())) {
            if (isMutation && isRelayMutation(field))
                field.resolve = getRelayMutationResolver();
            else
                field.resolve = getFieldResolver(field, objectType);
        }
    }
    function isRelayMutation(field) {
        const args = field.args;
        if (args.length !== 1 || args[0].name !== 'input')
            return false;
        const inputType = args[0].type;
        // TODO: check presence of 'clientMutationId'
        return (inputType instanceof graphql_1.GraphQLNonNull &&
            inputType.ofType instanceof graphql_1.GraphQLInputObjectType &&
            field.type instanceof graphql_1.GraphQLObjectType);
    }
    function getFieldResolver(field, objectType) {
        const fakeResolver = getResolver(field.type, field);
        return (source, _0, _1, info) => {
            if (source && source.$example && source[field.name]) {
                return source[field.name];
            }
            const value = getCurrentSourceProperty(source, info.path);
            return (value !== undefined) ? value : fakeResolver(objectType);
        };
    }
    function getRelayMutationResolver() {
        return (source, args, _1, info) => {
            const value = getCurrentSourceProperty(source, info.path);
            if (value instanceof Error)
                return value;
            return Object.assign({}, args['input'], value);
        };
    }
    // get value or Error instance injected by the proxy
    function getCurrentSourceProperty(source, path) {
        return source && source[path.key];
    }
    function getResolver(type, field) {
        if (type instanceof graphql_1.GraphQLNonNull)
            return getResolver(type.ofType, field);
        if (type instanceof graphql_1.GraphQLList)
            return arrayResolver(getResolver(type.ofType, field));
        if (graphql_1.isAbstractType(type))
            return abstractTypeResolver(type);
        return fieldResolver(type, field);
    }
    function abstractTypeResolver(type) {
        const possibleTypes = schema.getPossibleTypes(type);
        return () => ({ __typename: fake_1.getRandomItem(possibleTypes) });
    }
}
exports.fakeSchema = fakeSchema;
function fieldResolver(type, field) {
    const directiveToArgs = Object.assign({}, getFakeDirectives(type), getFakeDirectives(field));
    const { fake, examples } = directiveToArgs;
    if (graphql_1.isLeafType(type)) {
        if (examples)
            return () => fake_1.getRandomItem(examples.values);
        if (fake) {
            return () => fake_1.fakeValue(fake.type, fake.options, fake.locale);
        }
        return getLeafResolver(type);
    }
    else {
        // TODO: error on fake directive
        if (examples) {
            return () => (Object.assign({}, fake_1.getRandomItem(examples.values), { $example: true }));
        }
        return () => ({});
    }
}
function arrayResolver(itemResolver) {
    return (...args) => {
        let length = fake_1.getRandomInt(2, 4);
        const result = [];
        while (length-- !== 0)
            result.push(itemResolver(...args));
        return result;
    };
}
function getFakeDirectives(object) {
    const directives = object['appliedDirectives'];
    if (!directives)
        return {};
    const result = {};
    if (directives.isApplied('fake'))
        result.fake = directives.getDirectiveArgs('fake');
    if (directives.isApplied('examples'))
        result.examples = directives.getDirectiveArgs('examples');
    return result;
}
function getLeafResolver(type) {
    if (type instanceof graphql_1.GraphQLEnumType) {
        const values = type.getValues().map(x => x.value);
        return () => fake_1.getRandomItem(values);
    }
    const typeFaker = fake_1.typeFakers[type.name];
    if (typeFaker)
        return typeFaker.generator(typeFaker.defaultOptions);
    else
        return () => `<${type.name}>`;
}
//# sourceMappingURL=fake_schema.js.map