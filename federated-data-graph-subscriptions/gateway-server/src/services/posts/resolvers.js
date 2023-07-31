import { pubsub } from "../../kafka";
import { posts } from "./data";

const POST_ADDED = "graphql-sse";

export const resolvers = {
  Author: {
    posts(author, args, context, info) {
      return posts.filter(post => post.authorId === author.id);
    }
  },

  Post: {
    author(post) {
      return { __typename: "Author", id: post.authorID };
    }
  },

  Query: {
    post(root, { id }, context, info) {
      return posts.find(post => post.id === parseInt(id));
    },
    posts(root, args, context, info) {
      return posts;
    }
  },

  Mutation: {
    addPost(root, args, context, info) {
      const postID = posts.length + 1;
      const post = {
        ...args,
        id: postID,
        publishedAt: new Date().toISOString()
      };

      // Publish to `POST_ADDED` in the shared kafka instance
      if(typeof post === 'object')
      pubsub.publish(POST_ADDED, { postAdded: post });
      posts.push(post);
      return post;
    }
  }
};
