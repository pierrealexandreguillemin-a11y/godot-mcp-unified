@tool
extends "res://addons/godot_mcp/commands/base_command.gd"
class_name MCPProjectCommands
## Project-related MCP commands.
## Handles running/stopping project and getting project info.
## ISO 5055 compliant - uses centralized validation.

var _running_pid: int = -1


## Run the project
func run_project(params: Dictionary) -> Dictionary:
	# Validate optional parameters
	var v := MCPValidator
	var validation := v.all([
		v.optional_string(params, "scene", 0, 500),
		v.optional_bool(params, "debug"),
	])
	if not validation.valid:
		return _error(validation.error_code, validation.error_message)

	var scene: String = params.get("scene", "")
	var debug: bool = params.get("debug", true)

	# Check if already running
	if _editor_interface.is_playing_scene():
		return _error("ALREADY_RUNNING", "Project is already running")

	# Run the project via EditorInterface
	if scene.is_empty():
		_editor_interface.play_main_scene()
	else:
		var scene_path := _normalize_path(scene)
		if not ResourceLoader.exists(scene_path):
			return _error("SCENE_NOT_FOUND", "Scene not found: %s" % scene_path)
		_editor_interface.play_custom_scene(scene_path)

	# Emit event
	_emit_event("project_started", {
		"scene": scene if not scene.is_empty() else "main",
		"debug": debug
	})

	return _success({
		"status": "running",
		"scene": scene if not scene.is_empty() else "main"
	})


## Stop the running project
func stop_project() -> Dictionary:
	if _editor_interface.is_playing_scene():
		_editor_interface.stop_playing_scene()
		_running_pid = -1

		# Emit event
		_emit_event("project_stopped", {})

		return _success({"status": "stopped"})

	return _error("NOT_RUNNING", "No project is currently running")


## Get project information
func get_project_info() -> Dictionary:
	var project_settings := {}

	# Basic project info
	project_settings["name"] = ProjectSettings.get_setting("application/config/name", "Unnamed")
	project_settings["version"] = ProjectSettings.get_setting("application/config/version", "")
	project_settings["description"] = ProjectSettings.get_setting("application/config/description", "")

	# Main scene
	project_settings["main_scene"] = ProjectSettings.get_setting("application/run/main_scene", "")

	# Rendering
	project_settings["renderer"] = ProjectSettings.get_setting("rendering/renderer/rendering_method", "")

	# Window settings
	project_settings["window_width"] = ProjectSettings.get_setting("display/window/size/viewport_width", 1152)
	project_settings["window_height"] = ProjectSettings.get_setting("display/window/size/viewport_height", 648)

	# Physics
	project_settings["physics_fps"] = ProjectSettings.get_setting("physics/common/physics_ticks_per_second", 60)

	# Godot version
	var version_info := Engine.get_version_info()
	project_settings["godot_version"] = "%s.%s.%s" % [
		version_info.major,
		version_info.minor,
		version_info.patch
	]

	# Check if project is running
	project_settings["is_running"] = _editor_interface.is_playing_scene()

	# Current scene info
	var root := _get_edited_scene_root()
	if root:
		project_settings["current_scene"] = {
			"path": root.scene_file_path,
			"root_name": root.name,
			"root_type": root.get_class()
		}
	else:
		project_settings["current_scene"] = null

	# Get autoload singletons
	var autoloads: Array[Dictionary] = []
	for setting in ProjectSettings.get_property_list():
		if setting.name.begins_with("autoload/"):
			var autoload_name := setting.name.substr(9)
			var autoload_value: String = ProjectSettings.get_setting(setting.name, "")
			autoloads.append({
				"name": autoload_name,
				"path": autoload_value.trim_prefix("*")  # Remove * prefix for singletons
			})

	project_settings["autoloads"] = autoloads

	# Input actions (first 20)
	var input_actions: Array[String] = []
	for action in InputMap.get_actions():
		if not action.begins_with("ui_"):  # Skip built-in UI actions
			input_actions.append(action)
			if input_actions.size() >= 20:
				break

	project_settings["custom_input_actions"] = input_actions

	return _success(project_settings)


## Emit an event via the server
func _emit_event(event_type: String, data: Dictionary) -> void:
	if has_signal("event_emitted"):
		emit_signal("event_emitted", event_type, data)
