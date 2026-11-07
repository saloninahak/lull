import { existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer, type RunningServer } from './server.ts';

/**
 * `pnpm host`: the whole of lull on one port, for everyone on the network.
 * it serves the built app (apps/web/dist) and the rooms side by side.
 *
 *   pnpm host            # port 14087
 *   pnpm host 9000       # or any port you like
 *
 * PORT and HOST in the environment work too. see readme 13.1.
 */

const here = dirname(fileURLToPath(import.meta.url));
const staticDir = resolve(here, '../../web/dist');

const arg = process.argv.slice(2).find((a) => /^\d+$/.test(a));
const port = Number(arg ?? process.env.PORT ?? 14087);
const host = process.env.HOST ?? '0.0.0.0';
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`that port doesn't look right: ${arg ?? process.env.PORT}`);
  process.exit(1);
}
if (!existsSync(join(staticDir, 'index.html'))) {
  console.error(
    'the app isn\'t built yet. run "pnpm host" from the project folder, which builds it first.',
  );
  process.exit(1);
}

let server: RunningServer;
try {
  server = await startServer({ port, host, allowedOrigins, staticDir });
} catch (e) {
  const code = (e as { code?: string }).code;
  console.error(
    code === 'EADDRINUSE'
      ? `port ${port} is already in use. try another: pnpm host 14088`
      : `couldn't start: ${e instanceof Error ? e.message : String(e)}`,
  );
  process.exit(1);
}

/** this pc's addresses on the local network, the ones friends can reach */
const lan = Object.values(networkInterfaces())
  .flat()
  .filter((a) => a && a.family === 'IPv4' && !a.internal)
  .map((a) => a!.address);

console.log('');
console.log('  lull is up.');
console.log('');
console.log(`  on this pc     http://localhost:${server.port}`);
for (const ip of lan) console.log(`  for friends    http://${ip}:${server.port}`);
console.log('');
console.log('  keep this window open while you play. ctrl+c stops it.');
console.log('');

const stop = () => {
  void server.close().then(() => process.exit(0));
  setTimeout(() => process.exit(0), 5_000).unref();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
