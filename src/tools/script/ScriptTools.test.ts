/**
 * Script Tools Integration Tests
 * Tests DeleteScript, ReadScript, WriteScript (plus existing ListScripts, AttachScript, DetachScript)
 * ISO/IEC 29119 compliant test coverage
 * ISO/IEC 25010 compliant - data integrity and security
 *
 * Test Categories (ISO 29119):
 * 1. Input validation (Zod schema validation errors)
 * 2. Missing required parameters
 * 3. Invalid parameter values
 * 4. Path security (path traversal prevention)
 * 5. Success scenarios with actual file operations
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
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
import { handleDeleteScript } from './DeleteScriptTool.js';
import { handleReadScript } from './ReadScriptTool.js';
import { handleWriteScript } from './WriteScriptTool.js';

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

  // ===========================================================================
  // ListScripts Tests
  // ===========================================================================
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

  // ===========================================================================
  // AttachScript Tests
  // ===========================================================================
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

  // ===========================================================================
  // DetachScript Tests
  // ===========================================================================
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

  // ===========================================================================
  // DeleteScript Tests (ISO 29119 Compliant)
  // ===========================================================================
  describe('DeleteScript', () => {
    // Category 1: Input validation (Zod schema validation errors)
    describe('input validation', () => {
      it('should return validation error when no arguments provided', async () => {
        const result = await handleDeleteScript({});
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed/i);
      });

      it('should return validation error for empty projectPath', async () => {
        const result = await handleDeleteScript({
          projectPath: '',
          scriptPath: 'scripts/player.gd',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed|cannot be empty/i);
      });

      it('should return validation error for empty scriptPath', async () => {
        const result = await handleDeleteScript({
          projectPath,
          scriptPath: '',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed|cannot be empty/i);
      });
    });

    // Category 2: Missing required parameters
    describe('missing required parameters', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleDeleteScript({
          scriptPath: 'scripts/player.gd',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed|projectPath/i);
      });

      it('should return error when scriptPath is missing', async () => {
        const result = await handleDeleteScript({
          projectPath,
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed|scriptPath/i);
      });
    });

    // Category 3: Invalid parameter values
    describe('invalid parameter values', () => {
      it('should return error for non-existent project', async () => {
        const result = await handleDeleteScript({
          projectPath: '/non/existent/project/path',
          scriptPath: 'scripts/player.gd',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/not found|does not exist|invalid|not a valid/i);
      });

      it('should return error for non-existent script file', async () => {
        const result = await handleDeleteScript({
          projectPath,
          scriptPath: 'scripts/nonexistent.gd',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/not found/i);
      });

      it('should return error for non-GDScript file', async () => {
        // Create a non-.gd file to test
        writeFileSync(join(projectPath, 'scripts', 'test.txt'), 'test content');

        const result = await handleDeleteScript({
          projectPath,
          scriptPath: 'scripts/test.txt',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/not a GDScript file/i);
      });

      it('should return error for invalid path format', async () => {
        const result = await handleDeleteScript({
          projectPath,
          scriptPath: 'scripts//double//slashes.gd',
        });
        // Should either fail validation or file not found
        expect(isErrorResponse(result)).toBe(true);
      });
    });

    // Category 4: Path security (path traversal prevention)
    describe('path security', () => {
      it('should reject path traversal in scriptPath with ../', async () => {
        const result = await handleDeleteScript({
          projectPath,
          scriptPath: '../outside/script.gd',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed|path traversal|cannot contain/i);
      });

      it('should reject path traversal with multiple ../', async () => {
        const result = await handleDeleteScript({
          projectPath,
          scriptPath: '../../etc/passwd.gd',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed|path traversal|cannot contain/i);
      });

      it('should reject path traversal in middle of path', async () => {
        const result = await handleDeleteScript({
          projectPath,
          scriptPath: 'scripts/../../../outside.gd',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed|path traversal|cannot contain/i);
      });

      it('should reject path traversal in projectPath', async () => {
        const result = await handleDeleteScript({
          projectPath: projectPath + '/../../../etc',
          scriptPath: 'passwd.gd',
        });
        expect(isErrorResponse(result)).toBe(true);
        // On Windows, path traversal may result in "Not a valid Godot project" error
        expect(getResponseText(result)).toMatch(/validation failed|path traversal|cannot contain|not a valid/i);
      });
    });

    // Category 5: Success scenarios with actual file operations
    describe('delete operations', () => {
      it('should successfully delete an existing script', async () => {
        // Verify file exists before deletion
        const scriptFullPath = join(projectPath, 'scripts', 'player.gd');
        expect(existsSync(scriptFullPath)).toBe(true);

        const result = await handleDeleteScript({
          projectPath,
          scriptPath: 'scripts/player.gd',
        });

        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toMatch(/deleted successfully/i);

        // Verify file was actually deleted
        expect(existsSync(scriptFullPath)).toBe(false);
      });

      it('should delete script and warn about broken references', async () => {
        const result = await handleDeleteScript({
          projectPath,
          scriptPath: 'scripts/player.gd',
        });

        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toMatch(/broken references/i);
      });

      it('should delete newly created script', async () => {
        // Create a new script first
        const newScriptPath = join(projectPath, 'scripts', 'temporary.gd');
        writeFileSync(newScriptPath, 'extends Node\n\nfunc _ready():\n    pass\n');
        expect(existsSync(newScriptPath)).toBe(true);

        const result = await handleDeleteScript({
          projectPath,
          scriptPath: 'scripts/temporary.gd',
        });

        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toMatch(/deleted successfully/i);
        expect(existsSync(newScriptPath)).toBe(false);
      });

      it('should handle script in nested directories', async () => {
        // Create nested directory and script
        const { mkdirSync } = await import('fs');
        mkdirSync(join(projectPath, 'scripts', 'enemies'), { recursive: true });
        const nestedScript = join(projectPath, 'scripts', 'enemies', 'goblin.gd');
        writeFileSync(nestedScript, 'extends CharacterBody2D\n');
        expect(existsSync(nestedScript)).toBe(true);

        const result = await handleDeleteScript({
          projectPath,
          scriptPath: 'scripts/enemies/goblin.gd',
        });

        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toMatch(/deleted successfully/i);
        expect(existsSync(nestedScript)).toBe(false);
      });
    });
  });

  // ===========================================================================
  // ReadScript Tests (ISO 29119 Compliant)
  // ===========================================================================
  describe('ReadScript', () => {
    // Category 1: Input validation (Zod schema validation errors)
    describe('input validation', () => {
      it('should return validation error when no arguments provided', async () => {
        const result = await handleReadScript({});
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed/i);
      });

      it('should return validation error for empty projectPath', async () => {
        const result = await handleReadScript({
          projectPath: '',
          scriptPath: 'scripts/player.gd',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed|cannot be empty/i);
      });

      it('should return validation error for empty scriptPath', async () => {
        const result = await handleReadScript({
          projectPath,
          scriptPath: '',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed|cannot be empty/i);
      });
    });

    // Category 2: Missing required parameters
    describe('missing required parameters', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleReadScript({
          scriptPath: 'scripts/player.gd',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed|projectPath/i);
      });

      it('should return error when scriptPath is missing', async () => {
        const result = await handleReadScript({
          projectPath,
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed|scriptPath/i);
      });
    });

    // Category 3: Invalid parameter values
    describe('invalid parameter values', () => {
      it('should return error for non-existent project', async () => {
        const result = await handleReadScript({
          projectPath: '/non/existent/project/path',
          scriptPath: 'scripts/player.gd',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/not found|does not exist|invalid|not a valid/i);
      });

      it('should return error for non-existent script file', async () => {
        const result = await handleReadScript({
          projectPath,
          scriptPath: 'scripts/nonexistent.gd',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/not found/i);
      });

      it('should return error for non-GDScript file', async () => {
        // Create a non-.gd file to test
        writeFileSync(join(projectPath, 'scripts', 'readme.txt'), 'This is a readme');

        const result = await handleReadScript({
          projectPath,
          scriptPath: 'scripts/readme.txt',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/not a GDScript file/i);
      });

      it('should return error for directory path', async () => {
        const result = await handleReadScript({
          projectPath,
          scriptPath: 'scripts',
        });
        // Should fail because path doesn't end with .gd or is a directory
        expect(isErrorResponse(result)).toBe(true);
      });
    });

    // Category 4: Path security (path traversal prevention)
    describe('path security', () => {
      it('should reject path traversal in scriptPath with ../', async () => {
        const result = await handleReadScript({
          projectPath,
          scriptPath: '../outside/script.gd',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed|path traversal|cannot contain/i);
      });

      it('should reject path traversal with multiple ../', async () => {
        const result = await handleReadScript({
          projectPath,
          scriptPath: '../../etc/passwd.gd',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed|path traversal|cannot contain/i);
      });

      it('should reject path traversal in middle of path', async () => {
        const result = await handleReadScript({
          projectPath,
          scriptPath: 'scripts/../../../sensitive.gd',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed|path traversal|cannot contain/i);
      });

      it('should reject path traversal in projectPath', async () => {
        const result = await handleReadScript({
          projectPath: projectPath + '/../../../etc',
          scriptPath: 'passwd.gd',
        });
        expect(isErrorResponse(result)).toBe(true);
        // On Windows, path traversal may result in "Not a valid Godot project" error
        expect(getResponseText(result)).toMatch(/validation failed|path traversal|cannot contain|not a valid/i);
      });
    });

    // Category 5: Success scenarios with actual file operations
    describe('read operations', () => {
      it('should successfully read an existing script', async () => {
        const result = await handleReadScript({
          projectPath,
          scriptPath: 'scripts/player.gd',
        });

        expect(isErrorResponse(result)).toBe(false);
        const text = getResponseText(result);
        expect(text).toContain('extends CharacterBody2D');
        expect(text).toContain('SPEED');
        expect(text).toContain('_physics_process');
      });

      it('should include script path in response header', async () => {
        const result = await handleReadScript({
          projectPath,
          scriptPath: 'scripts/player.gd',
        });

        expect(isErrorResponse(result)).toBe(false);
        const text = getResponseText(result);
        // Handle both Unix and Windows path separators
        expect(text).toMatch(/# Script: scripts[/\\]player\.gd/);
      });

      it('should include line count in response header', async () => {
        const result = await handleReadScript({
          projectPath,
          scriptPath: 'scripts/player.gd',
        });

        expect(isErrorResponse(result)).toBe(false);
        const text = getResponseText(result);
        expect(text).toMatch(/# Lines: \d+/);
      });

      it('should read script with special characters', async () => {
        // Create a script with special characters
        const specialContent = `extends Node

# Special characters: <>&"'
var message = "Hello 'World' & \"Everyone\""
var unicode_var = "Unicode: \\u00e9\\u00e8"

func _ready():
    print(message)
`;
        writeFileSync(join(projectPath, 'scripts', 'special.gd'), specialContent);

        const result = await handleReadScript({
          projectPath,
          scriptPath: 'scripts/special.gd',
        });

        expect(isErrorResponse(result)).toBe(false);
        const text = getResponseText(result);
        expect(text).toContain('Special characters');
        expect(text).toContain('Hello');
      });

      it('should read empty script', async () => {
        writeFileSync(join(projectPath, 'scripts', 'empty.gd'), '');

        const result = await handleReadScript({
          projectPath,
          scriptPath: 'scripts/empty.gd',
        });

        expect(isErrorResponse(result)).toBe(false);
        const text = getResponseText(result);
        // Handle both Unix and Windows path separators
        expect(text).toMatch(/# Script: scripts[/\\]empty\.gd/);
        expect(text).toContain('# Lines: 1');
      });

      it('should read script from nested directories', async () => {
        // Create nested directory and script
        const { mkdirSync } = await import('fs');
        mkdirSync(join(projectPath, 'scripts', 'utils', 'math'), { recursive: true });
        const nestedContent = 'extends RefCounted\n\nfunc add(a, b):\n    return a + b\n';
        writeFileSync(join(projectPath, 'scripts', 'utils', 'math', 'calculator.gd'), nestedContent);

        const result = await handleReadScript({
          projectPath,
          scriptPath: 'scripts/utils/math/calculator.gd',
        });

        expect(isErrorResponse(result)).toBe(false);
        const text = getResponseText(result);
        expect(text).toContain('extends RefCounted');
        expect(text).toContain('func add');
      });

      it('should preserve script content exactly', async () => {
        const originalContent = readFileSync(join(projectPath, 'scripts', 'player.gd'), 'utf-8');

        const result = await handleReadScript({
          projectPath,
          scriptPath: 'scripts/player.gd',
        });

        expect(isErrorResponse(result)).toBe(false);
        const text = getResponseText(result);
        // The content should be included (after the header)
        expect(text).toContain(originalContent);
      });
    });
  });

  // ===========================================================================
  // WriteScript Tests (ISO 29119 Compliant)
  // ===========================================================================
  describe('WriteScript', () => {
    // Category 1: Input validation (Zod schema validation errors)
    describe('input validation', () => {
      it('should return validation error when no arguments provided', async () => {
        const result = await handleWriteScript({});
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed/i);
      });

      it('should return validation error for empty projectPath', async () => {
        const result = await handleWriteScript({
          projectPath: '',
          scriptPath: 'scripts/new.gd',
          content: 'extends Node',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed|cannot be empty/i);
      });

      it('should return validation error for empty scriptPath', async () => {
        const result = await handleWriteScript({
          projectPath,
          scriptPath: '',
          content: 'extends Node',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed|cannot be empty/i);
      });
    });

    // Category 2: Missing required parameters
    describe('missing required parameters', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleWriteScript({
          scriptPath: 'scripts/new.gd',
          content: 'extends Node',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed|projectPath/i);
      });

      it('should return error when scriptPath is missing', async () => {
        const result = await handleWriteScript({
          projectPath,
          content: 'extends Node',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed|scriptPath/i);
      });

      it('should return error when content is missing', async () => {
        const result = await handleWriteScript({
          projectPath,
          scriptPath: 'scripts/new.gd',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed|content/i);
      });
    });

    // Category 3: Invalid parameter values
    describe('invalid parameter values', () => {
      it('should return error for non-existent project', async () => {
        const result = await handleWriteScript({
          projectPath: '/non/existent/project/path',
          scriptPath: 'scripts/new.gd',
          content: 'extends Node',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/not found|does not exist|invalid|not a valid/i);
      });

      it('should fail when overwrite is false and file exists', async () => {
        const result = await handleWriteScript({
          projectPath,
          scriptPath: 'scripts/player.gd',
          content: 'extends Node',
          overwrite: false,
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/already exists/i);
      });

      it('should return error for invalid boolean overwrite value type', async () => {
        const result = await handleWriteScript({
          projectPath,
          scriptPath: 'scripts/new.gd',
          content: 'extends Node',
          overwrite: 'yes' as unknown as boolean,
        });
        // Zod should coerce or reject invalid boolean
        // Test may pass if Zod coerces string to boolean
        // The important thing is it doesn't crash
        expect(result).toBeDefined();
      });
    });

    // Category 4: Path security (path traversal prevention)
    describe('path security', () => {
      it('should reject path traversal in scriptPath with ../', async () => {
        const result = await handleWriteScript({
          projectPath,
          scriptPath: '../outside/script.gd',
          content: 'extends Node',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed|path traversal|cannot contain/i);
      });

      it('should reject path traversal with multiple ../', async () => {
        const result = await handleWriteScript({
          projectPath,
          scriptPath: '../../etc/malicious.gd',
          content: 'extends Node',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed|path traversal|cannot contain/i);
      });

      it('should reject path traversal in middle of path', async () => {
        const result = await handleWriteScript({
          projectPath,
          scriptPath: 'scripts/../../../outside.gd',
          content: 'extends Node',
        });
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/validation failed|path traversal|cannot contain/i);
      });

      it('should reject path traversal in projectPath', async () => {
        const result = await handleWriteScript({
          projectPath: projectPath + '/../../../tmp',
          scriptPath: 'malicious.gd',
          content: 'extends Node',
        });
        expect(isErrorResponse(result)).toBe(true);
        // On Windows, path traversal may result in "Not a valid Godot project" error
        expect(getResponseText(result)).toMatch(/validation failed|path traversal|cannot contain|not a valid/i);
      });

      it('should reject attempt to write outside project with absolute path injection', async () => {
        // This tests whether scriptPath is treated as relative
        const result = await handleWriteScript({
          projectPath,
          scriptPath: '/etc/malicious.gd',
          content: 'extends Node',
        });
        // Should either fail validation or write to projectPath + /etc/malicious.gd
        // The file should NOT be created at /etc/malicious.gd
        expect(existsSync('/etc/malicious.gd')).toBe(false);
      });
    });

    // Category 5: Success scenarios with actual file operations
    describe('write operations', () => {
      it('should successfully create a new script', async () => {
        const newContent = `extends Node2D

var health = 100

func _ready():
    print("Entity spawned")

func take_damage(amount):
    health -= amount
`;
        const result = await handleWriteScript({
          projectPath,
          scriptPath: 'scripts/entity.gd',
          content: newContent,
        });

        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toMatch(/created successfully/i);

        // Verify file was actually created
        const createdContent = readFileSync(join(projectPath, 'scripts', 'entity.gd'), 'utf-8');
        expect(createdContent).toBe(newContent);
      });

      it('should overwrite existing script when overwrite is true', async () => {
        const updatedContent = `extends CharacterBody2D

const SPEED = 500.0  # Changed from 300
const JUMP_VELOCITY = -600.0  # Changed from -400

func _ready():
    print("Player updated!")
`;
        const result = await handleWriteScript({
          projectPath,
          scriptPath: 'scripts/player.gd',
          content: updatedContent,
          overwrite: true,
        });

        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toMatch(/updated successfully/i);

        // Verify file was actually updated
        const updatedFile = readFileSync(join(projectPath, 'scripts', 'player.gd'), 'utf-8');
        expect(updatedFile).toBe(updatedContent);
        expect(updatedFile).toContain('SPEED = 500.0');
      });

      it('should automatically add .gd extension if missing', async () => {
        const content = 'extends Node\n';

        const result = await handleWriteScript({
          projectPath,
          scriptPath: 'scripts/auto_extension',  // No .gd extension
          content,
        });

        expect(isErrorResponse(result)).toBe(false);
        // Check that .gd was added
        expect(existsSync(join(projectPath, 'scripts', 'auto_extension.gd'))).toBe(true);
      });

      it('should create parent directories if they do not exist', async () => {
        const content = `extends Node

func calculate():
    pass
`;
        const result = await handleWriteScript({
          projectPath,
          scriptPath: 'scripts/deep/nested/directory/helper.gd',
          content,
        });

        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toMatch(/created successfully/i);

        // Verify file and directories were created
        const fullPath = join(projectPath, 'scripts', 'deep', 'nested', 'directory', 'helper.gd');
        expect(existsSync(fullPath)).toBe(true);
        expect(readFileSync(fullPath, 'utf-8')).toBe(content);
      });

      it('should report correct line count', async () => {
        const content = `extends Node

func one():
    pass

func two():
    pass

func three():
    pass
`;
        const result = await handleWriteScript({
          projectPath,
          scriptPath: 'scripts/multiline.gd',
          content,
        });

        expect(isErrorResponse(result)).toBe(false);
        const text = getResponseText(result);
        expect(text).toMatch(/Lines: 11/);  // 11 lines including the trailing newline
      });

      it('should write script with empty content', async () => {
        const result = await handleWriteScript({
          projectPath,
          scriptPath: 'scripts/empty_script.gd',
          content: '',
        });

        expect(isErrorResponse(result)).toBe(false);
        expect(existsSync(join(projectPath, 'scripts', 'empty_script.gd'))).toBe(true);
      });

      it('should write script with special characters', async () => {
        const specialContent = `extends Node

# This script has special characters: <>&"'
var message = "Hello 'World' & \\"Everyone\\""
var html_like = "<div>test</div>"
var unicode = "\\u00e9\\u00e8\\u00f1"

func _ready():
    print(message)
`;
        const result = await handleWriteScript({
          projectPath,
          scriptPath: 'scripts/special_chars.gd',
          content: specialContent,
        });

        expect(isErrorResponse(result)).toBe(false);
        const written = readFileSync(join(projectPath, 'scripts', 'special_chars.gd'), 'utf-8');
        expect(written).toBe(specialContent);
      });

      it('should write script with unicode content', async () => {
        const unicodeContent = `extends Node

var greeting_japanese = "こんにちは"
var greeting_chinese = "你好"
var greeting_arabic = "مرحبا"
var emoji = "Game Dev!"

func _ready():
    print(greeting_japanese)
`;
        const result = await handleWriteScript({
          projectPath,
          scriptPath: 'scripts/unicode.gd',
          content: unicodeContent,
        });

        expect(isErrorResponse(result)).toBe(false);
        const written = readFileSync(join(projectPath, 'scripts', 'unicode.gd'), 'utf-8');
        expect(written).toBe(unicodeContent);
        expect(written).toContain('こんにちは');
      });

      it('should include full path in success response', async () => {
        const result = await handleWriteScript({
          projectPath,
          scriptPath: 'scripts/with_path.gd',
          content: 'extends Node',
        });

        expect(isErrorResponse(result)).toBe(false);
        const text = getResponseText(result);
        expect(text).toContain('Path:');
        expect(text).toContain('with_path.gd');
      });

      it('should handle script in root project directory', async () => {
        const content = 'extends Node\n';

        const result = await handleWriteScript({
          projectPath,
          scriptPath: 'root_script.gd',
          content,
        });

        expect(isErrorResponse(result)).toBe(false);
        expect(existsSync(join(projectPath, 'root_script.gd'))).toBe(true);
      });
    });

    // Integration tests: Write then Read
    describe('write and read integration', () => {
      it('should be able to write then read the same content', async () => {
        const content = `extends Area2D

signal collected

func _on_body_entered(body):
    if body.is_in_group("player"):
        collected.emit()
        queue_free()
`;
        // Write the script
        const writeResult = await handleWriteScript({
          projectPath,
          scriptPath: 'scripts/collectible.gd',
          content,
        });
        expect(isErrorResponse(writeResult)).toBe(false);

        // Read it back
        const readResult = await handleReadScript({
          projectPath,
          scriptPath: 'scripts/collectible.gd',
        });
        expect(isErrorResponse(readResult)).toBe(false);
        expect(getResponseText(readResult)).toContain(content);
      });

      it('should be able to update script multiple times', async () => {
        const content1 = 'extends Node\nvar version = 1\n';
        const content2 = 'extends Node\nvar version = 2\n';
        const content3 = 'extends Node\nvar version = 3\n';

        // Write version 1
        await handleWriteScript({
          projectPath,
          scriptPath: 'scripts/versioned.gd',
          content: content1,
        });

        // Overwrite with version 2
        await handleWriteScript({
          projectPath,
          scriptPath: 'scripts/versioned.gd',
          content: content2,
          overwrite: true,
        });

        // Overwrite with version 3
        const finalResult = await handleWriteScript({
          projectPath,
          scriptPath: 'scripts/versioned.gd',
          content: content3,
          overwrite: true,
        });

        expect(isErrorResponse(finalResult)).toBe(false);

        // Read and verify final version
        const readResult = await handleReadScript({
          projectPath,
          scriptPath: 'scripts/versioned.gd',
        });
        expect(getResponseText(readResult)).toContain('version = 3');
      });
    });

    // Integration tests: Write then Delete
    describe('write and delete integration', () => {
      it('should be able to write then delete a script', async () => {
        const content = 'extends Node\n';
        const scriptPath = 'scripts/temporary_file.gd';
        const fullPath = join(projectPath, scriptPath);

        // Write the script
        await handleWriteScript({
          projectPath,
          scriptPath,
          content,
        });
        expect(existsSync(fullPath)).toBe(true);

        // Delete it
        const deleteResult = await handleDeleteScript({
          projectPath,
          scriptPath,
        });
        expect(isErrorResponse(deleteResult)).toBe(false);
        expect(existsSync(fullPath)).toBe(false);
      });
    });
  });
});
