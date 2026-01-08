/**
 * Prompt Definitions - Aggregate Export
 * @module prompts/definitions
 */

// Bounded Contexts
export * from './gameplay/index.js';
export * from './scaffolding/index.js';
export * from './debug/index.js';
export * from './migration/index.js';
export * from './analysis/index.js';

// Re-export for convenience
import {
  createCharacterController,
  createEnemyAI,
  createNPC,
  createCollectible,
  createProjectile,
} from './gameplay/index.js';

import {
  scaffoldPlatformer,
  scaffoldTopdown,
  scaffoldFPS,
  scaffoldPuzzle,
  scaffoldUISystem,
  createUIComponent,
  setupMultiplayer,
} from './scaffolding/index.js';

import {
  debugScript,
  debugPhysics,
  debugPerformance,
  optimizeScene,
  createShader,
} from './debug/index.js';

import { convert3to4, refactorScene } from './migration/index.js';

import { analyzeProject } from './analysis/index.js';

import { RegisteredPrompt } from '../domain/types.js';

/**
 * All registered prompts organized by bounded context
 */
export const allPrompts: RegisteredPrompt[] = [
  // Gameplay (5)
  createCharacterController,
  createEnemyAI,
  createNPC,
  createCollectible,
  createProjectile,
  // Scaffolding (7)
  scaffoldPlatformer,
  scaffoldTopdown,
  scaffoldFPS,
  scaffoldPuzzle,
  scaffoldUISystem,
  createUIComponent,
  setupMultiplayer,
  // Debug (5)
  debugScript,
  debugPhysics,
  debugPerformance,
  optimizeScene,
  createShader,
  // Migration (2)
  convert3to4,
  refactorScene,
  // Analysis (1)
  analyzeProject,
];
