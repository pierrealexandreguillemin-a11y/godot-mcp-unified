/**
 * MCP Resources Handler
 * Exposes Godot project files as MCP resources
 *
 * @see https://modelcontextprotocol.io/docs/concepts/resources
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import { isGodotProject } from '../utils/FileUtils';

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

/**
 * Get MIME type for Godot files
 */
const getMimeType = (filePath: string): string => {
  const ext = extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.gd': 'text/x-gdscript',
    '.tscn': 'text/x-godot-scene',
    '.tres': 'text/x-godot-resource',
    '.godot': 'text/x-godot-project',
    '.cfg': 'text/plain',
    '.json': 'application/json',
    '.md': 'text/markdown',
    '.txt': 'text/plain',
    '.shader': 'text/x-godot-shader',
    '.gdshader': 'text/x-godot-shader',
    '.import': 'text/plain',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

/**
 * List all resources in a Godot project
 */
export const listGodotResources = (projectPath: string): MCPResource[] => {
  if (!existsSync(projectPath) || !isGodotProject(projectPath)) {
    return [];
  }

  const resources: MCPResource[] = [];
  const extensions = ['.gd', '.tscn', '.tres', '.godot', '.gdshader', '.shader'];

  const scanDirectory = (dir: string, depth: number = 0): void => {
    if (depth > 5) return; // Limit recursion depth

    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (entry.startsWith('.') || entry === 'addons' || entry === '.godot') {
          continue;
        }

        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath, depth + 1);
        } else if (extensions.includes(extname(entry).toLowerCase())) {
          const relativePath = relative(projectPath, fullPath).replace(/\\/g, '/');
          const uri = `godot://${relativePath}`;

          resources.push({
            uri,
            name: entry,
            description: `Godot ${extname(entry).slice(1).toUpperCase()} file`,
            mimeType: getMimeType(fullPath),
          });
        }
      }
    } catch {
      // Ignore permission errors
    }
  };

  // Add project.godot as main resource
  resources.push({
    uri: 'godot://project.godot',
    name: 'project.godot',
    description: 'Godot project configuration file',
    mimeType: 'text/x-godot-project',
  });

  scanDirectory(projectPath);
  return resources;
};

/**
 * Read a resource by URI
 */
export const readGodotResource = (
  projectPath: string,
  uri: string
): ResourceContent | null => {
  if (!uri.startsWith('godot://')) {
    return null;
  }

  const relativePath = uri.replace('godot://', '');
  const fullPath = join(projectPath, relativePath);

  if (!existsSync(fullPath)) {
    return null;
  }

  try {
    const content = readFileSync(fullPath, 'utf-8');
    return {
      uri,
      mimeType: getMimeType(fullPath),
      text: content,
    };
  } catch {
    return null;
  }
};

/**
 * Get resource templates (common Godot patterns)
 */
export const getResourceTemplates = (): MCPResource[] => {
  return [
    {
      uri: 'godot-template://character-controller',
      name: 'Character Controller Template',
      description: 'Basic CharacterBody2D movement script',
      mimeType: 'text/x-gdscript',
    },
    {
      uri: 'godot-template://state-machine',
      name: 'State Machine Template',
      description: 'Generic state machine pattern for GDScript',
      mimeType: 'text/x-gdscript',
    },
    {
      uri: 'godot-template://singleton-autoload',
      name: 'Singleton Autoload Template',
      description: 'Global singleton pattern for autoloads',
      mimeType: 'text/x-gdscript',
    },
  ];
};

/**
 * Get template content by URI
 */
export const getTemplateContent = (uri: string): ResourceContent | null => {
  const templates: Record<string, string> = {
    'godot-template://character-controller': `extends CharacterBody2D

@export var speed: float = 200.0
@export var jump_velocity: float = -300.0

var gravity: float = ProjectSettings.get_setting("physics/2d/default_gravity")

func _physics_process(delta: float) -> void:
    # Gravity
    if not is_on_floor():
        velocity.y += gravity * delta

    # Jump
    if Input.is_action_just_pressed("ui_accept") and is_on_floor():
        velocity.y = jump_velocity

    # Movement
    var direction := Input.get_axis("ui_left", "ui_right")
    if direction:
        velocity.x = direction * speed
    else:
        velocity.x = move_toward(velocity.x, 0, speed)

    move_and_slide()
`,
    'godot-template://state-machine': `extends Node
class_name StateMachine

signal state_changed(old_state: StringName, new_state: StringName)

@export var initial_state: State

var current_state: State
var states: Dictionary = {}

func _ready() -> void:
    for child in get_children():
        if child is State:
            states[child.name] = child
            child.state_machine = self

    if initial_state:
        current_state = initial_state
        current_state.enter()

func _process(delta: float) -> void:
    if current_state:
        current_state.update(delta)

func _physics_process(delta: float) -> void:
    if current_state:
        current_state.physics_update(delta)

func change_state(new_state_name: StringName) -> void:
    if not states.has(new_state_name):
        push_error("State not found: " + new_state_name)
        return

    var old_state_name := current_state.name if current_state else &""
    if current_state:
        current_state.exit()

    current_state = states[new_state_name]
    current_state.enter()
    state_changed.emit(old_state_name, new_state_name)
`,
    'godot-template://singleton-autoload': `extends Node

## Global game manager singleton
## Add to Project > Project Settings > Autoload

signal game_started
signal game_paused(is_paused: bool)
signal game_over

var score: int = 0
var is_paused: bool = false

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS

func start_game() -> void:
    score = 0
    is_paused = false
    game_started.emit()

func toggle_pause() -> void:
    is_paused = !is_paused
    get_tree().paused = is_paused
    game_paused.emit(is_paused)

func end_game() -> void:
    game_over.emit()

func add_score(points: int) -> void:
    score += points
`,
  };

  if (!templates[uri]) {
    return null;
  }

  return {
    uri,
    mimeType: 'text/x-gdscript',
    text: templates[uri],
  };
};
