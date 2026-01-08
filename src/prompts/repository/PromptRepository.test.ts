/**
 * PromptRepository Unit Tests
 *
 * @description ISO/IEC 29119 compliant test suite for PromptRepository.
 * Tests the Repository Pattern implementation in isolation.
 *
 * Test Categories:
 * - Construction and initialization
 * - Query operations (findByName, findByCategory, exists)
 * - Collection operations (getAll, getAllDefinitions, getAllNames)
 * - Aggregation operations (count, getGroupedByCategory)
 * - Edge cases and boundary conditions
 *
 * @module prompts/repository/tests
 */

import { PromptRepository, promptRepository } from './PromptRepository.js';
import {
  RegisteredPrompt,
  PromptDefinition,
  PromptCategory,
  PROMPT_CATEGORIES,
} from '../domain/types.js';

// =============================================================================
// TEST FIXTURES
// =============================================================================

/**
 * Creates a mock RegisteredPrompt for testing
 */
const createMockPrompt = (
  name: string,
  category: PromptCategory,
  description: string = `Test prompt: ${name}`
): RegisteredPrompt => ({
  definition: {
    name,
    description,
    category,
    arguments: [{ name: 'testArg', description: 'Test argument', required: true }],
  },
  generator: (args) => ({
    description: `Generated: ${name}`,
    messages: [
      {
        role: 'user',
        content: { type: 'text', text: `Test message for ${name}: ${args.testArg || 'default'}` },
      },
    ],
  }),
});

/**
 * Standard test fixtures
 */
const testPrompts: RegisteredPrompt[] = [
  createMockPrompt('test_gameplay_1', 'gameplay'),
  createMockPrompt('test_gameplay_2', 'gameplay'),
  createMockPrompt('test_debug_1', 'debug'),
  createMockPrompt('test_scaffolding_1', 'scaffolding'),
  createMockPrompt('test_migration_1', 'migration'),
  createMockPrompt('test_analysis_1', 'analysis'),
];

// =============================================================================
// CONSTRUCTOR TESTS
// =============================================================================

