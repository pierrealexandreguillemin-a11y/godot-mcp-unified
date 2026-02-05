@tool
extends "res://addons/godot_mcp/commands/base_command.gd"
class_name MCPScriptCommands
## Script-related MCP commands.
## Handles creating, writing, and attaching scripts.
## ISO 5055 compliant - uses centralized validation.


## Write a script file
func write_script(params: Dictionary) -> Dictionary:
	# Validate parameters
	var v := MCPValidator
	var validation := v.all([
		v.require_script_path(params, "script_path"),
		v.require_string(params, "content", 1, 1000000),  # 1MB max
		v.optional_bool(params, "overwrite"),
	])
	if not validation.valid:
		return _error(validation.error_code, validation.error_message)

	var script_path: String = _normalize_path(params.script_path)
	var content: String = params.content
	var overwrite: bool = params.get("overwrite", true)

	# Check if file exists and overwrite is disabled
	if not overwrite and FileAccess.file_exists(_to_absolute_path(script_path)):
		return _error("EXISTS", "Script already exists: %s" % script_path)

	# Ensure directory exists
	var dir_path := script_path.get_base_dir()
	if not dir_path.is_empty() and dir_path != "res://":
		DirAccess.make_dir_recursive_absolute(_to_absolute_path(dir_path))

	# Write the script
	var file := FileAccess.open(script_path, FileAccess.WRITE)
	if file == null:
		return _error("WRITE_FAILED", "Failed to write script: %s" % error_string(FileAccess.get_open_error()))

	file.store_string(content)
	file.close()

	# Refresh filesystem
	_get_filesystem().scan()
	await _wait_frame()

	# Emit event
	_emit_event("script_created", {"path": script_path})

	return _success({"path": script_path})


## Attach a script to a node
func attach_script(params: Dictionary) -> Dictionary:
	# Validate parameters
	var v := MCPValidator
	var validation := v.all([
		v.require_string(params, "node_path", 1, 500),
		v.require_script_path(params, "script_path"),
	])
	if not validation.valid:
		return _error(validation.error_code, validation.error_message)

	var node_path: String = params.node_path
	var script_path: String = _normalize_path(params.script_path)

	var root := _get_edited_scene_root()
	if root == null:
		return _error("NO_SCENE", "No scene is currently open")

	var node := _find_node_by_path(root, node_path)
	if node == null:
		return _error("NODE_NOT_FOUND", "Node not found: %s" % node_path)

	# Load the script
	if not ResourceLoader.exists(script_path):
		return _error("SCRIPT_NOT_FOUND", "Script not found: %s" % script_path)

	var script: Script = ResourceLoader.load(script_path)
	if script == null:
		return _error("LOAD_FAILED", "Failed to load script: %s" % script_path)

	# Verify script is compatible with node
	var base_type := script.get_instance_base_type()
	if not base_type.is_empty() and not ClassDB.is_parent_class(node.get_class(), base_type):
		return _error("INCOMPATIBLE", "Script extends %s but node is %s" % [base_type, node.get_class()])

	# Attach with undo/redo
	var old_script := node.get_script()
	var undo_redo := _get_undo_redo()
	undo_redo.create_action("Attach Script: %s" % script_path)
	undo_redo.add_do_method(node, "set_script", script)
	undo_redo.add_undo_method(node, "set_script", old_script)
	undo_redo.commit_action()

	await _wait_frame()

	# Emit event
	_emit_event("script_attached", {
		"node_path": str(node.get_path()),
		"script_path": script_path
	})

	return _success({
		"node_path": str(node.get_path()),
		"script_path": script_path
	})


## Get the content of a script file
func get_script_content(params: Dictionary) -> Dictionary:
	var validation := MCPValidator.require_script_path(params, "script_path")
	if not validation.valid:
		return _error(validation.error_code, validation.error_message)

	var script_path: String = _normalize_path(params.script_path)

	if not FileAccess.file_exists(_to_absolute_path(script_path)):
		return _error("NOT_FOUND", "Script not found: %s" % script_path)

	var file := FileAccess.open(script_path, FileAccess.READ)
	if file == null:
		return _error("READ_FAILED", "Failed to read script: %s" % error_string(FileAccess.get_open_error()))

	var content := file.get_as_text()
	file.close()

	return _success({
		"path": script_path,
		"content": content,
		"size": content.length()
	})


## Detach script from a node
func detach_script(params: Dictionary) -> Dictionary:
	var validation := MCPValidator.require_string(params, "node_path", 1, 500)
	if not validation.valid:
		return _error(validation.error_code, validation.error_message)

	var node_path: String = params.node_path

	var root := _get_edited_scene_root()
	if root == null:
		return _error("NO_SCENE", "No scene is currently open")

	var node := _find_node_by_path(root, node_path)
	if node == null:
		return _error("NODE_NOT_FOUND", "Node not found: %s" % node_path)

	var old_script := node.get_script()
	if old_script == null:
		return _error("NO_SCRIPT", "Node has no script attached")

	# Detach with undo/redo
	var undo_redo := _get_undo_redo()
	undo_redo.create_action("Detach Script from: %s" % node.name)
	undo_redo.add_do_method(node, "set_script", null)
	undo_redo.add_undo_method(node, "set_script", old_script)
	undo_redo.commit_action()

	await _wait_frame()

	# Emit event
	_emit_event("script_detached", {"node_path": str(node.get_path())})

	return _success({"node_path": str(node.get_path())})


## Find a node by path (supports "." for root, relative and absolute paths)
func _find_node_by_path(root: Node, path: String) -> Node:
	if path == "." or path.is_empty():
		return root

	# Try absolute path first
	if path.begins_with("/"):
		return root.get_node_or_null(NodePath(path))

	# Try relative to root
	return root.get_node_or_null(NodePath(path))


## _emit_event is inherited from MCPBaseCommand
