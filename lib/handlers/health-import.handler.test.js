import { describe, it, expect, vi } from "vitest";
import { createHealthImportHandler } from "./health-import.handler.ts";

describe("HealthImportHandler", () => {
  describe("handleImport", () => {
    it("should successfully import health data", async () => {
      const mockHealthImportService = {
        importHealthData: vi.fn().mockReturnValue({ metrics: 10, workouts: 5 }),
      };

      const handler = createHealthImportHandler(mockHealthImportService);

      const mockRequest = {
        body: { data: { metrics: {}, workouts: [] } },
        log: { error: vi.fn() },
      };
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      const result = await handler.handleImport(mockRequest, mockReply);

      expect(result).toEqual({ success: true, metrics: 10, workouts: 5 });
      expect(mockHealthImportService.importHealthData).toHaveBeenCalledWith({
        data: { metrics: {}, workouts: [] },
      });
    });

    it("should return 400 for invalid JSON data (null)", async () => {
      const mockHealthImportService = {
        importHealthData: vi.fn(),
      };

      const handler = createHealthImportHandler(mockHealthImportService);

      const mockRequest = {
        body: null,
        log: { error: vi.fn() },
      };
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      await handler.handleImport(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining("Invalid JSON data") })
      );
      expect(mockHealthImportService.importHealthData).not.toHaveBeenCalled();
    });

    it("should return 400 for invalid JSON data (string)", async () => {
      const mockHealthImportService = {
        importHealthData: vi.fn(),
      };

      const handler = createHealthImportHandler(mockHealthImportService);

      const mockRequest = {
        body: "not an object",
        log: { error: vi.fn() },
      };
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      await handler.handleImport(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining("Invalid JSON data") })
      );
      expect(mockHealthImportService.importHealthData).not.toHaveBeenCalled();
    });

    it("should return 500 on service error", async () => {
      const mockHealthImportService = {
        importHealthData: vi.fn().mockImplementation(() => {
          throw new Error("Database error");
        }),
      };

      const handler = createHealthImportHandler(mockHealthImportService);

      const mockRequest = {
        body: { data: {} },
        log: { error: vi.fn() },
      };
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      await handler.handleImport(mockRequest, mockReply);

      expect(mockRequest.log.error).toHaveBeenCalled();
      expect(mockReply.code).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: "Database error" });
    });
  });
});
