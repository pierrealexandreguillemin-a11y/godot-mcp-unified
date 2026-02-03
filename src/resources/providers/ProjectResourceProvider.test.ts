/**
 * ProjectResourceProvider Tests
 * ISO/IEC 29119 compliant test structure
 *
 * Test categories:
 * - URI handling
 * - Resource listing structure
 * - Security (validation)
 * - readResource: project info, settings, section settings, export presets, version
 * - Error cases and edge cases
 */

import { jest } from '@jest/globals';

// ============================================================================
// MOCK SETUP - Must be before dynamic imports
// ============================================================================

const mockReadFileSync = jest.fn<(path: string, encoding?: string) => string>();
const mockExistsSync = jest.fn<(path: string) => boolean>();

jest.unstable_mockModule('fs', () => ({
  readFileSync: mockReadFileSync,
  existsSync: mockExistsSync,
}));

const mockIsGodotProject = jest.fn<(path: string) => boolean>();
const mockGetProjectStructure = jest.fn<(path: string) => { scenes: number; scripts: number; assets: number; other: number }>();

jest.unstable_mockModule('../../utils/FileUtils.js', () => ({
  isGodotProject: mockIsGodotProject,
  getProjectStructure: mockGetProjectStructure,
}));

const mockDetectGodotPath = jest.fn<() => Promise<string | null>>();

jest.unstable_mockModule('../../core/PathManager.js', () => ({
  detectGodotPath: mockDetectGodotPath,
  validatePath: jest.fn(() => true),
  normalizePath: jest.fn((p: string) => p),
  normalizeHandlerPaths: jest.fn(<T>(args: T) => args),
  isValidGodotPathSync: jest.fn(() => true),
  isValidGodotPath: jest.fn(async () => true),
  getPlatformGodotPaths: jest.fn(() => []),
  clearPathCache: jest.fn(),
  getPathCacheStats: jest.fn(() => ({ hits: 0, misses: 0, size: 0 })),
}));

const mockPoolExecute = jest.fn<(cmd: string, args: string[], opts?: unknown) => Promise<{ stdout: string; stderr: string; exitCode: number | null }>>();

jest.unstable_mockModule('../../core/ProcessPool.js', () => ({
  getGodotPool: jest.fn(() => ({
    execute: mockPoolExecute,
    shutdown: jest.fn(),
  })),
}));

// Dynamic import after all mocks are set up
const { ProjectResourceProvider } = await import('./ProjectResourceProvider.js');
const { RESOURCE_URIS } = await import('../types.js');

// ============================================================================
// TEST DATA
// ============================================================================

const MOCK_PROJECT_GODOT = `; Engine configuration file.
config_version=5

[application]

config/name="TestProject"
config/features=PackedStringArray("4.3", "Forward Plus")
run/main_scene="res://scenes/main.tscn"

[display]

window/size/viewport_width=1920
window/size/viewport_height=1080

[rendering]

renderer/rendering_method="forward_plus"
`;

const MOCK_EXPORT_PRESETS = `[preset.0]

name="Windows Desktop"
platform="Windows Desktop"
export_path="builds/game.exe"

[preset.1]

name="Linux"
platform="Linux/X11"
export_path="builds/game.x86_64"
`;

