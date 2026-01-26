import { describe, it, expect, beforeEach, vi } from "vitest";
import { createAnalysisService, type AnalysisService } from "./analysis.service.ts";
import type { AnalysisHistoryPort, InstructionsPort } from "../domain/analysis.port.ts";
import type { GeminiClient } from "../types/gemini.types.ts";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ANALYSIS_TYPE } from "../domain/analysis.constants.ts";
import type { AnalysisRecord } from "../domain/analysis.ts";

describe("AnalysisService", () => {
  let service: AnalysisService;
  let mockGeminiClient: GeminiClient;
  let mockInstructionsRepo: InstructionsPort;
  let mockAnalysisHistoryRepo: AnalysisHistoryPort;
  let mockMcpClient: Client;

  beforeEach(() => {
    mockGeminiClient = {
      analyze: vi.fn().mockResolvedValue("Generated analysis text"),
    };

    mockInstructionsRepo = {
      get: vi.fn().mockReturnValue("System prompt for analysis"),
    };

    mockAnalysisHistoryRepo = {
      save: vi.fn().mockReturnValue(1),
      getByDateAndType: vi.fn(),
      getRecentByType: vi.fn(),
    };

    mockMcpClient = {} as Client;

    service = createAnalysisService({
      geminiClient: mockGeminiClient,
      instructionsRepo: mockInstructionsRepo,
      analysisHistoryRepo: mockAnalysisHistoryRepo,
      mcpClient: mockMcpClient,
      timezone: "UTC",
    });
  });

  describe("generate", () => {
    it("should generate analysis with default weekly type", async () => {
      const result = await service.generate();

      expect(mockInstructionsRepo.get).toHaveBeenCalledWith(ANALYSIS_TYPE.WEEKLY);
      expect(mockGeminiClient.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: "System prompt for analysis",
          userMessage: expect.stringContaining("Type: weekly"),
          mcpClient: mockMcpClient,
        })
      );
      expect(result.type).toBe(ANALYSIS_TYPE.WEEKLY);
      expect(result.analysis).toBe("Generated analysis text");
      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should generate daily analysis", async () => {
      const result = await service.generate(ANALYSIS_TYPE.DAILY);

      expect(mockInstructionsRepo.get).toHaveBeenCalledWith(ANALYSIS_TYPE.DAILY);
      expect(mockGeminiClient.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          userMessage: expect.stringContaining("Type: daily"),
        })
      );
      expect(result.type).toBe(ANALYSIS_TYPE.DAILY);
    });

    it("should generate monthly analysis", async () => {
      const result = await service.generate(ANALYSIS_TYPE.MONTHLY);

      expect(mockInstructionsRepo.get).toHaveBeenCalledWith(ANALYSIS_TYPE.MONTHLY);
      expect(mockGeminiClient.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          userMessage: expect.stringContaining("Type: monthly"),
        })
      );
      expect(result.type).toBe(ANALYSIS_TYPE.MONTHLY);
    });

    it("should include period dates in user message", async () => {
      await service.generate(ANALYSIS_TYPE.WEEKLY);

      expect(mockGeminiClient.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          userMessage: expect.stringContaining("Period:"),
        })
      );
    });

    it("should include today date in user message", async () => {
      await service.generate();

      expect(mockGeminiClient.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          userMessage: expect.stringContaining("Today:"),
        })
      );
    });

    it("should propagate errors from gemini client", async () => {
      mockGeminiClient.analyze = vi.fn().mockRejectedValue(new Error("Gemini error"));

      await expect(service.generate()).rejects.toThrow("Gemini error");
    });
  });

  describe("save", () => {
    it("should delegate to repository", () => {
      const params = {
        date: "2025-01-12",
        type: ANALYSIS_TYPE.WEEKLY,
        analysis: "Test analysis",
      };

      const result = service.save(params);

      expect(mockAnalysisHistoryRepo.save).toHaveBeenCalledWith(params);
      expect(result).toBe(1);
    });
  });

  describe("getByDateAndType", () => {
    it("should delegate to repository", () => {
      const mockRecord: AnalysisRecord = {
        id: 1,
        date: "2025-01-12",
        type: ANALYSIS_TYPE.WEEKLY,
        analysis: "Test",
        created_at: "2025-01-12T10:00:00Z",
      };
      mockAnalysisHistoryRepo.getByDateAndType = vi.fn().mockReturnValue(mockRecord);

      const result = service.getByDateAndType("2025-01-12", ANALYSIS_TYPE.WEEKLY);

      expect(mockAnalysisHistoryRepo.getByDateAndType).toHaveBeenCalledWith(
        "2025-01-12",
        ANALYSIS_TYPE.WEEKLY
      );
      expect(result).toBe(mockRecord);
    });

    it("should return undefined if not found", () => {
      mockAnalysisHistoryRepo.getByDateAndType = vi.fn().mockReturnValue(undefined);

      const result = service.getByDateAndType("2025-01-12", ANALYSIS_TYPE.WEEKLY);

      expect(result).toBeUndefined();
    });
  });

  describe("getRecentByType", () => {
    it("should delegate to repository", () => {
      const mockRecords: AnalysisRecord[] = [
        {
          id: 1,
          date: "2025-01-12",
          type: ANALYSIS_TYPE.WEEKLY,
          analysis: "Test 1",
          created_at: "2025-01-12T10:00:00Z",
        },
        {
          id: 2,
          date: "2025-01-05",
          type: ANALYSIS_TYPE.WEEKLY,
          analysis: "Test 2",
          created_at: "2025-01-05T10:00:00Z",
        },
      ];
      mockAnalysisHistoryRepo.getRecentByType = vi.fn().mockReturnValue(mockRecords);

      const result = service.getRecentByType(ANALYSIS_TYPE.WEEKLY, 5);

      expect(mockAnalysisHistoryRepo.getRecentByType).toHaveBeenCalledWith(
        ANALYSIS_TYPE.WEEKLY,
        5
      );
      expect(result).toBe(mockRecords);
    });
  });
});
