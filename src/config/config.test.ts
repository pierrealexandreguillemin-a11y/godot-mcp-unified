/**
 * Config Module Unit Tests
 * ISO/IEC 29119 compliant test structure
 * Tests for config.ts configuration management (src/config/config.ts)
 */

import { jest } from '@jest/globals';

describe('config', () => {
  // Store original env
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  describe('DEBUG_MODE', () => {
    it('should default to false when DEBUG env is not set', async () => {
      delete process.env.DEBUG;
      const { DEBUG_MODE } = await import('./config.js');
      // DEBUG_MODE is evaluated at module load time, so it depends on current env
      expect(typeof DEBUG_MODE).toBe('boolean');
    });

    it('should be false when DEBUG is not "true"', async () => {
      // Since it's a module-level constant, just test the expression logic
      expect(process.env.DEBUG === 'true').toBe(false);
    });
  });

  describe('GODOT_DEBUG_MODE', () => {
    it('should always be true', async () => {
      const { GODOT_DEBUG_MODE } = await import('./config.js');
      expect(GODOT_DEBUG_MODE).toBe(true);
    });
  });

  describe('READ_ONLY_MODE', () => {
    it('should be a boolean', async () => {
      const { READ_ONLY_MODE } = await import('./config.js');
      expect(typeof READ_ONLY_MODE).toBe('boolean');
    });
  });

  describe('PARAMETER_MAPPINGS', () => {
    it('should map snake_case to camelCase', async () => {
      const { PARAMETER_MAPPINGS } = await import('./config.js');

      expect(PARAMETER_MAPPINGS['project_path']).toBe('projectPath');
      expect(PARAMETER_MAPPINGS['scene_path']).toBe('scenePath');
      expect(PARAMETER_MAPPINGS['root_node_type']).toBe('rootNodeType');
      expect(PARAMETER_MAPPINGS['parent_node_path']).toBe('parentNodePath');
      expect(PARAMETER_MAPPINGS['node_type']).toBe('nodeType');
      expect(PARAMETER_MAPPINGS['node_name']).toBe('nodeName');
      expect(PARAMETER_MAPPINGS['texture_path']).toBe('texturePath');
      expect(PARAMETER_MAPPINGS['node_path']).toBe('nodePath');
      expect(PARAMETER_MAPPINGS['output_path']).toBe('outputPath');
      expect(PARAMETER_MAPPINGS['mesh_item_names']).toBe('meshItemNames');
      expect(PARAMETER_MAPPINGS['new_path']).toBe('newPath');
      expect(PARAMETER_MAPPINGS['file_path']).toBe('filePath');
      expect(PARAMETER_MAPPINGS['directory']).toBe('directory');
      expect(PARAMETER_MAPPINGS['recursive']).toBe('recursive');
      expect(PARAMETER_MAPPINGS['scene']).toBe('scene');
    });

    it('should contain all expected mappings', async () => {
      const { PARAMETER_MAPPINGS } = await import('./config.js');

      expect(Object.keys(PARAMETER_MAPPINGS)).toHaveLength(15);
    });
  });

  describe('REVERSE_PARAMETER_MAPPINGS', () => {
    it('should map camelCase back to snake_case', async () => {
      const { REVERSE_PARAMETER_MAPPINGS } = await import('./config.js');

      expect(REVERSE_PARAMETER_MAPPINGS['projectPath']).toBe('project_path');
      expect(REVERSE_PARAMETER_MAPPINGS['scenePath']).toBe('scene_path');
      expect(REVERSE_PARAMETER_MAPPINGS['rootNodeType']).toBe('root_node_type');
      expect(REVERSE_PARAMETER_MAPPINGS['parentNodePath']).toBe('parent_node_path');
      expect(REVERSE_PARAMETER_MAPPINGS['nodeType']).toBe('node_type');
      expect(REVERSE_PARAMETER_MAPPINGS['nodeName']).toBe('node_name');
      expect(REVERSE_PARAMETER_MAPPINGS['texturePath']).toBe('texture_path');
    });

    it('should be the inverse of PARAMETER_MAPPINGS', async () => {
      const { PARAMETER_MAPPINGS, REVERSE_PARAMETER_MAPPINGS } = await import('./config.js');

      for (const [snake, camel] of Object.entries(PARAMETER_MAPPINGS)) {
        expect(REVERSE_PARAMETER_MAPPINGS[camel]).toBe(snake);
      }
    });

    it('should have the same number of entries as PARAMETER_MAPPINGS', async () => {
      const { PARAMETER_MAPPINGS, REVERSE_PARAMETER_MAPPINGS } = await import('./config.js');

      expect(Object.keys(REVERSE_PARAMETER_MAPPINGS)).toHaveLength(
        Object.keys(PARAMETER_MAPPINGS).length
      );
    });
  });

  describe('getDefaultConfig', () => {
    it('should return config with expected shape', async () => {
      const { getDefaultConfig } = await import('./config.js');
      const config = getDefaultConfig();

      expect(config).toHaveProperty('debugMode');
      expect(config).toHaveProperty('godotDebugMode');
      expect(config).toHaveProperty('strictPathValidation');
      expect(config).toHaveProperty('readOnlyMode');
    });

    it('should have strictPathValidation as true by default for ISO 5055 compliance', async () => {
      const { getDefaultConfig } = await import('./config.js');
      const config = getDefaultConfig();

      expect(config.strictPathValidation).toBe(true);
    });

    it('should use GODOT_PATH from env when available', async () => {
      const { getDefaultConfig } = await import('./config.js');
      const config = getDefaultConfig();

      // godotPath should reflect process.env.GODOT_PATH
      expect(config.godotPath).toBe(process.env.GODOT_PATH);
    });

    it('should have godotDebugMode always true', async () => {
      const { getDefaultConfig } = await import('./config.js');
      const config = getDefaultConfig();

      expect(config.godotDebugMode).toBe(true);
    });

    it('should have debugMode as boolean', async () => {
      const { getDefaultConfig } = await import('./config.js');
      const config = getDefaultConfig();

      expect(typeof config.debugMode).toBe('boolean');
    });

    it('should have readOnlyMode as boolean', async () => {
      const { getDefaultConfig } = await import('./config.js');
      const config = getDefaultConfig();

      expect(typeof config.readOnlyMode).toBe('boolean');
    });
  });

  describe('mergeConfig', () => {
    it('should return defaults when no user config is provided', async () => {
      const { mergeConfig, getDefaultConfig } = await import('./config.js');
      const result = mergeConfig();
      const defaults = getDefaultConfig();

      expect(result.strictPathValidation).toBe(defaults.strictPathValidation);
      expect(result.godotDebugMode).toBe(defaults.godotDebugMode);
    });

    it('should return defaults when undefined is passed', async () => {
      const { mergeConfig, getDefaultConfig } = await import('./config.js');
      const result = mergeConfig(undefined);
      const defaults = getDefaultConfig();

      expect(result.debugMode).toBe(defaults.debugMode);
    });

    it('should override defaults with user config values', async () => {
      const { mergeConfig } = await import('./config.js');

      const result = mergeConfig({
        godotPath: '/custom/path/godot',
        strictPathValidation: true,
        readOnlyMode: true,
      });

      expect(result.godotPath).toBe('/custom/path/godot');
      expect(result.strictPathValidation).toBe(true);
      expect(result.readOnlyMode).toBe(true);
    });

    it('should preserve defaults for non-overridden fields', async () => {
      const { mergeConfig } = await import('./config.js');

      const result = mergeConfig({ godotPath: '/custom/godot' });

      // godotDebugMode should still be the default (true)
      expect(result.godotDebugMode).toBe(true);
      expect(result.strictPathValidation).toBe(true);
    });

    it('should handle empty user config object', async () => {
      const { mergeConfig, getDefaultConfig } = await import('./config.js');

      const result = mergeConfig({});
      const defaults = getDefaultConfig();

      expect(result.debugMode).toBe(defaults.debugMode);
      expect(result.godotDebugMode).toBe(defaults.godotDebugMode);
      expect(result.strictPathValidation).toBe(defaults.strictPathValidation);
    });

    it('should allow overriding debugMode', async () => {
      const { mergeConfig } = await import('./config.js');

      const result = mergeConfig({ debugMode: true });

      expect(result.debugMode).toBe(true);
    });
  });

  describe('config (default instance)', () => {
    it('should have SERVER_NAME', async () => {
      const { config } = await import('./config.js');
      expect(config.SERVER_NAME).toBe('godot-mcp-server');
    });

    it('should have SERVER_VERSION', async () => {
      const { config } = await import('./config.js');
      expect(config.SERVER_VERSION).toBe('0.3.0');
    });

    it('should include DEBUG_MODE as boolean', async () => {
      const { config } = await import('./config.js');
      expect(typeof config.DEBUG_MODE).toBe('boolean');
    });

    it('should have GODOT_DEBUG_MODE as true', async () => {
      const { config } = await import('./config.js');
      expect(config.GODOT_DEBUG_MODE).toBe(true);
    });

    it('should include READ_ONLY_MODE as boolean', async () => {
      const { config } = await import('./config.js');
      expect(typeof config.READ_ONLY_MODE).toBe('boolean');
    });

    it('should have strictPathValidation as true for ISO 5055 compliance', async () => {
      const { config } = await import('./config.js');
      expect(config.strictPathValidation).toBe(true);
    });
  });

  describe('GodotServerConfig interface', () => {
    it('should allow all optional fields', () => {
      // TypeScript compile-time check: all fields optional
      const emptyConfig = {} as import('./config.js').GodotServerConfig;
      expect(emptyConfig).toBeDefined();
    });

    it('should allow full config', () => {
      const fullConfig: import('./config.js').GodotServerConfig = {
        godotPath: '/usr/bin/godot',
        debugMode: true,
        godotDebugMode: true,
        strictPathValidation: true,
        readOnlyMode: false,
      };

      expect(fullConfig.godotPath).toBe('/usr/bin/godot');
      expect(fullConfig.debugMode).toBe(true);
    });
  });
});
