@tool
extends RefCounted
class_name MCPValidator
## Parameter validation utilities for MCP commands.
## Provides Zod-like validation for GDScript (ISO 5055 compliance).


## Validation result
class ValidationResult:
	var valid: bool
	var error_code: String
	var error_message: String

	func _init(p_valid: bool = true, p_code: String = "", p_message: String = "") -> void:
		valid = p_valid
		error_code = p_code
		error_message = p_message

	static func ok() -> ValidationResult:
		return ValidationResult.new(true)

	static func fail(code: String, message: String) -> ValidationResult:
		return ValidationResult.new(false, code, message)


## Validate that a required parameter exists and is not null/empty
static func require_string(params: Dictionary, key: String, min_length: int = 1, max_length: int = 1000) -> ValidationResult:
	if not params.has(key):
		return ValidationResult.fail("MISSING_PARAM", "Required parameter missing: %s" % key)

	var value = params[key]
	if value == null:
		return ValidationResult.fail("NULL_PARAM", "Parameter cannot be null: %s" % key)

	if not value is String:
		return ValidationResult.fail("INVALID_TYPE", "Parameter must be a string: %s (got %s)" % [key, typeof(value)])

	var str_value: String = value
	if str_value.length() < min_length:
		return ValidationResult.fail("TOO_SHORT", "Parameter %s must be at least %d characters" % [key, min_length])

	if str_value.length() > max_length:
		return ValidationResult.fail("TOO_LONG", "Parameter %s must be at most %d characters" % [key, max_length])

	return ValidationResult.ok()


## Validate a resource path (res://)
static func require_resource_path(params: Dictionary, key: String) -> ValidationResult:
	var result := require_string(params, key)
	if not result.valid:
		return result

	var path: String = params[key]

	# Allow paths without res:// prefix (will be normalized)
	if not path.begins_with("res://") and not path.begins_with("/"):
		# Relative path, will be prefixed with res://
		return ValidationResult.ok()

	if path.begins_with("res://"):
		if path.length() < 7:  # "res://" is 6 chars, need at least 1 more
			return ValidationResult.fail("INVALID_PATH", "Resource path is too short: %s" % path)
		return ValidationResult.ok()

	return ValidationResult.fail("INVALID_PATH", "Path must start with res:// or be relative: %s" % path)


## Validate a scene path (.tscn or .scn)
static func require_scene_path(params: Dictionary, key: String) -> ValidationResult:
	var result := require_resource_path(params, key)
	if not result.valid:
		return result

	var path: String = params[key]
	var ext := path.get_extension().to_lower()

	if ext != "tscn" and ext != "scn":
		return ValidationResult.fail("INVALID_EXTENSION", "Scene path must have .tscn or .scn extension: %s" % path)

	return ValidationResult.ok()


## Validate a script path (.gd)
static func require_script_path(params: Dictionary, key: String) -> ValidationResult:
	var result := require_resource_path(params, key)
	if not result.valid:
		return result

	var path: String = params[key]
	var ext := path.get_extension().to_lower()

	if ext != "gd" and ext != "gdscript":
		return ValidationResult.fail("INVALID_EXTENSION", "Script path must have .gd extension: %s" % path)

	return ValidationResult.ok()


## Validate a node type name
static func require_node_type(params: Dictionary, key: String) -> ValidationResult:
	var result := require_string(params, key, 1, 100)
	if not result.valid:
		return result

	var type_name: String = params[key]

	if not MCPNodeFactory.is_valid_node_type(type_name):
		return ValidationResult.fail("INVALID_NODE_TYPE", "Unknown or non-instantiable node type: %s" % type_name)

	return ValidationResult.ok()


## Validate a node name (valid identifier)
static func require_node_name(params: Dictionary, key: String) -> ValidationResult:
	var result := require_string(params, key, 1, 100)
	if not result.valid:
		return result

	var name: String = params[key]

	# Check for invalid characters
	var invalid_chars := [":", "/", "\\", ".", "@", "\"", "'"]
	for char in invalid_chars:
		if name.contains(char):
			return ValidationResult.fail("INVALID_NAME", "Node name contains invalid character '%s': %s" % [char, name])

	return ValidationResult.ok()


