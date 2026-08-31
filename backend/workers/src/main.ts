import Redis from 'ioredis';

async function main() {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const redis = new Redis(url, { maxRetriesPerRequest: 3 });
  const pong = await redis.ping();
  if (pong !== 'PONG') {
    throw new Error('Redis is not ready');
  }
  console.log(
    JSON.stringify({
      service: 'ubp-worker',
      status: 'ok',
      redis: 'connected',
      message: 'Phase 1 worker stub. Job processors will be added in later phases.',
    }),
  );
  const keepAlive = setInterval(() => {
    redis.ping().catch((error) => {
      console.error(JSON.stringify({ service: 'ubp-worker', redis: 'error', error: String(error) }));
    });
  }, 30_000);
  const shutdown = async () => {
    clearInterval(keepAlive);
    await redis.quit();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
