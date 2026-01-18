import { describe, it, expect, vi } from "vitest";
import { createTelegramService } from "./telegram.service.ts";
import type { TelegramClient } from "../types/telegram.types.ts";

describe("TelegramService", () => {
  const createMockClient = (): TelegramClient & {
    calls: string[];
  } => {
    const calls: string[] = [];
    return {
      calls,
      sendMessage: vi.fn(async (text: string) => {
        calls.push(text);
      }),
    };
  };

  describe("send", () => {
    it("should send single message if text fits", async () => {
      const client = createMockClient();
      const service = createTelegramService(client);

      await service.send("short message");

      expect(client.calls).toHaveLength(1);
      expect(client.calls[0]).toBe("short message");
    });

    it("should split long messages", async () => {
      const client = createMockClient();
      const service = createTelegramService(client);

      // Create message longer than 4096 chars
      const longMessage = "a".repeat(5000);
      await service.send(longMessage);

      expect(client.calls).toHaveLength(2);
      expect(client.calls[0]).toHaveLength(4096);
      expect(client.calls[1]).toHaveLength(904);
    });

    it("should split at newline boundaries", async () => {
      const client = createMockClient();
      const service = createTelegramService(client);

      // Create message with newlines
      const part1 = "a".repeat(4000);
      const part2 = "b".repeat(1000);
      const message = `${part1}\n${part2}`;

      await service.send(message);

      expect(client.calls).toHaveLength(2);
      expect(client.calls[0]).toBe(part1);
      expect(client.calls[1]).toBe(part2);
    });
  });
});