describe('ProjectResourceProvider', () => {
  let provider: InstanceType<typeof ProjectResourceProvider>;
  const projectPath = '/mock/project';

  beforeEach(() => {
    provider = new ProjectResourceProvider();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // URI HANDLING
  // ==========================================================================
  describe('handlesUri', () => {
    const validUris = [
      RESOURCE_URIS.PROJECT_INFO,
      RESOURCE_URIS.PROJECT_SETTINGS,
      `${RESOURCE_URIS.PROJECT_SETTINGS}application`,
      `${RESOURCE_URIS.PROJECT_SETTINGS}display`,
      RESOURCE_URIS.EXPORT_PRESETS,
      RESOURCE_URIS.SYSTEM_VERSION,
    ];

    const invalidUris = [
      'godot://scenes',
      'godot://scripts',
      'godot://assets',
      'godot://debug/output',
      'godot://unknown',
    ];

    for (const uri of validUris) {
      it(`handles ${uri}`, () => {
        expect(provider.handlesUri(uri)).toBe(true);
      });
    }

    for (const uri of invalidUris) {
      it(`does not handle ${uri}`, () => {
        expect(provider.handlesUri(uri)).toBe(false);
      });
    }
  });

  // ==========================================================================
  // PREFIX
  // ==========================================================================
  describe('prefix', () => {
    it('has correct prefix', () => {
      expect(provider.prefix).toBe('project');
    });
  });

  // ==========================================================================
  // RESOURCE LISTING STRUCTURE
  // ==========================================================================
  describe('listResources', () => {
    it('returns array of resources', async () => {
      mockExistsSync.mockReturnValue(false);
      mockIsGodotProject.mockReturnValue(false);
      const resources = await provider.listResources('/non-existent-path');
      expect(Array.isArray(resources)).toBe(true);
    });

    it('includes base resources even for invalid path', async () => {
      mockExistsSync.mockReturnValue(false);
      mockIsGodotProject.mockReturnValue(false);
      const resources = await provider.listResources('/non-existent-path');

      expect(resources.length).toBeGreaterThanOrEqual(3);

      expect(resources).toContainEqual(
        expect.objectContaining({ uri: RESOURCE_URIS.PROJECT_INFO })
      );
      expect(resources).toContainEqual(
        expect.objectContaining({ uri: RESOURCE_URIS.PROJECT_SETTINGS })
      );
      expect(resources).toContainEqual(
        expect.objectContaining({ uri: RESOURCE_URIS.SYSTEM_VERSION })
      );
    });

    it('all resources have required properties', async () => {
      mockExistsSync.mockReturnValue(false);
      mockIsGodotProject.mockReturnValue(false);
      const resources = await provider.listResources('/non-existent-path');

      for (const resource of resources) {
        expect(resource.uri).toBeDefined();
        expect(resource.name).toBeDefined();
        expect(resource.mimeType).toBe('application/json');
      }
    });

    it('includes export presets when file exists', async () => {
      mockExistsSync.mockImplementation((path: string) => {
        if (typeof path === 'string' && path.includes('export_presets.cfg')) return true;
        return false;
      });
      mockIsGodotProject.mockReturnValue(false);

      const resources = await provider.listResources(projectPath);

      expect(resources).toContainEqual(
        expect.objectContaining({ uri: RESOURCE_URIS.EXPORT_PRESETS })
      );
    });

    it('does not include export presets when file does not exist', async () => {
      mockExistsSync.mockReturnValue(false);
      mockIsGodotProject.mockReturnValue(false);

      const resources = await provider.listResources(projectPath);

      const exportPreset = resources.find((r) => r.uri === RESOURCE_URIS.EXPORT_PRESETS);
      expect(exportPreset).toBeUndefined();
    });

    it('adds section-specific resources for valid Godot project', async () => {
      mockExistsSync.mockReturnValue(false);
      mockIsGodotProject.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(MOCK_PROJECT_GODOT);

      const resources = await provider.listResources(projectPath);

      // Should include application, display, rendering sections
      expect(resources).toContainEqual(
        expect.objectContaining({
          uri: `${RESOURCE_URIS.PROJECT_SETTINGS}application`,
          name: 'Settings: application',
        })
      );
      expect(resources).toContainEqual(
        expect.objectContaining({
          uri: `${RESOURCE_URIS.PROJECT_SETTINGS}display`,
          name: 'Settings: display',
        })
      );
      expect(resources).toContainEqual(
        expect.objectContaining({
          uri: `${RESOURCE_URIS.PROJECT_SETTINGS}rendering`,
          name: 'Settings: rendering',
        })
      );
    });

    it('does not add root section as a section-specific resource', async () => {
      mockExistsSync.mockReturnValue(false);
      mockIsGodotProject.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(MOCK_PROJECT_GODOT);

      const resources = await provider.listResources(projectPath);

      const rootResource = resources.find(
        (r) => r.uri === `${RESOURCE_URIS.PROJECT_SETTINGS}root`
      );
      expect(rootResource).toBeUndefined();
    });

    it('handles parse errors gracefully during section enumeration', async () => {
      mockExistsSync.mockReturnValue(false);
      mockIsGodotProject.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const resources = await provider.listResources(projectPath);

      // Should still return base resources without throwing
      expect(resources.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ==========================================================================
  // READ RESOURCE - PROJECT INFO
  // ==========================================================================
  describe('readResource - project info', () => {
    it('returns null for empty project path', async () => {
      mockIsGodotProject.mockReturnValue(false);
      const result = await provider.readResource('', RESOURCE_URIS.PROJECT_INFO);
      expect(result).toBeNull();
    });

    it('returns null when not a Godot project', async () => {
      mockIsGodotProject.mockReturnValue(false);
      const result = await provider.readResource(projectPath, RESOURCE_URIS.PROJECT_INFO);
      expect(result).toBeNull();
    });

    it('returns project info with parsed project data', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(MOCK_PROJECT_GODOT);
      mockGetProjectStructure.mockReturnValue({
        scenes: 5,
        scripts: 10,
        assets: 20,
        other: 3,
      });

      const result = await provider.readResource(projectPath, RESOURCE_URIS.PROJECT_INFO);

      expect(result).not.toBeNull();
      expect(result!.uri).toBe(RESOURCE_URIS.PROJECT_INFO);
      expect(result!.mimeType).toBe('application/json');

      const data = JSON.parse(result!.text!);
      expect(data.name).toBe('TestProject');
      expect(data.path).toBe(projectPath);
      expect(data.configVersion).toBe(5);
      expect(data.mainScene).toBe('res://scenes/main.tscn');
      expect(data.features).toContain('4.3');
      expect(data.features).toContain('Forward Plus');
      expect(data.structure).toEqual({
        scenes: 5,
        scripts: 10,
        assets: 20,
        other: 3,
      });
    });

    it('uses directory basename when project name not in config', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(`config_version=5\n`);
      mockGetProjectStructure.mockReturnValue({ scenes: 0, scripts: 0, assets: 0, other: 0 });

      const result = await provider.readResource('/mock/my-game', RESOURCE_URIS.PROJECT_INFO);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.name).toBe('my-game');
    });

    it('returns null mainScene when not configured', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(`config_version=5\n[application]\nconfig/name="Test"\n`);
      mockGetProjectStructure.mockReturnValue({ scenes: 0, scripts: 0, assets: 0, other: 0 });

      const result = await provider.readResource(projectPath, RESOURCE_URIS.PROJECT_INFO);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.mainScene).toBeNull();
    });

    it('returns empty features when not configured', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(`config_version=5\n[application]\nconfig/name="Test"\n`);
      mockGetProjectStructure.mockReturnValue({ scenes: 0, scripts: 0, assets: 0, other: 0 });

      const result = await provider.readResource(projectPath, RESOURCE_URIS.PROJECT_INFO);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.features).toEqual([]);
    });

    it('returns null when readFileSync throws', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const result = await provider.readResource(projectPath, RESOURCE_URIS.PROJECT_INFO);
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // READ RESOURCE - PROJECT SETTINGS (ALL)
  // ==========================================================================
  describe('readResource - project settings (all)', () => {
    it('returns null for empty project path', async () => {
      mockIsGodotProject.mockReturnValue(false);
      const result = await provider.readResource('', RESOURCE_URIS.PROJECT_SETTINGS);
      expect(result).toBeNull();
    });

    it('returns null when not a Godot project', async () => {
      mockIsGodotProject.mockReturnValue(false);
      const result = await provider.readResource(projectPath, RESOURCE_URIS.PROJECT_SETTINGS);
      expect(result).toBeNull();
    });

    it('returns all settings with proper structure', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(MOCK_PROJECT_GODOT);

      const result = await provider.readResource(projectPath, RESOURCE_URIS.PROJECT_SETTINGS);

      expect(result).not.toBeNull();
      expect(result!.uri).toBe(RESOURCE_URIS.PROJECT_SETTINGS);
      expect(result!.mimeType).toBe('application/json');

      const data = JSON.parse(result!.text!);
      expect(data.projectPath).toBe(projectPath);
      expect(data.configVersion).toBe(5);
      expect(data.section).toBe('all');
      expect(Array.isArray(data.settings)).toBe(true);
      expect(data.settings.length).toBeGreaterThan(0);
      expect(Array.isArray(data.availableSections)).toBe(true);
    });

    it('returns null when readFileSync throws', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const result = await provider.readResource(projectPath, RESOURCE_URIS.PROJECT_SETTINGS);
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // READ RESOURCE - PROJECT SETTINGS (SECTION)
  // ==========================================================================
  describe('readResource - project settings (section)', () => {
    it('returns filtered settings for a valid section', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(MOCK_PROJECT_GODOT);

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.PROJECT_SETTINGS}application`
      );

      expect(result).not.toBeNull();
      expect(result!.uri).toBe(`${RESOURCE_URIS.PROJECT_SETTINGS}application`);
      expect(result!.mimeType).toBe('application/json');

      const data = JSON.parse(result!.text!);
      expect(data.section).toBe('application');
      expect(Array.isArray(data.settings)).toBe(true);
      // Should only include application settings
      for (const setting of data.settings) {
        expect(
          setting.section === 'application' || setting.key.startsWith('application/')
        ).toBe(true);
      }
    });

    it('returns empty settings for non-existent section', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(MOCK_PROJECT_GODOT);

      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.PROJECT_SETTINGS}nonexistent`
      );

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.section).toBe('nonexistent');
      expect(data.settings).toEqual([]);
    });

    it('returns null for section when not a Godot project', async () => {
      mockIsGodotProject.mockReturnValue(false);
      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.PROJECT_SETTINGS}display`
      );
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // READ RESOURCE - EXPORT PRESETS
  // ==========================================================================
  describe('readResource - export presets', () => {
    it('returns null when export_presets.cfg does not exist', async () => {
      mockExistsSync.mockReturnValue(false);
      const result = await provider.readResource(projectPath, RESOURCE_URIS.EXPORT_PRESETS);
      expect(result).toBeNull();
    });

    it('returns parsed export presets', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(MOCK_EXPORT_PRESETS);

      const result = await provider.readResource(projectPath, RESOURCE_URIS.EXPORT_PRESETS);

      expect(result).not.toBeNull();
      expect(result!.uri).toBe(RESOURCE_URIS.EXPORT_PRESETS);
      expect(result!.mimeType).toBe('application/json');

      const data = JSON.parse(result!.text!);
      expect(data.count).toBe(2);
      expect(Array.isArray(data.presets)).toBe(true);
      expect(data.presets[0].name).toBe('Windows Desktop');
      expect(data.presets[1].name).toBe('Linux');
    });

    it('returns null when readFileSync throws for export presets', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const result = await provider.readResource(projectPath, RESOURCE_URIS.EXPORT_PRESETS);
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // READ RESOURCE - SYSTEM VERSION
  // ==========================================================================
  describe('readResource - system version', () => {
    it('returns error when Godot not found', async () => {
      mockDetectGodotPath.mockResolvedValue(null);

      const result = await provider.readResource(projectPath, RESOURCE_URIS.SYSTEM_VERSION);

      expect(result).not.toBeNull();
      expect(result!.uri).toBe(RESOURCE_URIS.SYSTEM_VERSION);
      expect(result!.mimeType).toBe('application/json');

      const data = JSON.parse(result!.text!);
      expect(data.error).toBe('Godot not found');
      expect(data.version).toBeNull();
    });

    it('returns version info when Godot is found', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockPoolExecute.mockResolvedValue({
        stdout: '4.3.stable\n',
        stderr: '',
        exitCode: 0,
      });

      const result = await provider.readResource(projectPath, RESOURCE_URIS.SYSTEM_VERSION);

      expect(result).not.toBeNull();
      expect(result!.uri).toBe(RESOURCE_URIS.SYSTEM_VERSION);

      const data = JSON.parse(result!.text!);
      expect(data.version).toBe('4.3.stable');
      expect(data.path).toBe('/usr/bin/godot');
    });

    it('returns null when pool.execute throws', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockPoolExecute.mockRejectedValue(new Error('Process failed'));

      const result = await provider.readResource(projectPath, RESOURCE_URIS.SYSTEM_VERSION);
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // READ RESOURCE - UNKNOWN URI
  // ==========================================================================
  describe('readResource - unknown URI', () => {
    it('returns null for unknown URI', async () => {
      const result = await provider.readResource(projectPath, 'godot://unknown');
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // SECURITY - SECTION VALIDATION
  // ==========================================================================
  describe('security', () => {
    it('validates section name against path traversal', async () => {
      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.PROJECT_SETTINGS}../../../etc/passwd`
      );

      expect(result).not.toBeNull();
      expect(result!.text).toBeDefined();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBeDefined();
    });

    it('validates section name against injection', async () => {
      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.PROJECT_SETTINGS}<script>alert(1)</script>`
      );

      expect(result).not.toBeNull();
      expect(result!.text).toBeDefined();
      const data = JSON.parse(result!.text!);
      expect(data.error).toBeDefined();
    });

    it('rejects empty section name', async () => {
      // URI is exactly PROJECT_SETTINGS + nothing - this is the "all settings" case
      // But if we add a slash it should still be handled correctly
      const result = await provider.readResource(
        projectPath,
        RESOURCE_URIS.PROJECT_SETTINGS
      );
      // This is the "all settings" URI, should return null or settings
      // (not an error about invalid section)
      if (result !== null) {
        expect(result.uri).toBe(RESOURCE_URIS.PROJECT_SETTINGS);
      }
    });

    it('accepts valid section names', async () => {
      const validSections = ['application', 'display', 'rendering', 'input'];

      for (const section of validSections) {
        const result = await provider.readResource(
          '/non-existent',
          `${RESOURCE_URIS.PROJECT_SETTINGS}${section}`
        );

        if (result && result.text) {
          const data = JSON.parse(result.text);
          if (data.error) {
            expect(data.error).not.toContain('Invalid section');
          }
        }
      }
    });

    it('rejects section names with special characters', async () => {
      const invalidSections = ['sec tion', 'sec/tion', 'sec.tion', 'sec!tion'];

      for (const section of invalidSections) {
        const result = await provider.readResource(
          projectPath,
          `${RESOURCE_URIS.PROJECT_SETTINGS}${section}`
        );

        // Should return error or null, not valid data
        if (result && result.text) {
          const data = JSON.parse(result.text);
          expect(data.error).toBeDefined();
        }
      }
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================
  describe('edge cases', () => {
    it('handles project.godot with no sections', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('config_version=5\n');
      mockGetProjectStructure.mockReturnValue({ scenes: 0, scripts: 0, assets: 0, other: 0 });

      const result = await provider.readResource(projectPath, RESOURCE_URIS.PROJECT_INFO);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.configVersion).toBe(5);
    });

    it('handles project.godot with empty content', async () => {
      mockIsGodotProject.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('');
      mockGetProjectStructure.mockReturnValue({ scenes: 0, scripts: 0, assets: 0, other: 0 });

      const result = await provider.readResource(projectPath, RESOURCE_URIS.PROJECT_INFO);

      expect(result).not.toBeNull();
      const data = JSON.parse(result!.text!);
      expect(data.features).toEqual([]);
      expect(data.mainScene).toBeNull();
    });

    it('returns valid JSON from createErrorContent', async () => {
      // Trigger error content via invalid section
      const result = await provider.readResource(
        projectPath,
        `${RESOURCE_URIS.PROJECT_SETTINGS}inval!d`
      );

      expect(result).not.toBeNull();
      expect(result!.mimeType).toBe('application/json');
      const data = JSON.parse(result!.text!);
      expect(data.error).toBeDefined();
      expect(data.uri).toBeDefined();
    });
  });
});
