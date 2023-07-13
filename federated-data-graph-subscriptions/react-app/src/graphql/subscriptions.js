import { gql } from "@apollo/client";

import { PostFields } from "./fragments";

export const PostAdded = gql`
  subscription PostAdded($authorId: ID) {
    postAdded(authorId: $authorId) {
      ...PostFields
    }
  }
  ${PostFields}
`;
