/**
 * MCP Prompts Handler
 * Pre-defined prompt templates for common Godot tasks
 *
 * @see https://modelcontextprotocol.io/docs/concepts/prompts
 */

import {
  Prompt,
  PromptArgument,
  PromptMessage,
  GetPromptResult,
} from '@modelcontextprotocol/sdk/types.js';

export type MCPPrompt = Prompt;
export type MCPPromptArgument = PromptArgument;
export type MCPPromptMessage = PromptMessage;
export type MCPPromptResult = GetPromptResult;

/**
 * All available prompts
 */
export const godotPrompts: MCPPrompt[] = [
  {
    name: 'create_character_controller',
    description: 'Generate a character controller script for 2D or 3D movement',
    arguments: [
      {
        name: 'type',
        description: '2D or 3D character type',
        required: true,
      },
      {
        name: 'features',
        description: 'Comma-separated features: jump, dash, crouch, climb',
        required: false,
      },
    ],
  },
  {
    name: 'create_enemy_ai',
    description: 'Generate an enemy AI script with customizable behavior',
    arguments: [
      {
        name: 'behavior',
        description: 'AI behavior type: patrol, chase, flee, boss',
        required: true,
      },
      {
        name: 'type',
        description: '2D or 3D enemy type',
        required: false,
      },
    ],
  },
  {
    name: 'analyze_project',
    description: 'Analyze a Godot project and suggest improvements',
    arguments: [
      {
        name: 'projectPath',
        description: 'Path to the Godot project',
        required: true,
      },
      {
        name: 'focus',
        description: 'Focus area: performance, architecture, code-quality',
        required: false,
      },
    ],
  },
  {
    name: 'debug_script',
    description: 'Help debug a GDScript file with errors',
    arguments: [
      {
        name: 'scriptPath',
        description: 'Path to the script with errors',
        required: true,
      },
      {
        name: 'errorMessage',
        description: 'The error message from Godot',
        required: false,
      },
    ],
  },
  {
    name: 'create_ui_component',
    description: 'Generate a UI component with proper theming',
    arguments: [
      {
        name: 'componentType',
        description: 'Type: menu, hud, dialog, inventory, settings',
        required: true,
      },
      {
        name: 'style',
        description: 'Visual style: minimal, fantasy, sci-fi, pixel',
        required: false,
      },
    ],
  },
  {
    name: 'setup_multiplayer',
    description: 'Generate multiplayer networking boilerplate',
    arguments: [
      {
        name: 'architecture',
        description: 'Network architecture: client-server, p2p',
        required: true,
      },
      {
        name: 'features',
        description: 'Features: sync, rpc, lobby, matchmaking',
        required: false,
      },
    ],
  },
  {
    name: 'create_shader',
    description: 'Generate a Godot shader for visual effects',
    arguments: [
      {
        name: 'effect',
        description: 'Effect type: outline, dissolve, water, fire, glow',
        required: true,
      },
      {
        name: 'target',
        description: 'Target: canvas_item, spatial, particles',
        required: false,
      },
    ],
  },
  {
    name: 'optimize_scene',
    description: 'Analyze and optimize a scene for performance',
    arguments: [
      {
        name: 'scenePath',
        description: 'Path to the scene file',
        required: true,
      },
    ],
  },
  {
    name: 'scaffold_platformer',
    description: 'Generate a complete 2D platformer project structure',
    arguments: [
      {
        name: 'projectName',
        description: 'Name of the platformer project',
        required: true,
      },
      {
        name: 'features',
        description: 'Features: parallax, enemies, collectibles, checkpoints',
        required: false,
      },
    ],
  },
  {
    name: 'scaffold_topdown',
    description: 'Generate a top-down RPG project structure',
    arguments: [
      {
        name: 'projectName',
        description: 'Name of the RPG project',
        required: true,
      },
      {
        name: 'features',
        description: 'Features: inventory, dialogue, quests, combat',
        required: false,
      },
    ],
  },
  {
    name: 'scaffold_fps',
    description: 'Generate a 3D first-person shooter project structure',
    arguments: [
      {
        name: 'projectName',
        description: 'Name of the FPS project',
        required: true,
      },
      {
        name: 'features',
        description: 'Features: weapons, enemies, pickups, multiplayer',
        required: false,
      },
    ],
  },
  {
    name: 'scaffold_puzzle',
    description: 'Generate a puzzle game project structure',
    arguments: [
      {
        name: 'projectName',
        description: 'Name of the puzzle project',
        required: true,
      },
      {
        name: 'puzzleType',
        description: 'Type: match3, sokoban, physics, logic',
        required: false,
      },
    ],
  },
  {
    name: 'create_npc',
    description: 'Generate an interactive NPC with dialogue and behavior',
    arguments: [
      {
        name: 'npcType',
        description: 'Type: shopkeeper, quest_giver, villager, guard',
        required: true,
      },
      {
        name: 'is3D',
        description: 'true for 3D, false for 2D',
        required: false,
      },
    ],
  },
  {
    name: 'create_collectible',
    description: 'Generate a collectible item with pickup mechanics',
    arguments: [
      {
        name: 'itemType',
        description: 'Type: coin, health, powerup, key, ammo',
        required: true,
      },
      {
        name: 'is3D',
        description: 'true for 3D, false for 2D',
        required: false,
      },
    ],
  },
  {
    name: 'debug_physics',
    description: 'Diagnose and fix physics-related issues in a scene',
    arguments: [
      {
        name: 'scenePath',
        description: 'Path to the scene with physics issues',
        required: true,
      },
      {
        name: 'issue',
        description: 'Issue type: collision, jitter, tunneling, performance',
        required: false,
      },
    ],
  },
  {
    name: 'create_projectile',
    description: 'Generate a projectile scene with physics and damage',
    arguments: [
      {
        name: 'projectileType',
        description: 'Type: bullet, rocket, arrow, magic, grenade',
        required: true,
      },
      {
        name: 'is3D',
        description: 'true for 3D, false for 2D',
        required: false,
      },
    ],
  },
  {
    name: 'scaffold_ui_system',
    description: 'Generate a complete UI system with menus, HUD, and transitions',
    arguments: [
      {
        name: 'projectName',
        description: 'Name of the project',
        required: true,
      },
      {
        name: 'components',
        description: 'Components: main_menu, pause_menu, hud, settings, loading',
        required: false,
      },
    ],
  },
  {
    name: 'debug_performance',
    description: 'Analyze scene performance and identify bottlenecks',
    arguments: [
      {
        name: 'scenePath',
        description: 'Path to the scene to analyze',
        required: true,
      },
      {
        name: 'focus',
        description: 'Focus: draw_calls, physics, scripts, memory',
        required: false,
      },
    ],
  },
  {
    name: 'convert_3to4',
    description: 'Guide migration from Godot 3.x to Godot 4.x',
    arguments: [
      {
        name: 'projectPath',
        description: 'Path to the Godot 3.x project',
        required: true,
      },
      {
        name: 'focus',
        description: 'Focus: gdscript, scenes, shaders, all',
        required: false,
      },
    ],
  },
  {
    name: 'refactor_scene',
    description: 'Refactor scene structure and extract subscenes',
    arguments: [
      {
        name: 'scenePath',
        description: 'Path to the scene to refactor',
        required: true,
      },
      {
        name: 'action',
        description: 'Action: extract_subscene, flatten, reorganize, optimize',
        required: false,
      },
    ],
  },
];

