# Claude Code Instructions

## Code Generation Policy
- **DO NOT write code automatically** - only write code when the user explicitly requests it
- When the user describes ideas, architecture, or discusses approaches, respond with discussion and questions instead of writing code
- Wait for explicit instructions like "implement", "write code", "create", "add", "make" before generating any code
- If unsure whether code should be written, ask the user first

## Code Style
- Do not write comments in code, configs, or any other files unless explicitly requested by the user
- Write clean, self-documenting code without explanatory comments
- All code must be written in English (variable names, function names, comments, strings, etc.)

## Documentation
- Do not create or add markdown files (README.md, INSTRUCTIONS.md, etc.) with instructions or documentation unless explicitly requested by the user
- Only create documentation files when the user specifically asks for them
