/**
 * Prompt Definitions Index Unit Tests
 *
 * @description ISO/IEC 29119 compliant test suite for the definitions aggregate.
 * Tests the allPrompts collection and individual bounded context exports.
 *
 * Test Categories:
 * - Aggregate export verification
 * - Bounded context exports
 * - Prompt count and completeness
 * - Prompt structure validation
 * - Generator functionality
 *
 * @module prompts/definitions/tests
 */

import {
  allPrompts,
  // Gameplay exports
  createCharacterController,
  createEnemyAI,
  createNPC,
  createCollectible,
  createProjectile,
  // Scaffolding exports
  scaffoldPlatformer,
  scaffoldTopdown,
  scaffoldFPS,
  scaffoldPuzzle,
  scaffoldUISystem,
  createUIComponent,
  setupMultiplayer,
  // Debug exports
  debugScript,
  debugPhysics,
  debugPerformance,
  optimizeScene,
  createShader,
  // Migration exports
  convert3to4,
  refactorScene,
  // Analysis exports
  analyzeProject,
} from './index.js';

import {
  RegisteredPrompt,
  PromptCategory,
  PROMPT_CATEGORIES,
  isRegisteredPrompt,
} from '../domain/types.js';

// =============================================================================
// AGGREGATE EXPORT TESTS
// =============================================================================