/**
 * Get all prompts
 */
export const getAllPrompts = (): MCPPrompt[] => {
  return godotPrompts;
};

/**
 * Get a prompt by name
 */
export const getPromptByName = (name: string): MCPPrompt | undefined => {
  return godotPrompts.find((p) => p.name === name);
};

/**
 * Generate prompt messages from template
 */
export const generatePromptMessages = (
  promptName: string,
  args: Record<string, string>
): MCPPromptResult | null => {
  const promptGenerators: Record<string, (args: Record<string, string>) => MCPPromptResult> = {
    create_character_controller: (a) => ({
      description: `Create a ${a.type || '2D'} character controller`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a ${a.type || '2D'} character controller script for Godot 4.x with the following features: ${a.features || 'basic movement, jump'}.

Requirements:
- Use typed GDScript with proper type hints
- Include @export variables for customization
- Add comments explaining the code
- Follow Godot best practices
- Use move_and_slide() for physics
${a.type === '3D' ? '- Include camera handling' : '- Support for animations via AnimationPlayer'}

Please provide the complete GDScript code.`,
          },
        },
      ],
    }),

    create_enemy_ai: (a) => ({
      description: `Create ${a.behavior} enemy AI`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a ${a.type || '2D'} enemy AI script for Godot 4.x with ${a.behavior} behavior.

Requirements:
- Use a state machine pattern
- Include detection range with Area${a.type === '3D' ? '3D' : '2D'}
- Add @export variables for speed, detection range, etc.
- Include proper signal handling
- Add debug visualization option
- Follow Godot 4.x best practices

Behavior details for "${a.behavior}":
${a.behavior === 'patrol' ? '- Move between waypoints\n- Pause at each point\n- Detect player in range' : ''}
${a.behavior === 'chase' ? '- Follow player when detected\n- Return to patrol when lost\n- Attack when in range' : ''}
${a.behavior === 'flee' ? '- Run away from player\n- Find cover points\n- Alert other enemies' : ''}
${a.behavior === 'boss' ? '- Multiple attack patterns\n- Phase transitions\n- Telegraphed attacks' : ''}

Please provide the complete GDScript code.`,
          },
        },
      ],
    }),

    analyze_project: (a) => ({
      description: `Analyze Godot project at ${a.projectPath}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analyze the Godot project at "${a.projectPath}" and provide recommendations.

Focus area: ${a.focus || 'general'}

Please:
1. Use list_scripts to examine all GDScript files
2. Use list_scenes to review scene structure
3. Use get_project_settings to check configuration
4. Use get_script_errors to find any issues

Provide a detailed analysis covering:
- Project structure and organization
- Code quality and patterns used
- ${a.focus === 'performance' ? 'Performance bottlenecks and optimization opportunities' : ''}
- ${a.focus === 'architecture' ? 'Architecture patterns and improvements' : ''}
- ${a.focus === 'code-quality' ? 'Code style, naming conventions, and best practices' : ''}
- Specific recommendations with code examples`,
          },
        },
      ],
    }),

    debug_script: (a) => ({
      description: `Debug script ${a.scriptPath}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Help me debug the GDScript file at "${a.scriptPath}".

${a.errorMessage ? `Error message: ${a.errorMessage}` : 'Please check for any errors using get_script_errors.'}

Please:
1. Use read_script to examine the code
2. Use get_script_errors to get detailed error information
3. Identify the root cause of the issue
4. Provide a corrected version of the code
5. Explain what was wrong and how to avoid it in the future`,
          },
        },
      ],
    }),

    create_ui_component: (a) => ({
      description: `Create ${a.componentType} UI component`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a ${a.componentType} UI component for Godot 4.x with ${a.style || 'minimal'} style.

Requirements:
- Create both the scene (.tscn) and script (.gd)
- Use Control nodes and proper anchoring
- Include theme overrides for customization
- Add accessibility features (focus, navigation)
- Include animations for transitions
- Follow Godot UI best practices

Component type "${a.componentType}" should include:
${a.componentType === 'menu' ? '- Main menu with buttons\n- Settings submenu\n- Quit confirmation' : ''}
${a.componentType === 'hud' ? '- Health bar\n- Score display\n- Mini-map placeholder\n- Responsive layout' : ''}
${a.componentType === 'dialog' ? '- Text display with typewriter effect\n- Character portrait\n- Choice buttons\n- Skip functionality' : ''}
${a.componentType === 'inventory' ? '- Grid-based item slots\n- Drag and drop support\n- Item tooltips\n- Category filters' : ''}
${a.componentType === 'settings' ? '- Audio sliders\n- Graphics options\n- Key rebinding\n- Save/Load settings' : ''}

Please provide both the scene structure and the GDScript code.`,
          },
        },
      ],
    }),

    setup_multiplayer: (a) => ({
      description: `Setup ${a.architecture} multiplayer`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Set up multiplayer networking for Godot 4.x using ${a.architecture} architecture.

Features to include: ${a.features || 'sync, rpc'}

Requirements:
- Use Godot's built-in MultiplayerAPI
- Create autoload for network management
- Handle connection/disconnection gracefully
- Include error handling and timeouts
- Add debug logging

Please provide:
1. Network manager autoload script
2. Player synchronization script
3. Example RPC calls
4. Connection flow (host/join)
${a.features?.includes('lobby') ? '5. Lobby management system' : ''}
${a.features?.includes('matchmaking') ? '6. Simple matchmaking logic' : ''}`,
          },
        },
      ],
    }),

    create_shader: (a) => ({
      description: `Create ${a.effect} shader`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a Godot 4.x shader for "${a.effect}" effect.

Shader type: ${a.target || 'canvas_item'}

Requirements:
- Well-commented code explaining each section
- Uniform variables for customization
- Optimized for performance
- Include usage instructions

Effect "${a.effect}" should:
${a.effect === 'outline' ? '- Draw outline around sprite\n- Customizable color and width\n- Work with transparent sprites' : ''}
${a.effect === 'dissolve' ? '- Dissolve effect with noise\n- Customizable edge color\n- Animated threshold' : ''}
${a.effect === 'water' ? '- Animated waves\n- Reflection/refraction\n- Foam at edges' : ''}
${a.effect === 'fire' ? '- Animated flames\n- Color gradient\n- Particle-like appearance' : ''}
${a.effect === 'glow' ? '- Bloom effect\n- Pulsating animation\n- Color customization' : ''}

Please provide the complete .gdshader code.`,
          },
        },
      ],
    }),

    optimize_scene: (a) => ({
      description: `Optimize scene ${a.scenePath}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analyze and optimize the scene at "${a.scenePath}" for better performance.

Please:
1. Use get_node_tree to examine the scene structure
2. Identify performance issues:
   - Deep node hierarchies
   - Unnecessary nodes
   - Missing culling
   - Heavy scripts on many nodes
3. Check for:
   - Proper use of CanvasGroup for batching
   - Visibility culling setup
   - Physics layer optimization
   - Signal connections efficiency
4. Provide specific optimization recommendations
5. Show before/after structure if changes are needed`,
          },
        },
      ],
    }),

    scaffold_platformer: (a) => ({
      description: `Scaffold 2D platformer: ${a.projectName}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a complete 2D platformer project structure for "${a.projectName}".

Features to include: ${a.features || 'parallax, enemies, collectibles'}

Please create:
1. **Project Structure**
   - res://scenes/
     - main.tscn (main menu)
     - game.tscn (game world)
     - player/player.tscn
     - enemies/ (enemy scenes)
     - ui/ (HUD, pause menu)
   - res://scripts/
     - player/
     - enemies/
     - managers/
   - res://assets/ (placeholder structure)

2. **Core Systems**
   - Player controller with move_and_slide()
   - Camera follow with smoothing
   - Game manager autoload
   - Level transition system

3. **Gameplay Elements**
${a.features?.includes('parallax') ? '   - Parallax background layers' : ''}
${a.features?.includes('enemies') ? '   - Basic enemy with patrol AI' : ''}
${a.features?.includes('collectibles') ? '   - Collectible coins with counter' : ''}
${a.features?.includes('checkpoints') ? '   - Checkpoint save system' : ''}

Use tools: create_scene, add_node, write_script, attach_script, connect_signal`,
          },
        },
      ],
    }),

    scaffold_topdown: (a) => ({
      description: `Scaffold top-down RPG: ${a.projectName}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a complete top-down RPG project structure for "${a.projectName}".

Features to include: ${a.features || 'inventory, dialogue, combat'}

Please create:
1. **Project Structure**
   - res://scenes/
     - main_menu.tscn
     - world.tscn
     - player/player.tscn
     - npcs/
     - ui/
   - res://scripts/
     - player/
     - npc/
     - systems/
   - res://data/ (JSON/Resource data)

2. **Core Systems**
   - 8-directional movement
   - Camera with smooth follow
   - Game state manager
   - Save/Load system

3. **RPG Features**
${a.features?.includes('inventory') ? '   - Inventory system with slots\n   - Item pickup and use' : ''}
${a.features?.includes('dialogue') ? '   - Dialogue box with choices\n   - NPC interaction system' : ''}
${a.features?.includes('quests') ? '   - Quest tracking system\n   - Quest log UI' : ''}
${a.features?.includes('combat') ? '   - Turn-based or action combat\n   - Health/damage system' : ''}

Use tools: create_scene, add_node, write_script, create_resource`,
          },
        },
      ],
    }),

    scaffold_fps: (a) => ({
      description: `Scaffold 3D FPS: ${a.projectName}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a complete 3D first-person shooter project structure for "${a.projectName}".

Features to include: ${a.features || 'weapons, enemies, pickups'}

Please create:
1. **Project Structure**
   - res://scenes/
     - main_menu.tscn
     - levels/
     - player/fps_player.tscn
     - weapons/
     - enemies/
     - ui/
   - res://scripts/
     - player/
     - weapons/
     - enemies/
     - managers/

2. **Core Systems**
   - FPS controller (CharacterBody3D)
   - Mouse look with sensitivity
   - Weapon manager
   - Health system

3. **FPS Features**
${a.features?.includes('weapons') ? '   - Weapon switching system\n   - Shooting with raycasts\n   - Recoil and spread' : ''}
${a.features?.includes('enemies') ? '   - Enemy AI with NavMesh\n   - Damage and death' : ''}
${a.features?.includes('pickups') ? '   - Ammo and health pickups\n   - Weapon pickups' : ''}
${a.features?.includes('multiplayer') ? '   - Multiplayer spawning\n   - Network sync' : ''}

Use tools: create_scene, add_node, write_script, setup_rigidbody, create_navigation_region`,
          },
        },
      ],
    }),

    scaffold_puzzle: (a) => ({
      description: `Scaffold puzzle game: ${a.projectName}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a complete puzzle game project structure for "${a.projectName}".

Puzzle type: ${a.puzzleType || 'logic'}

Please create:
1. **Project Structure**
   - res://scenes/
     - main_menu.tscn
     - level_select.tscn
     - levels/
     - ui/
   - res://scripts/
     - puzzle/
     - managers/
   - res://data/levels/

2. **Core Systems**
   - Level loader
   - Progress tracker
   - Undo/Redo system
   - Win condition checker

3. **Puzzle-Specific Features**
${a.puzzleType === 'match3' ? '   - Grid-based matching\n   - Tile swapping\n   - Cascade detection\n   - Score system' : ''}
${a.puzzleType === 'sokoban' ? '   - Push mechanics\n   - Goal detection\n   - Move counter\n   - Reset level' : ''}
${a.puzzleType === 'physics' ? '   - Physics-based interactions\n   - Object spawning\n   - Goal triggers' : ''}
${a.puzzleType === 'logic' || !a.puzzleType ? '   - State-based puzzles\n   - Interactive elements\n   - Hint system' : ''}

Use tools: create_scene, add_node, write_script, create_tilemap_layer`,
          },
        },
      ],
    }),

    create_npc: (a) => ({
      description: `Create ${a.npcType} NPC`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create an interactive ${a.npcType} NPC for Godot 4.x (${a.is3D === 'true' ? '3D' : '2D'}).

Please create:
1. **NPC Scene Structure**
   - ${a.is3D === 'true' ? 'CharacterBody3D' : 'CharacterBody2D'} root
   - ${a.is3D === 'true' ? 'CollisionShape3D' : 'CollisionShape2D'}
   - ${a.is3D === 'true' ? 'MeshInstance3D' : 'Sprite2D'} for visuals
   - ${a.is3D === 'true' ? 'Area3D' : 'Area2D'} for interaction detection
   - Label for name display

2. **NPC Script with**
   - Interaction detection (player in range)
   - Dialogue trigger
   - @export variables for customization
   - State machine (idle, talking, busy)

3. **Behavior for "${a.npcType}"**
${a.npcType === 'shopkeeper' ? '   - Shop inventory display\n   - Buy/sell transactions\n   - Price display\n   - Currency check' : ''}
${a.npcType === 'quest_giver' ? '   - Quest offering\n   - Quest status check\n   - Reward giving\n   - Multiple quest support' : ''}
${a.npcType === 'villager' ? '   - Random idle dialogue\n   - Day/night schedule\n   - Wander behavior' : ''}
${a.npcType === 'guard' ? '   - Patrol route\n   - Player detection\n   - Alert state\n   - Block passage' : ''}

4. **Signals**
   - interaction_started
   - interaction_ended
   - dialogue_finished

Use tools: create_scene, add_node, write_script, attach_script, connect_signal`,
          },
        },
      ],
    }),

    create_collectible: (a) => ({
      description: `Create ${a.itemType} collectible`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a ${a.itemType} collectible item for Godot 4.x (${a.is3D === 'true' ? '3D' : '2D'}).

Please create:
1. **Collectible Scene Structure**
   - ${a.is3D === 'true' ? 'Area3D' : 'Area2D'} root (for overlap detection)
   - ${a.is3D === 'true' ? 'CollisionShape3D' : 'CollisionShape2D'}
   - ${a.is3D === 'true' ? 'MeshInstance3D' : 'Sprite2D'} for visuals
   - AnimationPlayer for effects

2. **Visual Effects**
   - Floating/bobbing animation
   - Rotation (for 3D)
   - Sparkle particles
   - Collection animation

3. **Collectible Script**
   - @export value (amount, type)
   - On body entered → collect
   - Play collection effect
   - Queue free after delay

4. **Item-Specific Behavior**
${a.itemType === 'coin' ? '   - Add to score/currency\n   - Coin sound effect\n   - Value display' : ''}
${a.itemType === 'health' ? '   - Heal player\n   - Heal amount variable\n   - Only collect if not full' : ''}
${a.itemType === 'powerup' ? '   - Temporary effect\n   - Duration timer\n   - Effect indicator' : ''}
${a.itemType === 'key' ? '   - Add to inventory\n   - Unique key ID\n   - Check for door unlock' : ''}
${a.itemType === 'ammo' ? '   - Add to weapon ammo\n   - Ammo type selection\n   - Max ammo check' : ''}

5. **Signals**
   - collected(collector, value)

Use tools: create_scene, add_node, write_script, create_gpu_particles`,
          },
        },
      ],
    }),

    debug_physics: (a) => ({
      description: `Debug physics in ${a.scenePath}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Diagnose and fix physics issues in the scene at "${a.scenePath}".

Issue type: ${a.issue || 'general'}

Please analyze:
1. **Scene Structure**
   - Use get_node_tree to find all physics bodies
   - Check collision shapes
   - Review collision layers and masks

2. **Common Issues to Check**
${a.issue === 'collision' || !a.issue ? `   - Missing collision shapes
   - Incorrect collision layer/mask setup
   - Overlapping static bodies
   - One-way collision issues` : ''}
${a.issue === 'jitter' ? `   - Floating point precision issues
   - Conflicting physics forces
   - Incorrect position updates
   - Camera interpolation problems` : ''}
${a.issue === 'tunneling' ? `   - High velocity objects
   - Thin collision shapes
   - CCD (continuous collision) settings
   - Physics tick rate` : ''}
${a.issue === 'performance' ? `   - Too many physics bodies
   - Complex collision shapes
   - Unnecessary physics processing
   - Sleep mode configuration` : ''}

3. **Debugging Tools to Use**
   - get_project_settings for physics config
   - Suggest enabling Debug > Visible Collision Shapes
   - Check physics/2d or physics/3d settings

4. **Provide Solutions**
   - Specific fixes for identified issues
   - Code examples for corrections
   - Project settings recommendations
   - Best practices for Godot physics

Use tools: get_project_settings, get_node_tree, set_project_setting`,
          },
        },
      ],
    }),

    create_projectile: (a) => ({
      description: `Create ${a.projectileType} projectile`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a ${a.projectileType} projectile for Godot 4.x (${a.is3D === 'true' ? '3D' : '2D'}).

Please create:
1. **Projectile Scene Structure**
   - ${a.is3D === 'true' ? 'Area3D' : 'Area2D'} or ${a.is3D === 'true' ? 'RigidBody3D' : 'RigidBody2D'} root
   - ${a.is3D === 'true' ? 'CollisionShape3D' : 'CollisionShape2D'}
   - ${a.is3D === 'true' ? 'MeshInstance3D' : 'Sprite2D'} for visuals
   - ${a.is3D === 'true' ? 'GPUParticles3D' : 'GPUParticles2D'} for trail

2. **Projectile Script**
   - @export speed, damage, lifetime
   - Movement in _physics_process
   - Collision detection
   - Damage application on hit
   - Auto-destroy after lifetime

3. **Projectile-Specific Behavior**
${a.projectileType === 'bullet' ? '   - Fast, straight trajectory\n   - Hitscan or physics-based\n   - Impact particles' : ''}
${a.projectileType === 'rocket' ? '   - Slower with area damage\n   - Explosion on impact\n   - Smoke trail' : ''}
${a.projectileType === 'arrow' ? '   - Arc trajectory (gravity)\n   - Stick on impact\n   - Quiver system' : ''}
${a.projectileType === 'magic' ? '   - Homing capability\n   - Particle effects\n   - Mana cost integration' : ''}
${a.projectileType === 'grenade' ? '   - Throw arc with physics\n   - Timed explosion\n   - Bounce behavior' : ''}

4. **Signals**
   - hit(target, damage)
   - expired()

Use tools: create_scene, add_node, write_script, setup_rigidbody, create_gpu_particles`,
          },
        },
      ],
    }),

    scaffold_ui_system: (a) => ({
      description: `Scaffold UI system: ${a.projectName}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a complete UI system for "${a.projectName}".

Components to include: ${a.components || 'main_menu, pause_menu, hud, settings'}

Please create:
1. **UI Structure**
   - res://scenes/ui/
     - main_menu.tscn
     - pause_menu.tscn
     - hud.tscn
     - settings_menu.tscn
     - loading_screen.tscn
   - res://scripts/ui/
     - UIManager.gd (autoload)
     - BaseMenu.gd (base class)

2. **UI Manager Autoload**
   - Scene stack for navigation
   - Transition animations
   - Input mode switching
   - Pause handling

3. **Components**
${a.components?.includes('main_menu') ? '   - Main menu with Play, Settings, Quit\n   - Button hover/click effects\n   - Background animation' : ''}
${a.components?.includes('pause_menu') ? '   - Pause overlay with blur\n   - Resume, Settings, Main Menu\n   - Time scale handling' : ''}
${a.components?.includes('hud') ? '   - Health/mana bars\n   - Score/currency display\n   - Minimap placeholder\n   - Responsive anchoring' : ''}
${a.components?.includes('settings') ? '   - Audio volume sliders\n   - Graphics quality options\n   - Key rebinding\n   - Settings persistence' : ''}
${a.components?.includes('loading') ? '   - Progress bar\n   - Loading tips\n   - Async scene loading' : ''}

4. **Theme System**
   - Base theme resource
   - Consistent styling
   - Font configuration

Use tools: create_scene, add_node, write_script, create_ui_container, create_control`,
          },
        },
      ],
    }),

    debug_performance: (a) => ({
      description: `Debug performance: ${a.scenePath}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analyze performance of the scene at "${a.scenePath}".

Focus area: ${a.focus || 'all'}

Please analyze:
1. **Scene Structure Analysis**
   - Use get_node_tree to map all nodes
   - Count nodes by type
   - Identify deep hierarchies (>10 levels)

2. **Performance Metrics to Check**
${a.focus === 'draw_calls' || !a.focus ? `   - Draw call count (batch breaking)
   - Material/shader variety
   - Texture atlas usage
   - CanvasGroup for 2D batching` : ''}
${a.focus === 'physics' || !a.focus ? `   - Physics body count
   - Collision shape complexity
   - Physics tick rate
   - Sleeping body ratio` : ''}
${a.focus === 'scripts' || !a.focus ? `   - Scripts with _process/_physics_process
   - Signal connection count
   - Heavy operations in loops
   - Memory allocations per frame` : ''}
${a.focus === 'memory' || !a.focus ? `   - Loaded resource size
   - Texture memory usage
   - Instanced scene overhead
   - Audio buffer usage` : ''}

3. **Profiling Recommendations**
   - Enable Godot's built-in profiler
   - Check Frame Time breakdown
   - Monitor GPU vs CPU bottleneck

4. **Optimization Suggestions**
   - Specific fixes with code examples
   - Node consolidation opportunities
   - Resource sharing recommendations
   - LOD/culling setup if 3D

Use tools: get_node_tree, get_project_settings`,
          },
        },
      ],
    }),

    convert_3to4: (a) => ({
      description: `Convert project to Godot 4: ${a.projectPath}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Guide migration of Godot 3.x project at "${a.projectPath}" to Godot 4.x.

Focus: ${a.focus || 'all'}

Please help with:
1. **Pre-Migration Checklist**
   - Backup entire project
   - Document current Godot 3.x version
   - List all addons/plugins used
   - Note custom GDNative/C# usage

2. **Automated Conversion**
   - Use Godot 4's project converter
   - Run convert_project tool
   - Run validate_conversion tool

3. **Manual Fixes Required**
${a.focus === 'gdscript' || !a.focus ? `   **GDScript Changes:**
   - \`onready\` → \`@onready\`
   - \`export\` → \`@export\`
   - \`tool\` → \`@tool\`
   - \`yield\` → \`await\`
   - \`connect("signal", obj, "method")\` → \`signal.connect(method)\`
   - Typed arrays: \`Array\` → \`Array[Type]\`
   - \`setget\` → properties with get/set` : ''}
${a.focus === 'scenes' || !a.focus ? `   **Scene Changes:**
   - Node renames (Spatial→Node3D, KinematicBody→CharacterBody)
   - Property renames
   - Resource path updates
   - UID system integration` : ''}
${a.focus === 'shaders' || !a.focus ? `   **Shader Changes:**
   - \`hint_color\` → \`source_color\`
   - Uniform syntax updates
   - Built-in variable renames
   - Render mode changes` : ''}

4. **Testing Checklist**
   - Run project and check console
   - Test all scenes load
   - Verify gameplay mechanics
   - Check visual fidelity

Use tools: convert_project, validate_conversion, get_script_errors`,
          },
        },
      ],
    }),

    refactor_scene: (a) => ({
      description: `Refactor scene: ${a.scenePath}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Refactor the scene at "${a.scenePath}".

Action: ${a.action || 'analyze'}

Please help with:
1. **Scene Analysis**
   - Use get_node_tree to examine structure
   - Identify reusable components
   - Find duplicate node patterns
   - Check script organization

2. **Refactoring Actions**
${a.action === 'extract_subscene' || !a.action ? `   **Extract Subscenes:**
   - Identify self-contained node groups
   - Create new .tscn for each group
   - Replace with instanced scenes
   - Ensure signals still connect
   - Update script references` : ''}
${a.action === 'flatten' ? `   **Flatten Hierarchy:**
   - Remove unnecessary container nodes
   - Merge similar functionality
   - Reduce nesting depth
   - Simplify node paths in code` : ''}
${a.action === 'reorganize' ? `   **Reorganize Structure:**
   - Group nodes by function
   - Apply naming conventions
   - Order nodes logically
   - Add organizational comments` : ''}
${a.action === 'optimize' ? `   **Optimize for Performance:**
   - Remove unused nodes
   - Combine static geometry
   - Setup visibility culling
   - Configure processing modes` : ''}

3. **Post-Refactor Steps**
   - Update all script references
   - Fix broken node paths
   - Test functionality
   - Update documentation

4. **Best Practices Applied**
   - Single responsibility per scene
   - Meaningful node names
   - Consistent structure patterns
   - Proper scene composition

Use tools: get_node_tree, create_scene, instance_scene, move_node`,
          },
        },
      ],
    }),
  };

  const generator = promptGenerators[promptName];
  if (!generator) {
    return null;
  }

  return generator(args);
};
