/**
 * Optimize Scene Prompt
 * @module prompts/definitions/debug
 */

import { RegisteredPrompt } from '../../domain/types.js';

export const optimizeScene: RegisteredPrompt = {
  definition: {
    name: 'optimize_scene',
    description: 'Analyze and optimize a scene for performance',
    category: 'debug',
    arguments: [
      {
        name: 'scenePath',
        description: 'Path to the scene file',
        required: true,
      },
    ],
  },
  generator: (args) => ({
    description: `Optimize scene ${args.scenePath}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Analyze and optimize the scene at "${args.scenePath}" for better performance.

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
