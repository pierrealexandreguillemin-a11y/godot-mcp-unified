/**
 * Resource Tools Comprehensive Tests
 * Tests CreateResource and ListResources
 * ISO 29119 compliant test coverage
 *
 * Test Design Techniques Applied:
 * - Equivalence Partitioning: Valid/invalid resource types
 * - Boundary Value Analysis: Property value limits
 * - Decision Table Testing: Resource type + property combinations
 * - State Transition Testing: File creation states
 */

import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  createTempProject,
  parseJsonResponse,
  isErrorResponse,
} from '../test-utils.js';
import { handleCreateResource, ResourceType } from './CreateResourceTool.js';
import { handleListResources } from './ListResourcesTool.js';

describe('Resource Tools', () => {
  let projectPath: string;
  let cleanup: () => void;

  beforeEach(() => {
    const temp = createTempProject();
    projectPath = temp.projectPath;
    cleanup = temp.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  describe('CreateResource', () => {
    describe('Parameter Validation', () => {
      describe('projectPath validation', () => {
        it('should return error when projectPath is missing', async () => {
          const result = await handleCreateResource({
            resourcePath: 'resources/new.tres',
            resourceType: 'Theme',
          });
          expect(isErrorResponse(result)).toBe(true);
          expect(result.content[0].text).toContain('projectPath');
        });

        it('should return error when projectPath is empty', async () => {
          const result = await handleCreateResource({
            projectPath: '',
            resourcePath: 'resources/new.tres',
            resourceType: 'Theme',
          });
          expect(isErrorResponse(result)).toBe(true);
        });

        it('should return error for non-existent project', async () => {
          const result = await handleCreateResource({
            projectPath: '/non/existent/path',
            resourcePath: 'resources/new.tres',
            resourceType: 'Theme',
          });
          expect(isErrorResponse(result)).toBe(true);
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });

        it('should return error for path traversal attempt', async () => {
          const result = await handleCreateResource({
            projectPath: '../../../etc',
            resourcePath: 'resources/new.tres',
            resourceType: 'Theme',
          });
          expect(isErrorResponse(result)).toBe(true);
          expect(result.content[0].text).toMatch(/path traversal|Validation failed/i);
        });
      });

      describe('resourcePath validation', () => {
        it('should return error when resourcePath is missing', async () => {
          const result = await handleCreateResource({
            projectPath,
            resourceType: 'Theme',
          });
          expect(isErrorResponse(result)).toBe(true);
          expect(result.content[0].text).toContain('resourcePath');
        });

        it('should return error when resourcePath is empty', async () => {
          const result = await handleCreateResource({
            projectPath,
            resourcePath: '',
            resourceType: 'Theme',
          });
          expect(isErrorResponse(result)).toBe(true);
        });

        it('should return error for path traversal in resourcePath', async () => {
          const result = await handleCreateResource({
            projectPath,
            resourcePath: '../outside.tres',
            resourceType: 'Theme',
          });
          expect(isErrorResponse(result)).toBe(true);
          expect(result.content[0].text).toMatch(/path traversal|Validation failed/i);
        });
      });

      describe('resourceType validation', () => {
        it('should return error when resourceType is missing', async () => {
          const result = await handleCreateResource({
            projectPath,
            resourcePath: 'resources/new.tres',
          });
          expect(isErrorResponse(result)).toBe(true);
          expect(result.content[0].text).toContain('resourceType');
        });

        it('should return error for invalid resourceType', async () => {
          const result = await handleCreateResource({
            projectPath,
            resourcePath: 'resources/new.tres',
            resourceType: 'InvalidResourceType' as ResourceType,
          });
          expect(isErrorResponse(result)).toBe(true);
          expect(result.content[0].text).toMatch(/resourceType|Validation failed/i);
        });
      });
    });

    describe('File Extension Handling', () => {
      it('should add .tres extension if not provided', async () => {
        const result = await handleCreateResource({
          projectPath,
          resourcePath: 'resources/no_extension',
          resourceType: 'Theme',
        });

        expect(isErrorResponse(result)).toBe(false);
        expect(existsSync(join(projectPath, 'resources', 'no_extension.tres'))).toBe(true);
      });

      it('should not duplicate .tres extension', async () => {
        const result = await handleCreateResource({
          projectPath,
          resourcePath: 'resources/with_extension.tres',
          resourceType: 'Theme',
        });

        expect(isErrorResponse(result)).toBe(false);
        expect(existsSync(join(projectPath, 'resources', 'with_extension.tres'))).toBe(true);
        expect(existsSync(join(projectPath, 'resources', 'with_extension.tres.tres'))).toBe(false);
      });
    });

    describe('Directory Creation', () => {
      it('should create parent directories if they do not exist', async () => {
        const result = await handleCreateResource({
          projectPath,
          resourcePath: 'new/nested/directory/resource.tres',
          resourceType: 'Theme',
        });

        expect(isErrorResponse(result)).toBe(false);
        expect(existsSync(join(projectPath, 'new', 'nested', 'directory', 'resource.tres'))).toBe(true);
      });

      it('should work with existing directory', async () => {
        const result = await handleCreateResource({
          projectPath,
          resourcePath: 'resources/new_resource.tres',
          resourceType: 'Theme',
        });

        expect(isErrorResponse(result)).toBe(false);
        expect(existsSync(join(projectPath, 'resources', 'new_resource.tres'))).toBe(true);
      });
    });

    describe('Overwrite Protection', () => {
      it('should return error if resource already exists', async () => {
        // Create a resource first
        await handleCreateResource({
          projectPath,
          resourcePath: 'resources/existing.tres',
          resourceType: 'Theme',
        });

        // Try to create again
        const result = await handleCreateResource({
          projectPath,
          resourcePath: 'resources/existing.tres',
          resourceType: 'Theme',
        });

        expect(isErrorResponse(result)).toBe(true);
        expect(result.content[0].text).toContain('already exists');
      });

      it('should suggest alternatives when resource exists', async () => {
        await handleCreateResource({
          projectPath,
          resourcePath: 'resources/existing.tres',
          resourceType: 'Theme',
        });

        const result = await handleCreateResource({
          projectPath,
          resourcePath: 'resources/existing.tres',
          resourceType: 'Theme',
        });

        expect(result.content.length).toBeGreaterThan(1);
        expect(result.content[1].text).toContain('different path');
      });
    });

    describe('Resource Types', () => {
      const resourceTypes: ResourceType[] = [
        'StandardMaterial3D',
        'ShaderMaterial',
        'StyleBoxFlat',
        'StyleBoxTexture',
        'Theme',
        'Environment',
        'Sky',
        'Gradient',
        'Curve',
        'AudioBusLayout',
        'Animation',
        'AnimationLibrary',
      ];

      for (const resourceType of resourceTypes) {
        it(`should create ${resourceType} resource`, async () => {
          // Use unique name to avoid conflicts with existing fixtures
          const result = await handleCreateResource({
            projectPath,
            resourcePath: `resources/test_${resourceType.toLowerCase()}_create.tres`,
            resourceType,
          });

          expect(isErrorResponse(result)).toBe(false);
          expect(result.content[0].text).toContain('created successfully');
          expect(result.content[0].text).toContain(resourceType);

          // Verify file exists and contains correct type
          const filePath = join(projectPath, 'resources', `test_${resourceType.toLowerCase()}_create.tres`);
          expect(existsSync(filePath)).toBe(true);

          const content = readFileSync(filePath, 'utf-8');
          expect(content).toContain(`type="${resourceType}"`);
          expect(content).toContain('[gd_resource');
          expect(content).toContain('[resource]');
        });
      }
    });

    describe('Default Properties', () => {
      it('should include default properties for StandardMaterial3D', async () => {
        await handleCreateResource({
          projectPath,
          resourcePath: 'resources/material.tres',
          resourceType: 'StandardMaterial3D',
        });

        const content = readFileSync(join(projectPath, 'resources', 'material.tres'), 'utf-8');
        expect(content).toContain('albedo_color');
        expect(content).toContain('metallic');
        expect(content).toContain('roughness');
      });

      it('should include default properties for StyleBoxFlat', async () => {
        await handleCreateResource({
          projectPath,
          resourcePath: 'resources/stylebox.tres',
          resourceType: 'StyleBoxFlat',
        });

        const content = readFileSync(join(projectPath, 'resources', 'stylebox.tres'), 'utf-8');
        expect(content).toContain('bg_color');
        expect(content).toContain('border_width');
        expect(content).toContain('corner_radius');
      });

      it('should include default properties for Environment', async () => {
        await handleCreateResource({
          projectPath,
          resourcePath: 'resources/env.tres',
          resourceType: 'Environment',
        });

        const content = readFileSync(join(projectPath, 'resources', 'env.tres'), 'utf-8');
        expect(content).toContain('background_mode');
        expect(content).toContain('ambient_light_color');
        expect(content).toContain('ambient_light_energy');
      });

      it('should include default properties for Gradient', async () => {
        await handleCreateResource({
          projectPath,
          resourcePath: 'resources/gradient.tres',
          resourceType: 'Gradient',
        });

        const content = readFileSync(join(projectPath, 'resources', 'gradient.tres'), 'utf-8');
        expect(content).toContain('colors');
        expect(content).toContain('offsets');
        expect(content).toContain('PackedColorArray');
      });

      it('should include default properties for Curve', async () => {
        await handleCreateResource({
          projectPath,
          resourcePath: 'resources/curve.tres',
          resourceType: 'Curve',
        });

        const content = readFileSync(join(projectPath, 'resources', 'curve.tres'), 'utf-8');
        expect(content).toContain('_data');
        expect(content).toContain('point_count');
        expect(content).toContain('Vector2');
      });

      it('should include default properties for Animation', async () => {
        await handleCreateResource({
          projectPath,
          resourcePath: 'resources/anim.tres',
          resourceType: 'Animation',
        });

        const content = readFileSync(join(projectPath, 'resources', 'anim.tres'), 'utf-8');
        expect(content).toContain('length');
        expect(content).toContain('loop_mode');
        expect(content).toContain('step');
      });
    });

    describe('Custom Properties', () => {
      it('should merge custom properties with defaults', async () => {
        await handleCreateResource({
          projectPath,
          resourcePath: 'resources/custom_material.tres',
          resourceType: 'StandardMaterial3D',
          properties: {
            metallic: 0.8,
            roughness: 0.2,
          },
        });

        const content = readFileSync(join(projectPath, 'resources', 'custom_material.tres'), 'utf-8');
        expect(content).toContain('metallic = 0.8');
        expect(content).toContain('roughness = 0.2');
        // Should still have albedo_color from defaults
        expect(content).toContain('albedo_color');
      });

      it('should handle Color properties', async () => {
        await handleCreateResource({
          projectPath,
          resourcePath: 'resources/colored.tres',
          resourceType: 'StandardMaterial3D',
          properties: {
            albedo_color: 'Color(1, 0, 0, 1)',
          },
        });

        const content = readFileSync(join(projectPath, 'resources', 'colored.tres'), 'utf-8');
        expect(content).toContain('Color(1, 0, 0, 1)');
      });

      it('should handle Vector2 properties', async () => {
        await handleCreateResource({
          projectPath,
          resourcePath: 'resources/vector.tres',
          resourceType: 'Theme',
          properties: {
            some_vector: 'Vector2(100, 200)',
          },
        });

        const content = readFileSync(join(projectPath, 'resources', 'vector.tres'), 'utf-8');
        expect(content).toContain('Vector2(100, 200)');
      });

      it('should handle Vector3 properties', async () => {
        await handleCreateResource({
          projectPath,
          resourcePath: 'resources/vector3.tres',
          resourceType: 'Theme',
          properties: {
            some_vector: 'Vector3(1, 2, 3)',
          },
        });

        const content = readFileSync(join(projectPath, 'resources', 'vector3.tres'), 'utf-8');
        expect(content).toContain('Vector3(1, 2, 3)');
      });

      it('should handle string properties', async () => {
        await handleCreateResource({
          projectPath,
          resourcePath: 'resources/string_prop.tres',
          resourceType: 'Theme',
          properties: {
            custom_name: 'MyTheme',
          },
        });

        const content = readFileSync(join(projectPath, 'resources', 'string_prop.tres'), 'utf-8');
        expect(content).toContain('"MyTheme"');
      });

      it('should handle boolean properties', async () => {
        await handleCreateResource({
          projectPath,
          resourcePath: 'resources/bool_prop.tres',
          resourceType: 'Animation',
          properties: {
            some_flag: true,
          },
        });

        const content = readFileSync(join(projectPath, 'resources', 'bool_prop.tres'), 'utf-8');
        expect(content).toContain('some_flag = true');
      });

      it('should handle array properties', async () => {
        await handleCreateResource({
          projectPath,
          resourcePath: 'resources/array_prop.tres',
          resourceType: 'Theme',
          properties: {
            items: [1, 2, 3],
          },
        });

        const content = readFileSync(join(projectPath, 'resources', 'array_prop.tres'), 'utf-8');
        expect(content).toContain('[1, 2, 3]');
      });

      it('should handle object properties', async () => {
        await handleCreateResource({
          projectPath,
          resourcePath: 'resources/object_prop.tres',
          resourceType: 'Theme',
          properties: {
            nested: { a: 1, b: 2 },
          },
        });

        const content = readFileSync(join(projectPath, 'resources', 'object_prop.tres'), 'utf-8');
        expect(content).toContain('"a": 1');
        expect(content).toContain('"b": 2');
      });

      it('should handle null properties', async () => {
        await handleCreateResource({
          projectPath,
          resourcePath: 'resources/null_prop.tres',
          resourceType: 'Theme',
          properties: {
            nullable: null,
          },
        });

        const content = readFileSync(join(projectPath, 'resources', 'null_prop.tres'), 'utf-8');
        expect(content).toContain('nullable = null');
      });
    });

    describe('Success Response', () => {
      it('should return success with resource type in message', async () => {
        const result = await handleCreateResource({
          projectPath,
          resourcePath: 'resources/new.tres',
          resourceType: 'Theme',
        });

        expect(isErrorResponse(result)).toBe(false);
        expect(result.content[0].text).toContain('Theme');
      });

      it('should return success with path in message', async () => {
        const result = await handleCreateResource({
          projectPath,
          resourcePath: 'resources/new.tres',
          resourceType: 'Theme',
        });

        expect(isErrorResponse(result)).toBe(false);
        expect(result.content[0].text).toContain('resources/new.tres');
      });
    });
  });

  describe('ListResources', () => {
    describe('Validation', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleListResources({});
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should return error for non-existent project', async () => {
        const result = await handleListResources({
          projectPath: '/non/existent/path',
        });
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should return error for path traversal attempt', async () => {
        const result = await handleListResources({
          projectPath: '../../../etc',
        });
        expect(isErrorResponse(result)).toBe(true);
      });
    });

    describe('Basic Listing', () => {
      it('should list all resources in project', async () => {
        const result = await handleListResources({
          projectPath,
        });

        expect(isErrorResponse(result)).toBe(false);

        const data = parseJsonResponse<{
          count: number;
          resources: Array<{ path: string; name: string; format: string }>;
        }>(result);

        expect(data.count).toBeGreaterThanOrEqual(1);
        expect(data.resources.some((r) => r.path.includes('theme.tres'))).toBe(true);
      });

      it('should return resource info with required fields', async () => {
        const result = await handleListResources({
          projectPath,
        });

        const data = parseJsonResponse<{
          resources: Array<{
            path: string;
            name: string;
            size: number;
            modified: string;
            format: 'tres' | 'res';
          }>;
        }>(result);

        expect(data.resources.length).toBeGreaterThan(0);
        const resource = data.resources[0];
        expect(resource).toHaveProperty('path');
        expect(resource).toHaveProperty('name');
        expect(resource).toHaveProperty('size');
        expect(resource).toHaveProperty('modified');
        expect(resource).toHaveProperty('format');
      });

      it('should include project path in result', async () => {
        const result = await handleListResources({
          projectPath,
        });

        const data = parseJsonResponse<{
          projectPath: string;
        }>(result);

        expect(data.projectPath).toBe(projectPath);
      });
    });

    describe('Directory Filtering', () => {
      it('should filter by directory', async () => {
        const result = await handleListResources({
          projectPath,
          directory: 'resources',
        });

        expect(isErrorResponse(result)).toBe(false);

        const data = parseJsonResponse<{
          resources: Array<{ path: string }>;
        }>(result);

        expect(data.resources.every((r) => r.path.startsWith('resources/'))).toBe(true);
      });

      it('should return empty array for non-existent directory', async () => {
        const result = await handleListResources({
          projectPath,
          directory: 'nonexistent',
        });

        expect(isErrorResponse(result)).toBe(false);

        const data = parseJsonResponse<{
          resources: Array<{ path: string }>;
          count: number;
        }>(result);

        expect(data.count).toBe(0);
        expect(data.resources).toEqual([]);
      });
    });

    describe('Recursive Search', () => {
      beforeEach(() => {
        // Create nested resources
        mkdirSync(join(projectPath, 'resources', 'nested'), { recursive: true });
        writeFileSync(
          join(projectPath, 'resources', 'nested', 'deep.tres'),
          '[gd_resource type="Theme" format=3]\n[resource]\n'
        );
      });

      it('should search recursively by default', async () => {
        const result = await handleListResources({
          projectPath,
        });

        const data = parseJsonResponse<{
          resources: Array<{ path: string }>;
          recursive: boolean;
        }>(result);

        expect(data.recursive).toBe(true);
        expect(data.resources.some((r) => r.path.includes('nested/deep.tres'))).toBe(true);
      });

      it('should not search recursively when disabled', async () => {
        const result = await handleListResources({
          projectPath,
          directory: 'resources',
          recursive: false,
        });

        const data = parseJsonResponse<{
          resources: Array<{ path: string }>;
          recursive: boolean;
        }>(result);

        expect(data.recursive).toBe(false);
        expect(data.resources.some((r) => r.path.includes('nested/'))).toBe(false);
      });
    });

    describe('Resource Type Extraction', () => {
      it('should include resource type from tres files', async () => {
        const result = await handleListResources({
          projectPath,
        });

        const data = parseJsonResponse<{
          resources: Array<{ resourceType?: string }>;
          resourceTypes: string[];
        }>(result);

        const themeResource = data.resources.find((r) => r.resourceType === 'Theme');
        expect(themeResource).toBeDefined();
        expect(data.resourceTypes).toContain('Theme');
      });

      it('should list unique resource types', async () => {
        // Create additional resources of different types
        await handleCreateResource({
          projectPath,
          resourcePath: 'resources/material.tres',
          resourceType: 'StandardMaterial3D',
        });

        const result = await handleListResources({
          projectPath,
        });

        const data = parseJsonResponse<{
          resourceTypes: string[];
        }>(result);

        expect(data.resourceTypes).toContain('Theme');
        expect(data.resourceTypes).toContain('StandardMaterial3D');
        // Should be sorted
        expect(data.resourceTypes).toEqual([...data.resourceTypes].sort());
      });
    });

    describe('Resource Type Filtering', () => {
      beforeEach(async () => {
        await handleCreateResource({
          projectPath,
          resourcePath: 'resources/material1.tres',
          resourceType: 'StandardMaterial3D',
        });
        await handleCreateResource({
          projectPath,
          resourcePath: 'resources/material2.tres',
          resourceType: 'StandardMaterial3D',
        });
      });

      it('should filter by resource type', async () => {
        const result = await handleListResources({
          projectPath,
          resourceType: 'Theme',
        });

        expect(isErrorResponse(result)).toBe(false);

        const data = parseJsonResponse<{
          resources: Array<{ resourceType?: string }>;
        }>(result);

        expect(data.resources.every((r) => r.resourceType === 'Theme')).toBe(true);
      });

      it('should filter case-insensitively', async () => {
        const result = await handleListResources({
          projectPath,
          resourceType: 'theme',
        });

        const data = parseJsonResponse<{
          resources: Array<{ resourceType?: string }>;
        }>(result);

        expect(data.resources.length).toBeGreaterThan(0);
      });

      it('should return empty array for non-matching type', async () => {
        const result = await handleListResources({
          projectPath,
          resourceType: 'NonexistentType',
        });

        const data = parseJsonResponse<{
          resources: Array<{ path: string }>;
          count: number;
        }>(result);

        expect(data.count).toBe(0);
      });
    });

    describe('Format Information', () => {
      it('should identify .tres format', async () => {
        const result = await handleListResources({
          projectPath,
        });

        const data = parseJsonResponse<{
          resources: Array<{ format: 'tres' | 'res' }>;
        }>(result);

        expect(data.resources.every((r) => r.format === 'tres' || r.format === 'res')).toBe(true);
      });

      it('should include file size', async () => {
        const result = await handleListResources({
          projectPath,
        });

        const data = parseJsonResponse<{
          resources: Array<{ size: number }>;
        }>(result);

        expect(data.resources.every((r) => typeof r.size === 'number' && r.size > 0)).toBe(true);
      });

      it('should include modification time in ISO format', async () => {
        const result = await handleListResources({
          projectPath,
        });

        const data = parseJsonResponse<{
          resources: Array<{ modified: string }>;
        }>(result);

        expect(data.resources.every((r) => /^\d{4}-\d{2}-\d{2}T/.test(r.modified))).toBe(true);
      });
    });

    describe('Sorting', () => {
      beforeEach(async () => {
        await handleCreateResource({
          projectPath,
          resourcePath: 'resources/z_last.tres',
          resourceType: 'Theme',
        });
        await handleCreateResource({
          projectPath,
          resourcePath: 'resources/a_first.tres',
          resourceType: 'Theme',
        });
      });

      it('should sort resources by path', async () => {
        const result = await handleListResources({
          projectPath,
        });

        const data = parseJsonResponse<{
          resources: Array<{ path: string }>;
        }>(result);

        const paths = data.resources.map((r) => r.path);
        const sortedPaths = [...paths].sort();
        expect(paths).toEqual(sortedPaths);
      });
    });

    describe('Hidden Files and Directories', () => {
      beforeEach(() => {
        // Create hidden directory with resource
        mkdirSync(join(projectPath, '.hidden'), { recursive: true });
        writeFileSync(
          join(projectPath, '.hidden', 'secret.tres'),
          '[gd_resource type="Theme" format=3]\n[resource]\n'
        );
      });

      it('should skip hidden directories', async () => {
        const result = await handleListResources({
          projectPath,
        });

        const data = parseJsonResponse<{
          resources: Array<{ path: string }>;
        }>(result);

        expect(data.resources.some((r) => r.path.includes('.hidden'))).toBe(false);
      });

      it('should skip .godot directory', async () => {
        // Create .godot directory with resource
        mkdirSync(join(projectPath, '.godot'), { recursive: true });
        writeFileSync(
          join(projectPath, '.godot', 'internal.tres'),
          '[gd_resource type="Theme" format=3]\n[resource]\n'
        );

        const result = await handleListResources({
          projectPath,
        });

        const data = parseJsonResponse<{
          resources: Array<{ path: string }>;
        }>(result);

        expect(data.resources.some((r) => r.path.includes('.godot'))).toBe(false);
      });

      it('should skip addons directory', async () => {
        mkdirSync(join(projectPath, 'addons', 'plugin'), { recursive: true });
        writeFileSync(
          join(projectPath, 'addons', 'plugin', 'addon_resource.tres'),
          '[gd_resource type="Theme" format=3]\n[resource]\n'
        );

        const result = await handleListResources({
          projectPath,
        });

        const data = parseJsonResponse<{
          resources: Array<{ path: string }>;
        }>(result);

        expect(data.resources.some((r) => r.path.includes('addons/'))).toBe(false);
      });
    });

    describe('Result Metadata', () => {
      it('should include directory in result', async () => {
        const result = await handleListResources({
          projectPath,
          directory: 'resources',
        });

        const data = parseJsonResponse<{
          directory: string;
        }>(result);

        expect(data.directory).toBe('resources');
      });

      it('should show (root) for no directory filter', async () => {
        const result = await handleListResources({
          projectPath,
        });

        const data = parseJsonResponse<{
          directory: string;
        }>(result);

        expect(data.directory).toBe('(root)');
      });
    });
  });

  describe('Integration: CreateResource + ListResources', () => {
    it('should list newly created resources', async () => {
      // Create a new resource
      await handleCreateResource({
        projectPath,
        resourcePath: 'resources/integration_test.tres',
        resourceType: 'StandardMaterial3D',
      });

      // List and verify
      const result = await handleListResources({
        projectPath,
      });

      const data = parseJsonResponse<{
        resources: Array<{ path: string; resourceType?: string }>;
      }>(result);

      const newResource = data.resources.find((r) => r.path.includes('integration_test.tres'));
      expect(newResource).toBeDefined();
      expect(newResource?.resourceType).toBe('StandardMaterial3D');
    });

    it('should correctly count multiple created resources', async () => {
      const initialResult = await handleListResources({ projectPath });
      const initialData = parseJsonResponse<{ count: number }>(initialResult);
      const initialCount = initialData.count;

      // Create 3 new resources
      await handleCreateResource({
        projectPath,
        resourcePath: 'resources/res1.tres',
        resourceType: 'Theme',
      });
      await handleCreateResource({
        projectPath,
        resourcePath: 'resources/res2.tres',
        resourceType: 'Gradient',
      });
      await handleCreateResource({
        projectPath,
        resourcePath: 'resources/res3.tres',
        resourceType: 'Curve',
      });

      const finalResult = await handleListResources({ projectPath });
      const finalData = parseJsonResponse<{ count: number }>(finalResult);

      expect(finalData.count).toBe(initialCount + 3);
    });
  });
});
