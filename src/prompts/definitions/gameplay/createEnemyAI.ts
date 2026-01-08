/**
 * Create Enemy AI Prompt
 * @module prompts/definitions/gameplay
 */

import { RegisteredPrompt } from '../../domain/types.js';

export const createEnemyAI: RegisteredPrompt = {
  definition: {
    name: 'create_enemy_ai',
    description: 'Generate an enemy AI script with customizable behavior',
    category: 'gameplay',
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
  generator: (args) => ({
    description: `Create ${args.behavior} enemy AI`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a ${args.type || '2D'} enemy AI script for Godot 4.x with ${args.behavior} behavior.

Requirements:
- Use a state machine pattern
- Include detection range with Area${args.type === '3D' ? '3D' : '2D'}
- Add @export variables for speed, detection range, etc.
- Include proper signal handling
- Add debug visualization option
- Follow Godot 4.x best practices

Behavior details for "${args.behavior}":
${args.behavior === 'patrol' ? '- Move between waypoints\n- Pause at each point\n- Detect player in range' : ''}
${args.behavior === 'chase' ? '- Follow player when detected\n- Return to patrol when lost\n- Attack when in range' : ''}
${args.behavior === 'flee' ? '- Run away from player\n- Find cover points\n- Alert other enemies' : ''}
${args.behavior === 'boss' ? '- Multiple attack patterns\n- Phase transitions\n- Telegraphed attacks' : ''}

Please provide the complete GDScript code.`,
        },
      },
    ],
  }),
};
