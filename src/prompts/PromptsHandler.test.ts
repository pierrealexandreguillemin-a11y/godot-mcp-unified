/**
 * PromptsHandler Tests
 * ISO/IEC 29119 compliant test structure
 *
 * Test categories:
 * - Prompt listing
 * - Prompt retrieval by name
 * - Message generation
 * - Argument handling
 * - Edge cases
 */

import {
  godotPrompts,
  getAllPrompts,
  getPromptByName,
  generatePromptMessages,
} from './PromptsHandler.js';

describe('PromptsHandler', () => {
  // ==========================================================================
  // PROMPT LISTING
  // ==========================================================================
  describe('godotPrompts', () => {
    it('contains predefined prompts', () => {
      expect(godotPrompts.length).toBeGreaterThan(0);
    });

    it('includes create_character_controller', () => {
      const prompt = godotPrompts.find((p) => p.name === 'create_character_controller');
      expect(prompt).toBeDefined();
      expect(prompt?.description).toContain('character controller');
    });

    it('includes create_enemy_ai', () => {
      const prompt = godotPrompts.find((p) => p.name === 'create_enemy_ai');
      expect(prompt).toBeDefined();
      expect(prompt?.description).toContain('enemy AI');
    });

    it('includes analyze_project', () => {
      const prompt = godotPrompts.find((p) => p.name === 'analyze_project');
      expect(prompt).toBeDefined();
    });

    it('includes debug_script', () => {
      const prompt = godotPrompts.find((p) => p.name === 'debug_script');
      expect(prompt).toBeDefined();
    });

    it('includes create_ui_component', () => {
      const prompt = godotPrompts.find((p) => p.name === 'create_ui_component');
      expect(prompt).toBeDefined();
    });

    it('includes setup_multiplayer', () => {
      const prompt = godotPrompts.find((p) => p.name === 'setup_multiplayer');
      expect(prompt).toBeDefined();
    });

    it('includes create_shader', () => {
      const prompt = godotPrompts.find((p) => p.name === 'create_shader');
      expect(prompt).toBeDefined();
    });

    it('includes optimize_scene', () => {
      const prompt = godotPrompts.find((p) => p.name === 'optimize_scene');
      expect(prompt).toBeDefined();
    });

    it('all prompts have required properties', () => {
      for (const prompt of godotPrompts) {
        expect(prompt.name).toBeDefined();
        expect(typeof prompt.name).toBe('string');
        expect(prompt.description).toBeDefined();
        expect(typeof prompt.description).toBe('string');
      }
    });

    it('prompts with arguments have proper structure', () => {
      for (const prompt of godotPrompts) {
        if (prompt.arguments) {
          expect(Array.isArray(prompt.arguments)).toBe(true);
          for (const arg of prompt.arguments) {
            expect(arg.name).toBeDefined();
            expect(arg.description).toBeDefined();
            expect(typeof arg.required).toBe('boolean');
          }
        }
      }
    });
  });

  describe('getAllPrompts', () => {
    it('returns all prompts', () => {
      const prompts = getAllPrompts();
      expect(prompts).toEqual(godotPrompts);
    });

    it('returns array', () => {
      const prompts = getAllPrompts();
      expect(Array.isArray(prompts)).toBe(true);
    });

    it('returns 8 prompts', () => {
      const prompts = getAllPrompts();
      expect(prompts.length).toBe(8);
    });
  });

  // ==========================================================================
  // PROMPT RETRIEVAL
  // ==========================================================================
  describe('getPromptByName', () => {
    it('returns prompt by name', () => {
      const prompt = getPromptByName('create_character_controller');
      expect(prompt).toBeDefined();
      expect(prompt?.name).toBe('create_character_controller');
    });

    it('returns undefined for unknown name', () => {
      const prompt = getPromptByName('unknown_prompt');
      expect(prompt).toBeUndefined();
    });

    it('returns undefined for empty name', () => {
      const prompt = getPromptByName('');
      expect(prompt).toBeUndefined();
    });

    it('is case-sensitive', () => {
      const prompt = getPromptByName('CREATE_CHARACTER_CONTROLLER');
      expect(prompt).toBeUndefined();
    });
  });

  // ==========================================================================
  // MESSAGE GENERATION
  // ==========================================================================
  describe('generatePromptMessages', () => {
    describe('create_character_controller', () => {
      it('generates messages for 2D character', () => {
        const result = generatePromptMessages('create_character_controller', { type: '2D' });

        expect(result).not.toBeNull();
        expect(result?.description).toContain('2D');
        expect(result?.messages).toHaveLength(1);
        expect(result?.messages[0].role).toBe('user');
      });

      it('generates messages for 3D character', () => {
        const result = generatePromptMessages('create_character_controller', { type: '3D' });

        expect(result).not.toBeNull();
        expect(result?.description).toContain('3D');
        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('3D');
        expect(text).toContain('camera handling');
      });

      it('uses default type when not specified', () => {
        const result = generatePromptMessages('create_character_controller', {});

        expect(result).not.toBeNull();
        expect(result?.description).toContain('2D');
      });

      it('includes features in message', () => {
        const result = generatePromptMessages('create_character_controller', {
          type: '2D',
          features: 'jump, dash, crouch',
        });

        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('jump, dash, crouch');
      });
    });

    describe('create_enemy_ai', () => {
      it('generates messages for patrol behavior', () => {
        const result = generatePromptMessages('create_enemy_ai', { behavior: 'patrol' });

        expect(result).not.toBeNull();
        expect(result?.description).toContain('patrol');
        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('waypoints');
      });

      it('generates messages for chase behavior', () => {
        const result = generatePromptMessages('create_enemy_ai', { behavior: 'chase' });

        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('Follow player');
      });

      it('generates messages for flee behavior', () => {
        const result = generatePromptMessages('create_enemy_ai', { behavior: 'flee' });

        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('Run away');
      });

      it('generates messages for boss behavior', () => {
        const result = generatePromptMessages('create_enemy_ai', { behavior: 'boss' });

        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('attack patterns');
      });
    });

    describe('analyze_project', () => {
      it('generates messages with project path', () => {
        const result = generatePromptMessages('analyze_project', {
          projectPath: '/my/project',
        });

        expect(result).not.toBeNull();
        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('/my/project');
      });

      it('includes focus area', () => {
        const result = generatePromptMessages('analyze_project', {
          projectPath: '/project',
          focus: 'performance',
        });

        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('performance');
        expect(text).toContain('Performance bottlenecks');
      });
    });

    describe('debug_script', () => {
      it('generates messages with script path', () => {
        const result = generatePromptMessages('debug_script', {
          scriptPath: '/scripts/player.gd',
        });

        expect(result).not.toBeNull();
        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('/scripts/player.gd');
      });

      it('includes error message when provided', () => {
        const result = generatePromptMessages('debug_script', {
          scriptPath: '/test.gd',
          errorMessage: 'Unexpected token',
        });

        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('Unexpected token');
      });
    });

    describe('create_ui_component', () => {
      it('generates messages for menu component', () => {
        const result = generatePromptMessages('create_ui_component', {
          componentType: 'menu',
        });

        expect(result).not.toBeNull();
        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('Main menu');
      });

      it('generates messages for hud component', () => {
        const result = generatePromptMessages('create_ui_component', {
          componentType: 'hud',
        });

        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('Health bar');
      });

      it('generates messages for dialog component', () => {
        const result = generatePromptMessages('create_ui_component', {
          componentType: 'dialog',
        });

        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('typewriter effect');
      });

      it('generates messages for inventory component', () => {
        const result = generatePromptMessages('create_ui_component', {
          componentType: 'inventory',
        });

        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('Grid-based');
      });

      it('generates messages for settings component', () => {
        const result = generatePromptMessages('create_ui_component', {
          componentType: 'settings',
        });

        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('Audio sliders');
      });

      it('includes style when provided', () => {
        const result = generatePromptMessages('create_ui_component', {
          componentType: 'menu',
          style: 'fantasy',
        });

        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('fantasy');
      });
    });

    describe('setup_multiplayer', () => {
      it('generates messages for client-server', () => {
        const result = generatePromptMessages('setup_multiplayer', {
          architecture: 'client-server',
        });

        expect(result).not.toBeNull();
        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('client-server');
      });

      it('generates messages for p2p', () => {
        const result = generatePromptMessages('setup_multiplayer', {
          architecture: 'p2p',
        });

        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('p2p');
      });

      it('includes lobby feature', () => {
        const result = generatePromptMessages('setup_multiplayer', {
          architecture: 'client-server',
          features: 'lobby',
        });

        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('Lobby management');
      });

      it('includes matchmaking feature', () => {
        const result = generatePromptMessages('setup_multiplayer', {
          architecture: 'p2p',
          features: 'matchmaking',
        });

        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('matchmaking');
      });
    });

    describe('create_shader', () => {
      it('generates messages for outline effect', () => {
        const result = generatePromptMessages('create_shader', { effect: 'outline' });

        expect(result).not.toBeNull();
        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('outline');
        expect(text).toContain('Draw outline');
      });

      it('generates messages for dissolve effect', () => {
        const result = generatePromptMessages('create_shader', { effect: 'dissolve' });

        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('Dissolve effect');
      });

      it('generates messages for water effect', () => {
        const result = generatePromptMessages('create_shader', { effect: 'water' });

        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('Animated waves');
      });

      it('generates messages for fire effect', () => {
        const result = generatePromptMessages('create_shader', { effect: 'fire' });

        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('Animated flames');
      });

      it('generates messages for glow effect', () => {
        const result = generatePromptMessages('create_shader', { effect: 'glow' });

        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('Bloom effect');
      });

      it('includes target type', () => {
        const result = generatePromptMessages('create_shader', {
          effect: 'outline',
          target: 'spatial',
        });

        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('spatial');
      });
    });

    describe('optimize_scene', () => {
      it('generates messages with scene path', () => {
        const result = generatePromptMessages('optimize_scene', {
          scenePath: '/scenes/main.tscn',
        });

        expect(result).not.toBeNull();
        const text = (result?.messages[0].content as { text: string }).text;
        expect(text).toContain('/scenes/main.tscn');
        expect(text).toContain('performance');
      });
    });

    describe('unknown prompt', () => {
      it('returns null for unknown prompt', () => {
        const result = generatePromptMessages('unknown_prompt', {});
        expect(result).toBeNull();
      });
    });
  });

  // ==========================================================================
  // MESSAGE STRUCTURE
  // ==========================================================================
  describe('message structure', () => {
    it('all generated messages have correct structure', () => {
      const testCases: Array<{ name: string; args: Record<string, string> }> = [
        { name: 'create_character_controller', args: { type: '2D' } },
        { name: 'create_enemy_ai', args: { behavior: 'patrol' } },
        { name: 'analyze_project', args: { projectPath: '/test' } },
        { name: 'debug_script', args: { scriptPath: '/test.gd' } },
        { name: 'create_ui_component', args: { componentType: 'menu' } },
        { name: 'setup_multiplayer', args: { architecture: 'p2p' } },
        { name: 'create_shader', args: { effect: 'outline' } },
        { name: 'optimize_scene', args: { scenePath: '/test.tscn' } },
      ];

      for (const { name, args } of testCases) {
        const result = generatePromptMessages(name, args);
        expect(result).not.toBeNull();
        expect(result?.description).toBeDefined();
        expect(Array.isArray(result?.messages)).toBe(true);
        expect(result?.messages.length).toBeGreaterThan(0);

        for (const message of result!.messages) {
          expect(message.role).toBe('user');
          expect(message.content).toBeDefined();
          expect((message.content as { type: string }).type).toBe('text');
          expect((message.content as { text: string }).text).toBeDefined();
        }
      }
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================
  describe('edge cases', () => {
    it('handles empty arguments object', () => {
      const result = generatePromptMessages('create_character_controller', {});
      expect(result).not.toBeNull();
    });

    it('handles undefined values in arguments', () => {
      const result = generatePromptMessages('create_character_controller', {
        type: undefined as unknown as string,
      });
      expect(result).not.toBeNull();
    });

    it('handles extra arguments', () => {
      const result = generatePromptMessages('create_character_controller', {
        type: '2D',
        extra: 'ignored',
      });
      expect(result).not.toBeNull();
    });
  });
});
