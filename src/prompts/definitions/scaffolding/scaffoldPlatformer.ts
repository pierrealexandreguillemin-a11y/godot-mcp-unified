/**
 * Scaffold Platformer Prompt
 * @module prompts/definitions/scaffolding
 */

import { RegisteredPrompt } from '../../domain/types.js';

export const scaffoldPlatformer: RegisteredPrompt = {
  definition: {
    name: 'scaffold_platformer',
    description: 'Generate a complete 2D platformer project structure',
    category: 'scaffolding',
    arguments: [
      {
        name: 'projectName',
        description: 'Name of the platformer project',
        required: true,
      },
      {
        name: 'features',
        description: 'Features: parallax, enemies, collectibles, checkpoints',
        required: false,
      },
    ],
  },
  generator: (args) => ({
    description: `Scaffold 2D platformer: ${args.projectName}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a complete 2D platformer project structure for "${args.projectName}".

Features to include: ${args.features || 'parallax, enemies, collectibles'}

Please create:
1. **Project Structure**
   - res://scenes/
     - main.tscn (main menu)
     - game.tscn (game world)
     - player/player.tscn
     - enemies/ (enemy scenes)
     - ui/ (HUD, pause menu)
   - res://scripts/
     - player/
     - enemies/
     - managers/
   - res://assets/ (placeholder structure)

2. **Core Systems**
   - Player controller with move_and_slide()
   - Camera follow with smoothing
   - Game manager autoload
   - Level transition system

3. **Gameplay Elements**
${args.features?.includes('parallax') ? '   - Parallax background layers' : ''}
${args.features?.includes('enemies') ? '   - Basic enemy with patrol AI' : ''}
${args.features?.includes('collectibles') ? '   - Collectible coins with counter' : ''}
${args.features?.includes('checkpoints') ? '   - Checkpoint save system' : ''}

Use tools: create_scene, add_node, write_script, attach_script, connect_signal`,
        },
      },
    ],
  }),
};
