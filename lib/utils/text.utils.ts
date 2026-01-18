/**
 * Split text into chunks that fit within a maximum length.
 * Tries to split at paragraph boundaries (newlines) for cleaner output.
 */
export const splitTextByLength = (
  text: string,
  maxLength: number
): string[] => {
  if (text.length <= maxLength) {
    return [text];
  }

  const parts: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      parts.push(remaining);
      break;
    }

    // Find last newline within limit
    let splitIndex = remaining.lastIndexOf("\n", maxLength);
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      // If no good split point, cut at limit
      splitIndex = maxLength;
    }

    parts.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex).trimStart();
  }

  return parts;
};
