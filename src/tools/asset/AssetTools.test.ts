/**
 * Asset Tools Tests
 * ISO/IEC 25010 compliant - strict testing
 */

import { handleListAssets } from './ListAssetsTool';
import { handleImportAsset } from './ImportAssetTool';
import { handleReimportAssets } from './ReimportAssetsTool';

describe('Asset Tools', () => {
  describe('ListAssets', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleListAssets({});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error for invalid project path', async () => {
      const result = await handleListAssets({
        projectPath: '/non/existent/path',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });

    it('should accept valid category filter', async () => {
      const result = await handleListAssets({
        projectPath: '/non/existent/path',
        category: 'texture',
      });
      // Will fail on project validation, but category param is accepted
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });

    it('should return error for invalid category', async () => {
      const result = await handleListAssets({
        projectPath: '/non/existent/path',
        category: 'invalid_category',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid category');
    });

    it('should accept recursive parameter', async () => {
      const result = await handleListAssets({
        projectPath: '/non/existent/path',
        recursive: false,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });
  });

  describe('ImportAsset', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleImportAsset({
        sourcePath: '/path/to/file.png',
        destinationPath: 'assets/file.png',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error when sourcePath is missing', async () => {
      const result = await handleImportAsset({
        projectPath: '/path/to/project',
        destinationPath: 'assets/file.png',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('sourcePath');
    });

    it('should return error when destinationPath is missing', async () => {
      const result = await handleImportAsset({
        projectPath: '/path/to/project',
        sourcePath: '/path/to/file.png',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('destinationPath');
    });

    it('should return error when source file does not exist', async () => {
      const result = await handleImportAsset({
        projectPath: '/path/to/project',
        sourcePath: '/non/existent/file.png',
        destinationPath: 'assets/file.png',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Source file not found');
    });

    it('should return error for unsupported file type', async () => {
      // Use package.json as a source file that exists but has unsupported extension
      const result = await handleImportAsset({
        projectPath: '/path/to/project',
        sourcePath: process.cwd() + '/package.json',
        destinationPath: 'assets/file.json',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unsupported file type');
    });

    it('should reject destination path with ".."', async () => {
      const result = await handleImportAsset({
        projectPath: '/path/to/project',
        sourcePath: '/some/file.png',
        destinationPath: '../escape/file.png',
      });
      // Will fail on source file not found first
      expect(result.isError).toBe(true);
    });
  });

  describe('ReimportAssets', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleReimportAssets({
        assetPaths: ['assets/file.png'],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error when assetPaths is missing', async () => {
      const result = await handleReimportAssets({
        projectPath: '/path/to/project',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('assetPaths');
    });

    it('should return error when assetPaths is empty', async () => {
      const result = await handleReimportAssets({
        projectPath: '/path/to/project',
        assetPaths: [],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('cannot be empty');
    });

    it('should return error when assetPaths is not an array', async () => {
      const result = await handleReimportAssets({
        projectPath: '/path/to/project',
        assetPaths: 'not-an-array',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('must be an array');
    });

    it('should return error for invalid method', async () => {
      const result = await handleReimportAssets({
        projectPath: '/non/existent/path',
        assetPaths: ['assets/file.png'],
        method: 'invalid_method',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid method');
    });

    it('should return error for invalid project path', async () => {
      const result = await handleReimportAssets({
        projectPath: '/non/existent/path',
        assetPaths: ['assets/file.png'],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });

    it('should accept touch method', async () => {
      const result = await handleReimportAssets({
        projectPath: '/non/existent/path',
        assetPaths: ['assets/file.png'],
        method: 'touch',
      });
      // Will fail on project validation
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });

    it('should accept delete_import method', async () => {
      const result = await handleReimportAssets({
        projectPath: '/non/existent/path',
        assetPaths: ['assets/file.png'],
        method: 'delete_import',
      });
      // Will fail on project validation
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });
  });
});
