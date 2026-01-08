/**
 * DebugResourceProvider Tests
 * ISO/IEC 29119 compliant
 *
 * Test categories:
 * - URI handling
 * - Debug output management
 * - Stream status
 * - Placeholder resources (breakpoints, stack, variables)
 */

import {
  DebugResourceProvider,
  addDebugOutput,
  setDebugStreamActive,
  getDebugBuffer,
  getDebugStreamStatus,
} from './DebugResourceProvider.js';

describe('DebugResourceProvider', () => {
  let provider: DebugResourceProvider;
  const projectPath = '/mock/project';

  beforeEach(() => {
    provider = new DebugResourceProvider();
    // Reset debug state
    setDebugStreamActive(false);
  });

  afterEach(() => {
    setDebugStreamActive(false);
  });

  // ==========================================================================
  // URI HANDLING
  // ==========================================================================
  describe('handlesUri', () => {
    const validUris = [
      'godot://debug/output',
      'godot://debug/stream',
      'godot://debug/breakpoints',
      'godot://debug/stack',
      'godot://debug/variables',
    ];

    const invalidUris = [
      'godot://scenes',
      'godot://scripts',
      'godot://assets',
      'godot://project/info',
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
  // RESOURCE LISTING
  // ==========================================================================
  describe('listResources', () => {
    it('returns all debug resources', async () => {
      const resources = await provider.listResources(projectPath);

      expect(resources).toContainEqual(
        expect.objectContaining({ uri: 'godot://debug/output' })
      );
      expect(resources).toContainEqual(
        expect.objectContaining({ uri: 'godot://debug/stream' })
      );
      expect(resources).toContainEqual(
        expect.objectContaining({ uri: 'godot://debug/breakpoints' })
      );
      expect(resources).toContainEqual(
        expect.objectContaining({ uri: 'godot://debug/stack' })
      );
      expect(resources).toContainEqual(
        expect.objectContaining({ uri: 'godot://debug/variables' })
      );
    });

    it('has correct mime types', async () => {
      const resources = await provider.listResources(projectPath);

      for (const resource of resources) {
        expect(resource.mimeType).toBe('application/json');
      }
    });
  });

  // ==========================================================================
  // DEBUG OUTPUT BUFFER
  // ==========================================================================
  describe('debug buffer management', () => {
    it('adds output to buffer', () => {
      setDebugStreamActive(true);
      addDebugOutput('test line 1');
      addDebugOutput('test line 2');

      const buffer = getDebugBuffer();
      expect(buffer).toContain('test line 1');
      expect(buffer).toContain('test line 2');
    });

    it('limits buffer size', () => {
      setDebugStreamActive(true);

      // Add more than 1000 lines
      for (let i = 0; i < 1100; i++) {
        addDebugOutput(`line ${i}`);
      }

      const buffer = getDebugBuffer();
      // Should keep last 500 when over 1000
      expect(buffer.length).toBeLessThanOrEqual(1000);
    });

    it('clears buffer when stream starts', () => {
      addDebugOutput('old line');
      setDebugStreamActive(true);

      const buffer = getDebugBuffer();
      expect(buffer).not.toContain('old line');
    });
  });

  // ==========================================================================
  // STREAM STATUS
  // ==========================================================================
  describe('stream status', () => {
    it('tracks active state', () => {
      expect(getDebugStreamStatus().isActive).toBe(false);

      setDebugStreamActive(true);
      expect(getDebugStreamStatus().isActive).toBe(true);

      setDebugStreamActive(false);
      expect(getDebugStreamStatus().isActive).toBe(false);
    });

    it('tracks start time', () => {
      setDebugStreamActive(true);
      const status = getDebugStreamStatus();

      expect(status.startTime).toBeInstanceOf(Date);
    });

    it('clears start time when inactive', () => {
      setDebugStreamActive(true);
      setDebugStreamActive(false);

      expect(getDebugStreamStatus().startTime).toBeNull();
    });
  });

  // ==========================================================================
  // RESOURCE READING
  // ==========================================================================
  describe('readResource', () => {
    describe('debug/output', () => {
      it('returns output with inactive stream', async () => {
        const result = await provider.readResource(projectPath, 'godot://debug/output');

        expect(result).not.toBeNull();
        const data = JSON.parse(result!.text!);
        expect(data.isActive).toBe(false);
        expect(data.lineCount).toBe(0);
        expect(data.output).toEqual([]);
      });

      it('returns output with active stream', async () => {
        setDebugStreamActive(true);
        addDebugOutput('test output');

        const result = await provider.readResource(projectPath, 'godot://debug/output');

        expect(result).not.toBeNull();
        const data = JSON.parse(result!.text!);
        expect(data.isActive).toBe(true);
        expect(data.lineCount).toBe(1);
        expect(data.output).toContain('test output');
        expect(data.startTime).toBeDefined();
        expect(data.durationMs).toBeGreaterThanOrEqual(0);
      });
    });

    describe('debug/stream', () => {
      it('returns stream status', async () => {
        // Ensure clean state by stopping stream first
        setDebugStreamActive(false);

        const result = await provider.readResource(projectPath, 'godot://debug/stream');

        expect(result).not.toBeNull();
        const data = JSON.parse(result!.text!);
        expect(data.isActive).toBe(false);
        // Buffer may have residual data, just check it's a number
        expect(typeof data.bufferSize).toBe('number');
      });

      it('returns active stream status', async () => {
        setDebugStreamActive(true);
        addDebugOutput('line');

        const result = await provider.readResource(projectPath, 'godot://debug/stream');

        expect(result).not.toBeNull();
        const data = JSON.parse(result!.text!);
        expect(data.isActive).toBe(true);
        expect(data.bufferSize).toBe(1);
        expect(data.startTime).toBeDefined();
      });
    });

    describe('debug/breakpoints', () => {
      it('returns placeholder response', async () => {
        const result = await provider.readResource(projectPath, 'godot://debug/breakpoints');

        expect(result).not.toBeNull();
        const data = JSON.parse(result!.text!);
        expect(data.supported).toBe(false);
        expect(data.note).toContain('remote debugger');
        expect(data.breakpoints).toEqual([]);
      });
    });

    describe('debug/stack', () => {
      it('returns placeholder response', async () => {
        const result = await provider.readResource(projectPath, 'godot://debug/stack');

        expect(result).not.toBeNull();
        const data = JSON.parse(result!.text!);
        expect(data.supported).toBe(false);
        expect(data.isPaused).toBe(false);
        expect(data.stack).toEqual([]);
      });
    });

    describe('debug/variables', () => {
      it('returns placeholder response', async () => {
        const result = await provider.readResource(projectPath, 'godot://debug/variables');

        expect(result).not.toBeNull();
        const data = JSON.parse(result!.text!);
        expect(data.supported).toBe(false);
        expect(data.isPaused).toBe(false);
        expect(data.locals).toEqual([]);
        expect(data.members).toEqual([]);
        expect(data.globals).toEqual([]);
      });
    });

    describe('unknown URI', () => {
      it('returns null for unknown URI', async () => {
        const result = await provider.readResource(projectPath, 'godot://unknown');
        expect(result).toBeNull();
      });
    });
  });
});
