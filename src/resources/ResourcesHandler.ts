/**
 * MCP Resources Handler
 * Central manager for all Godot MCP resources
 *
 * Implements 20 resources across 4 groups:
 * - Project (5): info, settings, sections, export presets, version
 * - Scene/Script (6): scenes, scene content, tree, scripts, script content, errors
 * - Assets (4): all assets, by category, resources, UIDs
 * - Debug (5): output, stream, breakpoints, stack, variables
 *
 * @see https://modelcontextprotocol.io/docs/concepts/resources
 */

import { ResourceProvider, GodotResource, ResourceContent, getMimeType } from './types.js';
import {
  ProjectResourceProvider,
  SceneScriptResourceProvider,
  AssetsResourceProvider,
  DebugResourceProvider,
} from './providers/index.js';
import { logError } from '../utils/Logger.js';

// Initialize all resource providers
const providers: ResourceProvider[] = [
  new ProjectResourceProvider(),
  new SceneScriptResourceProvider(),
  new AssetsResourceProvider(),
  new DebugResourceProvider(),
];

/**
 * List all available resources for a project
 */
export const listGodotResources = async (projectPath: string): Promise<GodotResource[]> => {
  const allResources: GodotResource[] = [];

  for (const provider of providers) {
    try {
      const resources = await provider.listResources(projectPath);
      allResources.push(...resources);
    } catch (error) {
      logError(`[Resources] Error listing from ${provider.prefix}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return allResources;
};

/**
 * Read a specific resource by URI
 */
export const readGodotResource = async (
  projectPath: string,
  uri: string
): Promise<ResourceContent | null> => {
  // Find the provider that handles this URI
  for (const provider of providers) {
    if (provider.handlesUri(uri)) {
      try {
        return await provider.readResource(projectPath, uri);
      } catch (error) {
        logError(`[Resources] Error reading ${uri}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return null;
      }
    }
  }

  return null;
};

/**
 * Get resource templates (common Godot code patterns)
 */
export const getResourceTemplates = (): GodotResource[] => {
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
    if not is_on_floor():
        velocity.y += gravity * delta
    if Input.is_action_just_pressed("ui_accept") and is_on_floor():
        velocity.y = jump_velocity
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

// Re-export types for backward compatibility
export type { GodotResource, ResourceContent };
export { getMimeType };
