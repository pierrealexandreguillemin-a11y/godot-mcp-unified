@tool
extends "res://addons/godot_mcp/commands/base_command.gd"
class_name MCPSceneCommands
## Scene-related MCP commands.
## Handles creating, opening, saving, and querying scenes.
## ISO 5055 compliant - uses centralized validation and node factory.


## Create a new scene with specified root type
func create_scene(params: Dictionary) -> Dictionary:
	# Validate parameters
	var v := MCPValidator
	var validation := v.all([
		v.require_scene_path(params, "scene_path"),
		v.optional_string(params, "root_type", 1, 100),
	])
	if not validation.valid:
		return _error(validation.error_code, validation.error_message)

	var scene_path: String = _normalize_path(params.scene_path)
	var root_type: String = params.get("root_type", "Node2D")

	# Validate node type if specified
	if not MCPNodeFactory.is_valid_node_type(root_type):
		return _error("INVALID_NODE_TYPE", "Cannot create node of type: %s" % root_type)

	# Execute with error handling
	var result := await _safe_execute(func() -> Dictionary:
		# Create root node
		var root_node: Node = MCPNodeFactory.create_node(root_type)
		if root_node == null:
			return _error("CREATE_FAILED", "Failed to create node of type: %s" % root_type)

		root_node.name = scene_path.get_file().get_basename()

		# Create packed scene
		var packed_scene := PackedScene.new()
		var err := packed_scene.pack(root_node)
		root_node.queue_free()

		if err != OK:
			return _error("PACK_FAILED", "Failed to pack scene: %s" % error_string(err))

		# Ensure directory exists
		var dir_path := scene_path.get_base_dir()
		if not dir_path.is_empty() and dir_path != "res://":
			DirAccess.make_dir_recursive_absolute(_to_absolute_path(dir_path))

		# Save the scene
		err = ResourceSaver.save(packed_scene, scene_path)
		if err != OK:
			return _error("SAVE_FAILED", "Failed to save scene: %s" % error_string(err))

		# Refresh filesystem
		_get_filesystem().scan()

		return _success({"path": scene_path})
	)

	if result.has("__await_frame"):
		await _wait_frame()
		result.erase("__await_frame")

	return result


## Open an existing scene in the editor
func open_scene(params: Dictionary) -> Dictionary:
	var validation := MCPValidator.require_scene_path(params, "scene_path")
	if not validation.valid:
		return _error(validation.error_code, validation.error_message)

	var scene_path: String = _normalize_path(params.scene_path)

	return await _safe_execute(func() -> Dictionary:
		if not ResourceLoader.exists(scene_path):
			return _error("NOT_FOUND", "Scene not found: %s" % scene_path)

		_editor_interface.open_scene_from_path(scene_path)
		await _wait_frame()

		return _success({"path": scene_path})
	)


## Save the current scene or a specific scene
func save_scene(params: Dictionary) -> Dictionary:
	var scene_path: String = params.get("scene_path", "")

	return await _safe_execute(func() -> Dictionary:
		if scene_path.is_empty():
			# Save current scene
			var root := _get_edited_scene_root()
			if root == null:
				return _error("NO_SCENE", "No scene is currently open")

			var err := _editor_interface.save_scene()
			if err != OK:
				return _error("SAVE_FAILED", "Failed to save scene: %s" % error_string(err))

			return _success({"path": root.scene_file_path})
		else:
			# Save specific scene
			scene_path = _normalize_path(scene_path)
			var root := _get_edited_scene_root()

			if root and root.scene_file_path == scene_path:
				var err := _editor_interface.save_scene()
				if err != OK:
					return _error("SAVE_FAILED", "Failed to save scene: %s" % error_string(err))
				return _success({"path": scene_path})
			else:
				return _error("NOT_OPEN", "Scene is not currently open: %s" % scene_path)
	)


## Get information about the currently edited scene
func get_current_scene() -> Dictionary:
	var root := _get_edited_scene_root()
	if root == null:
		return _success(null)

	return _success({
		"path": root.scene_file_path,
		"root_name": root.name,
		"root_type": root.get_class()
	})


## Get the scene tree structure
func get_scene_tree(params: Dictionary) -> Dictionary:
	var scene_path: String = params.get("scene_path", "")
	var max_depth: int = mini(params.get("max_depth", 10), 50)  # Cap at 50

	var root: Node
	var should_free := false

	if scene_path.is_empty():
		root = _get_edited_scene_root()
		if root == null:
			return _error("NO_SCENE", "No scene is currently open")
	else:
		scene_path = _normalize_path(scene_path)
		if not ResourceLoader.exists(scene_path):
			return _error("NOT_FOUND", "Scene not found: %s" % scene_path)

		var packed := ResourceLoader.load(scene_path) as PackedScene
		if packed == null:
			return _error("LOAD_FAILED", "Failed to load scene: %s" % scene_path)

		root = packed.instantiate()
		should_free = true

	var tree := _build_node_tree(root, 0, max_depth)

	if should_free:
		root.queue_free()

	return _success(tree)


## Build a dictionary representation of the node tree
func _build_node_tree(node: Node, depth: int, max_depth: int) -> Dictionary:
	var result := {
		"name": node.name,
		"type": node.get_class(),
		"path": str(node.get_path()) if node.is_inside_tree() else node.name
	}

	# Add script info if present
	var script := node.get_script() as Script
	if script:
		result["script"] = script.resource_path

	# Add children if not at max depth
	if depth < max_depth and node.get_child_count() > 0:
		var children: Array[Dictionary] = []
		for child in node.get_children():
			children.append(_build_node_tree(child, depth + 1, max_depth))
		result["children"] = children

	return result


## Safe execution wrapper with error handling
func _safe_execute(operation: Callable) -> Dictionary:
	var result: Dictionary
	# GDScript doesn't have try-catch, but we can check for errors
	result = await operation.call()
	if result == null:
		return _error("EXECUTION_FAILED", "Operation returned null")
	return result
