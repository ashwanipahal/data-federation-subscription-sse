import { pubsub } from "./redis";
import { withFilter } from 'graphql-subscriptions';

const POST_ADDED = "POST_ADDED";

export const resolvers = {
  Subscription: {
    postAdded: {
      // The client may request `Post` fields that are not resolvable from the
      // payload data that was included in `pubsub.publish()`, so we must
      // provide some mechanism to fetch those additional fields when requested
      resolve(payload, args, context, info) {
        // const { dataSources: { gatewayApi } } = context;
        // return gatewayApi.fetchAndMergeNonPayloadPostData(
        //   payload.postAdded.id,
        //   payload,
        //   info
        // );
        return {
          id: "123",
          author: {
            id:'1',
            name:"ashwani"
          },
          content: "test",
          publishedAt: "test",
          title: "test"
        };
      },
      subscribe: withFilter(
        () => pubsub.asyncIterator([POST_ADDED]),
        (payload, variables) => {
          // Only push an update if the comment is on
          // the correct repository for this operation
          return (
            payload.postAdded.authorID === variables.authorId
          );
        },
      ),
    }
  }
};
