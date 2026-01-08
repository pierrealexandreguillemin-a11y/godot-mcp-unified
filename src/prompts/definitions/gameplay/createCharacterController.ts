/**
 * Create Character Controller Prompt
 * @module prompts/definitions/gameplay
 */

import { RegisteredPrompt } from '../../domain/types.js';

export const createCharacterController: RegisteredPrompt = {
  definition: {
    name: 'create_character_controller',
    description: 'Generate a character controller script for 2D or 3D movement',
    category: 'gameplay',
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
  generator: (args) => ({
    description: `Create a ${args.type || '2D'} character controller`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a ${args.type || '2D'} character controller script for Godot 4.x with the following features: ${args.features || 'basic movement, jump'}.

Requirements:
- Use typed GDScript with proper type hints
- Include @export variables for customization
- Add comments explaining the code
- Follow Godot best practices
- Use move_and_slide() for physics
${args.type === '3D' ? '- Include camera handling' : '- Support for animations via AnimationPlayer'}

Please provide the complete GDScript code.`,
        },
      },
    ],
  }),
};
