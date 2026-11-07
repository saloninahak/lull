import { startServer } from './server.ts';

// configuration comes from the environment. see readme 13.1 and 13.8.
const port = Number(process.env.PORT ?? 1999);
const host = process.env.HOST ?? '127.0.0.1';
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const trustProxy = ['1', 'true', 'yes'].includes((process.env.TRUST_PROXY ?? '').toLowerCase());

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error(`that port doesn't look right: ${process.env.PORT}`);
  process.exit(1);
}

// one bad message is caught where it lands (server.ts). anything that still
// gets this far means the process isn't in a state to trust, so it says why
// and stops, and the host starts a fresh one.
process.on('uncaughtException', (e) => {
  console.error('stopping after an unexpected error', e);
  process.exit(1);
});
process.on('unhandledRejection', (e) => {
  console.error('stopping after an unexpected error', e);
  process.exit(1);
});

const server = await startServer({ port, host, allowedOrigins, trustProxy });
console.log(
  `lull rooms on http://${host}:${server.port}` +
    (allowedOrigins.length ? ` for ${allowedOrigins.join(', ')}` : ' for any site'),
);

const stop = () => {
  void server.close().then(() => process.exit(0));
  // never hang on the way out
  setTimeout(() => process.exit(0), 5_000).unref();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
