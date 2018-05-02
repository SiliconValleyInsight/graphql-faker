#!/usr/bin/env node

import "core-js/shim";

import { Source, parse, concatAST, buildASTSchema } from "graphql";

import * as graphqlHTTP from "express-graphql";
import { pick } from "lodash";
import { proxyMiddleware } from "./proxy";
import fake_definition from "./fake_definition_graphql";

function buildServerSchema(idl) {
  const fakeIDL = new Source(fake_definition, "Fake definition AST");
  const fakeAST = parse(fakeIDL);
  var ast = concatAST([parse(idl), fakeAST]);
  return buildASTSchema(ast);
}

export const fakerProxy = (fakedSchema, url) =>
  graphqlHTTP(req => {
    const fakeIDL = new Source(fakedSchema, `Introspection from faked schema`);

    return proxyMiddleware(url, [])
      .then(([schemaIDL, cb]) => {
        schemaIDL = new Source(schemaIDL, `Inrospection from "${url}"`);

        if (fakeIDL) {
          const schema = buildServerSchema(schemaIDL);
          fakeIDL.body = fakeIDL.body.replace(
            "<RootTypeName>",
            schema.getQueryType().name
          );
        }

        const schema = buildServerSchema(schemaIDL);
        const forwardHeaders = pick(req.headers, []);
        return {
          ...cb(schema, fakeIDL, forwardHeaders),
          graphiql: true
        };
      })
      .catch(error => {
        console.log(error);
      });
  });
