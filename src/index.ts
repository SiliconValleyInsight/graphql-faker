#!/usr/bin/env node

import "core-js/shim";

import { Source, parse, concatAST, buildASTSchema } from "graphql";

import * as fs from "fs";
import * as path from "path";
import * as graphqlHTTP from "express-graphql";
// import chalk from "chalk";
import { pick } from "lodash";
import { proxyMiddleware } from "./proxy";

const fakeDefinitionAST = readAST(
  path.join(__dirname, "fake_definition.graphql")
);

function readIDL(filepath) {
  return new Source(fs.readFileSync(filepath, "utf-8"), filepath);
}

function readAST(filepath) {
  return parse(readIDL(filepath));
}

function buildServerSchema(idl) {
  var ast = concatAST([parse(idl), fakeDefinitionAST]);
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
