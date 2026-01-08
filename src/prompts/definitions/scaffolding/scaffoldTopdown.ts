/**
 * Scaffold Top-down RPG Prompt
 * @module prompts/definitions/scaffolding
 */

import { RegisteredPrompt } from '../../domain/types.js';

export const scaffoldTopdown: RegisteredPrompt = {
  definition: {
    name: 'scaffold_topdown',
    description: 'Generate a top-down RPG project structure',
    category: 'scaffolding',
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
  generator: (args) => ({
    description: `Scaffold top-down RPG: ${args.projectName}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a complete top-down RPG project structure for "${args.projectName}".

Features to include: ${args.features || 'inventory, dialogue, combat'}

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
${args.features?.includes('inventory') ? '   - Inventory system with slots\n   - Item pickup and use' : ''}
${args.features?.includes('dialogue') ? '   - Dialogue box with choices\n   - NPC interaction system' : ''}
${args.features?.includes('quests') ? '   - Quest tracking system\n   - Quest log UI' : ''}
${args.features?.includes('combat') ? '   - Turn-based or action combat\n   - Health/damage system' : ''}

Use tools: create_scene, add_node, write_script, create_resource`,
        },
      },
    ],
  }),
};
