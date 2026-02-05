@tool
extends EditorPlugin
## Main entry point for the Godot MCP plugin.
## Provides WebSocket server for AI-assisted development via MCP protocol.

const MCPWebSocketServer := preload("res://addons/godot_mcp/mcp_websocket_server.gd")

const MCP_PORT := 6505

var _websocket_server: Node


func _enter_tree() -> void:
	_websocket_server = MCPWebSocketServer.new()
	_websocket_server.name = "MCPWebSocketServer"
	add_child(_websocket_server)

	var err := _websocket_server.start(MCP_PORT, get_editor_interface())
	if err != OK:
		push_error("[MCP] Failed to start WebSocket server: %s" % error_string(err))
		return

	print("[MCP] Plugin started on ws://localhost:%d" % MCP_PORT)


func _exit_tree() -> void:
	if _websocket_server:
		_websocket_server.stop()
		_websocket_server.queue_free()
		_websocket_server = null
	print("[MCP] Plugin stopped")
