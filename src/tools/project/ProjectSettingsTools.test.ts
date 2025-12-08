/**
 * Project Settings Tools Integration Tests
 * Tests GetProjectSettings and SetProjectSetting with real files
 * ISO/IEC 25010 compliant test coverage
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  createTempProject,
  getResponseText,
  parseJsonResponse,
  isErrorResponse,
} from '../test-utils.js';
import { handleGetProjectSettings } from './GetProjectSettingsTool.js';
import { handleSetProjectSetting } from './SetProjectSettingTool.js';

describe('GetProjectSettings', () => {
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

  describe('validation', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleGetProjectSettings({});
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('projectPath');
    });

    it('should return error for non-existent project', async () => {
      const result = await handleGetProjectSettings({
        projectPath: '/non/existent/path',
      });
      expect(isErrorResponse(result)).toBe(true);
    });
  });

  describe('parsing', () => {
    it('should parse all sections from project.godot', async () => {
      const result = await handleGetProjectSettings({ projectPath });

      expect(isErrorResponse(result)).toBe(false);
      const data = parseJsonResponse<{
        sections: string[];
        configVersion: number;
      }>(result);

      expect(data.sections).toContain('application');
      expect(data.sections).toContain('display');
      expect(data.sections).toContain('rendering');
      expect(data.configVersion).toBe(5);
    });

    it('should return settings with correct structure', async () => {
      const result = await handleGetProjectSettings({ projectPath });

      expect(isErrorResponse(result)).toBe(false);
      const data = parseJsonResponse<{
        settings: Array<{
          section: string;
          key: string;
          value: string;
          rawValue: string;
        }>;
      }>(result);

      expect(data.settings.length).toBeGreaterThan(0);

      const nameSetting = data.settings.find((s) => s.key.includes('config/name'));
      expect(nameSetting).toBeDefined();
      expect(nameSetting?.value).toBe('Test Project');
    });

    it('should filter by section', async () => {
      const result = await handleGetProjectSettings({
        projectPath,
        section: 'display',
      });

      expect(isErrorResponse(result)).toBe(false);
      const data = parseJsonResponse<{
        settings: Array<{ section: string }>;
      }>(result);

      expect(data.settings.every((s) => s.section === 'display')).toBe(true);
    });

    it('should filter by specific key', async () => {
      const result = await handleGetProjectSettings({
        projectPath,
        key: 'config/name',
      });

      expect(isErrorResponse(result)).toBe(false);
      const data = parseJsonResponse<{
        settings: Array<{ key: string; value: string }>;
      }>(result);

      expect(data.settings.length).toBe(1);
      expect(data.settings[0].value).toBe('Test Project');
    });
  });
});

describe('SetProjectSetting', () => {
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

  describe('validation', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleSetProjectSetting({
        key: 'test/key',
        value: 'value',
      });
      expect(isErrorResponse(result)).toBe(true);
    });

    it('should return error when key is missing', async () => {
      const result = await handleSetProjectSetting({
        projectPath,
        value: 'value',
      });
      expect(isErrorResponse(result)).toBe(true);
    });

    it('should return error when value is missing', async () => {
      const result = await handleSetProjectSetting({
        projectPath,
        key: 'test/key',
      });
      expect(isErrorResponse(result)).toBe(true);
    });
  });

  describe('modification', () => {
    it('should update existing setting', async () => {
      const result = await handleSetProjectSetting({
        projectPath,
        key: 'application/config/name',
        value: 'New Project Name',
      });

      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toContain('updated');

      // Verify file was modified
      const content = readFileSync(join(projectPath, 'project.godot'), 'utf-8');
      expect(content).toContain('"New Project Name"');
    });

    it('should add new setting to existing section', async () => {
      const result = await handleSetProjectSetting({
        projectPath,
        key: 'application/config/description',
        value: 'A test description',
        section: 'application',
      });

      expect(isErrorResponse(result)).toBe(false);

      const content = readFileSync(join(projectPath, 'project.godot'), 'utf-8');
      expect(content).toContain('config/description');
      expect(content).toContain('"A test description"');
    });

    it('should add new section if not exists', async () => {
      const result = await handleSetProjectSetting({
        projectPath,
        key: 'custom_key',
        value: 'custom_value',
        section: 'custom_section',
      });

      expect(isErrorResponse(result)).toBe(false);

      const content = readFileSync(join(projectPath, 'project.godot'), 'utf-8');
      expect(content).toContain('[custom_section]');
      expect(content).toContain('custom_key=');
    });

    it('should handle boolean values', async () => {
      const result = await handleSetProjectSetting({
        projectPath,
        key: 'display/window/fullscreen',
        value: 'true',
        section: 'display',
      });

      expect(isErrorResponse(result)).toBe(false);

      const content = readFileSync(join(projectPath, 'project.godot'), 'utf-8');
      expect(content).toContain('window/fullscreen=true');
    });

    it('should handle numeric values', async () => {
      const result = await handleSetProjectSetting({
        projectPath,
        key: 'display/window/size/viewport_width',
        value: '1280',
      });

      expect(isErrorResponse(result)).toBe(false);

      const content = readFileSync(join(projectPath, 'project.godot'), 'utf-8');
      expect(content).toContain('1280');
    });
  });
});
