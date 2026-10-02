class_name CIAPI
extends Node

var base_url: String = ""
var token: String = ""
var player: Dictionary = {}
const SESSION_FILE := "user://cultural_islands_session.cfg"

func _ready() -> void:
    base_url = CID.api_base()
    _load_session()

func _load_session() -> void:
    var cfg := ConfigFile.new()
    if cfg.load(SESSION_FILE) == OK:
        token = str(cfg.get_value("auth", "token", ""))
        player = cfg.get_value("auth", "player", {})

func set_session(new_token: String, new_player: Dictionary) -> void:
    token = new_token
    player = new_player
    var cfg := ConfigFile.new()
    cfg.set_value("auth", "token", token)
    cfg.set_value("auth", "player", player)
    cfg.save(SESSION_FILE)

func clear_session() -> void:
    token = ""
    player = {}
    DirAccess.remove_absolute(ProjectSettings.globalize_path(SESSION_FILE))

func logged_in() -> bool:
    return token.strip_edges() != ""

func request(method: HTTPClient.Method, path: String, body: Dictionary = {}) -> Dictionary:
    var req := HTTPRequest.new()
    add_child(req)
    req.timeout = 12.0
    var headers := PackedStringArray(["Content-Type: application/json", "Accept: application/json"])
    if token != "":
        headers.append("Authorization: Bearer %s" % token)
    var payload := ""
    if not body.is_empty():
        payload = JSON.stringify(body)
    var err := req.request(base_url + path, headers, method, payload)
    if err != OK:
        req.queue_free()
        return {"_error": "Could not connect to server (request error %s)." % err}
    var result = await req.request_completed
    var response_code: int = result[1]
    var bytes: PackedByteArray = result[3]
    var text := bytes.get_string_from_utf8()
    req.queue_free()
    if text.strip_edges() == "":
        return {"_error": "Server returned an empty response (%s)." % response_code}
    var data = JSON.parse_string(text)
    if typeof(data) != TYPE_DICTIONARY:
        return {"_error": "Server returned invalid JSON (%s)." % response_code}
    if not bool(data.get("success", false)):
        return {"_error": str(data.get("error", "Request failed (%s)." % response_code))}
    return data

func register_user(username: String, password: String, display_name: String) -> Dictionary:
    var r := await request(HTTPClient.METHOD_POST, "/auth/register", {"username":username, "password":password, "display_name":display_name})
    _capture_session(r)
    return r

func login_user(username: String, password: String) -> Dictionary:
    var r := await request(HTTPClient.METHOD_POST, "/auth/login", {"username":username, "password":password})
    _capture_session(r)
    return r

func me() -> Dictionary:
    var r := await request(HTTPClient.METHOD_GET, "/auth/me")
    if not r.has("_error") and r.has("player"):
        player = r.player
        _persist_player()
    return r

func _capture_session(r: Dictionary) -> void:
    if r.has("token") and r.has("player"):
        set_session(str(r.token), r.player)

func _persist_player() -> void:
    var cfg := ConfigFile.new()
    cfg.set_value("auth", "token", token)
    cfg.set_value("auth", "player", player)
    cfg.save(SESSION_FILE)

func list_games() -> Dictionary:
    return await request(HTTPClient.METHOD_GET, "/games")

func create_game(island_type: String, max_players: int = 4) -> Dictionary:
    return await request(HTTPClient.METHOD_POST, "/games", {"game_mode":"turn_based", "island_type":island_type, "max_players":max_players})

func join_game(game_id: String, island_type: String) -> Dictionary:
    return await request(HTTPClient.METHOD_POST, "/games/%s/join" % game_id, {"island_type":island_type})

func start_game(game_id: String) -> Dictionary:
    return await request(HTTPClient.METHOD_POST, "/games/%s/start" % game_id, {})

func get_game(game_id: String) -> Dictionary:
    return await request(HTTPClient.METHOD_GET, "/games/%s" % game_id)

func get_state(game_id: String) -> Dictionary:
    return await request(HTTPClient.METHOD_GET, "/games/%s/state" % game_id)

func place_tile(game_id: String, q: int, r: int, tile_id: String, rotation: int) -> Dictionary:
    return await request(HTTPClient.METHOD_POST, "/games/%s/place-tile" % game_id, {"q":q, "r":r, "tile_id":tile_id, "rotation":rotation})

func respond_event(game_id: String, action: String, water_spent: int = 0) -> Dictionary:
    return await request(HTTPClient.METHOD_POST, "/games/%s/respond-event" % game_id, {"action":action, "water_spent":water_spent})

func trade(game_id: String, trader_id: String) -> Dictionary:
    return await request(HTTPClient.METHOD_POST, "/games/%s/trade" % game_id, {"trader_id":trader_id})

func complete_task(game_id: String, task_id: String) -> Dictionary:
    return await request(HTTPClient.METHOD_POST, "/games/%s/complete-task" % game_id, {"task_id":task_id})

func end_turn(game_id: String) -> Dictionary:
    return await request(HTTPClient.METHOD_POST, "/games/%s/end-turn" % game_id, {})

func leaderboard() -> Dictionary:
    return await request(HTTPClient.METHOD_GET, "/leaderboard")
