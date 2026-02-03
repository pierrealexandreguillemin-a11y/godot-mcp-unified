/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.test.json',
        diagnostics: {
          ignoreDiagnostics: [1343, 1378],
        },
      },
    ],
  },
  testMatch: ['**/src/**/*.test.ts', '**/src/**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/test/**',
    '!src/index.ts',
    // Exclude tools requiring Godot runtime
    '!src/tools/debug/**',
    '!src/tools/system/**',
    '!src/tools/uid/**',
    '!src/tools/capture/**',
    '!src/tools/project/ConvertProjectTool.ts',
    '!src/tools/project/ExportProjectTool.ts',
    '!src/tools/project/ExportPackTool.ts',
    '!src/tools/project/GenerateDocsTool.ts',
    '!src/tools/project/LaunchEditorTool.ts',
    '!src/tools/project/RunProjectTool.ts',
    '!src/tools/project/ValidateConversionTool.ts',
    '!src/tools/project/ValidateProjectTool.ts',
    '!src/tools/script/GetScriptErrorsTool.ts',
    '!src/tools/scene/ExportMeshLibraryTool.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 40,
      lines: 40,
      statements: 40,
    },
  },
  verbose: true,
  testTimeout: 10000,
};
