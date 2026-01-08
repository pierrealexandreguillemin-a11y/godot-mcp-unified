/**
 * Convert Godot 3 to 4 Prompt
 * @module prompts/definitions/migration
 */

import { RegisteredPrompt } from '../../domain/types.js';

export const convert3to4: RegisteredPrompt = {
  definition: {
    name: 'convert_3to4',
    description: 'Guide migration from Godot 3.x to Godot 4.x',
    category: 'migration',
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
  generator: (args) => ({
    description: `Convert project to Godot 4: ${args.projectPath}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Guide migration of Godot 3.x project at "${args.projectPath}" to Godot 4.x.

Focus: ${args.focus || 'all'}

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
${args.focus === 'gdscript' || !args.focus ? `   **GDScript Changes:**
   - \`onready\` → \`@onready\`
   - \`export\` → \`@export\`
   - \`tool\` → \`@tool\`
   - \`yield\` → \`await\`
   - \`connect("signal", obj, "method")\` → \`signal.connect(method)\`
   - Typed arrays: \`Array\` → \`Array[Type]\`
   - \`setget\` → properties with get/set` : ''}
${args.focus === 'scenes' || !args.focus ? `   **Scene Changes:**
   - Node renames (Spatial→Node3D, KinematicBody→CharacterBody)
   - Property renames
   - Resource path updates
   - UID system integration` : ''}
${args.focus === 'shaders' || !args.focus ? `   **Shader Changes:**
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
};
