import {
  ApolloLink,
  Observable,
  split,
  ApolloClient,
  InMemoryCache,
  HttpLink
} from "@apollo/client";
import { getMainDefinition } from "@apollo/client/utilities";

import { print } from "graphql";
import { createClient } from "graphql-sse";

class SSELink extends ApolloLink {
   client;

  constructor(options) {
    super();
    this.client = createClient(options);
  }

  request(operation) {
    return new Observable((sink) => {
      return this.client.subscribe(
        { ...operation, query: print(operation.query) },
        {
          next: sink.next.bind(sink),
          complete: sink.complete.bind(sink),
          error: sink.error.bind(sink),
        }
      );
    });
  }
}

const sseLink = new SSELink({
  url: process.env.REACT_APP_SUBSCRIPTIONS_API_URL,
  onMessage: console.log,
});

const httpLink = new HttpLink({
  uri: process.env.REACT_APP_GATEWAY_API_URL
});

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  sseLink,
  httpLink
);


const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: splitLink,
  credentials: "include"
});

export default client;