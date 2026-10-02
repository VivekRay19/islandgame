class_name CIBoard
extends Control

signal hex_clicked(q: int, r: int)
signal tile_clicked(tile: Dictionary)
signal hex_hovered(q: int, r: int)

var island: Dictionary = {}
var selected_tile_id := ""
var hovered_slot: Vector2i = Vector2i(99999, 99999)
var valid_slots: Array[Vector2i] = []
var board_scale := 76.0
var origin := Vector2.ZERO
var pulse := 0.0

const HEX_DIRS := [Vector2i(1,0),Vector2i(1,-1),Vector2i(0,-1),Vector2i(-1,0),Vector2i(-1,1),Vector2i(0,1)]

func _ready() -> void:
    mouse_filter = Control.MOUSE_FILTER_STOP
    set_process(true)

func set_island(value: Dictionary) -> void:
    island = value
    _recompute_slots()
    _fit_to_island()
    queue_redraw()

func set_build_mode(tile_id: String) -> void:
    selected_tile_id = tile_id
    _recompute_slots()
    queue_redraw()

func clear_build_mode() -> void:
    selected_tile_id = ""
    hovered_slot = Vector2i(99999,99999)
    queue_redraw()

func _process(delta: float) -> void:
    pulse = fmod(pulse + delta * 2.0, TAU)
    if selected_tile_id != "":
        queue_redraw()

func _layout_size() -> float:
    return min(size.x, size.y)

func axial_to_local(q: int, r: int) -> Vector2:
    var s := board_scale
    return Vector2(s * sqrt(3.0) * (float(q) + float(r) * 0.5), s * 1.5 * float(r))

func _board_center() -> Vector2:
    var center := Vector2(size.x * 0.49, size.y * 0.53)
    return center + origin

func hex_screen(q: int, r: int) -> Vector2:
    return _board_center() + axial_to_local(q, r)

func _screen_to_axial(p: Vector2) -> Vector2i:
    var local := p - _board_center()
    var s := max(board_scale, 1.0)
    var fr := local.y / (1.5 * s)
    var fq := local.x / (sqrt(3.0) * s) - fr * 0.5
    return _cube_round(fq, fr)

func _cube_round(qf: float, rf: float) -> Vector2i:
    var sf := -qf-rf
    var q := round(qf)
    var r := round(rf)
    var s := round(sf)
    var qd := abs(q-qf)
    var rd := abs(r-rf)
    var sd := abs(s-sf)
    if qd > rd and qd > sd:
        q = -r-s
    elif rd > sd:
        r = -q-s
    return Vector2i(int(q), int(r))

func _recompute_slots() -> void:
    valid_slots.clear()
    var seen := {}
    var tiles: Array = island.get("tiles", [])
    if tiles.is_empty():
        valid_slots.append(Vector2i.ZERO)
        return
    for t in tiles:
        var q := int(t.get("q",0)); var r := int(t.get("r",0))
        for d in HEX_DIRS:
            var p := Vector2i(q+d.x, r+d.y)
            seen["%s:%s" % [p.x,p.y]] = p
    for v in seen.values():
        var p: Vector2i = v
        if not _occupied(p.x, p.y):
            valid_slots.append(p)

func _occupied(q: int, r: int) -> bool:
    for t in island.get("tiles", []):
        if int(t.get("q",0)) == q and int(t.get("r",0)) == r:
            return true
    return false

func _fit_to_island() -> void:
    var tiles: Array = island.get("tiles", [])
    if tiles.is_empty():
        board_scale = min(_layout_size() / 8.0, 92.0)
        origin = Vector2.ZERO
        return
    var max_extent := 1
    for t in tiles:
        max_extent = max(max_extent, max(abs(int(t.get("q",0))), abs(int(t.get("r",0)))))
        max_extent = max(max_extent, abs(int(t.get("q",0))+int(t.get("r",0))))
    board_scale = clamp(_layout_size() / float(max(6, max_extent * 3 + 2)), 52.0, 92.0)
    origin = Vector2.ZERO

func _hex_points(center: Vector2, radius: float) -> PackedVector2Array:
    var pts := PackedVector2Array()
    for i in 6:
        var a := deg_to_rad(30.0 + float(i) * 60.0)
        pts.append(center + Vector2(cos(a), sin(a) * 0.9) * radius)
    return pts

