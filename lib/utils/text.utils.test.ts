import { describe, it, expect } from "vitest";
import { splitTextByLength } from "./text.utils.ts";

describe("splitTextByLength", () => {
  it("should return single item if text fits", () => {
    const result = splitTextByLength("short text", 100);
    expect(result).toEqual(["short text"]);
  });

  it("should split at newline boundary", () => {
    const text = "line1\nline2\nline3";
    const result = splitTextByLength(text, 10);

    expect(result[0]).toBe("line1");
    expect(result[1]).toBe("line2");
    expect(result[2]).toBe("line3");
  });

  it("should split at limit if no good newline", () => {
    const text = "a".repeat(150);
    const result = splitTextByLength(text, 100);

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveLength(100);
    expect(result[1]).toHaveLength(50);
  });

  it("should prefer newline near end over cutting mid-text", () => {
    const text = "aaaa\n" + "b".repeat(90);
    const result = splitTextByLength(text, 50);

    // Should not split at the early newline (position 4) because it's < 50/2
    // Should cut at position 50 instead
    expect(result[0]).toHaveLength(50);
  });

  it("should handle multiple splits", () => {
    const text = Array(5).fill("x".repeat(30)).join("\n");
    const result = splitTextByLength(text, 35);

    expect(result).toHaveLength(5);
    result.forEach((part) => {
      expect(part.length).toBeLessThanOrEqual(35);
    });
  });

  it("should trim leading whitespace from subsequent parts", () => {
    const text = "first\n   second";
    const result = splitTextByLength(text, 6);

    expect(result[0]).toBe("first");
    expect(result[1]).toBe("second");
  });

  it("should handle empty string", () => {
    const result = splitTextByLength("", 100);
    expect(result).toEqual([""]);
  });
});
