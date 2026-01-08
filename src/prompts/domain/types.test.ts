/**
 * Domain Types Unit Tests
 *
 * @description ISO/IEC 29119 compliant test suite for domain types and type guards.
 * Tests type exports, constants, and runtime validation functions.
 *
 * Test Categories:
 * - Type exports verification
 * - Constants validation
 * - Type guard functions
 * - Edge cases and boundary conditions
 *
 * @module prompts/domain/tests
 */

import {
  // Type exports (compile-time verification)
  MCPPrompt,
  MCPPromptArgument,
  MCPPromptMessage,
  MCPPromptResult,
  PromptCategory,
  PromptDefinition,
  PromptArguments,
  GeneratedPromptResult,
  MessageGenerator,
  RegisteredPrompt,
  // Runtime exports
  PROMPT_CATEGORIES,
  isPromptCategory,
  isPromptDefinition,
  isRegisteredPrompt,
} from './types.js';

// =============================================================================
// TYPE EXPORTS VERIFICATION (Compile-time)
// =============================================================================

describe('Domain Types', () => {
  describe('type exports', () => {
    it('exports MCPPrompt type', () => {
      // Type-level verification - if this compiles, the type exists
      const prompt: MCPPrompt = {
        name: 'test',
        description: 'Test prompt',
      };
      expect(prompt.name).toBe('test');
    });

    it('exports MCPPromptArgument type', () => {
      const arg: MCPPromptArgument = {
        name: 'arg1',
        description: 'Test argument',
        required: true,
      };
      expect(arg.required).toBe(true);
    });

    it('exports MCPPromptMessage type', () => {
      const message: MCPPromptMessage = {
        role: 'user',
        content: { type: 'text', text: 'Hello' },
      };
      expect(message.role).toBe('user');
    });

    it('exports MCPPromptResult type', () => {
      const result: MCPPromptResult = {
        description: 'Test result',
        messages: [{ role: 'user', content: { type: 'text', text: 'Test' } }],
      };
      expect(result.messages).toHaveLength(1);
    });

    it('exports PromptCategory type', () => {
      const category: PromptCategory = 'gameplay';
      expect(category).toBe('gameplay');
    });

    it('exports PromptDefinition interface', () => {
      const definition: PromptDefinition = {
        name: 'test_prompt',
        description: 'Test',
        category: 'debug',
      };
      expect(definition.category).toBe('debug');
    });

    it('exports PromptArguments type', () => {
      const args: PromptArguments = {
        type: '2D',
        features: 'jump, dash',
      };
      expect(args.type).toBe('2D');
    });

    it('exports GeneratedPromptResult type', () => {
      const result: GeneratedPromptResult = {
        description: 'Generated',
        messages: [],
      };
      expect(result.description).toBe('Generated');
    });

    it('exports MessageGenerator type', () => {
      const generator: MessageGenerator = (args) => ({
        description: `Test: ${args.type || 'default'}`,
        messages: [{ role: 'user', content: { type: 'text', text: 'Test' } }],
      });
      const result = generator({ type: '3D' });
      expect(result.description).toContain('3D');
    });

    it('exports RegisteredPrompt interface', () => {
      const prompt: RegisteredPrompt = {
        definition: {
          name: 'test',
          description: 'Test',
          category: 'analysis',
        },
        generator: () => ({
          description: 'Test',
          messages: [],
        }),
      };
      expect(prompt.definition.name).toBe('test');
    });
  });

  // ===========================================================================
  // PROMPT_CATEGORIES CONSTANT
  // ===========================================================================

  describe('PROMPT_CATEGORIES', () => {
    it('is a readonly array', () => {
      expect(Array.isArray(PROMPT_CATEGORIES)).toBe(true);
      // Note: 'as const' provides compile-time immutability, not runtime freeze
      // We verify it behaves as readonly by checking it's an array with expected values
    });

    it('contains exactly 5 categories', () => {
      expect(PROMPT_CATEGORIES).toHaveLength(5);
    });

    it('contains gameplay category', () => {
      expect(PROMPT_CATEGORIES).toContain('gameplay');
    });

    it('contains scaffolding category', () => {
      expect(PROMPT_CATEGORIES).toContain('scaffolding');
    });

    it('contains debug category', () => {
      expect(PROMPT_CATEGORIES).toContain('debug');
    });

    it('contains migration category', () => {
      expect(PROMPT_CATEGORIES).toContain('migration');
    });

    it('contains analysis category', () => {
      expect(PROMPT_CATEGORIES).toContain('analysis');
    });

    it('categories are in expected order', () => {
      expect(PROMPT_CATEGORIES[0]).toBe('gameplay');
      expect(PROMPT_CATEGORIES[1]).toBe('scaffolding');
      expect(PROMPT_CATEGORIES[2]).toBe('debug');
      expect(PROMPT_CATEGORIES[3]).toBe('migration');
      expect(PROMPT_CATEGORIES[4]).toBe('analysis');
    });

    it('all elements are strings', () => {
      PROMPT_CATEGORIES.forEach((category) => {
        expect(typeof category).toBe('string');
      });
    });
  });

  // ===========================================================================
  // isPromptCategory TYPE GUARD
  // ===========================================================================

  describe('isPromptCategory', () => {
    describe('valid categories', () => {
      it('returns true for gameplay', () => {
        expect(isPromptCategory('gameplay')).toBe(true);
      });

      it('returns true for scaffolding', () => {
        expect(isPromptCategory('scaffolding')).toBe(true);
      });

      it('returns true for debug', () => {
        expect(isPromptCategory('debug')).toBe(true);
      });

      it('returns true for migration', () => {
        expect(isPromptCategory('migration')).toBe(true);
      });

      it('returns true for analysis', () => {
        expect(isPromptCategory('analysis')).toBe(true);
      });
    });

    describe('invalid categories', () => {
      it('returns false for invalid string', () => {
        expect(isPromptCategory('invalid')).toBe(false);
      });

      it('returns false for empty string', () => {
        expect(isPromptCategory('')).toBe(false);
      });

      it('returns false for number', () => {
        expect(isPromptCategory(123)).toBe(false);
      });

      it('returns false for null', () => {
        expect(isPromptCategory(null)).toBe(false);
      });

      it('returns false for undefined', () => {
        expect(isPromptCategory(undefined)).toBe(false);
      });

      it('returns false for object', () => {
        expect(isPromptCategory({ category: 'gameplay' })).toBe(false);
      });

      it('returns false for array', () => {
        expect(isPromptCategory(['gameplay'])).toBe(false);
      });

      it('returns false for boolean', () => {
        expect(isPromptCategory(true)).toBe(false);
      });

      it('is case-sensitive', () => {
        expect(isPromptCategory('GAMEPLAY')).toBe(false);
        expect(isPromptCategory('Gameplay')).toBe(false);
      });
    });
  });

  // ===========================================================================
  // isPromptDefinition TYPE GUARD
  // ===========================================================================

  describe('isPromptDefinition', () => {
    describe('valid definitions', () => {
      it('returns true for minimal valid definition', () => {
        const def = {
          name: 'test',
          description: 'Test prompt',
          category: 'gameplay',
        };
        expect(isPromptDefinition(def)).toBe(true);
      });

      it('returns true for definition with arguments', () => {
        const def = {
          name: 'test',
          description: 'Test prompt',
          category: 'debug',
          arguments: [{ name: 'arg1', description: 'Arg', required: true }],
        };
        expect(isPromptDefinition(def)).toBe(true);
      });

      it('returns true for each valid category', () => {
        for (const category of PROMPT_CATEGORIES) {
          const def = {
            name: 'test',
            description: 'Test',
            category,
          };
          expect(isPromptDefinition(def)).toBe(true);
        }
      });
    });

    describe('invalid definitions', () => {
      it('returns false for null', () => {
        expect(isPromptDefinition(null)).toBe(false);
      });

      it('returns false for undefined', () => {
        expect(isPromptDefinition(undefined)).toBe(false);
      });

      it('returns false for string', () => {
        expect(isPromptDefinition('test')).toBe(false);
      });

      it('returns false for number', () => {
        expect(isPromptDefinition(123)).toBe(false);
      });

      it('returns false for array', () => {
        expect(isPromptDefinition([])).toBe(false);
      });

      it('returns false for missing name', () => {
        const def = {
          description: 'Test',
          category: 'gameplay',
        };
        expect(isPromptDefinition(def)).toBe(false);
      });

      it('returns false for missing description', () => {
        const def = {
          name: 'test',
          category: 'gameplay',
        };
        expect(isPromptDefinition(def)).toBe(false);
      });

      it('returns false for missing category', () => {
        const def = {
          name: 'test',
          description: 'Test',
        };
        expect(isPromptDefinition(def)).toBe(false);
      });

      it('returns false for invalid category', () => {
        const def = {
          name: 'test',
          description: 'Test',
          category: 'invalid',
        };
        expect(isPromptDefinition(def)).toBe(false);
      });

      it('returns false for non-string name', () => {
        const def = {
          name: 123,
          description: 'Test',
          category: 'gameplay',
        };
        expect(isPromptDefinition(def)).toBe(false);
      });

      it('returns false for non-string description', () => {
        const def = {
          name: 'test',
          description: 123,
          category: 'gameplay',
        };
        expect(isPromptDefinition(def)).toBe(false);
      });
    });
  });

  // ===========================================================================
  // isRegisteredPrompt TYPE GUARD
  // ===========================================================================

  describe('isRegisteredPrompt', () => {
    describe('valid registered prompts', () => {
      it('returns true for valid registered prompt', () => {
        const prompt = {
          definition: {
            name: 'test',
            description: 'Test',
            category: 'gameplay',
          },
          generator: () => ({ description: 'Test', messages: [] }),
        };
        expect(isRegisteredPrompt(prompt)).toBe(true);
      });

      it('returns true for prompt with arguments', () => {
        const prompt = {
          definition: {
            name: 'test',
            description: 'Test',
            category: 'debug',
            arguments: [{ name: 'arg', description: 'Arg', required: true }],
          },
          generator: (args: PromptArguments) => ({
            description: `Test: ${args.arg}`,
            messages: [],
          }),
        };
        expect(isRegisteredPrompt(prompt)).toBe(true);
      });
    });

    describe('invalid registered prompts', () => {
      it('returns false for null', () => {
        expect(isRegisteredPrompt(null)).toBe(false);
      });

      it('returns false for undefined', () => {
        expect(isRegisteredPrompt(undefined)).toBe(false);
      });

      it('returns false for string', () => {
        expect(isRegisteredPrompt('test')).toBe(false);
      });

      it('returns false for missing definition', () => {
        const prompt = {
          generator: () => ({ description: 'Test', messages: [] }),
        };
        expect(isRegisteredPrompt(prompt)).toBe(false);
      });

      it('returns false for missing generator', () => {
        const prompt = {
          definition: {
            name: 'test',
            description: 'Test',
            category: 'gameplay',
          },
        };
        expect(isRegisteredPrompt(prompt)).toBe(false);
      });

      it('returns false for invalid definition', () => {
        const prompt = {
          definition: {
            name: 'test',
            // missing description and category
          },
          generator: () => ({ description: 'Test', messages: [] }),
        };
        expect(isRegisteredPrompt(prompt)).toBe(false);
      });

      it('returns false for non-function generator', () => {
        const prompt = {
          definition: {
            name: 'test',
            description: 'Test',
            category: 'gameplay',
          },
          generator: 'not a function',
        };
        expect(isRegisteredPrompt(prompt)).toBe(false);
      });

      it('returns false for null generator', () => {
        const prompt = {
          definition: {
            name: 'test',
            description: 'Test',
            category: 'gameplay',
          },
          generator: null,
        };
        expect(isRegisteredPrompt(prompt)).toBe(false);
      });
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('edge cases', () => {
    it('type guards handle frozen objects', () => {
      const frozen = Object.freeze({
        name: 'test',
        description: 'Test',
        category: 'gameplay',
      });
      expect(isPromptDefinition(frozen)).toBe(true);
    });

    it('type guards handle objects with extra properties', () => {
      const extended = {
        name: 'test',
        description: 'Test',
        category: 'gameplay',
        extraProp: 'extra',
      };
      expect(isPromptDefinition(extended)).toBe(true);
    });

    it('type guards handle nested objects', () => {
      const nested = {
        definition: {
          name: 'test',
          description: 'Test',
          category: 'analysis',
          nested: { deep: true },
        },
        generator: () => ({ description: 'Test', messages: [] }),
      };
      expect(isRegisteredPrompt(nested)).toBe(true);
    });

    it('type guards handle empty strings', () => {
      const emptyName = {
        name: '',
        description: '',
        category: 'gameplay',
      };
      // Empty strings are still strings, so this should pass
      expect(isPromptDefinition(emptyName)).toBe(true);
    });

    it('type guards handle whitespace-only strings', () => {
      const whitespace = {
        name: '   ',
        description: '   ',
        category: 'debug',
      };
      expect(isPromptDefinition(whitespace)).toBe(true);
    });

    it('type guards are consistent across multiple calls', () => {
      const def = {
        name: 'test',
        description: 'Test',
        category: 'gameplay',
      };
      expect(isPromptDefinition(def)).toBe(isPromptDefinition(def));
      expect(isPromptDefinition(def)).toBe(true);
    });
  });
});