## Validate an integer parameter
static func require_int(params: Dictionary, key: String, min_val: int = -2147483648, max_val: int = 2147483647) -> ValidationResult:
	if not params.has(key):
		return ValidationResult.fail("MISSING_PARAM", "Required parameter missing: %s" % key)

	var value = params[key]
	if value == null:
		return ValidationResult.fail("NULL_PARAM", "Parameter cannot be null: %s" % key)

	if not (value is int or value is float):
		return ValidationResult.fail("INVALID_TYPE", "Parameter must be an integer: %s" % key)

	var int_value: int = int(value)
	if int_value < min_val:
		return ValidationResult.fail("OUT_OF_RANGE", "Parameter %s must be >= %d" % [key, min_val])

	if int_value > max_val:
		return ValidationResult.fail("OUT_OF_RANGE", "Parameter %s must be <= %d" % [key, max_val])

	return ValidationResult.ok()


## Validate a float parameter
static func require_float(params: Dictionary, key: String, min_val: float = -INF, max_val: float = INF) -> ValidationResult:
	if not params.has(key):
		return ValidationResult.fail("MISSING_PARAM", "Required parameter missing: %s" % key)

	var value = params[key]
	if value == null:
		return ValidationResult.fail("NULL_PARAM", "Parameter cannot be null: %s" % key)

	if not (value is int or value is float):
		return ValidationResult.fail("INVALID_TYPE", "Parameter must be a number: %s" % key)

	var float_value: float = float(value)
	if float_value < min_val:
		return ValidationResult.fail("OUT_OF_RANGE", "Parameter %s must be >= %f" % [key, min_val])

	if float_value > max_val:
		return ValidationResult.fail("OUT_OF_RANGE", "Parameter %s must be <= %f" % [key, max_val])

	return ValidationResult.ok()


## Validate a boolean parameter
static func require_bool(params: Dictionary, key: String) -> ValidationResult:
	if not params.has(key):
		return ValidationResult.fail("MISSING_PARAM", "Required parameter missing: %s" % key)

	var value = params[key]
	if value == null:
		return ValidationResult.fail("NULL_PARAM", "Parameter cannot be null: %s" % key)

	if not value is bool:
		return ValidationResult.fail("INVALID_TYPE", "Parameter must be a boolean: %s" % key)

	return ValidationResult.ok()


## Validate a dictionary parameter
static func require_dict(params: Dictionary, key: String) -> ValidationResult:
	if not params.has(key):
		return ValidationResult.fail("MISSING_PARAM", "Required parameter missing: %s" % key)

	var value = params[key]
	if value == null:
		return ValidationResult.fail("NULL_PARAM", "Parameter cannot be null: %s" % key)

	if not value is Dictionary:
		return ValidationResult.fail("INVALID_TYPE", "Parameter must be a dictionary: %s" % key)

	return ValidationResult.ok()


## Validate an array parameter
static func require_array(params: Dictionary, key: String, min_length: int = 0, max_length: int = 1000) -> ValidationResult:
	if not params.has(key):
		return ValidationResult.fail("MISSING_PARAM", "Required parameter missing: %s" % key)

	var value = params[key]
	if value == null:
		return ValidationResult.fail("NULL_PARAM", "Parameter cannot be null: %s" % key)

	if not value is Array:
		return ValidationResult.fail("INVALID_TYPE", "Parameter must be an array: %s" % key)

	var arr: Array = value
	if arr.size() < min_length:
		return ValidationResult.fail("TOO_SHORT", "Array %s must have at least %d elements" % [key, min_length])

	if arr.size() > max_length:
		return ValidationResult.fail("TOO_LONG", "Array %s must have at most %d elements" % [key, max_length])

	return ValidationResult.ok()


## Validate an optional string parameter (returns ok if missing)
static func optional_string(params: Dictionary, key: String, min_length: int = 0, max_length: int = 1000) -> ValidationResult:
	if not params.has(key) or params[key] == null:
		return ValidationResult.ok()
	return require_string(params, key, min_length, max_length)


## Validate an optional int parameter
static func optional_int(params: Dictionary, key: String, min_val: int = -2147483648, max_val: int = 2147483647) -> ValidationResult:
	if not params.has(key) or params[key] == null:
		return ValidationResult.ok()
	return require_int(params, key, min_val, max_val)


## Validate an optional bool parameter
static func optional_bool(params: Dictionary, key: String) -> ValidationResult:
	if not params.has(key) or params[key] == null:
		return ValidationResult.ok()
	return require_bool(params, key)


## Validate an optional dict parameter
static func optional_dict(params: Dictionary, key: String) -> ValidationResult:
	if not params.has(key) or params[key] == null:
		return ValidationResult.ok()
	return require_dict(params, key)


## Combine multiple validation results
static func all(results: Array[ValidationResult]) -> ValidationResult:
	for result in results:
		if not result.valid:
			return result
	return ValidationResult.ok()
