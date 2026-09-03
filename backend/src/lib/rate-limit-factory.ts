import rateLimit from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import Redis from 'ioredis';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';

type LimiterOptions = {
  windowMs: number;
  max: number;
  message: { code: string; message: string };
};

let rateLimitRedis: Redis | undefined;

function rateLimitRedisClient() {
  if (!rateLimitRedis) {
    rateLimitRedis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5_000,
    });
  }
  return rateLimitRedis;
}

export function createRateLimiter(options: LimiterOptions) {
  const base = {
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    message: options.message,
  };

  if (config.nodeEnv !== 'production') {
    return rateLimit(base);
  }

  try {
    const client = rateLimitRedisClient();
    return rateLimit({
      ...base,
      store: new RedisStore({
        sendCommand: (command: string, ...args: string[]) =>
          client.call(command, ...args) as Promise<RedisReply>,
      }),
    });
  } catch (error) {
    logger.warn({ err: error }, 'Falling back to in-memory rate limiter');
    return rateLimit(base);
  }
}
