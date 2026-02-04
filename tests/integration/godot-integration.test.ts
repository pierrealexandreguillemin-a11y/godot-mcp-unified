/**
 * Integration Tests with Real Godot Installation
 *
 * These tests require a working Godot installation.
 * Set GODOT_PATH environment variable before running.
 *
 * Run with: npm run test:integration
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Skip all tests if GODOT_PATH is not set
const GODOT_PATH = process.env.GODOT_PATH;
const SKIP_INTEGRATION = !GODOT_PATH || !existsSync(GODOT_PATH);

const TEST_PROJECT_PATH = join(__dirname, '../../test-project-integration');
const SCENES_PATH = join(TEST_PROJECT_PATH, 'scenes');

// Conditionally describe based on Godot availability
const describeIntegration = SKIP_INTEGRATION ? describe.skip : describe;

describeIntegration('Godot Integration Tests', () => {
  beforeAll(() => {
    // Create test project
    if (existsSync(TEST_PROJECT_PATH)) {
      rmSync(TEST_PROJECT_PATH, { recursive: true });
    }
    mkdirSync(TEST_PROJECT_PATH, { recursive: true });
    mkdirSync(SCENES_PATH, { recursive: true });

    // Create project.godot
    const projectGodot = `config_version=5

[application]
config/name="Integration Test Project"
config/features=PackedStringArray("4.5", "Forward Plus")

[rendering]
renderer/rendering_method="forward_plus"
`;
    writeFileSync(join(TEST_PROJECT_PATH, 'project.godot'), projectGodot);
  });

  afterAll(() => {
    // Cleanup test project
    if (existsSync(TEST_PROJECT_PATH)) {
      rmSync(TEST_PROJECT_PATH, { recursive: true });
    }
  });

  describe('Godot Detection', () => {
    it('should detect Godot version', async () => {
      const { detectGodotPath } = await import('../../src/core/PathManager.js');
      const path = await detectGodotPath();
      expect(path).toBeTruthy();
      expect(existsSync(path!)).toBe(true);
    });

    it('should get Godot version string', async () => {
      const { getGodotVersion } = await import('../../src/core/GodotExecutor.js');
      const version = await getGodotVersion(GODOT_PATH!);
      expect(version).toMatch(/^\d+\.\d+/);
    });
  });

  describe('TscnParser Direct Manipulation', () => {
    it('should create a valid scene file', async () => {
      const { serializeTscn, addNode } = await import('../../src/core/tscn/index.js');

      const doc = {
        header: { format: 3, uidType: 'uid', uid: 'uid://integration_test' },
        extResources: [],
        subResources: [],
        nodes: [{ name: 'TestRoot', type: 'Node2D', properties: {} }],
        connections: [],
        editableInstances: [],
      };

      addNode(doc, {
        name: 'Child',
        type: 'Sprite2D',
        parent: '.',
        properties: {},
      });

      const tscn = serializeTscn(doc);
      const scenePath = join(SCENES_PATH, 'tscn_parser_test.tscn');
      writeFileSync(scenePath, tscn);

      expect(existsSync(scenePath)).toBe(true);

      const content = readFileSync(scenePath, 'utf-8');
      expect(content).toContain('[gd_scene format=3');
      expect(content).toContain('[node name="TestRoot" type="Node2D"]');
      expect(content).toContain('[node name="Child" type="Sprite2D" parent="."]');
    });

    it('should create scene that Godot can load', async () => {
      const { serializeTscn } = await import('../../src/core/tscn/index.js');

      const doc = {
        header: { format: 3, uidType: 'uid', uid: 'uid://loadable_test' },
        extResources: [],
        subResources: [],
        nodes: [{ name: 'Root', type: 'CharacterBody2D', properties: {} }],
        connections: [],
        editableInstances: [],
      };

      const scenePath = join(SCENES_PATH, 'loadable.tscn');
      writeFileSync(scenePath, serializeTscn(doc));

      // Try to load with Godot
      const scriptPath = join(__dirname, '../../build/scripts/godot_operations.gd');
      const cmd = `"${GODOT_PATH}" --headless --path "${TEST_PROJECT_PATH}" --script "${scriptPath}" add_node "{\\"scene_path\\":\\"scenes/loadable.tscn\\",\\"parent_path\\":\\".\\",\\"node_type\\":\\"CollisionShape2D\\",\\"node_name\\":\\"TestCollision\\"}"`;

      const output = execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
      expect(output).toContain('added successfully');

      // Verify node was added
      const content = readFileSync(scenePath, 'utf-8');
      expect(content).toContain('TestCollision');
    });
  });

  describe('GDScript Operations', () => {
    it('should create scene via GDScript', () => {
      const scriptPath = join(__dirname, '../../build/scripts/godot_operations.gd');
      const cmd = `"${GODOT_PATH}" --headless --path "${TEST_PROJECT_PATH}" --script "${scriptPath}" create_scene "{\\"scene_path\\":\\"scenes/gdscript_created.tscn\\",\\"root_node_type\\":\\"Area2D\\"}"`;

      const output = execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
      expect(output).toContain('Scene created successfully');

      const scenePath = join(SCENES_PATH, 'gdscript_created.tscn');
      expect(existsSync(scenePath)).toBe(true);

      const content = readFileSync(scenePath, 'utf-8');
      expect(content).toContain('type="Area2D"');
    });

    it('should add node via GDScript', () => {
      const scriptPath = join(__dirname, '../../build/scripts/godot_operations.gd');
      const scenePath = join(SCENES_PATH, 'gdscript_created.tscn');

      const cmd = `"${GODOT_PATH}" --headless --path "${TEST_PROJECT_PATH}" --script "${scriptPath}" add_node "{\\"scene_path\\":\\"scenes/gdscript_created.tscn\\",\\"parent_path\\":\\".\\",\\"node_type\\":\\"Timer\\",\\"node_name\\":\\"MyTimer\\"}"`;

      const output = execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
      expect(output).toContain('added successfully');

      const content = readFileSync(scenePath, 'utf-8');
      expect(content).toContain('MyTimer');
      expect(content).toContain('Timer');
    });
  });

  describe('MCP Tool Integration', () => {
    it('should get project info via tool', async () => {
      const { toolRegistry } = await import('../../src/tools/ToolRegistry.js');

      const tool = toolRegistry.get('get_project_info');
      expect(tool).toBeDefined();

      const result = await tool!.handler({
        projectPath: TEST_PROJECT_PATH,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content).toBeDefined();

      const content = JSON.parse((result.content as { text: string }[])[0].text);
      expect(content.name).toBe('Integration Test Project');
      expect(content.godotVersion).toMatch(/^\d+\.\d+/);
    });

    it('should list scenes via tool', async () => {
      const { toolRegistry } = await import('../../src/tools/ToolRegistry.js');

      const tool = toolRegistry.get('list_scenes');
      expect(tool).toBeDefined();

      const result = await tool!.handler({
        projectPath: TEST_PROJECT_PATH,
      });

      expect(result.isError).toBeFalsy();

      const content = (result.content as { text: string }[])[0].text;
      expect(content).toContain('.tscn');
    });

    it('should create scene via tool', async () => {
      const { toolRegistry } = await import('../../src/tools/ToolRegistry.js');

      const tool = toolRegistry.get('create_scene');
      expect(tool).toBeDefined();

      const result = await tool!.handler({
        projectPath: TEST_PROJECT_PATH,
        scenePath: 'scenes/tool_created.tscn',
        rootType: 'RigidBody2D',
        rootName: 'PhysicsObject',
      });

      expect(result.isError).toBeFalsy();

      const scenePath = join(SCENES_PATH, 'tool_created.tscn');
      expect(existsSync(scenePath)).toBe(true);
    });
  });

  describe('ProcessPool with Godot', () => {
    it('should execute Godot via ProcessPool', async () => {
      const { getGodotPool } = await import('../../src/core/ProcessPool.js');

      const pool = getGodotPool();
      const result = await pool.execute(GODOT_PATH!, ['--version'], { timeout: 10000 });

      expect(result.stdout).toMatch(/^\d+\.\d+/);
      expect(result.exitCode).toBe(0);
    });

    it('should handle circuit breaker', async () => {
      const { getGodotPool } = await import('../../src/core/ProcessPool.js');

      const pool = getGodotPool();

      // This should succeed
      const result = await pool.execute(GODOT_PATH!, ['--version'], { timeout: 10000 });
      expect(result.exitCode).toBe(0);

      // Pool stats should show success
      const stats = pool.getStats();
      expect(stats.completedJobs).toBeGreaterThan(0);
    });
  });
});

// Export for direct execution
if (SKIP_INTEGRATION) {
  console.log('⚠️  Skipping integration tests: GODOT_PATH not set or Godot not found');
  console.log('   Set GODOT_PATH environment variable to run integration tests');
}
