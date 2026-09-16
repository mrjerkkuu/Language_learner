import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/api/health", async () => {
  return { ok: true };
});

const PORT = process.env.PORT ?? 3000;

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
