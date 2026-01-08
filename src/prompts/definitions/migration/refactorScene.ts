/**
 * Refactor Scene Prompt
 * @module prompts/definitions/migration
 */

import { RegisteredPrompt } from '../../domain/types.js';

export const refactorScene: RegisteredPrompt = {
  definition: {
    name: 'refactor_scene',
    description: 'Refactor scene structure and extract subscenes',
    category: 'migration',
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
  generator: (args) => ({
    description: `Refactor scene: ${args.scenePath}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Refactor the scene at "${args.scenePath}".

Action: ${args.action || 'analyze'}

Please help with:
1. **Scene Analysis**
   - Use get_node_tree to examine structure
   - Identify reusable components
   - Find duplicate node patterns
   - Check script organization

2. **Refactoring Actions**
${args.action === 'extract_subscene' || !args.action ? `   **Extract Subscenes:**
   - Identify self-contained node groups
   - Create new .tscn for each group
   - Replace with instanced scenes
   - Ensure signals still connect
   - Update script references` : ''}
${args.action === 'flatten' ? `   **Flatten Hierarchy:**
   - Remove unnecessary container nodes
   - Merge similar functionality
   - Reduce nesting depth
   - Simplify node paths in code` : ''}
${args.action === 'reorganize' ? `   **Reorganize Structure:**
   - Group nodes by function
   - Apply naming conventions
   - Order nodes logically
   - Add organizational comments` : ''}
${args.action === 'optimize' ? `   **Optimize for Performance:**
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
