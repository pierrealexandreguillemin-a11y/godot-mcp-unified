/**
 * Resource Tools Integration Tests
 * Tests ListResources
 * ISO/IEC 25010 compliant test coverage
 */

import {
  createTempProject,
  parseJsonResponse,
  isErrorResponse,
} from '../test-utils.js';
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

  describe('ListResources', () => {
    describe('validation', () => {
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
    });

    describe('listing operations', () => {
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

      it('should include resource type from tres files', async () => {
        const result = await handleListResources({
          projectPath,
        });

        expect(isErrorResponse(result)).toBe(false);

        const data = parseJsonResponse<{
          resources: Array<{ resourceType?: string }>;
          resourceTypes: string[];
        }>(result);

        // Theme resource should have type extracted
        const themeResource = data.resources.find((r) => r.resourceType === 'Theme');
        expect(themeResource).toBeDefined();
        expect(data.resourceTypes).toContain('Theme');
      });

      it('should include format information', async () => {
        const result = await handleListResources({
          projectPath,
        });

        expect(isErrorResponse(result)).toBe(false);

        const data = parseJsonResponse<{
          resources: Array<{ format: 'tres' | 'res' }>;
        }>(result);

        expect(data.resources.every((r) => r.format === 'tres' || r.format === 'res')).toBe(true);
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
    });
  });
});
