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
  };

  const generator = promptGenerators[promptName];
  if (!generator) {
    return null;
  }

  return generator(args);
};
