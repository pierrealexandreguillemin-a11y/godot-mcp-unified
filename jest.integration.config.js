/**
 * Jest Configuration for Integration Tests
 *
 * Requires GODOT_PATH environment variable to be set.
 * Run with: npm run test:integration
 */

export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testMatch: ['**/tests/integration/**/*.test.ts'],
  testTimeout: 60000, // 60 seconds for Godot operations
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  // Don't run in parallel - Godot processes can conflict
  maxWorkers: 1,
};
