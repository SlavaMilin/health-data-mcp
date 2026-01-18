import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createAnalysisHandler,
  type AnalysisHandler,
} from "./analysis.handler.ts";
import type { HealthAnalysisService } from "../services/health-analysis.service.ts";
import type { FastifyRequest, FastifyReply } from "fastify";

describe("AnalysisHandler", () => {
  let handler: AnalysisHandler;
  let mockService: HealthAnalysisService;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    mockService = {
      run: vi.fn(),
    };

    mockRequest = {
      query: {},
      log: {
        error: vi.fn(),
      } as unknown as FastifyRequest["log"],
    };

    mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    handler = createAnalysisHandler(mockService);
  });

  describe("runAnalysis", () => {
    it("should run weekly analysis by default", async () => {
      mockRequest.query = {};

      const result = await handler.runAnalysis(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockService.run).toHaveBeenCalledWith("weekly");
      expect(result).toEqual({
        success: true,
        message: "Analysis sent to Telegram",
      });
    });

    it("should run analysis with specified type", async () => {
      mockRequest.query = { type: "daily" };

      const result = await handler.runAnalysis(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockService.run).toHaveBeenCalledWith("daily");
      expect(result).toEqual({
        success: true,
        message: "Analysis sent to Telegram",
      });
    });

    it("should run monthly analysis", async () => {
      mockRequest.query = { type: "monthly" };

      const result = await handler.runAnalysis(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockService.run).toHaveBeenCalledWith("monthly");
      expect(result).toEqual({
        success: true,
        message: "Analysis sent to Telegram",
      });
    });

    it("should return 400 for invalid type", async () => {
      mockRequest.query = { type: "invalid" };

      await handler.runAnalysis(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        })
      );
      expect(mockService.run).not.toHaveBeenCalled();
    });

    it("should return 500 on service error", async () => {
      mockRequest.query = { type: "weekly" };
      mockService.run = vi.fn().mockRejectedValue(new Error("Service error"));

      await handler.runAnalysis(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.code).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: "Service error",
      });
      expect(mockRequest.log?.error).toHaveBeenCalled();
    });

    it("should handle non-Error exceptions", async () => {
      mockRequest.query = { type: "weekly" };
      mockService.run = vi.fn().mockRejectedValue("string error");

      await handler.runAnalysis(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.code).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: "Unknown error",
      });
    });
  });
});
