/**
 * Utilities Unit Tests
 * Tests ErrorHandler and FileUtils
 * ISO/IEC 25010 compliant test coverage
 */

import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createErrorResponse } from './ErrorHandler.js';
import { isGodotProject, findGodotProjects, getProjectStructure } from './FileUtils.js';

describe('ErrorHandler', () => {
  describe('createErrorResponse', () => {
    it('should create error response with message', () => {
      const result = createErrorResponse('Something went wrong');
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Something went wrong');
    });

    it('should include possible solutions', () => {
      const result = createErrorResponse('Error occurred', [
        'Try solution A',
        'Try solution B',
      ]);
      // Solutions are in second content item
      expect(result.content.length).toBe(2);
      expect(result.content[1].text).toContain('Possible solutions');
      expect(result.content[1].text).toContain('Try solution A');
      expect(result.content[1].text).toContain('Try solution B');
    });

    it('should handle empty solutions array', () => {
      const result = createErrorResponse('Error occurred', []);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).not.toContain('Something to try');
    });
  });
});

describe('FileUtils', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'fileutils-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('isGodotProject', () => {
    it('should return true for directory with project.godot', () => {
      writeFileSync(join(tempDir, 'project.godot'), '[application]');
      expect(isGodotProject(tempDir)).toBe(true);
    });

    it('should return false for directory without project.godot', () => {
      expect(isGodotProject(tempDir)).toBe(false);
    });

    it('should return false for non-existent directory', () => {
      expect(isGodotProject('/non/existent/path')).toBe(false);
    });
  });

  describe('findGodotProjects', () => {
    it('should find project in current directory', () => {
      writeFileSync(join(tempDir, 'project.godot'), '[application]');
      const projects = findGodotProjects(tempDir, false);
      expect(projects.length).toBeGreaterThanOrEqual(1);
      expect(projects[0].path).toBe(tempDir);
    });

    it('should find projects in subdirectories when recursive', () => {
      const subdir = join(tempDir, 'subproject');
      mkdirSync(subdir);
      writeFileSync(join(subdir, 'project.godot'), '[application]');

      const projects = findGodotProjects(tempDir, true);
      expect(projects.some(p => p.path === subdir)).toBe(true);
    });

    it('should find immediate subdirectory projects regardless of recursive flag', () => {
      // Note: findGodotProjects always checks immediate subdirectories
      // The recursive flag controls deeper searching within non-project directories
      const subdir = join(tempDir, 'subproject');
      mkdirSync(subdir);
      writeFileSync(join(subdir, 'project.godot'), '[application]');

      const projects = findGodotProjects(tempDir, false);
      expect(projects.some(p => p.path === subdir)).toBe(true);
    });

    it('should skip hidden directories', () => {
      const hiddenDir = join(tempDir, '.hidden');
      mkdirSync(hiddenDir);
      writeFileSync(join(hiddenDir, 'project.godot'), '[application]');

      const projects = findGodotProjects(tempDir, true);
      expect(projects.some(p => p.path === hiddenDir)).toBe(false);
    });

    it('should return empty array for empty directory', () => {
      const projects = findGodotProjects(tempDir, true);
      expect(projects).toEqual([]);
    });
  });

  describe('getProjectStructure', () => {
    it('should count scenes', () => {
      writeFileSync(join(tempDir, 'project.godot'), '[application]');
      writeFileSync(join(tempDir, 'main.tscn'), '[gd_scene]');
      writeFileSync(join(tempDir, 'level.tscn'), '[gd_scene]');

      const structure = getProjectStructure(tempDir);
      expect(structure.scenes).toBe(2);
    });

    it('should count scripts', () => {
      writeFileSync(join(tempDir, 'project.godot'), '[application]');
      writeFileSync(join(tempDir, 'player.gd'), 'extends Node');
      writeFileSync(join(tempDir, 'enemy.gd'), 'extends Node');
      writeFileSync(join(tempDir, 'game.cs'), 'using Godot;');

      const structure = getProjectStructure(tempDir);
      expect(structure.scripts).toBe(3);
    });

    it('should count assets', () => {
      writeFileSync(join(tempDir, 'project.godot'), '[application]');
      writeFileSync(join(tempDir, 'icon.png'), 'PNG');
      writeFileSync(join(tempDir, 'sound.wav'), 'WAV');
      writeFileSync(join(tempDir, 'font.ttf'), 'TTF');

      const structure = getProjectStructure(tempDir);
      expect(structure.assets).toBe(3);
    });

    it('should count other files', () => {
      writeFileSync(join(tempDir, 'project.godot'), '[application]');
      writeFileSync(join(tempDir, 'readme.txt'), 'readme');
      writeFileSync(join(tempDir, 'config.json'), '{}');

      const structure = getProjectStructure(tempDir);
      expect(structure.other).toBeGreaterThanOrEqual(2);
    });

    it('should scan subdirectories', () => {
      writeFileSync(join(tempDir, 'project.godot'), '[application]');
      const subdir = join(tempDir, 'scenes');
      mkdirSync(subdir);
      writeFileSync(join(subdir, 'main.tscn'), '[gd_scene]');

      const structure = getProjectStructure(tempDir);
      expect(structure.scenes).toBe(1);
    });

    it('should skip hidden directories', () => {
      writeFileSync(join(tempDir, 'project.godot'), '[application]');
      const hiddenDir = join(tempDir, '.hidden');
      mkdirSync(hiddenDir);
      writeFileSync(join(hiddenDir, 'hidden.tscn'), '[gd_scene]');

      const structure = getProjectStructure(tempDir);
      expect(structure.scenes).toBe(0);
    });

    it('should return zeros for non-existent directory', () => {
      const structure = getProjectStructure('/non/existent/path');
      expect(structure.scenes).toBe(0);
      expect(structure.scripts).toBe(0);
      expect(structure.assets).toBe(0);
      expect(structure.other).toBe(0);
    });
  });
});
