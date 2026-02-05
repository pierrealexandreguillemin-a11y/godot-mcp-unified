@tool
extends "res://addons/godot_mcp/commands/base_command.gd"
class_name MCPNodeCommands
## Node-related MCP commands.
## Handles adding, editing, and removing nodes in scenes.
## ISO 5055 compliant - uses centralized validation and node factory.


## Add a new node to the current scene
func add_node(params: Dictionary) -> Dictionary:
	# Validate parameters
	var v := MCPValidator
	var validation := v.all([
		v.require_node_type(params, "node_type"),
		v.require_node_name(params, "node_name"),
		v.optional_string(params, "parent_path", 0, 500),
		v.optional_dict(params, "properties"),
	])
	if not validation.valid:
		return _error(validation.error_code, validation.error_message)

	var node_type: String = params.node_type
	var node_name: String = params.node_name
	var parent_path: String = params.get("parent_path", ".")
	var properties: Dictionary = params.get("properties", {})

	var root := _get_edited_scene_root()
	if root == null:
		return _error("NO_SCENE", "No scene is currently open")

	# Find parent node
	var parent: Node = _find_node_by_path(root, parent_path)
	if parent == null:
		return _error("PARENT_NOT_FOUND", "Parent node not found: %s" % parent_path)

	# Create new node using factory
	var new_node: Node = MCPNodeFactory.create_node(node_type)
	if new_node == null:
		return _error("CREATE_FAILED", "Failed to create node of type: %s" % node_type)

	new_node.name = node_name

	# Set properties
	for prop_name in properties.keys():
		_set_node_property(new_node, prop_name, properties[prop_name])

	# Add with undo/redo support
	var undo_redo := _get_undo_redo()
	undo_redo.create_action("Add Node: %s" % node_name)
	undo_redo.add_do_method(parent, "add_child", new_node, true)
	undo_redo.add_do_method(new_node, "set_owner", root)
	undo_redo.add_do_reference(new_node)
	undo_redo.add_undo_method(parent, "remove_child", new_node)
	undo_redo.commit_action()

	await _wait_frame()

	# Emit event
	_emit_node_event("node_added", new_node)

	return _success({
		"name": new_node.name,
		"type": new_node.get_class(),
		"path": str(new_node.get_path())
	})


## Edit properties of an existing node
func edit_node(params: Dictionary) -> Dictionary:
	# Validate parameters
	var v := MCPValidator
	var validation := v.all([
		v.require_string(params, "node_path", 1, 500),
		v.optional_dict(params, "properties"),
		v.optional_string(params, "new_name", 0, 100),
	])
	if not validation.valid:
		return _error(validation.error_code, validation.error_message)

	var node_path: String = params.node_path
	var properties: Dictionary = params.get("properties", {})
	var new_name: String = params.get("new_name", "")

	if properties.is_empty() and new_name.is_empty():
		return _error("NO_CHANGES", "No properties or name specified to change")

	var root := _get_edited_scene_root()
	if root == null:
		return _error("NO_SCENE", "No scene is currently open")

	var node := _find_node_by_path(root, node_path)
	if node == null:
		return _error("NOT_FOUND", "Node not found: %s" % node_path)

	var undo_redo := _get_undo_redo()
	undo_redo.create_action("Edit Node: %s" % node.name)

	# Rename if requested
	if not new_name.is_empty() and new_name != node.name:
		var old_name := node.name
		undo_redo.add_do_method(self, "_set_node_name", node, new_name)
		undo_redo.add_undo_method(self, "_set_node_name", node, old_name)

	# Update properties
	for prop_name in properties.keys():
		var old_value = node.get(prop_name)
		var new_value = properties[prop_name]
		undo_redo.add_do_method(self, "_set_node_property", node, prop_name, new_value)
		undo_redo.add_undo_method(self, "_set_node_property", node, prop_name, old_value)

	undo_redo.commit_action()
	await _wait_frame()

	# Emit event
	_emit_node_event("node_modified", node)

	return _success({
		"name": node.name,
		"type": node.get_class(),
		"path": str(node.get_path())
	})


## Remove a node from the scene
func remove_node(params: Dictionary) -> Dictionary:
	var validation := MCPValidator.require_string(params, "node_path", 1, 500)
	if not validation.valid:
		return _error(validation.error_code, validation.error_message)

	var node_path: String = params.node_path

	var root := _get_edited_scene_root()
	if root == null:
		return _error("NO_SCENE", "No scene is currently open")

	var node := _find_node_by_path(root, node_path)
	if node == null:
		return _error("NOT_FOUND", "Node not found: %s" % node_path)

	if node == root:
		return _error("CANNOT_REMOVE_ROOT", "Cannot remove the root node")

	var parent := node.get_parent()
	var node_name := node.name
	var node_index := node.get_index()

	var undo_redo := _get_undo_redo()
	undo_redo.create_action("Remove Node: %s" % node_name)
	undo_redo.add_do_method(parent, "remove_child", node)
	undo_redo.add_undo_method(parent, "add_child", node, true)
	undo_redo.add_undo_method(parent, "move_child", node, node_index)
	undo_redo.add_undo_method(node, "set_owner", root)
	undo_redo.add_undo_reference(node)
	undo_redo.commit_action()

	await _wait_frame()

	# Emit event
	_emit_event("node_removed", {"name": node_name, "path": node_path})

	return _success({"removed": node_name})


