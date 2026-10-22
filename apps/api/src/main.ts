import { buildApp } from "./app.ts";
import { grantConfiguredAdmins } from "./modules/admin/application/configured-admins.ts";
import { loadEnv } from "./shared/config/env.ts";

const env = loadEnv();
const { app, container } = await buildApp(env);

const granted = await grantConfiguredAdmins(container.deps.admin, env.ADMIN_EMAILS);
if (granted.length > 0) app.log.info({ granted }, "Granted admin access from ADMIN_EMAILS");

if (env.NODE_ENV === "production" && !env.REDIS_URL) {
  app.log.warn("REDIS_URL is not set: rate limits are per-instance only. Set it when running more than one instance.");
}

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, "Shutting down");
  const forceExit = setTimeout(() => process.exit(1), 15_000).unref();
  try {
    await app.close(); // stops accepting requests, drains in-flight ones, then closes the container
    clearTimeout(forceExit);
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, "Error during shutdown");
    process.exit(1);
  }
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

await app.listen({ host: env.HOST, port: env.PORT });
if (env.JOBS_ENABLED) container.scheduler.start();
