/**
 * Prompts Module - Public API
 * Maintains backward compatibility with existing consumers
 * @module prompts
 */

// Domain exports
export * from './domain/types.js';

// Repository exports
export { PromptRepository, promptRepository } from './repository/index.js';

// Definition exports (for direct access if needed)
export { allPrompts } from './definitions/index.js';

// ============================================
// BACKWARD COMPATIBLE API
// ============================================

import { promptRepository } from './repository/index.js';
import {
  PromptDefinition,
  GeneratedPromptResult,
  PromptArguments,
} from './domain/types.js';

/**
 * Get all available prompts
 * @deprecated Use promptRepository.getAllDefinitions() instead
 */
export function getAllPrompts(): PromptDefinition[] {
  return promptRepository.getAllDefinitions();
}

/**
 * Get a specific prompt by name
 * @deprecated Use promptRepository.findByName() instead
 */
export function getPromptByName(name: string): PromptDefinition | undefined {
  const prompt = promptRepository.findByName(name);
  return prompt?.definition;
}

/**
 * Generate prompt messages for a given prompt name and arguments
 */
export function generatePromptMessages(
  name: string,
  args: PromptArguments
): GeneratedPromptResult | null {
  const prompt = promptRepository.findByName(name);
  if (!prompt) {
    return null;
  }
  return prompt.generator(args);
}

/**
 * Check if a prompt exists
 */
export function hasPrompt(name: string): boolean {
  return promptRepository.exists(name);
}

/**
 * Get prompt count
 */
export function getPromptCount(): number {
  return promptRepository.count();
}
