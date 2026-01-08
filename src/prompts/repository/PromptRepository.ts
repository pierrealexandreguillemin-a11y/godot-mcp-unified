/**
 * Prompt Repository - Data Access Layer
 *
 * @description Repository pattern implementation for prompt storage and retrieval.
 * Follows ISO/IEC 5055 (CISQ) Single Responsibility Principle.
 *
 * @module prompts/repository
 * @since 0.9.0
 * @license MIT
 *
 * @example
 * ```typescript
 * import { PromptRepository, promptRepository } from './PromptRepository.js';
 *
 * // Use singleton instance
 * const allPrompts = promptRepository.getAllDefinitions();
 * const prompt = promptRepository.findByName('create_character_controller');
 *
 * // Or create custom instance
 * const customRepo = new PromptRepository(myPrompts);
 * ```
 */

import {
  RegisteredPrompt,
  PromptDefinition,
  PromptCategory,
} from '../domain/types.js';
import { allPrompts } from '../definitions/index.js';

/**
 * Repository for managing prompt definitions
 *
 * @description Implements the Repository Pattern (DDD) for prompt aggregates.
 * Provides a collection-like interface for accessing prompts without exposing
 * the underlying data structure.
 *
 * @class PromptRepository
 *
 * @example
 * ```typescript
 * const repo = new PromptRepository();
 *
 * // Find by name
 * const prompt = repo.findByName('debug_script');
 *
 * // Find by category
 * const gameplayPrompts = repo.findByCategory('gameplay');
 *
 * // Check existence
 * if (repo.exists('my_prompt')) {
 *   console.log('Prompt found');
 * }
 * ```
 */
export class PromptRepository {
  /**
   * Internal storage using Map for O(1) lookup by name
   * @private
   * @readonly
   */
  private readonly prompts: Map<string, RegisteredPrompt>;

  /**
   * Creates a new PromptRepository instance
   *
   * @description Initializes the repository with an array of registered prompts.
   * Defaults to all prompts from the definitions module.
   *
   * @param {RegisteredPrompt[]} [prompts=allPrompts] - Array of prompts to manage
   *
   * @example
   * ```typescript
   * // Default with all prompts
   * const repo = new PromptRepository();
   *
   * // Custom prompts
   * const customRepo = new PromptRepository([myPrompt1, myPrompt2]);
   * ```
   */
  constructor(prompts: RegisteredPrompt[] = allPrompts) {
    this.prompts = new Map(prompts.map((p) => [p.definition.name, p]));
  }

  /**
   * Get all prompt definitions
   *
   * @description Returns only the definition metadata without generators.
   * Useful for listing available prompts to clients.
   *
   * @returns {PromptDefinition[]} Array of all prompt definitions
   *
   * @example
   * ```typescript
   * const definitions = repo.getAllDefinitions();
   * definitions.forEach(d => console.log(d.name, d.description));
   * ```
   */
  getAllDefinitions(): PromptDefinition[] {
    return Array.from(this.prompts.values()).map((p) => p.definition);
  }

  /**
   * Get all registered prompts
   *
   * @description Returns complete prompt objects including generators.
   * Use when you need to execute prompt generation.
   *
   * @returns {RegisteredPrompt[]} Array of all registered prompts
   *
   * @example
   * ```typescript
   * const prompts = repo.getAll();
   * prompts.forEach(p => {
   *   const result = p.generator({ type: '2D' });
   *   console.log(result.description);
   * });
   * ```
   */
  getAll(): RegisteredPrompt[] {
    return Array.from(this.prompts.values());
  }

  /**
   * Find a prompt by name
   *
   * @description Retrieves a single prompt by its unique identifier.
   * Returns undefined if not found (null object pattern alternative).
   *
   * @param {string} name - Unique prompt identifier
   * @returns {RegisteredPrompt | undefined} The prompt or undefined
   *
   * @example
   * ```typescript
   * const prompt = repo.findByName('create_enemy_ai');
   * if (prompt) {
   *   const result = prompt.generator({ behavior: 'patrol' });
   * }
   * ```
   */
  findByName(name: string): RegisteredPrompt | undefined {
    return this.prompts.get(name);
  }

  /**
   * Check if a prompt exists
   *
   * @description Fast O(1) existence check without retrieving the prompt.
   *
   * @param {string} name - Prompt name to check
   * @returns {boolean} True if prompt exists
   *
   * @example
   * ```typescript
   * if (repo.exists('scaffold_platformer')) {
   *   // Safe to call findByName
   * }
   * ```
   */
  exists(name: string): boolean {
    return this.prompts.has(name);
  }

  /**
   * Get prompts by category
   *
   * @description Filters prompts by their bounded context category.
   * Useful for organizing prompts in UI or documentation.
   *
   * @param {PromptCategory} category - Category to filter by
   * @returns {RegisteredPrompt[]} Array of prompts in the category
   *
   * @example
   * ```typescript
   * const debugPrompts = repo.findByCategory('debug');
   * console.log(`Found ${debugPrompts.length} debug prompts`);
   * ```
   */
  findByCategory(category: PromptCategory): RegisteredPrompt[] {
    return Array.from(this.prompts.values()).filter(
      (p) => p.definition.category === category
    );
  }

  /**
   * Get total count
   *
   * @description Returns the number of registered prompts.
   *
   * @returns {number} Total prompt count
   *
   * @example
   * ```typescript
   * console.log(`Repository contains ${repo.count()} prompts`);
   * ```
   */
  count(): number {
    return this.prompts.size;
  }

  /**
   * Get all prompt names
   *
   * @description Returns just the names for quick enumeration.
   *
   * @returns {string[]} Array of all prompt names
   *
   * @example
   * ```typescript
   * const names = repo.getAllNames();
   * names.forEach(name => console.log(name));
   * ```
   */
  getAllNames(): string[] {
    return Array.from(this.prompts.keys());
  }

  /**
   * Get prompts grouped by category
   *
   * @description Returns a map of categories to their prompts.
   * Useful for building categorized documentation or UI.
   *
   * @returns {Map<PromptCategory, RegisteredPrompt[]>} Prompts grouped by category
   *
   * @example
   * ```typescript
   * const grouped = repo.getGroupedByCategory();
   * for (const [category, prompts] of grouped) {
   *   console.log(`${category}: ${prompts.length} prompts`);
   * }
   * ```
   */
  getGroupedByCategory(): Map<PromptCategory, RegisteredPrompt[]> {
    const grouped = new Map<PromptCategory, RegisteredPrompt[]>();
    for (const prompt of this.prompts.values()) {
      const category = prompt.definition.category;
      const existing = grouped.get(category) || [];
      existing.push(prompt);
      grouped.set(category, existing);
    }
    return grouped;
  }
}

/**
 * Singleton instance for backward compatibility
 *
 * @description Pre-initialized repository with all default prompts.
 * Use this instance for most use cases.
 *
 * @constant
 * @type {PromptRepository}
 *
 * @example
 * ```typescript
 * import { promptRepository } from './PromptRepository.js';
 *
 * const prompt = promptRepository.findByName('analyze_project');
 * ```
 */
export const promptRepository = new PromptRepository();
