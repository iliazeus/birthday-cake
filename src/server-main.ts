import "dotenv/config";
import { ServerApp } from "./server-app";

const app = new ServerApp({
  server: {
    host: process.env.SERVER_HOST ?? "0.0.0.0",
    port: Number(process.env.SERVER_PORT ?? 9117),
  },
  engine: {
    msPerTick: Math.round(1000 / Number(process.env.ENGINE_TICKS_PER_SECOND ?? 16)),
    candleCount: Number(process.env.ENGINE_CANDLE_COUNT ?? 26),
    candleLifetimeMs: Math.round(1000 * Number(process.env.ENGINE_CANDLE_LIFETIME ?? 0.05)),
    targetWindForcePerClient: Number(process.env.ENGINE_TARGET_WIND_FORCE_PER_CLIENT ?? 0.001),
  },
});

process.on("SIGHUP", () => app.reset());
process.on("SIGINT", () => app.stop());