func _draw() -> void:
    var panel := Rect2(Vector2.ZERO, size)
    draw_rect(panel, Color("#091b25"))
    _draw_ocean()
    _draw_title_strip()
    _draw_slots()
    var tiles: Array = island.get("tiles", [])
    var ordered := tiles.duplicate()
    ordered.sort_custom(func(a,b): return int(a.get("q",0))+int(a.get("r",0)) < int(b.get("q",0))+int(b.get("r",0)))
    for t in ordered:
        _draw_tile(t)
    if tiles.is_empty():
        draw_string(ThemeDB.fallback_font, Vector2(20,size.y-24), "Island canvas", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color("#6e8990"))

func _draw_ocean() -> void:
    var center := Vector2(size.x*0.49,size.y*0.54)
    for i in range(7):
        var rr := 130.0 + i*54.0
        var alpha := 0.045 - i*0.004
        draw_arc(center, rr, 0, TAU, 96, Color(0.25,0.7,0.75,alpha), 2.0)
    draw_circle(center, min(size.x,size.y)*0.43, Color(0.025,0.11,0.16,0.45))

func _draw_title_strip() -> void:
    var title := "YOUR ISLAND"
    var island_name := str(CID.ISLANDS.get(str(island.get("island_type","farming")), {"name":"Island"}).get("name","Island"))
    draw_string(ThemeDB.fallback_font, Vector2(24, 30), title, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color("#6f8c93"))
    draw_string(ThemeDB.fallback_font, Vector2(24, 55), island_name, HORIZONTAL_ALIGNMENT_LEFT, -1, 22, Color("#edf4f3"))
    draw_string(ThemeDB.fallback_font, Vector2(size.x-24-150, 33), "PLACEMENT MODE" if selected_tile_id != "" else "ISLAND VIEW", HORIZONTAL_ALIGNMENT_RIGHT, 150, 11, Color("#6f8c93"))

func _draw_slots() -> void:
    if selected_tile_id == "":
        return
    for p in valid_slots:
        var c := hex_screen(p.x,p.y)
        var hovered := p == hovered_slot
        var alpha := 0.14 if not hovered else 0.24 + sin(pulse)*0.04
        var pts := _hex_points(c, board_scale*0.92)
        draw_colored_polygon(pts, Color(0.25,0.85,0.76,alpha))
        draw_polyline(pts, Color(0.42,0.88,0.82,0.7 if hovered else 0.28), 2.0 if hovered else 1.0, true)
        if hovered:
            draw_circle(c, 6.0 + sin(pulse)*1.5, Color("#f2c66d"))

func _draw_tile(t: Dictionary) -> void:
    var q := int(t.get("q",0)); var r := int(t.get("r",0))
    var c := hex_screen(q,r)
    var def := CID.tile(str(t.get("tile_id","tile_farm")))
    var radius := board_scale * 0.92
    var pts := _hex_points(c + Vector2(0,10), radius)
    draw_colored_polygon(pts, Color(0,0,0,0.33))
    var top := _hex_points(c, radius)
    draw_colored_polygon(top, def.color.darkened(0.08) if bool(t.get("is_damaged",false)) else def.color)
    draw_polyline(top, Color("#e7f4ef",0.2), 1.0, true)
    _draw_tile_art(c, def)
    if bool(t.get("is_damaged",false)):
        draw_circle(c, radius*0.38, Color(0.08,0.08,0.08,0.38))
        draw_line(c+Vector2(-radius*0.23,-radius*0.23), c+Vector2(radius*0.23,radius*0.23), Color("#ef765f"), 4.0)
        draw_line(c+Vector2(radius*0.23,-radius*0.23), c+Vector2(-radius*0.23,radius*0.23), Color("#ef765f"), 4.0)
    var event := island.get("active_event")
    if typeof(event) == TYPE_DICTIONARY and not event.is_empty() and int(event.get("target_q",9999)) == q and int(event.get("target_r",9999)) == r:
        draw_arc(c-Vector2(0,8), radius*0.73, 0, TAU, 48, Color("#f06f5d"), 3.0 + sin(pulse)*0.8)
        draw_circle(c-Vector2(0,8), 7, Color("#f06f5d"))

