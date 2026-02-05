@tool
extends RefCounted
class_name MCPNodeFactory
## Factory for creating Godot nodes by type name.
## Centralized to avoid duplication (ISO 5055 DRY compliance).


## Create a node of the specified type
## Returns null if type is invalid or cannot be instantiated
static func create_node(type_name: String) -> Node:
	# Common 2D nodes
	match type_name:
		"Node": return Node.new()
		"Node2D": return Node2D.new()
		"Sprite2D": return Sprite2D.new()
		"AnimatedSprite2D": return AnimatedSprite2D.new()
		"Camera2D": return Camera2D.new()
		"CharacterBody2D": return CharacterBody2D.new()
		"RigidBody2D": return RigidBody2D.new()
		"StaticBody2D": return StaticBody2D.new()
		"Area2D": return Area2D.new()
		"CollisionShape2D": return CollisionShape2D.new()
		"CollisionPolygon2D": return CollisionPolygon2D.new()
		"RayCast2D": return RayCast2D.new()
		"ShapeCast2D": return ShapeCast2D.new()
		"Path2D": return Path2D.new()
		"PathFollow2D": return PathFollow2D.new()
		"Line2D": return Line2D.new()
		"Polygon2D": return Polygon2D.new()
		"LightOccluder2D": return LightOccluder2D.new()
		"PointLight2D": return PointLight2D.new()
		"DirectionalLight2D": return DirectionalLight2D.new()
		"GPUParticles2D": return GPUParticles2D.new()
		"CPUParticles2D": return CPUParticles2D.new()
		"NavigationAgent2D": return NavigationAgent2D.new()
		"NavigationRegion2D": return NavigationRegion2D.new()
		"TileMap": return TileMap.new()
		"TileMapLayer": return TileMapLayer.new()
		"ParallaxBackground": return ParallaxBackground.new()
		"ParallaxLayer": return ParallaxLayer.new()
		"BackBufferCopy": return BackBufferCopy.new()
		"VisibleOnScreenNotifier2D": return VisibleOnScreenNotifier2D.new()
		"VisibleOnScreenEnabler2D": return VisibleOnScreenEnabler2D.new()
		"RemoteTransform2D": return RemoteTransform2D.new()
		"Skeleton2D": return Skeleton2D.new()
		"Bone2D": return Bone2D.new()
		"PhysicalBone2D": return PhysicalBone2D.new()
		"Joint2D": return Joint2D.new()
		"PinJoint2D": return PinJoint2D.new()
		"DampedSpringJoint2D": return DampedSpringJoint2D.new()
		"GrooveJoint2D": return GrooveJoint2D.new()

	# Common 3D nodes
	match type_name:
		"Node3D": return Node3D.new()
		"Sprite3D": return Sprite3D.new()
		"AnimatedSprite3D": return AnimatedSprite3D.new()
		"Camera3D": return Camera3D.new()
		"CharacterBody3D": return CharacterBody3D.new()
		"RigidBody3D": return RigidBody3D.new()
		"StaticBody3D": return StaticBody3D.new()
		"Area3D": return Area3D.new()
		"CollisionShape3D": return CollisionShape3D.new()
		"CollisionPolygon3D": return CollisionPolygon3D.new()
		"RayCast3D": return RayCast3D.new()
		"ShapeCast3D": return ShapeCast3D.new()
		"Path3D": return Path3D.new()
		"PathFollow3D": return PathFollow3D.new()
		"MeshInstance3D": return MeshInstance3D.new()
		"MultiMeshInstance3D": return MultiMeshInstance3D.new()
		"CSGBox3D": return CSGBox3D.new()
		"CSGCylinder3D": return CSGCylinder3D.new()
		"CSGSphere3D": return CSGSphere3D.new()
		"CSGTorus3D": return CSGTorus3D.new()
		"CSGPolygon3D": return CSGPolygon3D.new()
		"CSGMesh3D": return CSGMesh3D.new()
		"CSGCombiner3D": return CSGCombiner3D.new()
		"DirectionalLight3D": return DirectionalLight3D.new()
		"OmniLight3D": return OmniLight3D.new()
		"SpotLight3D": return SpotLight3D.new()
		"GPUParticles3D": return GPUParticles3D.new()
		"CPUParticles3D": return CPUParticles3D.new()
		"GPUParticlesAttractor3D": return GPUParticlesAttractor3D.new()
		"GPUParticlesCollision3D": return GPUParticlesCollision3D.new()
		"FogVolume": return FogVolume.new()
		"ReflectionProbe": return ReflectionProbe.new()
		"VoxelGI": return VoxelGI.new()
		"LightmapGI": return LightmapGI.new()
		"WorldEnvironment": return WorldEnvironment.new()
		"NavigationAgent3D": return NavigationAgent3D.new()
		"NavigationRegion3D": return NavigationRegion3D.new()
		"NavigationLink3D": return NavigationLink3D.new()
		"NavigationObstacle3D": return NavigationObstacle3D.new()
		"Skeleton3D": return Skeleton3D.new()
		"BoneAttachment3D": return BoneAttachment3D.new()
		"PhysicalBone3D": return PhysicalBone3D.new()
		"Joint3D": return Joint3D.new()
		"PinJoint3D": return PinJoint3D.new()
		"HingeJoint3D": return HingeJoint3D.new()
		"SliderJoint3D": return SliderJoint3D.new()
		"ConeTwistJoint3D": return ConeTwistJoint3D.new()
		"Generic6DOFJoint3D": return Generic6DOFJoint3D.new()
		"VehicleBody3D": return VehicleBody3D.new()
		"VehicleWheel3D": return VehicleWheel3D.new()
		"SoftBody3D": return SoftBody3D.new()
		"SpringArm3D": return SpringArm3D.new()
		"RemoteTransform3D": return RemoteTransform3D.new()
		"VisibleOnScreenNotifier3D": return VisibleOnScreenNotifier3D.new()
		"VisibleOnScreenEnabler3D": return VisibleOnScreenEnabler3D.new()
		"Decal": return Decal.new()
		"OccluderInstance3D": return OccluderInstance3D.new()

	# UI Control nodes
	match type_name:
		"Control": return Control.new()
		"CanvasLayer": return CanvasLayer.new()
		"CanvasGroup": return CanvasGroup.new()
		"SubViewport": return SubViewport.new()
		"SubViewportContainer": return SubViewportContainer.new()
		"Label": return Label.new()
		"RichTextLabel": return RichTextLabel.new()
		"Button": return Button.new()
		"LinkButton": return LinkButton.new()
		"TextureButton": return TextureButton.new()
		"CheckBox": return CheckBox.new()
		"CheckButton": return CheckButton.new()
		"MenuButton": return MenuButton.new()
		"OptionButton": return OptionButton.new()
		"LineEdit": return LineEdit.new()
		"TextEdit": return TextEdit.new()
		"CodeEdit": return CodeEdit.new()
		"SpinBox": return SpinBox.new()
		"HSlider": return HSlider.new()
		"VSlider": return VSlider.new()
		"HScrollBar": return HScrollBar.new()
		"VScrollBar": return VScrollBar.new()
		"ProgressBar": return ProgressBar.new()
		"TextureProgressBar": return TextureProgressBar.new()
		"TextureRect": return TextureRect.new()
		"NinePatchRect": return NinePatchRect.new()
		"ColorRect": return ColorRect.new()
		"Panel": return Panel.new()
		"PanelContainer": return PanelContainer.new()
		"ScrollContainer": return ScrollContainer.new()
		"MarginContainer": return MarginContainer.new()
		"CenterContainer": return CenterContainer.new()
		"AspectRatioContainer": return AspectRatioContainer.new()
		"HBoxContainer": return HBoxContainer.new()
		"VBoxContainer": return VBoxContainer.new()
		"GridContainer": return GridContainer.new()
		"FlowContainer": return FlowContainer.new()
		"HFlowContainer": return HFlowContainer.new()
		"VFlowContainer": return VFlowContainer.new()
		"HSplitContainer": return HSplitContainer.new()
		"VSplitContainer": return VSplitContainer.new()
		"TabContainer": return TabContainer.new()
		"TabBar": return TabBar.new()
		"ItemList": return ItemList.new()
		"Tree": return Tree.new()
		"GraphEdit": return GraphEdit.new()
		"GraphNode": return GraphNode.new()
		"ColorPicker": return ColorPicker.new()
		"ColorPickerButton": return ColorPickerButton.new()
		"FileDialog": return FileDialog.new()
		"PopupMenu": return PopupMenu.new()
		"PopupPanel": return PopupPanel.new()
		"MenuBar": return MenuBar.new()
		"VideoStreamPlayer": return VideoStreamPlayer.new()
		"ReferenceRect": return ReferenceRect.new()

	# Audio nodes
	match type_name:
		"AudioStreamPlayer": return AudioStreamPlayer.new()
		"AudioStreamPlayer2D": return AudioStreamPlayer2D.new()
		"AudioStreamPlayer3D": return AudioStreamPlayer3D.new()
		"AudioListener2D": return AudioListener2D.new()
		"AudioListener3D": return AudioListener3D.new()

	# Animation nodes
	match type_name:
		"AnimationPlayer": return AnimationPlayer.new()
		"AnimationTree": return AnimationTree.new()
		"AnimationMixer": return AnimationMixer.new()
		"Tween": return Tween.new()

	# Utility nodes
	match type_name:
		"Timer": return Timer.new()
		"HTTPRequest": return HTTPRequest.new()
		"ResourcePreloader": return ResourcePreloader.new()
		"MultiplayerSpawner": return MultiplayerSpawner.new()
		"MultiplayerSynchronizer": return MultiplayerSynchronizer.new()
		"CanvasModulate": return CanvasModulate.new()

	# XR nodes
	match type_name:
		"XROrigin3D": return XROrigin3D.new()
		"XRCamera3D": return XRCamera3D.new()
		"XRController3D": return XRController3D.new()
		"XRAnchor3D": return XRAnchor3D.new()

	# Fallback: try ClassDB instantiation
	if ClassDB.class_exists(type_name):
		if ClassDB.can_instantiate(type_name):
			var obj = ClassDB.instantiate(type_name)
			if obj is Node:
				return obj
			elif obj:
				obj.free()

	return null


