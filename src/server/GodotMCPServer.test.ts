/**
 * GodotMCPServer Tests
 * ISO/IEC 29119 compliant test structure
 *
 * Test categories:
 * - Server instantiation
 * - Basic structure
 *
 * Note: Full integration tests require complex ESM mocking.
 * These tests verify the basic structure and exports.
 */

import { GodotMCPServer } from './GodotMCPServer.js';

describe('GodotMCPServer', () => {
  // ==========================================================================
  // INSTANTIATION
  // ==========================================================================
  describe('instantiation', () => {
    it('can be instantiated', () => {
      const server = new GodotMCPServer();
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(GodotMCPServer);
    });

    it('has start method', () => {
      const server = new GodotMCPServer();
      expect(typeof server.start).toBe('function');
    });

    it('has stop method', () => {
      const server = new GodotMCPServer();
      expect(typeof server.stop).toBe('function');
    });
  });

  // ==========================================================================
  // EXPORTS
  // ==========================================================================
  describe('exports', () => {
    it('exports GodotMCPServer class', async () => {
      const module = await import('./GodotMCPServer.js');
      expect(module.GodotMCPServer).toBeDefined();
    });
  });
});
