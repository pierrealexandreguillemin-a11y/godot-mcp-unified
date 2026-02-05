@tool
extends Node
class_name MCPCommandHandler
## Dispatcher for MCP commands.
## Routes incoming commands to appropriate processors.

var _server: Node  # MCPWebSocketServer
var _editor_interface: EditorInterface
var _scene_commands: Node
var _node_commands: Node
var _script_commands: Node
var _project_commands: Node


func initialize(server: Node, editor_interface: EditorInterface) -> void:
	_server = server
	_editor_interface = editor_interface

	# Load command processors
	var SceneCommands := preload("res://addons/godot_mcp/commands/scene_commands.gd")
	_scene_commands = SceneCommands.new()
	_scene_commands.name = "SceneCommands"
	_scene_commands.initialize(editor_interface)
	_scene_commands.event_emitted.connect(_on_event_emitted)
	add_child(_scene_commands)

	var NodeCommands := preload("res://addons/godot_mcp/commands/node_commands.gd")
	_node_commands = NodeCommands.new()
	_node_commands.name = "NodeCommands"
	_node_commands.initialize(editor_interface)
	_node_commands.event_emitted.connect(_on_event_emitted)
	add_child(_node_commands)

	var ScriptCommands := preload("res://addons/godot_mcp/commands/script_commands.gd")
	_script_commands = ScriptCommands.new()
	_script_commands.name = "ScriptCommands"
	_script_commands.initialize(editor_interface)
	_script_commands.event_emitted.connect(_on_event_emitted)
	add_child(_script_commands)

	var ProjectCommands := preload("res://addons/godot_mcp/commands/project_commands.gd")
	_project_commands = ProjectCommands.new()
	_project_commands.name = "ProjectCommands"
	_project_commands.initialize(editor_interface)
	_project_commands.event_emitted.connect(_on_event_emitted)
	add_child(_project_commands)


func process_command(client_id: int, data: Dictionary) -> void:
	var id: String = data.get("id", "")
	var action: String = data.get("action", "")
	var params: Dictionary = data.get("params", {})

	if action.is_empty():
		_server.send_error(client_id, id, "missing_action", "Action field is required")
		return

	var result := await _execute_action(action, params)
	_server.send_response(client_id, id, result.success, result.data)


func _execute_action(action: String, params: Dictionary) -> Dictionary:
	match action:
		# Echo for testing
		"echo":
			return _success(params)

		# Scene commands
		"create_scene":
			return await _scene_commands.create_scene(params)
		"open_scene":
			return await _scene_commands.open_scene(params)
		"save_scene":
			return await _scene_commands.save_scene(params)
		"get_current_scene":
			return _scene_commands.get_current_scene()
		"get_scene_tree":
			return _scene_commands.get_scene_tree(params)

		# Node commands
		"add_node":
			return await _node_commands.add_node(params)
		"edit_node":
			return await _node_commands.edit_node(params)
		"remove_node":
			return await _node_commands.remove_node(params)
		"get_node_properties":
			return _node_commands.get_node_properties(params)

		# Script commands
		"write_script":
			return await _script_commands.write_script(params)
		"attach_script":
			return await _script_commands.attach_script(params)
		"get_script_content":
			return _script_commands.get_script_content(params)

		# Project commands
		"run_project":
			return _project_commands.run_project(params)
		"stop_project":
			return _project_commands.stop_project()
		"get_project_info":
			return _project_commands.get_project_info()

		_:
			return _error("unknown_action", "Unknown action: %s" % action)


func _success(data: Variant = null) -> Dictionary:
	return {"success": true, "data": data}


func _error(code: String, message: String) -> Dictionary:
	return {"success": false, "data": {"code": code, "message": message}}


## Forward events from command processors to WebSocket clients
func _on_event_emitted(event_type: String, data: Dictionary) -> void:
	_server.send_event(event_type, data)
