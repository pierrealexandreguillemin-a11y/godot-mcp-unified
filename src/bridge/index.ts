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

export {
  GodotLSPClient,
  getGodotLSPClient,
  tryConnectToLSP,
  DiagnosticSeverity,
  type Position,
  type Range,
  type Diagnostic,
  type PublishDiagnosticsParams,
  type ScriptDiagnostic,
} from './GodotLSPClient.js';

export {
  validateScript,
  validateViaLSP,
  validateViaBridge,
  isRealTimeValidationAvailable,
  type ValidationError,
  type ValidationResult,
} from './ScriptValidator.js';
