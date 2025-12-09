@tool
extends EditorPlugin
## MCP Bridge Plugin
## Enables bidirectional communication between Godot Editor and MCP Server
## for natural language coding workflows.

const DEFAULT_PORT: int = 6550
const BUFFER_SIZE: int = 65536

var _server: TCPServer
var _clients: Array[StreamPeerTCP] = []
var _port: int = DEFAULT_PORT
var _status_label: Label


func _enter_tree() -> void:
	_server = TCPServer.new()
	_start_server()
	_create_status_ui()
	print("[MCP Bridge] Plugin activated on port %d" % _port)


func _exit_tree() -> void:
	_stop_server()
	_remove_status_ui()
	print("[MCP Bridge] Plugin deactivated")


func _process(_delta: float) -> void:
	_poll_server()
	_poll_clients()


func _start_server() -> void:
	var error := _server.listen(_port)
	if error != OK:
		push_error("[MCP Bridge] Failed to start server on port %d: %s" % [_port, error_string(error)])
		return
	_update_status("Listening on port %d" % _port)


func _stop_server() -> void:
	for client in _clients:
		client.disconnect_from_host()
	_clients.clear()
	_server.stop()


func _poll_server() -> void:
	if not _server.is_listening():
		return

	if _server.is_connection_available():
		var client := _server.take_connection()
		if client:
			_clients.append(client)
			_update_status("Client connected (%d active)" % _clients.size())
			print("[MCP Bridge] Client connected from %s" % client.get_connected_host())


func _poll_clients() -> void:
	var disconnected: Array[StreamPeerTCP] = []

	for client in _clients:
		client.poll()

		match client.get_status():
			StreamPeerTCP.STATUS_CONNECTED:
				var available := client.get_available_bytes()
				if available > 0:
					var data := client.get_data(mini(available, BUFFER_SIZE))
					if data[0] == OK:
						_handle_request(client, data[1].get_string_from_utf8())
			StreamPeerTCP.STATUS_NONE, StreamPeerTCP.STATUS_ERROR:
				disconnected.append(client)

	for client in disconnected:
		_clients.erase(client)
		print("[MCP Bridge] Client disconnected")

	if disconnected.size() > 0:
		_update_status("Listening on port %d (%d clients)" % [_port, _clients.size()])


func _handle_request(client: StreamPeerTCP, raw_data: String) -> void:
	var json := JSON.new()
	var parse_result := json.parse(raw_data)

	if parse_result != OK:
		_send_error(client, "invalid_json", "Failed to parse JSON request")
		return

	var request: Dictionary = json.data
	var command: String = request.get("command", "")
	var params: Dictionary = request.get("params", {})
	var request_id: String = request.get("id", "")

	var response: Dictionary = _execute_command(command, params)
	response["id"] = request_id

	_send_response(client, response)


func _execute_command(command: String, params: Dictionary) -> Dictionary:
	match command:
		"ping":
			return {"success": true, "result": {"message": "pong", "version": get_plugin_version()}}

		"get_editor_info":
			return _cmd_get_editor_info()

		"validate_script":
			return _cmd_validate_script(params)

		"get_script_errors":
			return _cmd_get_script_errors(params)

		"reload_script":
			return _cmd_reload_script(params)

		"get_open_scenes":
			return _cmd_get_open_scenes()

		"reload_scene":
			return _cmd_reload_scene(params)

		"get_selected_nodes":
			return _cmd_get_selected_nodes()

		"execute_code":
			return _cmd_execute_code(params)

		"get_autoloads":
			return _cmd_get_autoloads()

		"get_project_settings":
			return _cmd_get_project_settings(params)

		_:
			return {"success": false, "error": {"code": "unknown_command", "message": "Unknown command: %s" % command}}


func _cmd_get_editor_info() -> Dictionary:
	var editor_interface := get_editor_interface()
	return {
		"success": true,
		"result": {
			"godot_version": Engine.get_version_info(),
			"editor_scale": editor_interface.get_editor_scale(),
			"current_path": editor_interface.get_current_path(),
			"playing": editor_interface.is_playing_scene(),
		}
	}


func _cmd_validate_script(params: Dictionary) -> Dictionary:
	var script_path: String = params.get("path", "")
	if script_path.is_empty():
		return {"success": false, "error": {"code": "missing_param", "message": "path is required"}}

	if not FileAccess.file_exists(script_path):
		return {"success": false, "error": {"code": "not_found", "message": "Script not found: %s" % script_path}}

	var script := load(script_path) as Script
	if not script:
		return {"success": false, "error": {"code": "load_failed", "message": "Failed to load script"}}

	# Force recompilation to get fresh errors
	script.reload()

	var errors: Array[Dictionary] = []
	# Note: GDScript doesn't expose parse errors directly, but reload() will print them
	# We can check if the script can be instantiated
	if script.can_instantiate():
		return {"success": true, "result": {"valid": true, "errors": []}}
	else:
		return {"success": true, "result": {"valid": false, "errors": [{"message": "Script has errors (check Godot output)"}]}}