func _draw_tile_art(c: Vector2, def: Dictionary) -> void:
    var k := str(def.get("kind",""))
    var a: Color = def.get("accent", Color.WHITE)
    if k == "farm":
        for i in range(-2,3):
            draw_line(c+Vector2(-26, i*9), c+Vector2(26, i*9-8), a.darkened(0.25), 2.2)
        draw_circle(c+Vector2(-17,-17),4,a)
        draw_circle(c+Vector2(15,-2),4,a)
        draw_circle(c+Vector2(5,18),4,a)
    elif k == "forest":
        for p in [Vector2(-17,10),Vector2(0,-2),Vector2(18,11)]:
            draw_line(c+p+Vector2(0,12), c+p+Vector2(0,-6), Color("#3b533b"), 4)
            draw_circle(c+p-Vector2(0,10), 11, a)
            draw_circle(c+p+Vector2(-6,-5), 6, a.lightened(0.1))
    elif k == "water":
        for y in [-18,-5,8,21]:
            var pts:=PackedVector2Array([c+Vector2(-28,y),c+Vector2(-12,y-3),c+Vector2(4,y),c+Vector2(20,y-3),c+Vector2(28,y)])
            draw_polyline(pts,a,3.0)
    elif k == "loom":
        draw_rect(Rect2(c+Vector2(-20,-18),Vector2(40,34)), Color("#6d4b37"))
        for x in [-14,-7,0,7,14]: draw_line(c+Vector2(x,-13),c+Vector2(x,12),a,2)
        draw_line(c+Vector2(-20,12),c+Vector2(20,12),a,3)
    elif k == "market":
        for x in [-20,0,20]: draw_line(c+Vector2(x,-2),c+Vector2(x,20),Color("#593e69"),4)
        draw_colored_polygon(PackedVector2Array([c+Vector2(-26,-2),c+Vector2(0,-24),c+Vector2(26,-2)]),a)
        draw_circle(c+Vector2(0,5),5,Color("#f5d38a"))
    elif k == "house":
        draw_rect(Rect2(c+Vector2(-20,-2),Vector2(40,26)),Color("#8a5d40"))
        draw_colored_polygon(PackedVector2Array([c+Vector2(-25,-2),c+Vector2(0,-26),c+Vector2(25,-2)]),a)
        draw_rect(Rect2(c+Vector2(-5,9),Vector2(10,15)),Color("#2b3540"))
    elif k == "shrine":
        draw_rect(Rect2(c+Vector2(-16,-18),Vector2(32,34)),Color("#5a4a86"))
        draw_line(c+Vector2(-23,-8),c+Vector2(23,-8),a,4)
        draw_circle(c+Vector2(0,-23),7,a)
    elif k == "clay":
        draw_circle(c,25,Color("#9f5c48"))
        draw_circle(c,17,Color("#d8926f"))
        draw_circle(c,8,Color("#6d4338"))
        draw_line(c+Vector2(24,-18),c+Vector2(28,16),a,3)
    elif k == "music":
        draw_arc(c+Vector2(0,2),20,PI,TAU,32,a,4)
        draw_line(c+Vector2(-20,2),c+Vector2(20,2),a,4)
        draw_line(c+Vector2(-10,2),c+Vector2(-10,19),a,3)
        draw_line(c+Vector2(10,2),c+Vector2(10,19),a,3)
        draw_circle(c+Vector2(7,-14),5,a)
    elif k == "quarry":
        for off in [Vector2(-15,8),Vector2(0,-2),Vector2(15,10)]:
            draw_colored_polygon(PackedVector2Array([c+off+Vector2(-8,9),c+off+Vector2(0,-10),c+off+Vector2(8,9)]),a.darkened(0.2))
        draw_line(c+Vector2(-22,-17),c+Vector2(18,21),a,4)
    draw_string(ThemeDB.fallback_font, c+Vector2(-40,44), str(def.get("label","")), HORIZONTAL_ALIGNMENT_CENTER, 80, 10, Color(1,1,1,0.62))

func _gui_input(event: InputEvent) -> void:
    if event is InputEventMouseMotion:
        var p := _screen_to_axial(event.position)
        var next := p if selected_tile_id != "" and _is_valid_slot(p) else Vector2i(99999,99999)
        if next != hovered_slot:
            hovered_slot = next
            if next.x < 99999:
                hex_hovered.emit(next.x,next.y)
            queue_redraw()
    elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
        var p := _screen_to_axial(event.position)
        if selected_tile_id != "" and _is_valid_slot(p):
            hex_clicked.emit(p.x,p.y)
            accept_event()
        else:
            var tile := _find_tile_near(p)
            if not tile.is_empty():
                tile_clicked.emit(tile)
                accept_event()

func _is_valid_slot(p: Vector2i) -> bool:
    return valid_slots.has(p)

func _find_tile_near(p: Vector2i) -> Dictionary:
    for t in island.get("tiles",[]):
        if int(t.get("q",0)) == p.x and int(t.get("r",0)) == p.y:
            return t
    return {}
