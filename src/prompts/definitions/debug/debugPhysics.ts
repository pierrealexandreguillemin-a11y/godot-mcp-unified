/**
 * Debug Physics Prompt
 * @module prompts/definitions/debug
 */

import { RegisteredPrompt } from '../../domain/types.js';

export const debugPhysics: RegisteredPrompt = {
  definition: {
    name: 'debug_physics',
    description: 'Diagnose and fix physics-related issues in a scene',
    category: 'debug',
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
  generator: (args) => ({
    description: `Debug physics in ${args.scenePath}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Diagnose and fix physics issues in the scene at "${args.scenePath}".

Issue type: ${args.issue || 'general'}

Please analyze:
1. **Scene Structure**
   - Use get_node_tree to find all physics bodies
   - Check collision shapes
   - Review collision layers and masks

2. **Common Issues to Check**
${args.issue === 'collision' || !args.issue ? `   - Missing collision shapes
   - Incorrect collision layer/mask setup
   - Overlapping static bodies
   - One-way collision issues` : ''}
${args.issue === 'jitter' ? `   - Floating point precision issues
   - Conflicting physics forces
   - Incorrect position updates
   - Camera interpolation problems` : ''}
${args.issue === 'tunneling' ? `   - High velocity objects
   - Thin collision shapes
   - CCD (continuous collision) settings
   - Physics tick rate` : ''}
${args.issue === 'performance' ? `   - Too many physics bodies
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
};
