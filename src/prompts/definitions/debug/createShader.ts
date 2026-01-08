/**
 * Create Shader Prompt
 * @module prompts/definitions/debug
 */

import { RegisteredPrompt } from '../../domain/types.js';

export const createShader: RegisteredPrompt = {
  definition: {
    name: 'create_shader',
    description: 'Generate a Godot shader for visual effects',
    category: 'debug',
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
  generator: (args) => ({
    description: `Create ${args.effect} shader`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a Godot 4.x shader for "${args.effect}" effect.

Shader type: ${args.target || 'canvas_item'}

Requirements:
- Well-commented code explaining each section
- Uniform variables for customization
- Optimized for performance
- Include usage instructions

Effect "${args.effect}" should:
${args.effect === 'outline' ? '- Draw outline around sprite\n- Customizable color and width\n- Work with transparent sprites' : ''}
${args.effect === 'dissolve' ? '- Dissolve effect with noise\n- Customizable edge color\n- Animated threshold' : ''}
${args.effect === 'water' ? '- Animated waves\n- Reflection/refraction\n- Foam at edges' : ''}
${args.effect === 'fire' ? '- Animated flames\n- Color gradient\n- Particle-like appearance' : ''}
${args.effect === 'glow' ? '- Bloom effect\n- Pulsating animation\n- Color customization' : ''}

Please provide the complete .gdshader code.`,
        },
      },
    ],
  }),
};
