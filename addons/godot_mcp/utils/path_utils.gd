@tool
extends RefCounted
class_name MCPPathUtils
## Path normalization and validation utilities for MCP protocol.


## Normalize a path to use res:// prefix
static func normalize_resource_path(path: String) -> String:
	if path.is_empty():
		return ""

	# Already normalized
	if path.begins_with("res://"):
		return path

	# Remove leading slashes
	path = path.lstrip("/")

	return "res://" + path


## Convert resource path to absolute filesystem path
static func to_absolute_path(res_path: String) -> String:
	return ProjectSettings.globalize_path(res_path)


## Convert absolute path to resource path
static func to_resource_path(abs_path: String) -> String:
	return ProjectSettings.localize_path(abs_path)


## Check if a resource path exists
static func resource_exists(res_path: String) -> bool:
	return ResourceLoader.exists(res_path)


## Check if a file exists at the resource path
static func file_exists(res_path: String) -> bool:
	return FileAccess.file_exists(to_absolute_path(res_path))


## Check if a directory exists at the resource path
static func dir_exists(res_path: String) -> bool:
	return DirAccess.dir_exists_absolute(to_absolute_path(res_path))


## Get the base directory of a path
static func get_base_dir(path: String) -> String:
	return path.get_base_dir()


## Get the file name from a path
static func get_file_name(path: String) -> String:
	return path.get_file()


## Get the file name without extension
static func get_base_name(path: String) -> String:
	return path.get_file().get_basename()


## Get the file extension
static func get_extension(path: String) -> String:
	return path.get_extension()


## Check if path has a valid scene extension
static func is_scene_path(path: String) -> bool:
	var ext := path.get_extension().to_lower()
	return ext == "tscn" or ext == "scn"


## Check if path has a valid script extension
static func is_script_path(path: String) -> bool:
	var ext := path.get_extension().to_lower()
	return ext == "gd" or ext == "gdscript"


## Check if path has a valid resource extension
static func is_resource_path(path: String) -> bool:
	var ext := path.get_extension().to_lower()
	return ext == "tres" or ext == "res"


## Ensure directory exists, create if needed
static func ensure_dir_exists(res_path: String) -> Error:
	var dir_path := get_base_dir(res_path)
	if dir_path.is_empty() or dir_path == "res://":
		return OK

	var abs_path := to_absolute_path(dir_path)
	if DirAccess.dir_exists_absolute(abs_path):
		return OK

	return DirAccess.make_dir_recursive_absolute(abs_path)


## Join path components
static func join_paths(base: String, child: String) -> String:
	if base.is_empty():
		return child
	if child.is_empty():
		return base

	base = base.rstrip("/")
	child = child.lstrip("/")

	return base + "/" + child


## Validate a node path string
static func is_valid_node_path(path: String) -> bool:
	if path.is_empty():
		return false

	# Special case for root
	if path == ".":
		return true

	# Check for invalid characters
	var invalid_chars := [":", ",", ";", "[", "]", "{", "}", "(", ")", "=", "+", "*", "?", "!"]
	for char in invalid_chars:
		if path.contains(char):
			return false

	return true


## Sanitize a name to be valid as a node or file name
static func sanitize_name(name: String) -> String:
	# Replace invalid characters with underscore
	var invalid_chars := [":", "/", "\\", ".", ",", ";", "[", "]", "{", "}", "(", ")", "=", "+", "*", "?", "!", "<", ">", "|", "\"", "'"]
	var result := name

	for char in invalid_chars:
		result = result.replace(char, "_")

	# Remove leading/trailing whitespace and underscores
	result = result.strip_edges()
	while result.begins_with("_"):
		result = result.substr(1)
	while result.ends_with("_"):
		result = result.left(-1)

	# Ensure non-empty
	if result.is_empty():
		result = "unnamed"

	return result
