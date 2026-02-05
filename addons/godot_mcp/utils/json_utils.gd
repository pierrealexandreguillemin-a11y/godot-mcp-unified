@tool
extends RefCounted
class_name MCPJsonUtils
## JSON parsing and serialization utilities for MCP protocol.


## Parse JSON string safely, returns null on error
static func parse_json(json_str: String) -> Variant:
	var result = JSON.parse_string(json_str)
	return result


## Stringify a value to JSON
static func stringify(value: Variant, indent: String = "") -> String:
	return JSON.stringify(value, indent)


## Convert Godot types to JSON-serializable format
static func serialize_value(value: Variant) -> Variant:
	if value == null:
		return null

	# Vector types
	if value is Vector2:
		return {"x": value.x, "y": value.y}
	elif value is Vector2i:
		return {"x": value.x, "y": value.y}
	elif value is Vector3:
		return {"x": value.x, "y": value.y, "z": value.z}
	elif value is Vector3i:
		return {"x": value.x, "y": value.y, "z": value.z}
	elif value is Vector4:
		return {"x": value.x, "y": value.y, "z": value.z, "w": value.w}
	elif value is Vector4i:
		return {"x": value.x, "y": value.y, "z": value.z, "w": value.w}

	# Color
	elif value is Color:
		return {"r": value.r, "g": value.g, "b": value.b, "a": value.a}

	# Rect2
	elif value is Rect2:
		return {
			"position": {"x": value.position.x, "y": value.position.y},
			"size": {"x": value.size.x, "y": value.size.y}
		}
	elif value is Rect2i:
		return {
			"position": {"x": value.position.x, "y": value.position.y},
			"size": {"x": value.size.x, "y": value.size.y}
		}

	# Transform types
	elif value is Transform2D:
		return {
			"x": {"x": value.x.x, "y": value.x.y},
			"y": {"x": value.y.x, "y": value.y.y},
			"origin": {"x": value.origin.x, "y": value.origin.y}
		}

	# Basis and Transform3D
	elif value is Basis:
		return {
			"x": {"x": value.x.x, "y": value.x.y, "z": value.x.z},
			"y": {"x": value.y.x, "y": value.y.y, "z": value.y.z},
			"z": {"x": value.z.x, "y": value.z.y, "z": value.z.z}
		}
	elif value is Transform3D:
		return {
			"basis": serialize_value(value.basis),
			"origin": {"x": value.origin.x, "y": value.origin.y, "z": value.origin.z}
		}

	# Resources
	elif value is Resource:
		return value.resource_path if not value.resource_path.is_empty() else null

	# Nodes
	elif value is Node:
		return str(value.get_path()) if value.is_inside_tree() else value.name

	# Objects (can't serialize)
	elif value is Object:
		return "<Object: %s>" % value.get_class()

	# Arrays
	elif value is Array:
		var arr := []
		for item in value:
			arr.append(serialize_value(item))
		return arr

	# Packed arrays
	elif value is PackedStringArray:
		return Array(value)
	elif value is PackedInt32Array or value is PackedInt64Array:
		return Array(value)
	elif value is PackedFloat32Array or value is PackedFloat64Array:
		return Array(value)
	elif value is PackedVector2Array:
		var arr := []
		for v in value:
			arr.append(serialize_value(v))
		return arr
	elif value is PackedVector3Array:
		var arr := []
		for v in value:
			arr.append(serialize_value(v))
		return arr
	elif value is PackedColorArray:
		var arr := []
		for c in value:
			arr.append(serialize_value(c))
		return arr

	# Dictionaries
	elif value is Dictionary:
		var dict := {}
		for key in value.keys():
			dict[str(key)] = serialize_value(value[key])
		return dict

	# Primitives (String, int, float, bool)
	else:
		return value


## Deserialize JSON values back to Godot types
static func deserialize_value(value: Variant, type_hint: String = "") -> Variant:
	if value == null:
		return null

	# Dictionary-based type detection
	if value is Dictionary:
		# Vector2
		if value.has("x") and value.has("y") and not value.has("z"):
			return Vector2(value.x, value.y)

		# Vector3
		if value.has("x") and value.has("y") and value.has("z") and not value.has("w"):
			return Vector3(value.x, value.y, value.z)

		# Vector4
		if value.has("x") and value.has("y") and value.has("z") and value.has("w"):
			return Vector4(value.x, value.y, value.z, value.w)

		# Color
		if value.has("r") and value.has("g") and value.has("b"):
			var a := value.get("a", 1.0)
			return Color(value.r, value.g, value.b, a)

		# Rect2
		if value.has("position") and value.has("size"):
			var pos := deserialize_value(value.position) as Vector2
			var size := deserialize_value(value.size) as Vector2
			return Rect2(pos, size)

	# Resource path
	if value is String and value.begins_with("res://"):
		if type_hint == "path":
			return value
		var resource := ResourceLoader.load(value)
		return resource if resource else value

	return value
