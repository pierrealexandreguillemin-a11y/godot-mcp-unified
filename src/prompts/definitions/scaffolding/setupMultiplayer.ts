/**
 * Setup Multiplayer Prompt
 * @module prompts/definitions/scaffolding
 */

import { RegisteredPrompt } from '../../domain/types.js';

export const setupMultiplayer: RegisteredPrompt = {
  definition: {
    name: 'setup_multiplayer',
    description: 'Generate multiplayer networking boilerplate',
    category: 'scaffolding',
    arguments: [
      {
        name: 'architecture',
        description: 'Network architecture: client-server, p2p',
        required: true,
      },
      {
        name: 'features',
        description: 'Features: sync, rpc, lobby, matchmaking',
        required: false,
      },
    ],
  },
  generator: (args) => ({
    description: `Setup ${args.architecture} multiplayer`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Set up multiplayer networking for Godot 4.x using ${args.architecture} architecture.

Features to include: ${args.features || 'sync, rpc'}

Requirements:
- Use Godot's built-in MultiplayerAPI
- Create autoload for network management
- Handle connection/disconnection gracefully
- Include error handling and timeouts
- Add debug logging

Please provide:
1. Network manager autoload script
2. Player synchronization script
3. Example RPC calls
4. Connection flow (host/join)
${args.features?.includes('lobby') ? '5. Lobby management system' : ''}
${args.features?.includes('matchmaking') ? '6. Simple matchmaking logic' : ''}`,
        },
      },
    ],
  }),
};
