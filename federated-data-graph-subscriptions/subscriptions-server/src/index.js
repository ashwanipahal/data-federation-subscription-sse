import {
  addGatewayDataSourceToSubscriptionContext,
  getGatewayApolloConfig,
  makeSubscriptionSchema
} from "federation-subscription-tools";
import { ApolloGateway } from "@apollo/gateway";
import {
  execute,
  getOperationAST,
  GraphQLError,
  parse,
  subscribe,
  validate
} from "graphql";
import express from 'express'
  import { createHandler } from 'graphql-sse/lib/use/express';

import { LiveBlogDataSource } from "./datasources/LiveBlogDataSource";
import { resolvers } from "./resolvers";
import { typeDefs } from "./typeDefs";

(async () => {
  const apolloKey = process.env.APOLLO_KEY;
  const graphRef = process.env.APOLLO_GRAPH_REF;
  const gatewayEndpoint = process.env.GATEWAY_ENDPOINT;
  const isProd = process.env.NODE_ENV === "production";
  const port = process.env.SUBSCRIPTIONS_SERVICE_PORT;

  let apolloConfig;
  let schema;

  /**
   * Instantiate an instance of the Gateway
   */
  let gatewayOptions = {
    debug: isProd ? false : true
  };

  if (!apolloKey) {
    gatewayOptions.serviceList = [
      { name: "authors", url: process.env.AUTHORS_SERVICE_URL },
      { name: "posts", url: process.env.POSTS_SERVICE_URL }
    ];
  }

  const gateway = new ApolloGateway(gatewayOptions);

  gateway.onSchemaLoadOrUpdate(schemaContext => {
    // makeSubscriptionSchema will combine service schema with subscription schema
    schema = makeSubscriptionSchema({
      gatewaySchema: schemaContext.apiSchema,
      typeDefs,
      resolvers
    });
  });

  if (apolloKey) {
    apolloConfig = getGatewayApolloConfig(apolloKey, graphRef);
  } else {
    // For unmanaged federation, we must set a poll interval to query the
    // subgraph services for their schemas to detect a schema change. Polling
    // the running endpoint for these SDLs is fairly blunt approach, so in
    // production, a more computationally efficient approach would be
    // preferable (or managed federation).
    gateway.experimental_pollInterval = 36000;
  }

  await gateway.load({ ...(apolloConfig && { apollo: apolloConfig }) });

  /**
   * Expose GraphQL endpoint via WebSockets (for subscription operations only)
   */
  
 
  const handler = createHandler({
    execute,
    subscribe,
    onSubscribe: (ctx, msg) => {
      const liveBlogDataSource = new LiveBlogDataSource(gatewayEndpoint);
      const dataSourceContext = addGatewayDataSourceToSubscriptionContext(
        ctx,
        liveBlogDataSource
      );
      
      const { token } = ctx.connectionParams;
      // Construct the execution arguments
      const args = {
        contextValue: {token: token | null, ...dataSourceContext},
        schema,
        operationName: msg.operationName,
        document: parse(msg.query),
        variableValues: msg.variables
      };
      const operationAST = getOperationAST(args.document, args.operationName);

      // Stops the subscription and sends an error message
      if (!operationAST) {
        return [new GraphQLError("Unable to identify operation")];
      }

      // Handle mutation and query requests
      if (operationAST.operation !== "subscription") {
        return [
          new GraphQLError("Only subscription operations are supported")
        ];
      }

      // Validate the operation document
      const errors = validate(args.schema, args.document);

      if (errors.length > 0) {
        return errors;
      }

      // Ready execution arguments
      return args;
    }
  });

  const app = express();
  app.all('/graphql/stream', async (req, res) => {
     try {
      if (req.method == 'OPTIONS') { // Handle preflight
        res.writeHead(200, {
           "Access-Control-Allow-Origin": "*",
           "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
           "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Length, X-Requested-With"
        });
        
        
        res.end();
        return;
      }
      await handler(req, res);
     } catch (err) {
       console.error(err);
       res.writeHead(500).end();
     }
  });
   
  app.listen(5001)
  console.log('Listening to port 5001')
})();
