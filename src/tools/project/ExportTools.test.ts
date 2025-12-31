/**
 * Export Tools Tests
 * ISO/IEC 25010 compliant - strict testing
 */

import { handleListExportPresets } from './ListExportPresetsTool';

describe('Export Tools', () => {
  describe('ListExportPresets', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleListExportPresets({});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return error for invalid project path', async () => {
      const result = await handleListExportPresets({
        projectPath: '/non/existent/path',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });
  });
});
