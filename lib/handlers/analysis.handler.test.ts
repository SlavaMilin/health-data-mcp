import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createAnalysisHandler,
  type AnalysisHandler,
} from "./analysis.handler.ts";
import type { AnalysisService, GeneratedAnalysis } from "../services/analysis.service.ts";
import type { TelegramService } from "../services/telegram.service.ts";
import type { FastifyRequest, FastifyReply } from "fastify";
import { ANALYSIS_TYPE } from "../domain/analysis.constants.ts";

describe("AnalysisHandler", () => {
  let handler: AnalysisHandler;
  let mockAnalysisService: AnalysisService;
  let mockTelegramService: TelegramService;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  const mockGeneratedAnalysis: GeneratedAnalysis = {
    date: "2025-01-12",
    type: ANALYSIS_TYPE.WEEKLY,
    analysis: "Test analysis content",
  };

  beforeEach(() => {
    mockAnalysisService = {
      generate: vi.fn().mockResolvedValue(mockGeneratedAnalysis),
      save: vi.fn().mockReturnValue(1),
      getByDateAndType: vi.fn(),
      getRecentByType: vi.fn(),
    };

    mockTelegramService = {
      send: vi.fn().mockResolvedValue(undefined),
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

    handler = createAnalysisHandler({
      analysisService: mockAnalysisService,
      telegramService: mockTelegramService,
    });
  });

  describe("runAnalysis", () => {
    it("should generate, save and send analysis", async () => {
      await handler.runAnalysis(ANALYSIS_TYPE.WEEKLY);

      expect(mockAnalysisService.generate).toHaveBeenCalledWith(ANALYSIS_TYPE.WEEKLY);
      expect(mockAnalysisService.save).toHaveBeenCalledWith(mockGeneratedAnalysis);
      expect(mockTelegramService.send).toHaveBeenCalledWith("Test analysis content");
    });

    it("should use weekly type by default", async () => {
      await handler.runAnalysis();

      expect(mockAnalysisService.generate).toHaveBeenCalledWith(undefined);
    });

    it("should propagate errors from generate", async () => {
      mockAnalysisService.generate = vi.fn().mockRejectedValue(new Error("Generate error"));

      await expect(handler.runAnalysis()).rejects.toThrow("Generate error");
      expect(mockAnalysisService.save).not.toHaveBeenCalled();
      expect(mockTelegramService.send).not.toHaveBeenCalled();
    });

    it("should propagate errors from telegram", async () => {
      mockTelegramService.send = vi.fn().mockRejectedValue(new Error("Telegram error"));

      await expect(handler.runAnalysis()).rejects.toThrow("Telegram error");
      expect(mockAnalysisService.save).toHaveBeenCalled();
    });
  });

  describe("handleRunAnalysis", () => {
    it("should run weekly analysis by default", async () => {
      mockRequest.query = {};

      const result = await handler.handleRunAnalysis(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockAnalysisService.generate).toHaveBeenCalledWith("weekly");
      expect(result).toEqual({
        success: true,
        message: "Analysis sent to Telegram",
      });
    });

    it("should run analysis with specified type", async () => {
      mockRequest.query = { type: "daily" };
      mockAnalysisService.generate = vi.fn().mockResolvedValue({
        ...mockGeneratedAnalysis,
        type: ANALYSIS_TYPE.DAILY,
      });

      const result = await handler.handleRunAnalysis(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockAnalysisService.generate).toHaveBeenCalledWith("daily");
      expect(result).toEqual({
        success: true,
        message: "Analysis sent to Telegram",
      });
    });

    it("should run monthly analysis", async () => {
      mockRequest.query = { type: "monthly" };
      mockAnalysisService.generate = vi.fn().mockResolvedValue({
        ...mockGeneratedAnalysis,
        type: ANALYSIS_TYPE.MONTHLY,
      });

      const result = await handler.handleRunAnalysis(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockAnalysisService.generate).toHaveBeenCalledWith("monthly");
      expect(result).toEqual({
        success: true,
        message: "Analysis sent to Telegram",
      });
    });

    it("should return 400 for invalid type", async () => {
      mockRequest.query = { type: "invalid" };

      await handler.handleRunAnalysis(
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
      expect(mockAnalysisService.generate).not.toHaveBeenCalled();
    });

    it("should return 500 on service error", async () => {
      mockRequest.query = { type: "weekly" };
      mockAnalysisService.generate = vi.fn().mockRejectedValue(new Error("Service error"));

      await handler.handleRunAnalysis(
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
      mockAnalysisService.generate = vi.fn().mockRejectedValue("string error");

      await handler.handleRunAnalysis(
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
