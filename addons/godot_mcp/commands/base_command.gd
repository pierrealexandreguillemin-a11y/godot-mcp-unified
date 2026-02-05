@tool
extends Node
class_name MCPBaseCommand
## Base class for MCP command processors.
## Provides common utilities and editor interface access.

var _editor_interface: EditorInterface


func initialize(editor_interface: EditorInterface) -> void:
	_editor_interface = editor_interface


## Create a success response
func _success(data: Variant = null) -> Dictionary:
	return {"success": true, "data": data}


## Create an error response
func _error(code: String, message: String) -> Dictionary:
	return {"success": false, "data": {"code": code, "message": message}}


## Get the current edited scene root
func _get_edited_scene_root() -> Node:
	return _editor_interface.get_edited_scene_root()


## Get the editor file system
func _get_filesystem() -> EditorFileSystem:
	return _editor_interface.get_resource_filesystem()


## Get the undo/redo manager
func _get_undo_redo() -> EditorUndoRedoManager:
	return _editor_interface.get_editor_undo_redo()


## Normalize a resource path
func _normalize_path(path: String) -> String:
	if not path.begins_with("res://"):
		path = "res://" + path
	return path


## Get absolute path from resource path
func _to_absolute_path(res_path: String) -> String:
	return ProjectSettings.globalize_path(res_path)


## Check if a required parameter exists
func _require_param(params: Dictionary, key: String) -> Dictionary:
	if not params.has(key) or params[key] == null:
		return _error("missing_param", "Required parameter: %s" % key)
	return {}


## Validate multiple required parameters
func _require_params(params: Dictionary, keys: Array[String]) -> Dictionary:
	for key in keys:
		var result := _require_param(params, key)
		if not result.is_empty():
			return result
	return {}


## Wait for one frame (useful for editor operations)
func _wait_frame() -> void:
	await get_tree().process_frame


## Wait for the filesystem to scan
func _wait_filesystem_scan() -> void:
	var fs := _get_filesystem()
	if fs.is_scanning():
		await fs.filesystem_changed
