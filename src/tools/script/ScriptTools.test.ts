/**
 * Script Tools Integration Tests
 * Tests ListScripts, AttachScript, DetachScript
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
import { handleListScripts } from './ListScriptsTool.js';
import { handleAttachScript } from './AttachScriptTool.js';
import { handleDetachScript } from './DetachScriptTool.js';

describe('Script Tools', () => {
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

  describe('ListScripts', () => {
    describe('validation', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleListScripts({});
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should return error for non-existent project', async () => {
        const result = await handleListScripts({
          projectPath: '/non/existent/path',
        });
        expect(isErrorResponse(result)).toBe(true);
      });
    });

    describe('listing operations', () => {
      it('should list all scripts in project', async () => {
        const result = await handleListScripts({
          projectPath,
        });

        expect(isErrorResponse(result)).toBe(false);

        const data = parseJsonResponse<{
          count: number;
          scripts: Array<{ path: string; name: string; size: number }>;
        }>(result);

        expect(data.count).toBeGreaterThanOrEqual(1);
        expect(data.scripts.some((s) => s.path.includes('player.gd'))).toBe(true);
      });

      it('should filter by directory', async () => {
        const result = await handleListScripts({
          projectPath,
          directory: 'scripts',
        });

        expect(isErrorResponse(result)).toBe(false);

        const data = parseJsonResponse<{
          scripts: Array<{ path: string }>;
        }>(result);

        expect(data.scripts.every((s) => s.path.startsWith('scripts/'))).toBe(true);
      });

      it('should include script metadata', async () => {
        const result = await handleListScripts({
          projectPath,
        });

        expect(isErrorResponse(result)).toBe(false);

        const data = parseJsonResponse<{
          scripts: Array<{ path: string; name: string; size: number; modified: string }>;
        }>(result);

        expect(data.scripts[0].name).toBeDefined();
        expect(data.scripts[0].size).toBeGreaterThan(0);
        expect(data.scripts[0].modified).toBeDefined();
      });
    });
  });

  describe('AttachScript', () => {
    describe('validation', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleAttachScript({
          scenePath: 'scenes/main.tscn',
          nodePath: '.',
          scriptPath: 'scripts/player.gd',
        });
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should return error when scenePath is missing', async () => {
        const result = await handleAttachScript({
          projectPath,
          nodePath: '.',
          scriptPath: 'scripts/player.gd',
        });
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should return error when scriptPath is missing', async () => {
        const result = await handleAttachScript({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodePath: '.',
        });
        expect(isErrorResponse(result)).toBe(true);
      });
    });

    describe('attach operations', () => {
      it('should attach script to root node', async () => {
        const result = await handleAttachScript({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodePath: '.',
          scriptPath: 'scripts/player.gd',
        });

        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toContain('attached successfully');

        // Verify file was modified
        const content = readFileSync(join(projectPath, 'scenes/main.tscn'), 'utf-8');
        expect(content).toContain('script=ExtResource');
        expect(content).toContain('res://scripts/player.gd');
      });

      it('should attach script to child node', async () => {
        const result = await handleAttachScript({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodePath: 'Player',
          scriptPath: 'scripts/player.gd',
        });

        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toContain('attached successfully');
      });

      it('should return error for non-existent script', async () => {
        const result = await handleAttachScript({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodePath: '.',
          scriptPath: 'scripts/nonexistent.gd',
        });

        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('not found');
      });

      it('should return error for non-existent node', async () => {
        const result = await handleAttachScript({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodePath: 'NonExistentNode',
          scriptPath: 'scripts/player.gd',
        });

        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('not found');
      });
    });
  });

  describe('DetachScript', () => {
    describe('validation', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleDetachScript({
          scenePath: 'scenes/with_script.tscn',
          nodePath: '.',
        });
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should return error when scenePath is missing', async () => {
        const result = await handleDetachScript({
          projectPath,
          nodePath: '.',
        });
        expect(isErrorResponse(result)).toBe(true);
      });
    });

    describe('detach operations', () => {
      it('should detach script from node with script', async () => {
        const result = await handleDetachScript({
          projectPath,
          scenePath: 'scenes/with_script.tscn',
          nodePath: '.',
        });

        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toContain('detached successfully');

        // Verify file was modified
        const content = readFileSync(join(projectPath, 'scenes/with_script.tscn'), 'utf-8');
        // Script reference should be removed from node
        expect(content).not.toMatch(/\[node[^\]]*script=ExtResource/);
      });

      it('should return error for node without script', async () => {
        const result = await handleDetachScript({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodePath: '.',
        });

        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/no script|not found/i);
      });
    });
  });
});