## Get properties of a node
func get_node_properties(params: Dictionary) -> Dictionary:
	var v := MCPValidator
	var validation := v.all([
		v.require_string(params, "node_path", 1, 500),
		v.optional_bool(params, "include_all"),
	])
	if not validation.valid:
		return _error(validation.error_code, validation.error_message)

	var node_path: String = params.node_path
	var include_all: bool = params.get("include_all", false)

	var root := _get_edited_scene_root()
	if root == null:
		return _error("NO_SCENE", "No scene is currently open")

	var node := _find_node_by_path(root, node_path)
	if node == null:
		return _error("NOT_FOUND", "Node not found: %s" % node_path)

	var properties := {}

	if include_all:
		# Get all exported properties
		for prop in node.get_property_list():
			if prop.usage & PROPERTY_USAGE_EDITOR:
				var value = node.get(prop.name)
				properties[prop.name] = _serialize_value(value)
	else:
		# Get common properties based on node type
		properties = _get_common_properties(node)

	return _success({
		"name": node.name,
		"type": node.get_class(),
		"path": str(node.get_path()),
		"properties": properties
	})


## Find a node by path (supports "." for root, relative and absolute paths)
func _find_node_by_path(root: Node, path: String) -> Node:
	if path == "." or path.is_empty():
		return root

	# Try absolute path first
	if path.begins_with("/"):
		return root.get_node_or_null(NodePath(path))

	# Try relative to root
	return root.get_node_or_null(NodePath(path))


## Set a property on a node with type conversion
func _set_node_property(node: Node, prop_name: String, value: Variant) -> void:
	var converted_value := _convert_property_value(node, prop_name, value)
	node.set(prop_name, converted_value)


func _set_node_name(node: Node, new_name: String) -> void:
	node.name = new_name


## Convert property value to appropriate type
func _convert_property_value(_node: Node, _prop_name: String, value: Variant) -> Variant:
	# Handle Vector2
	if value is Dictionary and value.has("x") and value.has("y") and not value.has("z"):
		return Vector2(value.x, value.y)

	# Handle Vector3
	if value is Dictionary and value.has("x") and value.has("y") and value.has("z"):
		return Vector3(value.x, value.y, value.z)

	# Handle Color
	if value is Dictionary and value.has("r") and value.has("g") and value.has("b"):
		var a := value.get("a", 1.0)
		return Color(value.r, value.g, value.b, a)

	# Handle resource paths
	if value is String and value.begins_with("res://"):
		var resource := ResourceLoader.load(value)
		if resource:
			return resource

	return value


## Serialize a value to JSON-compatible format
func _serialize_value(value: Variant) -> Variant:
	return MCPJsonUtils.serialize_value(value)


## Get common properties for a node type
func _get_common_properties(node: Node) -> Dictionary:
	var props := {}

	# All nodes
	props["name"] = node.name

	# Node2D
	if node is Node2D:
		props["position"] = _serialize_value(node.position)
		props["rotation"] = node.rotation
		props["scale"] = _serialize_value(node.scale)
		props["z_index"] = node.z_index
		props["visible"] = node.visible

	# Node3D
	elif node is Node3D:
		props["position"] = _serialize_value(node.position)
		props["rotation"] = _serialize_value(node.rotation)
		props["scale"] = _serialize_value(node.scale)
		props["visible"] = node.visible

	# Control
	elif node is Control:
		props["position"] = _serialize_value(node.position)
		props["size"] = _serialize_value(node.size)
		props["visible"] = node.visible

	# Sprite2D
	if node is Sprite2D:
		props["texture"] = _serialize_value(node.texture)
		props["centered"] = node.centered
		props["flip_h"] = node.flip_h
		props["flip_v"] = node.flip_v

	# Label
	if node is Label:
		props["text"] = node.text

	# Button
	if node is Button:
		props["text"] = node.text
		props["disabled"] = node.disabled

	return props


## Emit a node-related event
func _emit_node_event(event_type: String, node: Node) -> void:
	_emit_event(event_type, {
		"name": node.name,
		"type": node.get_class(),
		"path": str(node.get_path()) if node.is_inside_tree() else node.name
	})


## Emit an event via the server (to be implemented in base_command)
func _emit_event(event_type: String, data: Dictionary) -> void:
	# This will be connected to the WebSocket server
	if has_signal("event_emitted"):
		emit_signal("event_emitted", event_type, data)