describe('PromptRepository', () => {
  describe('constructor', () => {
    it('creates repository with provided prompts', () => {
      const repo = new PromptRepository(testPrompts);
      expect(repo.count()).toBe(testPrompts.length);
    });

    it('creates repository with empty array', () => {
      const repo = new PromptRepository([]);
      expect(repo.count()).toBe(0);
    });

    it('creates repository with default prompts when no argument', () => {
      const repo = new PromptRepository();
      expect(repo.count()).toBeGreaterThan(0);
    });

    it('handles single prompt', () => {
      const singlePrompt = [createMockPrompt('single', 'gameplay')];
      const repo = new PromptRepository(singlePrompt);
      expect(repo.count()).toBe(1);
    });

    it('deduplicates prompts with same name (last wins)', () => {
      const duplicates = [
        createMockPrompt('same_name', 'gameplay', 'First'),
        createMockPrompt('same_name', 'debug', 'Second'),
      ];
      const repo = new PromptRepository(duplicates);
      expect(repo.count()).toBe(1);
      const prompt = repo.findByName('same_name');
      expect(prompt?.definition.category).toBe('debug');
    });
  });

  // ===========================================================================
  // QUERY OPERATIONS
  // ===========================================================================

  describe('findByName', () => {
    let repo: PromptRepository;

    beforeEach(() => {
      repo = new PromptRepository(testPrompts);
    });

    it('returns prompt when found', () => {
      const prompt = repo.findByName('test_gameplay_1');
      expect(prompt).toBeDefined();
      expect(prompt?.definition.name).toBe('test_gameplay_1');
    });

    it('returns undefined for non-existent name', () => {
      const prompt = repo.findByName('non_existent_prompt');
      expect(prompt).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      const prompt = repo.findByName('');
      expect(prompt).toBeUndefined();
    });

    it('is case-sensitive', () => {
      const prompt = repo.findByName('TEST_GAMEPLAY_1');
      expect(prompt).toBeUndefined();
    });

    it('returns complete RegisteredPrompt with generator', () => {
      const prompt = repo.findByName('test_gameplay_1');
      expect(prompt?.definition).toBeDefined();
      expect(prompt?.generator).toBeInstanceOf(Function);
    });

    it('generator produces valid output', () => {
      const prompt = repo.findByName('test_gameplay_1');
      const result = prompt?.generator({ testArg: 'hello' });
      expect(result?.description).toContain('test_gameplay_1');
      expect(result?.messages).toHaveLength(1);
    });
  });

  describe('findByCategory', () => {
    let repo: PromptRepository;

    beforeEach(() => {
      repo = new PromptRepository(testPrompts);
    });

    it('returns all prompts in category', () => {
      const gameplayPrompts = repo.findByCategory('gameplay');
      expect(gameplayPrompts).toHaveLength(2);
      gameplayPrompts.forEach((p) => {
        expect(p.definition.category).toBe('gameplay');
      });
    });

    it('returns empty array for category with no prompts', () => {
      const singleCategoryRepo = new PromptRepository([
        createMockPrompt('only_gameplay', 'gameplay'),
      ]);
      const debugPrompts = singleCategoryRepo.findByCategory('debug');
      expect(debugPrompts).toHaveLength(0);
    });

    it('returns prompts for each valid category', () => {
      for (const category of PROMPT_CATEGORIES) {
        const prompts = repo.findByCategory(category);
        expect(Array.isArray(prompts)).toBe(true);
      }
    });

    it('returns new array each time (immutability)', () => {
      const first = repo.findByCategory('gameplay');
      const second = repo.findByCategory('gameplay');
      expect(first).not.toBe(second);
      expect(first).toEqual(second);
    });
  });

  describe('exists', () => {
    let repo: PromptRepository;

    beforeEach(() => {
      repo = new PromptRepository(testPrompts);
    });

    it('returns true for existing prompt', () => {
      expect(repo.exists('test_gameplay_1')).toBe(true);
    });

    it('returns false for non-existent prompt', () => {
      expect(repo.exists('non_existent')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(repo.exists('')).toBe(false);
    });

    it('is case-sensitive', () => {
      expect(repo.exists('TEST_GAMEPLAY_1')).toBe(false);
    });

    it('is consistent with findByName', () => {
      const name = 'test_gameplay_1';
      expect(repo.exists(name)).toBe(repo.findByName(name) !== undefined);
    });
  });

  // ===========================================================================
  // COLLECTION OPERATIONS
  // ===========================================================================

  describe('getAll', () => {
    let repo: PromptRepository;

    beforeEach(() => {
      repo = new PromptRepository(testPrompts);
    });

    it('returns all registered prompts', () => {
      const all = repo.getAll();
      expect(all).toHaveLength(testPrompts.length);
    });

    it('returns empty array for empty repository', () => {
      const emptyRepo = new PromptRepository([]);
      expect(emptyRepo.getAll()).toHaveLength(0);
    });

    it('returns prompts with generators', () => {
      const all = repo.getAll();
      all.forEach((p) => {
        expect(p.generator).toBeInstanceOf(Function);
      });
    });

    it('returns new array each time (immutability)', () => {
      const first = repo.getAll();
      const second = repo.getAll();
      expect(first).not.toBe(second);
    });
  });

  describe('getAllDefinitions', () => {
    let repo: PromptRepository;

    beforeEach(() => {
      repo = new PromptRepository(testPrompts);
    });

    it('returns all definitions', () => {
      const definitions = repo.getAllDefinitions();
      expect(definitions).toHaveLength(testPrompts.length);
    });

    it('returns definitions without generators', () => {
      const definitions = repo.getAllDefinitions();
      definitions.forEach((d) => {
        expect(d.name).toBeDefined();
        expect(d.description).toBeDefined();
        expect(d.category).toBeDefined();
        expect((d as unknown as RegisteredPrompt).generator).toBeUndefined();
      });
    });

    it('returns valid PromptDefinition objects', () => {
      const definitions = repo.getAllDefinitions();
      definitions.forEach((d: PromptDefinition) => {
        expect(typeof d.name).toBe('string');
        expect(typeof d.description).toBe('string');
        expect(PROMPT_CATEGORIES).toContain(d.category);
      });
    });

    it('returns empty array for empty repository', () => {
      const emptyRepo = new PromptRepository([]);
      expect(emptyRepo.getAllDefinitions()).toHaveLength(0);
    });
  });

  describe('getAllNames', () => {
    let repo: PromptRepository;

    beforeEach(() => {
      repo = new PromptRepository(testPrompts);
    });

    it('returns all prompt names', () => {
      const names = repo.getAllNames();
      expect(names).toHaveLength(testPrompts.length);
    });

    it('returns strings only', () => {
      const names = repo.getAllNames();
      names.forEach((name) => {
        expect(typeof name).toBe('string');
      });
    });

    it('contains expected names', () => {
      const names = repo.getAllNames();
      expect(names).toContain('test_gameplay_1');
      expect(names).toContain('test_debug_1');
    });

    it('returns empty array for empty repository', () => {
      const emptyRepo = new PromptRepository([]);
      expect(emptyRepo.getAllNames()).toHaveLength(0);
    });
  });

  // ===========================================================================
  // AGGREGATION OPERATIONS
  // ===========================================================================

  describe('count', () => {
    it('returns correct count', () => {
      const repo = new PromptRepository(testPrompts);
      expect(repo.count()).toBe(testPrompts.length);
    });

    it('returns 0 for empty repository', () => {
      const repo = new PromptRepository([]);
      expect(repo.count()).toBe(0);
    });

    it('returns 1 for single prompt', () => {
      const repo = new PromptRepository([createMockPrompt('single', 'gameplay')]);
      expect(repo.count()).toBe(1);
    });

    it('is consistent with getAll().length', () => {
      const repo = new PromptRepository(testPrompts);
      expect(repo.count()).toBe(repo.getAll().length);
    });
  });

  describe('getGroupedByCategory', () => {
    let repo: PromptRepository;

    beforeEach(() => {
      repo = new PromptRepository(testPrompts);
    });

    it('returns Map grouped by category', () => {
      const grouped = repo.getGroupedByCategory();
      expect(grouped).toBeInstanceOf(Map);
    });

    it('groups prompts correctly', () => {
      const grouped = repo.getGroupedByCategory();
      const gameplayPrompts = grouped.get('gameplay');
      expect(gameplayPrompts).toHaveLength(2);
    });

    it('includes all prompts across groups', () => {
      const grouped = repo.getGroupedByCategory();
      let totalCount = 0;
      for (const prompts of grouped.values()) {
        totalCount += prompts.length;
      }
      expect(totalCount).toBe(testPrompts.length);
    });

    it('returns empty Map for empty repository', () => {
      const emptyRepo = new PromptRepository([]);
      const grouped = emptyRepo.getGroupedByCategory();
      expect(grouped.size).toBe(0);
    });

    it('each group contains valid prompts', () => {
      const grouped = repo.getGroupedByCategory();
      for (const [category, prompts] of grouped) {
        prompts.forEach((p) => {
          expect(p.definition.category).toBe(category);
        });
      }
    });
  });

  // ===========================================================================
  // SINGLETON INSTANCE
  // ===========================================================================

  describe('promptRepository singleton', () => {
    it('is an instance of PromptRepository', () => {
      expect(promptRepository).toBeInstanceOf(PromptRepository);
    });

    it('contains default prompts', () => {
      expect(promptRepository.count()).toBeGreaterThan(0);
    });

    it('contains expected prompts', () => {
      expect(promptRepository.exists('create_character_controller')).toBe(true);
      expect(promptRepository.exists('analyze_project')).toBe(true);
    });

    it('has 20 prompts as per specification', () => {
      expect(promptRepository.count()).toBe(20);
    });

    it('has all categories represented', () => {
      const grouped = promptRepository.getGroupedByCategory();
      expect(grouped.has('gameplay')).toBe(true);
      expect(grouped.has('scaffolding')).toBe(true);
      expect(grouped.has('debug')).toBe(true);
      expect(grouped.has('migration')).toBe(true);
      expect(grouped.has('analysis')).toBe(true);
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('edge cases', () => {
    it('handles special characters in prompt names', () => {
      const specialPrompt = createMockPrompt('test-with-dashes', 'gameplay');
      const repo = new PromptRepository([specialPrompt]);
      expect(repo.findByName('test-with-dashes')).toBeDefined();
    });

    it('handles very long prompt names', () => {
      const longName = 'a'.repeat(100);
      const longPrompt = createMockPrompt(longName, 'gameplay');
      const repo = new PromptRepository([longPrompt]);
      expect(repo.findByName(longName)).toBeDefined();
    });

    it('handles prompts with no arguments', () => {
      const noArgsPrompt: RegisteredPrompt = {
        definition: {
          name: 'no_args',
          description: 'No arguments',
          category: 'debug',
        },
        generator: () => ({
          description: 'No args prompt',
          messages: [{ role: 'user', content: { type: 'text', text: 'Test' } }],
        }),
      };
      const repo = new PromptRepository([noArgsPrompt]);
      expect(repo.findByName('no_args')?.definition.arguments).toBeUndefined();
    });

    it('handles large number of prompts', () => {
      const manyPrompts = Array.from({ length: 1000 }, (_, i) =>
        createMockPrompt(`prompt_${i}`, 'gameplay')
      );
      const repo = new PromptRepository(manyPrompts);
      expect(repo.count()).toBe(1000);
      expect(repo.findByName('prompt_500')).toBeDefined();
    });
  });
});
