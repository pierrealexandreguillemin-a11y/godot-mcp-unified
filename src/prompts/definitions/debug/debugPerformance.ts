/**
 * Debug Performance Prompt
 * @module prompts/definitions/debug
 */

import { RegisteredPrompt } from '../../domain/types.js';

export const debugPerformance: RegisteredPrompt = {
  definition: {
    name: 'debug_performance',
    description: 'Analyze scene performance and identify bottlenecks',
    category: 'debug',
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
  generator: (args) => ({
    description: `Debug performance: ${args.scenePath}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Analyze performance of the scene at "${args.scenePath}".

Focus area: ${args.focus || 'all'}

Please analyze:
1. **Scene Structure Analysis**
   - Use get_node_tree to map all nodes
   - Count nodes by type
   - Identify deep hierarchies (>10 levels)

2. **Performance Metrics to Check**
${args.focus === 'draw_calls' || !args.focus ? `   - Draw call count (batch breaking)
   - Material/shader variety
   - Texture atlas usage
   - CanvasGroup for 2D batching` : ''}
${args.focus === 'physics' || !args.focus ? `   - Physics body count
   - Collision shape complexity
   - Physics tick rate
   - Sleeping body ratio` : ''}
${args.focus === 'scripts' || !args.focus ? `   - Scripts with _process/_physics_process
   - Signal connection count
   - Heavy operations in loops
   - Memory allocations per frame` : ''}
${args.focus === 'memory' || !args.focus ? `   - Loaded resource size
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
};
