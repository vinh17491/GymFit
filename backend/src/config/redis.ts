// Redis - optional, degrades to memory when unavailable
import Redis from 'ioredis';

let redisClient: Redis | null = null;

try {
  const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 0,
    retryStrategy(times: number) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    enableOfflineQueue: false,
    lazyConnect: true,
  });
  client.on('error', () => {});
  client.connect().catch(() => { redisClient = null; });
  redisClient = client;
} catch {
  redisClient = null;
}

export { redisClient };
export function isRedisAvailable(): boolean {
  return redisClient !== null && redisClient.status === 'ready';
}
