import type { FastifyBaseLogger } from "fastify";
import type { Logger } from "../types/logger.types.ts";

export const createConsoleLogger = (): Logger => ({
  info: (obj, msg) => console.log(...(msg ? [msg, obj] : [obj])),
  warn: (obj, msg) => console.warn(...(msg ? [msg, obj] : [obj])),
  error: (obj, msg) => console.error(...(msg ? [msg, obj] : [obj])),
});

export const fromFastifyLogger = (fastifyLogger: FastifyBaseLogger): Logger => fastifyLogger;
