/**
 * Scaffold Puzzle Game Prompt
 * @module prompts/definitions/scaffolding
 */

import { RegisteredPrompt } from '../../domain/types.js';

export const scaffoldPuzzle: RegisteredPrompt = {
  definition: {
    name: 'scaffold_puzzle',
    description: 'Generate a puzzle game project structure',
    category: 'scaffolding',
    arguments: [
      {
        name: 'projectName',
        description: 'Name of the puzzle project',
        required: true,
      },
      {
        name: 'puzzleType',
        description: 'Type: match3, sokoban, physics, logic',
        required: false,
      },
    ],
  },
  generator: (args) => ({
    description: `Scaffold puzzle game: ${args.projectName}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a complete puzzle game project structure for "${args.projectName}".

Puzzle type: ${args.puzzleType || 'logic'}

Please create:
1. **Project Structure**
   - res://scenes/
     - main_menu.tscn
     - level_select.tscn
     - levels/
     - ui/
   - res://scripts/
     - puzzle/
     - managers/
   - res://data/levels/

2. **Core Systems**
   - Level loader
   - Progress tracker
   - Undo/Redo system
   - Win condition checker

3. **Puzzle-Specific Features**
${args.puzzleType === 'match3' ? '   - Grid-based matching\n   - Tile swapping\n   - Cascade detection\n   - Score system' : ''}
${args.puzzleType === 'sokoban' ? '   - Push mechanics\n   - Goal detection\n   - Move counter\n   - Reset level' : ''}
${args.puzzleType === 'physics' ? '   - Physics-based interactions\n   - Object spawning\n   - Goal triggers' : ''}
${args.puzzleType === 'logic' || !args.puzzleType ? '   - State-based puzzles\n   - Interactive elements\n   - Hint system' : ''}

Use tools: create_scene, add_node, write_script, create_tilemap_layer`,
        },
      },
    ],
  }),
};
