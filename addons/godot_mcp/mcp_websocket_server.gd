@tool
extends Node
class_name MCPWebSocketServer
## WebSocket server for MCP communication.
## Uses TCPServer with WebSocketPeer for handling connections.

signal client_connected(client_id: int)
signal client_disconnected(client_id: int)
signal message_received(client_id: int, message: String)

const HANDSHAKE_TIMEOUT := 3.0
const REQUEST_TIMEOUT := 30.0

var _tcp_server: TCPServer
var _port: int
var _peers: Dictionary = {}  # {id: WebSocketPeer}
var _pending: Dictionary = {}  # {id: {stream: StreamPeerTCP, time: int}}
var _command_handler: Node
var _editor_interface: EditorInterface


func start(port: int, editor_interface: EditorInterface) -> Error:
	_port = port
	_editor_interface = editor_interface
	_tcp_server = TCPServer.new()

	var MCPCommandHandler := preload("res://addons/godot_mcp/mcp_command_handler.gd")
	_command_handler = MCPCommandHandler.new()
	_command_handler.name = "MCPCommandHandler"
	_command_handler.initialize(self, editor_interface)
	add_child(_command_handler)

	var err := _tcp_server.listen(port, "127.0.0.1")
	if err != OK:
		push_error("[MCP] Failed to listen on port %d: %s" % [port, error_string(err)])
		return err

	set_process(true)
	return OK


func stop() -> void:
	set_process(false)

	for id in _peers.keys():
		_peers[id].close()
	_peers.clear()

	for id in _pending.keys():
		_pending[id].stream.disconnect_from_host()
	_pending.clear()

	if _tcp_server:
		_tcp_server.stop()
		_tcp_server = null


func _process(_delta: float) -> void:
	_accept_new_connections()
	_process_pending_handshakes()
	_poll_peers()


func _accept_new_connections() -> void:
	while _tcp_server.is_connection_available():
		var conn := _tcp_server.take_connection()
		if conn:
			var id := randi()
			_pending[id] = {
				"stream": conn,
				"time": Time.get_ticks_msec()
			}


func _process_pending_handshakes() -> void:
	var now := Time.get_ticks_msec()
	var to_remove: Array[int] = []

	for id in _pending.keys():
		var pending: Dictionary = _pending[id]
		var stream: StreamPeerTCP = pending.stream

		# Timeout check
		if (now - pending.time) > HANDSHAKE_TIMEOUT * 1000:
			stream.disconnect_from_host()
			to_remove.append(id)
			continue

		# Poll the stream
		stream.poll()
		if stream.get_status() != StreamPeerTCP.STATUS_CONNECTED:
			continue

		# Try WebSocket handshake
		var ws := WebSocketPeer.new()
		var err := ws.accept_stream(stream)
		if err == OK:
			to_remove.append(id)
			_peers[id] = ws
			client_connected.emit(id)
			print("[MCP] Client connected: %d" % id)

	for id in to_remove:
		_pending.erase(id)


func _poll_peers() -> void:
	var to_remove: Array[int] = []

	for id in _peers.keys():
		var peer: WebSocketPeer = _peers[id]
		peer.poll()

		match peer.get_ready_state():
			WebSocketPeer.STATE_OPEN:
				while peer.get_available_packet_count() > 0:
					var packet := peer.get_packet()
					var message := packet.get_string_from_utf8()
					_handle_message(id, message)
			WebSocketPeer.STATE_CLOSED:
				print("[MCP] Client disconnected: %d (code: %d)" % [id, peer.get_close_code()])
				client_disconnected.emit(id)
				to_remove.append(id)

	for id in to_remove:
		_peers.erase(id)


func _handle_message(client_id: int, json_str: String) -> void:
	var data = JSON.parse_string(json_str)
	if data == null:
		send_error(client_id, "", "invalid_json", "Failed to parse JSON")
		return

	if not data is Dictionary:
		send_error(client_id, "", "invalid_format", "Message must be a JSON object")
		return

	_command_handler.process_command(client_id, data)


func send_response(client_id: int, id: String, success: bool, result: Variant) -> void:
	var response := {
		"id": id,
		"success": success
	}

	if success:
		response["result"] = result
	else:
		response["error"] = result

	_send_json(client_id, response)


func send_error(client_id: int, id: String, code: String, message: String) -> void:
	send_response(client_id, id, false, {"code": code, "message": message})


func send_event(event_type: String, data: Dictionary) -> void:
	var event := {
		"event": event_type,
		"data": data
	}
	for id in _peers.keys():
		_send_json(id, event)


func _send_json(client_id: int, data: Dictionary) -> void:
	if _peers.has(client_id):
		var peer: WebSocketPeer = _peers[client_id]
		if peer.get_ready_state() == WebSocketPeer.STATE_OPEN:
			peer.send_text(JSON.stringify(data))


func get_connected_clients() -> int:
	return _peers.size()


func is_client_connected(client_id: int) -> bool:
	return _peers.has(client_id)
