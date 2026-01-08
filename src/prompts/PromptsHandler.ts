/**
 * MCP Prompts Handler - Facade (Backward Compatibility)
 * Re-exports from new DDD/SRP modular architecture
 *
 * @deprecated Import from './index.js' instead
 * @see https://modelcontextprotocol.io/docs/concepts/prompts
 */

import {
  Prompt,
  PromptArgument,
  PromptMessage,
  GetPromptResult,
} from '@modelcontextprotocol/sdk/types.js';

// Re-export types for backward compatibility
export type MCPPrompt = Prompt;
export type MCPPromptArgument = PromptArgument;
export type MCPPromptMessage = PromptMessage;
export type MCPPromptResult = GetPromptResult;

// Import from new modular architecture
import {
  getAllPrompts as _getAllPrompts,
  getPromptByName as _getPromptByName,
  generatePromptMessages as _generatePromptMessages,
  promptRepository,
} from './index.js';

/**
 * All available prompts (backward compatible export)
 * @deprecated Use promptRepository.getAllDefinitions() instead
 */
export const godotPrompts: MCPPrompt[] = promptRepository.getAllDefinitions();

/**
 * Get all prompts
 * @deprecated Use promptRepository.getAllDefinitions() instead
 */
export const getAllPrompts = _getAllPrompts;

/**
 * Get prompt by name
 * @deprecated Use promptRepository.findByName() instead
 */
export const getPromptByName = _getPromptByName;

/**
 * Generate prompt messages
 */
export const generatePromptMessages = _generatePromptMessages;