## Check if a type name is valid and can be instantiated
static func is_valid_node_type(type_name: String) -> bool:
	if type_name.is_empty():
		return false

	# Check known types (fast path)
	var known_types := [
		"Node", "Node2D", "Node3D", "Control", "CanvasLayer",
		"Sprite2D", "Sprite3D", "Camera2D", "Camera3D",
		"CharacterBody2D", "CharacterBody3D", "RigidBody2D", "RigidBody3D",
		"StaticBody2D", "StaticBody3D", "Area2D", "Area3D",
		"CollisionShape2D", "CollisionShape3D", "Label", "Button",
		"Timer", "AnimationPlayer", "AudioStreamPlayer",
	]

	if type_name in known_types:
		return true

	# Check ClassDB
	return ClassDB.class_exists(type_name) and ClassDB.can_instantiate(type_name)


## Get the base type that a node type extends
static func get_base_type(type_name: String) -> String:
	if not ClassDB.class_exists(type_name):
		return ""
	return ClassDB.get_parent_class(type_name)


## Check if a type is a 2D node
static func is_2d_type(type_name: String) -> bool:
	if not ClassDB.class_exists(type_name):
		return false
	return ClassDB.is_parent_class(type_name, "Node2D") or type_name == "Node2D"


## Check if a type is a 3D node
static func is_3d_type(type_name: String) -> bool:
	if not ClassDB.class_exists(type_name):
		return false
	return ClassDB.is_parent_class(type_name, "Node3D") or type_name == "Node3D"


## Check if a type is a Control node
static func is_control_type(type_name: String) -> bool:
	if not ClassDB.class_exists(type_name):
		return false
	return ClassDB.is_parent_class(type_name, "Control") or type_name == "Control"