func _cmd_get_script_errors(params: Dictionary) -> Dictionary:
	var script_path: String = params.get("path", "")
	if script_path.is_empty():
		return {"success": false, "error": {"code": "missing_param", "message": "path is required"}}

	# Use the script editor to get errors
	var script_editor := get_editor_interface().get_script_editor()
	var open_scripts := script_editor.get_open_scripts()

	for script in open_scripts:
		if script.resource_path == script_path:
			# Script is open, we can potentially get errors
			# Note: Direct error access is limited in GDScript
			pass

	return {"success": true, "result": {"path": script_path, "errors": []}}


func _cmd_reload_script(params: Dictionary) -> Dictionary:
	var script_path: String = params.get("path", "")
	if script_path.is_empty():
		return {"success": false, "error": {"code": "missing_param", "message": "path is required"}}

	var script := load(script_path) as Script
	if script:
		script.reload()
		return {"success": true, "result": {"reloaded": true}}

	return {"success": false, "error": {"code": "not_found", "message": "Script not found"}}


func _cmd_get_open_scenes() -> Dictionary:
	var editor_interface := get_editor_interface()
	var edited_scene := editor_interface.get_edited_scene_root()

	var scenes: Array[Dictionary] = []
	if edited_scene:
		scenes.append({
			"name": edited_scene.name,
			"path": edited_scene.scene_file_path,
			"type": edited_scene.get_class(),
		})

	return {"success": true, "result": {"scenes": scenes}}


func _cmd_reload_scene(params: Dictionary) -> Dictionary:
	var scene_path: String = params.get("path", "")
	if scene_path.is_empty():
		return {"success": false, "error": {"code": "missing_param", "message": "path is required"}}

	get_editor_interface().reload_scene_from_path(scene_path)
	return {"success": true, "result": {"reloaded": true}}


func _cmd_get_selected_nodes() -> Dictionary:
	var selection := get_editor_interface().get_selection()
	var selected := selection.get_selected_nodes()

	var nodes: Array[Dictionary] = []
	for node in selected:
		nodes.append({
			"name": node.name,
			"type": node.get_class(),
			"path": str(node.get_path()),
		})

	return {"success": true, "result": {"nodes": nodes}}


func _cmd_execute_code(params: Dictionary) -> Dictionary:
	var code: String = params.get("code", "")
	if code.is_empty():
		return {"success": false, "error": {"code": "missing_param", "message": "code is required"}}

	# Security: Only allow in editor, not in exported builds
	if not Engine.is_editor_hint():
		return {"success": false, "error": {"code": "forbidden", "message": "Code execution only allowed in editor"}}

	# Create a temporary script to execute the code
	var script := GDScript.new()
	script.source_code = """
extends RefCounted

func execute():
%s
""" % code.indent("\t")

	var error := script.reload()
	if error != OK:
		return {"success": false, "error": {"code": "compile_error", "message": "Failed to compile code"}}

	var instance := script.new()
	var result = instance.execute()

	return {"success": true, "result": {"output": str(result) if result != null else "null"}}


func _cmd_get_autoloads() -> Dictionary:
	var autoloads: Array[Dictionary] = []

	# Read from project settings
	var settings := ProjectSettings.get_property_list()
	for setting in settings:
		var name: String = setting["name"]
		if name.begins_with("autoload/"):
			var autoload_name := name.trim_prefix("autoload/")
			var path: String = ProjectSettings.get_setting(name)
			autoloads.append({
				"name": autoload_name,
				"path": path,
			})

	return {"success": true, "result": {"autoloads": autoloads}}


func _cmd_get_project_settings(params: Dictionary) -> Dictionary:
	var filter: String = params.get("filter", "")
	var settings_list: Array[Dictionary] = []

	var all_settings := ProjectSettings.get_property_list()
	for setting in all_settings:
		var name: String = setting["name"]
		if filter.is_empty() or name.contains(filter):
			var value = ProjectSettings.get_setting(name)
			settings_list.append({
				"name": name,
				"value": str(value),
				"type": typeof(value),
			})

	return {"success": true, "result": {"settings": settings_list}}


func _send_response(client: StreamPeerTCP, response: Dictionary) -> void:
	var json_str := JSON.stringify(response)
	var data := (json_str + "\n").to_utf8_buffer()
	client.put_data(data)


func _send_error(client: StreamPeerTCP, code: String, message: String) -> void:
	_send_response(client, {
		"success": false,
		"error": {"code": code, "message": message}
	})


func _create_status_ui() -> void:
	_status_label = Label.new()
	_status_label.text = "MCP Bridge: Initializing..."
	add_control_to_container(EditorPlugin.CONTAINER_TOOLBAR, _status_label)


func _remove_status_ui() -> void:
	if _status_label:
		remove_control_from_container(EditorPlugin.CONTAINER_TOOLBAR, _status_label)
		_status_label.queue_free()


func _update_status(status: String) -> void:
	if _status_label:
		_status_label.text = "MCP: %s" % status


func get_plugin_version() -> String:
	return "1.0.0"