describe('Prompt Definitions Index', () => {
  describe('allPrompts aggregate', () => {
    it('exports allPrompts array', () => {
      expect(Array.isArray(allPrompts)).toBe(true);
    });

    it('contains exactly 20 prompts as per specification', () => {
      expect(allPrompts).toHaveLength(20);
    });

    it('all items are valid RegisteredPrompt', () => {
      allPrompts.forEach((prompt, index) => {
        expect(isRegisteredPrompt(prompt)).toBe(true);
        if (!isRegisteredPrompt(prompt)) {
          throw new Error(`Prompt at index ${index} is not a valid RegisteredPrompt`);
        }
      });
    });

    it('all prompts have unique names', () => {
      const names = allPrompts.map((p) => p.definition.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('all prompts have valid categories', () => {
      allPrompts.forEach((prompt) => {
        expect(PROMPT_CATEGORIES).toContain(prompt.definition.category);
      });
    });

    it('all prompts have non-empty descriptions', () => {
      allPrompts.forEach((prompt) => {
        expect(prompt.definition.description.length).toBeGreaterThan(0);
      });
    });

    it('all prompts have working generators', () => {
      allPrompts.forEach((prompt) => {
        expect(typeof prompt.generator).toBe('function');
        // Call with empty args to verify it doesn't throw
        const result = prompt.generator({});
        expect(result).toBeDefined();
        expect(result.description).toBeDefined();
        expect(Array.isArray(result.messages)).toBe(true);
      });
    });
  });

  // ===========================================================================
  // BOUNDED CONTEXT: GAMEPLAY (5 prompts)
  // ===========================================================================

  describe('Gameplay bounded context', () => {
    const gameplayPrompts = [
      { export: createCharacterController, name: 'create_character_controller' },
      { export: createEnemyAI, name: 'create_enemy_ai' },
      { export: createNPC, name: 'create_npc' },
      { export: createCollectible, name: 'create_collectible' },
      { export: createProjectile, name: 'create_projectile' },
    ];

    it('exports 5 gameplay prompts', () => {
      const gameplayInAll = allPrompts.filter(
        (p) => p.definition.category === 'gameplay'
      );
      expect(gameplayInAll).toHaveLength(5);
    });

    gameplayPrompts.forEach(({ export: prompt, name }) => {
      describe(name, () => {
        it('is exported', () => {
          expect(prompt).toBeDefined();
        });

        it('is a valid RegisteredPrompt', () => {
          expect(isRegisteredPrompt(prompt)).toBe(true);
        });

        it('has correct name', () => {
          expect(prompt.definition.name).toBe(name);
        });

        it('has gameplay category', () => {
          expect(prompt.definition.category).toBe('gameplay');
        });

        it('generator returns valid result', () => {
          const result = prompt.generator({});
          expect(result.messages.length).toBeGreaterThan(0);
        });
      });
    });
  });

  // ===========================================================================
  // BOUNDED CONTEXT: SCAFFOLDING (7 prompts)
  // ===========================================================================

  describe('Scaffolding bounded context', () => {
    const scaffoldingPrompts = [
      { export: scaffoldPlatformer, name: 'scaffold_platformer' },
      { export: scaffoldTopdown, name: 'scaffold_topdown' },
      { export: scaffoldFPS, name: 'scaffold_fps' },
      { export: scaffoldPuzzle, name: 'scaffold_puzzle' },
      { export: scaffoldUISystem, name: 'scaffold_ui_system' },
      { export: createUIComponent, name: 'create_ui_component' },
      { export: setupMultiplayer, name: 'setup_multiplayer' },
    ];

    it('exports 7 scaffolding prompts', () => {
      const scaffoldingInAll = allPrompts.filter(
        (p) => p.definition.category === 'scaffolding'
      );
      expect(scaffoldingInAll).toHaveLength(7);
    });

    scaffoldingPrompts.forEach(({ export: prompt, name }) => {
      describe(name, () => {
        it('is exported', () => {
          expect(prompt).toBeDefined();
        });

        it('is a valid RegisteredPrompt', () => {
          expect(isRegisteredPrompt(prompt)).toBe(true);
        });

        it('has correct name', () => {
          expect(prompt.definition.name).toBe(name);
        });

        it('has scaffolding category', () => {
          expect(prompt.definition.category).toBe('scaffolding');
        });

        it('generator returns valid result', () => {
          const result = prompt.generator({});
          expect(result.messages.length).toBeGreaterThan(0);
        });
      });
    });
  });

  // ===========================================================================
  // BOUNDED CONTEXT: DEBUG (5 prompts)
  // ===========================================================================

  describe('Debug bounded context', () => {
    const debugPrompts = [
      { export: debugScript, name: 'debug_script' },
      { export: debugPhysics, name: 'debug_physics' },
      { export: debugPerformance, name: 'debug_performance' },
      { export: optimizeScene, name: 'optimize_scene' },
      { export: createShader, name: 'create_shader' },
    ];

    it('exports 5 debug prompts', () => {
      const debugInAll = allPrompts.filter(
        (p) => p.definition.category === 'debug'
      );
      expect(debugInAll).toHaveLength(5);
    });

    debugPrompts.forEach(({ export: prompt, name }) => {
      describe(name, () => {
        it('is exported', () => {
          expect(prompt).toBeDefined();
        });

        it('is a valid RegisteredPrompt', () => {
          expect(isRegisteredPrompt(prompt)).toBe(true);
        });

        it('has correct name', () => {
          expect(prompt.definition.name).toBe(name);
        });

        it('has debug category', () => {
          expect(prompt.definition.category).toBe('debug');
        });

        it('generator returns valid result', () => {
          const result = prompt.generator({});
          expect(result.messages.length).toBeGreaterThan(0);
        });
      });
    });
  });

  // ===========================================================================
  // BOUNDED CONTEXT: MIGRATION (2 prompts)
  // ===========================================================================

  describe('Migration bounded context', () => {
    const migrationPrompts = [
      { export: convert3to4, name: 'convert_3to4' },
      { export: refactorScene, name: 'refactor_scene' },
    ];

    it('exports 2 migration prompts', () => {
      const migrationInAll = allPrompts.filter(
        (p) => p.definition.category === 'migration'
      );
      expect(migrationInAll).toHaveLength(2);
    });

    migrationPrompts.forEach(({ export: prompt, name }) => {
      describe(name, () => {
        it('is exported', () => {
          expect(prompt).toBeDefined();
        });

        it('is a valid RegisteredPrompt', () => {
          expect(isRegisteredPrompt(prompt)).toBe(true);
        });

        it('has correct name', () => {
          expect(prompt.definition.name).toBe(name);
        });

        it('has migration category', () => {
          expect(prompt.definition.category).toBe('migration');
        });

        it('generator returns valid result', () => {
          const result = prompt.generator({});
          expect(result.messages.length).toBeGreaterThan(0);
        });
      });
    });
  });

  // ===========================================================================
  // BOUNDED CONTEXT: ANALYSIS (1 prompt)
  // ===========================================================================

  describe('Analysis bounded context', () => {
    const analysisPrompts = [
      { export: analyzeProject, name: 'analyze_project' },
    ];

    it('exports 1 analysis prompt', () => {
      const analysisInAll = allPrompts.filter(
        (p) => p.definition.category === 'analysis'
      );
      expect(analysisInAll).toHaveLength(1);
    });

    analysisPrompts.forEach(({ export: prompt, name }) => {
      describe(name, () => {
        it('is exported', () => {
          expect(prompt).toBeDefined();
        });

        it('is a valid RegisteredPrompt', () => {
          expect(isRegisteredPrompt(prompt)).toBe(true);
        });

        it('has correct name', () => {
          expect(prompt.definition.name).toBe(name);
        });

        it('has analysis category', () => {
          expect(prompt.definition.category).toBe('analysis');
        });

        it('generator returns valid result', () => {
          const result = prompt.generator({});
          expect(result.messages.length).toBeGreaterThan(0);
        });
      });
    });
  });

  // ===========================================================================
  // CATEGORY DISTRIBUTION
  // ===========================================================================

  describe('Category distribution', () => {
    it('gameplay: 5 prompts (25%)', () => {
      const count = allPrompts.filter((p) => p.definition.category === 'gameplay').length;
      expect(count).toBe(5);
    });

    it('scaffolding: 7 prompts (35%)', () => {
      const count = allPrompts.filter((p) => p.definition.category === 'scaffolding').length;
      expect(count).toBe(7);
    });

    it('debug: 5 prompts (25%)', () => {
      const count = allPrompts.filter((p) => p.definition.category === 'debug').length;
      expect(count).toBe(5);
    });

    it('migration: 2 prompts (10%)', () => {
      const count = allPrompts.filter((p) => p.definition.category === 'migration').length;
      expect(count).toBe(2);
    });

    it('analysis: 1 prompt (5%)', () => {
      const count = allPrompts.filter((p) => p.definition.category === 'analysis').length;
      expect(count).toBe(1);
    });

    it('total equals 20', () => {
      let total = 0;
      for (const category of PROMPT_CATEGORIES) {
        total += allPrompts.filter((p) => p.definition.category === category).length;
      }
      expect(total).toBe(20);
    });
  });

  // ===========================================================================
  // EXPECTED PROMPT NAMES
  // ===========================================================================

  describe('Expected prompt names', () => {
    const expectedNames = [
      // Gameplay
      'create_character_controller',
      'create_enemy_ai',
      'create_npc',
      'create_collectible',
      'create_projectile',
      // Scaffolding
      'scaffold_platformer',
      'scaffold_topdown',
      'scaffold_fps',
      'scaffold_puzzle',
      'scaffold_ui_system',
      'create_ui_component',
      'setup_multiplayer',
      // Debug
      'debug_script',
      'debug_physics',
      'debug_performance',
      'optimize_scene',
      'create_shader',
      // Migration
      'convert_3to4',
      'refactor_scene',
      // Analysis
      'analyze_project',
    ];

    it('contains all expected prompts', () => {
      const actualNames = allPrompts.map((p) => p.definition.name);
      expectedNames.forEach((name) => {
        expect(actualNames).toContain(name);
      });
    });

    it('has no unexpected prompts', () => {
      const actualNames = allPrompts.map((p) => p.definition.name);
      actualNames.forEach((name) => {
        expect(expectedNames).toContain(name);
      });
    });
  });

  // ===========================================================================
  // GENERATOR FUNCTIONALITY
  // ===========================================================================

  describe('Generator functionality', () => {
    it('generators accept empty args', () => {
      allPrompts.forEach((prompt) => {
        expect(() => prompt.generator({})).not.toThrow();
      });
    });

    it('generators accept arbitrary args', () => {
      allPrompts.forEach((prompt) => {
        expect(() =>
          prompt.generator({
            arbitrary: 'value',
            another: 'param',
          })
        ).not.toThrow();
      });
    });

    it('generators return description', () => {
      allPrompts.forEach((prompt) => {
        const result = prompt.generator({});
        expect(typeof result.description).toBe('string');
        expect(result.description!.length).toBeGreaterThan(0);
      });
    });

    it('generators return messages array', () => {
      allPrompts.forEach((prompt) => {
        const result = prompt.generator({});
        expect(Array.isArray(result.messages)).toBe(true);
      });
    });

    it('generator messages have correct structure', () => {
      allPrompts.forEach((prompt) => {
        const result = prompt.generator({});
        result.messages.forEach((message) => {
          expect(message.role).toBe('user');
          expect(message.content).toBeDefined();
          expect((message.content as { type: string }).type).toBe('text');
          expect((message.content as { text: string }).text).toBeDefined();
        });
      });
    });

    it('generators interpolate arguments correctly', () => {
      const result = createCharacterController.generator({ type: '3D' });
      expect(result.description).toContain('3D');

      const result2 = analyzeProject.generator({ projectPath: '/my/project' });
      const text = (result2.messages[0].content as { text: string }).text;
      expect(text).toContain('/my/project');
    });
  });

  // ===========================================================================
  // PROMPT ARGUMENTS
  // ===========================================================================

  describe('Prompt arguments', () => {
    it('all prompts with arguments have valid argument structure', () => {
      allPrompts.forEach((prompt) => {
        if (prompt.definition.arguments) {
          prompt.definition.arguments.forEach((arg) => {
            expect(typeof arg.name).toBe('string');
            expect(arg.name.length).toBeGreaterThan(0);
            expect(typeof arg.description).toBe('string');
            expect(typeof arg.required).toBe('boolean');
          });
        }
      });
    });

    it('create_character_controller has type argument', () => {
      const args = createCharacterController.definition.arguments;
      expect(args?.some((a) => a.name === 'type')).toBe(true);
    });

    it('analyze_project has projectPath argument', () => {
      const args = analyzeProject.definition.arguments;
      expect(args?.some((a) => a.name === 'projectPath')).toBe(true);
    });

    it('required arguments are marked as such', () => {
      const projectPathArg = analyzeProject.definition.arguments?.find(
        (a) => a.name === 'projectPath'
      );
      expect(projectPathArg?.required).toBe(true);
    });
  });
});
