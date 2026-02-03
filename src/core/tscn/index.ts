/**
 * TSCN Module
 * Modular parser for Godot scene files (.tscn)
 *
 * ISO/IEC 25010 compliant - maintainable, reliable, efficient.
 * Split from monolithic TscnParser.ts (CC 111) to modular design (CC <50 total)
 */

// Types
export * from './types.js';

// Value parsing
export {
  parseValue,
  parseArray,
  parseDictionary,
  parseArguments,
  splitTopLevel,
  findTopLevelChar,
  isFunctionCall,
} from './TscnValueParser.js';

// Serialization
export { serializeTscn, serializeValue } from './TscnSerializer.js';

// Queries
export {
  findNodeByPath,
  findExtResourceById,
  findNodesByType,
  findNodesByGroup,
  getNodePath,
  hasScript,
  getScriptPath,
} from './TscnQueries.js';

// Mutations
export {
  addExtResource,
  removeExtResource,
  attachScriptToNode,
  detachScriptFromNode,
  addNode,
  removeNode,
  addConnection,
  removeConnection,
  addSubResource,
  setNodeProperty,
  removeNodeProperty,
  addNodeToGroup,
  removeNodeFromGroup,
} from './TscnMutations.js';
