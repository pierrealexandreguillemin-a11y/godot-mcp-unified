@tool
extends "res://addons/godot_mcp/commands/base_command.gd"
class_name MCPViewportCommands
## Viewport-related commands (screenshot capture, etc.)


## Capture the editor viewport as a PNG screenshot.
## Params:
##   viewport: "2d" or "3d" (default "2d")
##   output_path: where to save (default "screenshots/editor_viewport.png")
func capture_viewport(params: Dictionary) -> Dictionary:
	var viewport_type: String = params.get("viewport", "2d")
	var output_path: String = params.get("output_path", "screenshots/editor_viewport.png")

	if viewport_type != "2d" and viewport_type != "3d":
		return _error("INVALID_PARAM", "viewport must be '2d' or '3d', got: %s" % viewport_type)

	# Get the appropriate editor viewport
	var viewport: SubViewport = null
	if viewport_type == "2d":
		viewport = _get_editor_viewport_2d()
	else:
		viewport = _get_editor_viewport_3d()

	if viewport == null:
		return _error("VIEWPORT_NOT_FOUND", "Could not access editor %s viewport" % viewport_type)

	# Get the image from the viewport texture
	var image: Image = viewport.get_texture().get_image()
	if image == null:
		return _error("CAPTURE_FAILED", "Failed to get image from viewport texture")

	# Ensure output directory exists
	var res_path := _normalize_path(output_path)
	var dir_path := res_path.get_base_dir()
	if not DirAccess.dir_exists_absolute(ProjectSettings.globalize_path(dir_path)):
		DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(dir_path))

	# Save the image as PNG
	var abs_path := ProjectSettings.globalize_path(res_path)
	var error := image.save_png(abs_path)
	if error != OK:
		return _error("SAVE_FAILED", "Failed to save screenshot to %s (error %d)" % [abs_path, error])

	return _success({
		"path": abs_path,
		"res_path": res_path,
		"viewport": viewport_type,
		"size": {"width": image.get_width(), "height": image.get_height()},
	})


## Maximum recursion depth for editor UI tree traversal.
## The editor tree is typically 10-20 levels deep; 30 is a safe upper bound.
const MAX_TREE_DEPTH := 30
## Maximum recursion depth when searching for SubViewport under a matched node.
const MAX_SUBVIEWPORT_DEPTH := 10

## Known editor viewport class names per Godot version.
## Add entries here if Godot renames internal classes in future versions.
const VIEWPORT_2D_CLASSES: Array[String] = ["CanvasItemEditor", "CanvasItemEditorViewport"]
const VIEWPORT_3D_CLASSES: Array[String] = ["Node3DEditor", "Node3DEditorViewport"]


## Get the 2D editor viewport
func _get_editor_viewport_2d() -> SubViewport:
	var base_control := _editor_interface.get_base_control()
	for class_hint in VIEWPORT_2D_CLASSES:
		var vp := _find_viewport_in_tree(base_control, class_hint, 0)
		if vp != null:
			return vp
	return null


## Get the 3D editor viewport
func _get_editor_viewport_3d() -> SubViewport:
	var base_control := _editor_interface.get_base_control()
	for class_hint in VIEWPORT_3D_CLASSES:
		var vp := _find_viewport_in_tree(base_control, class_hint, 0)
		if vp != null:
			return vp
	return null


## Recursively search for a SubViewport under a node whose ancestor matches the hint.
## Bounded to MAX_TREE_DEPTH to prevent runaway recursion.
func _find_viewport_in_tree(node: Node, class_hint: String, depth: int) -> SubViewport:
	if node == null or depth > MAX_TREE_DEPTH:
		return null

	# Match by exact class name only (not substring) to avoid false positives
	if node.get_class() == class_hint:
		var vp := _find_first_subviewport(node, 0)
		if vp != null:
			return vp

	# Recurse into children
	for child in node.get_children():
		var result := _find_viewport_in_tree(child, class_hint, depth + 1)
		if result != null:
			return result

	return null


## Find the first SubViewport descendant, bounded to MAX_SUBVIEWPORT_DEPTH.
func _find_first_subviewport(node: Node, depth: int) -> SubViewport:
	if depth > MAX_SUBVIEWPORT_DEPTH:
		return null
	if node is SubViewport:
		return node as SubViewport
	for child in node.get_children():
		var result := _find_first_subviewport(child, depth + 1)
		if result != null:
			return result
	return null
