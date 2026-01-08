/**
 * Domain Types for MCP Prompts
 *
 * @description Core domain entities and value objects for the Prompts bounded context.
 * Follows ISO/IEC 5055 (CISQ) for code quality and DDD principles.
 *
 * @module prompts/domain
 * @since 0.9.0
 * @license MIT
 *
 * @example
 * ```typescript
 * import { RegisteredPrompt, PromptCategory } from './types.js';
 *
 * const myPrompt: RegisteredPrompt = {
 *   definition: {
 *     name: 'my_prompt',
 *     description: 'A custom prompt',
 *     category: 'gameplay',
 *     arguments: [{ name: 'arg1', description: 'First argument', required: true }],
 *   },
 *   generator: (args) => ({
 *     description: 'Generated prompt',
 *     messages: [{ role: 'user', content: { type: 'text', text: args.arg1 } }],
 *   }),
 * };
 * ```
 */

import {
  Prompt,
  PromptArgument,
  PromptMessage,
  GetPromptResult,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP Prompt type alias
 *
 * @description Re-export of the MCP SDK Prompt type for domain isolation.
 * Represents a prompt template definition without generation logic.
 *
 * @see {@link https://modelcontextprotocol.io/docs/concepts/prompts}
 */
export type MCPPrompt = Prompt;

/**
 * MCP Prompt Argument type alias
 *
 * @description Re-export of the MCP SDK PromptArgument type.
 * Defines a single argument that can be passed to a prompt.
 *
 * @property {string} name - Unique identifier for the argument
 * @property {string} description - Human-readable description
 * @property {boolean} required - Whether the argument is mandatory
 */
export type MCPPromptArgument = PromptArgument;

/**
 * MCP Prompt Message type alias
 *
 * @description Re-export of the MCP SDK PromptMessage type.
 * Represents a single message in a prompt conversation.
 *
 * @property {string} role - Message role ('user' | 'assistant')
 * @property {object} content - Message content with type and text
 */
export type MCPPromptMessage = PromptMessage;

/**
 * MCP Prompt Result type alias
 *
 * @description Re-export of the MCP SDK GetPromptResult type.
 * The complete result of generating a prompt including description and messages.
 */
export type MCPPromptResult = GetPromptResult;

/**
 * Bounded context categories for prompts
 *
 * @description Categorizes prompts by their domain responsibility.
 * Each category represents a distinct bounded context in DDD terms.
 *
 * - `gameplay`: Character controllers, enemies, NPCs, collectibles, projectiles
 * - `scaffolding`: Project templates, UI systems, multiplayer setup
 * - `debug`: Script debugging, physics issues, performance analysis
 * - `migration`: Godot version upgrades, scene refactoring
 * - `analysis`: Project analysis and recommendations
 *
 * @example
 * ```typescript
 * const category: PromptCategory = 'gameplay';
 * ```
 */
export type PromptCategory =
  | 'gameplay'
  | 'scaffolding'
  | 'debug'
  | 'migration'
  | 'analysis';

/**
 * All valid prompt category values
 *
 * @description Runtime array of all PromptCategory values for validation.
 * Useful for iteration and runtime type checking.
 *
 * @constant
 * @type {readonly PromptCategory[]}
 */
export const PROMPT_CATEGORIES: readonly PromptCategory[] = [
  'gameplay',
  'scaffolding',
  'debug',
  'migration',
  'analysis',
] as const;

/**
 * Prompt definition with metadata
 *
 * @description Extended prompt definition including category for bounded context organization.
 * This is the domain entity representing a prompt's identity and metadata.
 *
 * @interface PromptDefinition
 * @property {string} name - Unique prompt identifier (snake_case)
 * @property {string} description - Human-readable description of the prompt's purpose
 * @property {PromptCategory} category - Bounded context category
 * @property {MCPPromptArgument[]} [arguments] - Optional list of prompt arguments
 *
 * @example
 * ```typescript
 * const definition: PromptDefinition = {
 *   name: 'create_character_controller',
 *   description: 'Generate a character controller script',
 *   category: 'gameplay',
 *   arguments: [
 *     { name: 'type', description: '2D or 3D', required: true },
 *   ],
 * };
 * ```
 */
export interface PromptDefinition {
  /** Unique prompt name (snake_case convention) */
  name: string;
  /** Human-readable description */
  description: string;
  /** Bounded context category */
  category: PromptCategory;
  /** Arguments for the prompt */
  arguments?: MCPPromptArgument[];
}

/**
 * Arguments passed to prompt generator
 *
 * @description Key-value map of argument names to their string values.
 * All values are strings as they come from user input.
 *
 * @example
 * ```typescript
 * const args: PromptArguments = {
 *   type: '2D',
 *   features: 'jump, dash',
 * };
 * ```
 */
export type PromptArguments = Record<string, string>;

/**
 * Result from generating prompt messages
 *
 * @description Alias for MCPPromptResult, the output of a message generator.
 * Contains a description and array of messages for the LLM conversation.
 */
export type GeneratedPromptResult = MCPPromptResult;

/**
 * Message generator function type
 *
 * @description Pure function that transforms arguments into a prompt result.
 * Generators should be stateless and deterministic.
 *
 * @param {PromptArguments} args - Key-value map of argument values
 * @returns {GeneratedPromptResult} The generated prompt with messages
 *
 * @example
 * ```typescript
 * const generator: MessageGenerator = (args) => ({
 *   description: `Create ${args.type} character`,
 *   messages: [{
 *     role: 'user',
 *     content: { type: 'text', text: `Generate a ${args.type} character controller` },
 *   }],
 * });
 * ```
 */
export type MessageGenerator = (args: PromptArguments) => GeneratedPromptResult;

/**
 * Complete registered prompt with generator
 *
 * @description Aggregate root combining prompt definition with its message generator.
 * This is the primary entity used throughout the prompts module.
 *
 * @interface RegisteredPrompt
 * @property {PromptDefinition} definition - Prompt metadata and arguments
 * @property {MessageGenerator} generator - Function to generate messages
 *
 * @example
 * ```typescript
 * const prompt: RegisteredPrompt = {
 *   definition: {
 *     name: 'my_prompt',
 *     description: 'My custom prompt',
 *     category: 'debug',
 *   },
 *   generator: (args) => ({
 *     description: 'Generated',
 *     messages: [{ role: 'user', content: { type: 'text', text: 'Hello' } }],
 *   }),
 * };
 * ```
 */
export interface RegisteredPrompt {
  /** Prompt metadata and argument definitions */
  definition: PromptDefinition;
  /** Message generation function */
  generator: MessageGenerator;
}

/**
 * Type guard to check if a value is a valid PromptCategory
 *
 * @description Runtime validation for prompt categories.
 *
 * @param {unknown} value - Value to check
 * @returns {boolean} True if value is a valid PromptCategory
 *
 * @example
 * ```typescript
 * if (isPromptCategory(input)) {
 *   // input is typed as PromptCategory
 * }
 * ```
 */
export function isPromptCategory(value: unknown): value is PromptCategory {
  return (
    typeof value === 'string' &&
    PROMPT_CATEGORIES.includes(value as PromptCategory)
  );
}

/**
 * Type guard to check if a value is a valid PromptDefinition
 *
 * @description Runtime validation for prompt definitions.
 *
 * @param {unknown} value - Value to check
 * @returns {boolean} True if value is a valid PromptDefinition
 */
export function isPromptDefinition(value: unknown): value is PromptDefinition {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    typeof obj.description === 'string' &&
    isPromptCategory(obj.category)
  );
}

/**
 * Type guard to check if a value is a valid RegisteredPrompt
 *
 * @description Runtime validation for registered prompts.
 *
 * @param {unknown} value - Value to check
 * @returns {boolean} True if value is a valid RegisteredPrompt
 */
export function isRegisteredPrompt(value: unknown): value is RegisteredPrompt {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    isPromptDefinition(obj.definition) && typeof obj.generator === 'function'
  );
}
