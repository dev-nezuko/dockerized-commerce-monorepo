import { buildExpressApp } from './server';
import { env } from './config/env';
import { AppDataSource } from './data-source';
import { redis } from './config/redis';
import http from 'http';

async function main(): Promise<void> {
  await AppDataSource.initialize();
  const app = buildExpressApp();
  const server = http.createServer(app);

  server.listen(env.PORT, env.HOST, () => {
    console.log(`[backend] listening on http://localhost:${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[backend] received ${signal}, shutting down...`);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    try { await AppDataSource.destroy(); console.log('[backend] closed data source'); } catch {}
    try { await redis.quit(); console.log('[backend] closed redis'); } catch {}
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[backend] failed to start', err);
  process.exit(1);
});
