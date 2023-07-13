import gql from "graphql-tag";

export const typeDefs = gql`
  type Subscription {
    postAdded(authorId: ID): Post
  }
`;
