/**
 * Bridge module - Bidirectional communication with Godot Editor
 * @module bridge
 */

export {
  GodotBridge,
  getGodotBridge,
  tryConnectToGodot,
  type BridgeCommand,
  type BridgeResponse,
  type EditorInfo,
  type ScriptValidationResult,
  type OpenScene,
  type SelectedNode,
  type Autoload,
} from './GodotBridge.js';
