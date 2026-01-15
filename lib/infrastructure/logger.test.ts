import { describe, it, expect, vi, beforeEach } from "vitest";
import { createConsoleLogger, fromFastifyLogger } from "./logger.ts";

describe("createConsoleLogger", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("logs info with string", () => {
    const logger = createConsoleLogger();
    logger.info("test message");
    expect(console.log).toHaveBeenCalledWith("test message");
  });

  it("logs info with object and message", () => {
    const logger = createConsoleLogger();
    logger.info({ foo: "bar" }, "test message");
    expect(console.log).toHaveBeenCalledWith("test message", { foo: "bar" });
  });

  it("logs warn with string", () => {
    const logger = createConsoleLogger();
    logger.warn("warning");
    expect(console.warn).toHaveBeenCalledWith("warning");
  });

  it("logs warn with object and message", () => {
    const logger = createConsoleLogger();
    logger.warn({ id: 1 }, "warning msg");
    expect(console.warn).toHaveBeenCalledWith("warning msg", { id: 1 });
  });

  it("logs error with string", () => {
    const logger = createConsoleLogger();
    logger.error("error occurred");
    expect(console.error).toHaveBeenCalledWith("error occurred");
  });

  it("logs error with object and message", () => {
    const logger = createConsoleLogger();
    logger.error({ code: 500 }, "server error");
    expect(console.error).toHaveBeenCalledWith("server error", { code: 500 });
  });
});

describe("fromFastifyLogger", () => {
  it("returns the same logger object", () => {
    const mockFastifyLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
      child: vi.fn(),
      level: "info",
      silent: vi.fn(),
    };

    const logger = fromFastifyLogger(mockFastifyLogger as never);

    logger.info("test");
    expect(mockFastifyLogger.info).toHaveBeenCalledWith("test");

    logger.warn({ x: 1 }, "warn");
    expect(mockFastifyLogger.warn).toHaveBeenCalledWith({ x: 1 }, "warn");

    logger.error("err");
    expect(mockFastifyLogger.error).toHaveBeenCalledWith("err");
  });
});
