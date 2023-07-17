import { KafkaPubSub } from 'graphql-kafka-subscriptions';

export const pubsub = new KafkaPubSub({
  topic: 'graphql-sse',
  host: '127.0.0.1',
  port: '9092',
  globalConfig: {} // options passed directly to the consumer and producer
});
