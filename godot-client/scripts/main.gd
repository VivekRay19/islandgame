extends Control

const T := preload("res://scripts/theme.gd")
const D := preload("res://scripts/data.gd")
const BoardScript := preload("res://scripts/board.gd")

@onready var api: CIAPI = $ApiClient

var screen_root: Control
var toast_layer: CanvasLayer
var game_id := ""
var game_code := ""
var action_mode := "build"
var last_action_signature := ""
var game_state: Dictionary = {}
var tasks: Array = []
var traders: Array = []
var selected_island := "farming"
var selected_tile := ""
var selected_rotation := 0
var current_screen := ""
var poll_task_running := false
var host_game := false


func _ready() -> void:
    T.style_root(self)
    _build_shell()
    if api.logged_in():
        var check := await api.me()
        if check.has("_error"):
            api.clear_session()
    show_home()

func _build_shell() -> void:
    var bg := ColorRect.new()
    bg.color = T.BG
    bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    add_child(bg)
    move_child(bg,0)
    screen_root = Control.new()
    screen_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    add_child(screen_root)
    toast_layer = CanvasLayer.new()
    add_child(toast_layer)

func _clear_screen() -> void:
    for child in screen_root.get_children():
        child.queue_free()

func _title(text: String, size := 30, color := T.TEXT) -> Label:
    var l := Label.new()
    l.text = text
    l.add_theme_font_size_override("font_size", size)
    l.add_theme_color_override("font_color", color)
    return l

func _body(text: String, size := 14, color := T.MUTED) -> Label:
    var l := Label.new()
    l.text = text
    l.add_theme_font_size_override("font_size", size)
    l.add_theme_color_override("font_color", color)
    l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    return l

func _button(text: String, accent := false) -> Button:
    var b := Button.new()
    b.text = text
    b.custom_minimum_size = Vector2(0,48)
    b.add_theme_font_size_override("font_size",14)
    T.apply_button(b,accent)
    return b

func _panel(fill := T.SURFACE, border := T.LINE) -> PanelContainer:
    var p := PanelContainer.new()
    p.add_theme_stylebox_override("panel", T.panel(16,fill,border,1))
    return p

func _line() -> HSeparator:
    var h := HSeparator.new()
    h.add_theme_color_override("separator", T.LINE)
    h.custom_minimum_size.y = 1
    return h

func _top_nav(title_text: String, back_to_home := true) -> VBoxContainer:
    var wrap := VBoxContainer.new()
    wrap.add_theme_constant_override("separation", 14)
    var row := HBoxContainer.new()
    row.custom_minimum_size.y = 54
    if back_to_home:
        var back := Button.new()
        back.text = "‹"
        back.custom_minimum_size = Vector2(44,44)
        back.add_theme_font_size_override("font_size",26)
        T.apply_button(back)
        back.pressed.connect(show_home)
        row.add_child(back)
    var t := _title(title_text,28)
    t.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
    row.add_child(t)
    row.add_spacer(false)
    if api.logged_in():
        var user := _body(str(api.player.get("display_name",api.player.get("username","Player"))),13,T.TEXT)
        user.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
        row.add_child(user)
    wrap.add_child(row)
    wrap.add_child(_line())
    return wrap

func show_home() -> void:
    _clear_screen(); current_screen = "home"
    var margin := MarginContainer.new(); margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    margin.add_theme_constant_override("margin_left",76); margin.add_theme_constant_override("margin_right",76); margin.add_theme_constant_override("margin_top",58); margin.add_theme_constant_override("margin_bottom",54)
    screen_root.add_child(margin)
    var root := VBoxContainer.new(); root.add_theme_constant_override("separation",18); margin.add_child(root)

    var brand := HBoxContainer.new(); brand.custom_minimum_size.y=58
    var mark := Label.new(); mark.text="◈"; mark.add_theme_font_size_override("font_size",34); mark.add_theme_color_override("font_color",T.TEAL); brand.add_child(mark)
    var bt := VBoxContainer.new(); bt.add_theme_constant_override("separation",0); brand.add_child(bt)
    bt.add_child(_title("CULTURAL ISLANDS",18,T.TEXT)); bt.add_child(_body("BUILD · MANAGE · TRADE · SURVIVE",11,T.MUTED))
    brand.add_spacer(false)
    var status := _body("GODOT CLIENT  •  %s" % ("CONNECTED SESSION" if api.logged_in() else "GUEST MODE"),11,T.MUTED); status.vertical_alignment=VERTICAL_ALIGNMENT_CENTER; brand.add_child(status)
    root.add_child(brand)

    var hero := PanelContainer.new(); hero.add_theme_stylebox_override("panel",T.panel(22,Color("#0c2530"),Color("#1e5360"),1)); root.add_child(hero)
    var hero_row := HBoxContainer.new(); hero_row.add_theme_constant_override("separation",42); hero_row.custom_minimum_size.y=330; hero.add_child(hero_row)
    var copy := VBoxContainer.new(); copy.custom_minimum_size.x=560; copy.add_theme_constant_override("separation",15); hero_row.add_child(copy)
    copy.add_child(_body("AN ISLAND BUILT AROUND CHOICE",12,T.GOLD))
    copy.add_child(_title("Build an island that can grow — and survive what comes next.",40,T.TEXT))
    copy.add_child(_body("Place productive tiles, protect your reserves, trade through shortages, and answer events before they become damage. Your layout is the strategy.",16,T.MUTED))
    var tags := HBoxContainer.new(); tags.add_theme_constant_override("separation",8)
    for tag in ["PLACEMENT MATTERS","RESOURCES ARE LIMITED","EVENTS CREATE DECISIONS"]:
        var l := Label.new(); l.text=tag; l.add_theme_stylebox_override("normal",T.pill(Color("#12343d"))); l.add_theme_font_size_override("font_size",10); l.add_theme_color_override("font_color",T.TEAL); tags.add_child(l)
    copy.add_child(tags)
    var actions := HBoxContainer.new(); actions.add_theme_constant_override("separation",10)
    var play := _button("PLAY A GAME",true); play.pressed.connect(func(): show_login() if not api.logged_in() else show_lobby()); actions.add_child(play)
    var scores := _button("LEADERBOARD"); scores.pressed.connect(show_leaderboard); actions.add_child(scores)
    copy.add_child(actions)

    var art := Control.new(); art.custom_minimum_size=Vector2(460,270); hero_row.add_child(art)
    var art_draw := _HomeArt.new(); art_draw.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); art.add_child(art_draw)

    var feature_row := HBoxContainer.new(); feature_row.add_theme_constant_override("separation",14); root.add_child(feature_row)
    for spec in [["01","CHOOSE","Pick an island with a distinct starting advantage."],["02","BUILD","Place tiles so neighbouring systems support one another."],["03","RESPOND","Protect the island when fire, drought or storms arrive."],["04","SURVIVE","Complete development goals before the island runs out of room to breathe."]]:
        var card := _panel(T.SURFACE,T.LINE); card.size_flags_horizontal=Control.SIZE_EXPAND_FILL; feature_row.add_child(card)
        var v:=VBoxContainer.new(); v.add_theme_constant_override("separation",6); card.add_child(v)
        v.add_child(_body(spec[0],11,T.TEAL)); v.add_child(_title(spec[1],16,T.TEXT)); v.add_child(_body(spec[2],12,T.MUTED))

    var foot := HBoxContainer.new(); foot.add_spacer(false); var server := _body("Backend: Rust API  •  %s" % D.api_base(),10,Color("#52717a")); foot.add_child(server); root.add_child(foot)

func show_login() -> void:
    _clear_screen(); current_screen="login"
    var center := CenterContainer.new(); center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); screen_root.add_child(center)
    var card:=_panel(Color("#0f2a35"),Color("#28515c")); card.custom_minimum_size=Vector2(470,560); center.add_child(card)
    var root:=MarginContainer.new(); root.add_theme_constant_override("margin_left",34); root.add_theme_constant_override("margin_right",34); root.add_theme_constant_override("margin_top",32); root.add_theme_constant_override("margin_bottom",32); card.add_child(root)
    var v:=VBoxContainer.new(); v.add_theme_constant_override("separation",14); root.add_child(v)
    v.add_child(_body("CULTURAL ISLANDS",11,T.GOLD)); v.add_child(_title("Enter your island",30)); v.add_child(_body("Sign in to continue, or create a local player account on the existing game server.",13,T.MUTED))
    var tabs:=HBoxContainer.new(); tabs.add_theme_constant_override("separation",6); v.add_child(tabs)
    var login_tab:=_button("SIGN IN",true); var reg_tab:=_button("CREATE ACCOUNT"); tabs.add_child(login_tab); tabs.add_child(reg_tab)
    var form_holder:=VBoxContainer.new(); form_holder.add_theme_constant_override("separation",10); v.add_child(form_holder)
    var username:=LineEdit.new(); username.placeholder_text="Username"; username.custom_minimum_size.y=48; username.add_theme_stylebox_override("normal",T.card(T.BG_2,T.LINE,10)); form_holder.add_child(username)
    var password:=LineEdit.new(); password.placeholder_text="Password"; password.secret=true; password.custom_minimum_size.y=48; password.add_theme_stylebox_override("normal",T.card(T.BG_2,T.LINE,10)); form_holder.add_child(password)
    var display:=LineEdit.new(); display.placeholder_text="Display name (new accounts)"; display.visible=false; display.custom_minimum_size.y=48; display.add_theme_stylebox_override("normal",T.card(T.BG_2,T.LINE,10)); form_holder.add_child(display)
    var message:=_body("",12,T.RED); form_holder.add_child(message)
    var submit:=_button("CONTINUE",true); submit.custom_minimum_size.y=52; v.add_child(submit)
    var back:=_button("Back to home"); back.pressed.connect(show_home); v.add_child(back)
    var mode: Dictionary={"register":false}
    var set_mode=func(reg:bool):
        mode.register=reg; display.visible=reg; login_tab.disabled=reg; reg_tab.disabled=not reg; submit.text="CREATE ACCOUNT" if reg else "SIGN IN"
        T.apply_button(login_tab,not reg); T.apply_button(reg_tab,reg)
    login_tab.pressed.connect(func(): set_mode.call(false)); reg_tab.pressed.connect(func(): set_mode.call(true))
    submit.pressed.connect(func():
        submit.disabled=true; message.text="Connecting to island server…"
        var result: Dictionary
        if mode.register:
            result=await api.register_user(username.text.strip_edges(),password.text,display.text.strip_edges())
        else:
            result=await api.login_user(username.text.strip_edges(),password.text)
        if result.has("_error"):
            message.text=result._error; submit.disabled=false
        else:
            show_lobby()
    )

func show_lobby() -> void:
    _clear_screen(); current_screen="lobby"
    var margin:=MarginContainer.new(); margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); margin.add_theme_constant_override("margin_left",54); margin.add_theme_constant_override("margin_right",54); margin.add_theme_constant_override("margin_top",34); margin.add_theme_constant_override("margin_bottom",34); screen_root.add_child(margin)
    var root:=VBoxContainer.new(); root.add_theme_constant_override("separation",16); margin.add_child(root)
    root.add_child(_top_nav("PLAYGROUND / LOBBY"))
    var row:=HBoxContainer.new(); row.add_theme_constant_override("separation",16); row.size_flags_vertical=Control.SIZE_EXPAND_FILL; root.add_child(row)

    var left:=_panel(T.SURFACE,T.LINE); left.custom_minimum_size.x=550; left.size_flags_vertical=Control.SIZE_EXPAND_FILL; row.add_child(left)
    var lv:=VBoxContainer.new(); lv.add_theme_constant_override("separation",10); left.add_child(lv)
    lv.add_child(_title("Choose your island",22)); lv.add_child(_body("Each island begins with a different advantage and carries a different main risk.",12,T.MUTED))
    var cards:=GridContainer.new(); cards.columns=2; cards.add_theme_constant_override("h_separation",10); cards.add_theme_constant_override("v_separation",10); lv.add_child(cards)
    var buttons:={}
    for key in ["farming","forest","coastal","mountain"]:
        var c:=Button.new(); c.text=""; c.custom_minimum_size=Vector2(240,142); c.add_theme_stylebox_override("normal",T.card(Color("#102c37"),T.LINE,14)); c.add_theme_stylebox_override("hover",T.card(Color("#163a44"),D.ISLANDS[key].color,14)); c.mouse_default_cursor_shape=Control.CURSOR_POINTING_HAND; cards.add_child(c); buttons[key]=c
        var m:=MarginContainer.new(); m.mouse_filter=Control.MOUSE_FILTER_IGNORE; m.add_theme_constant_override("margin_left",16); m.add_theme_constant_override("margin_right",16); m.add_theme_constant_override("margin_top",14); m.add_theme_constant_override("margin_bottom",12); c.add_child(m)
        var cv:=VBoxContainer.new(); cv.mouse_filter=Control.MOUSE_FILTER_IGNORE; cv.add_theme_constant_override("separation",5); m.add_child(cv)
        var tag:=_body(D.ISLANDS[key].tag,10,D.ISLANDS[key].color); cv.add_child(tag); cv.add_child(_title(D.ISLANDS[key].name,16)); cv.add_child(_body(D.ISLANDS[key].adv,11,T.GREEN)); cv.add_child(_body(D.ISLANDS[key].risk,11,T.MUTED))
        c.pressed.connect(func(k=key): selected_island=k; _refresh_island_choice(buttons))
    lv.add_spacer(false)
    var create:=_button("CREATE GAME",true); create.pressed.connect(func(): await _create_game()); lv.add_child(create)
    _refresh_island_choice(buttons)

    var right:=_panel(Color("#0b202a"),T.LINE); right.size_flags_horizontal=Control.SIZE_EXPAND_FILL; right.size_flags_vertical=Control.SIZE_EXPAND_FILL; row.add_child(right)
    var rv:=VBoxContainer.new(); rv.add_theme_constant_override("separation",10); right.add_child(rv)
    var hdr:=HBoxContainer.new(); hdr.add_child(_title("Open games",22)); hdr.add_spacer(false); var refresh:=_button("REFRESH"); refresh.custom_minimum_size=Vector2(100,42); hdr.add_child(refresh); rv.add_child(hdr)
    var list:=VBoxContainer.new(); list.name="GameList"; list.size_flags_vertical=Control.SIZE_EXPAND_FILL; list.add_theme_constant_override("separation",8); rv.add_child(list)
    var note:=_body("Create a game on the left, or join an open table here. The existing Rust server remains the source of truth for state.",11,T.MUTED); rv.add_child(note)
    refresh.pressed.connect(func(): await _load_game_list(list))
    await _load_game_list(list)

func _refresh_island_choice(buttons: Dictionary) -> void:
    for key in buttons.keys():
        var b:Button=buttons[key]
        T.apply_button(b, false)
        if key == selected_island:
            b.add_theme_stylebox_override("normal",T.card(Color("#173743"),D.ISLANDS[key].color,14))

func _load_game_list(list: VBoxContainer) -> void:
    for child in list.get_children(): child.queue_free()
    var loading:=_body("Loading open games…",12,T.MUTED); list.add_child(loading)
    var res:=await api.list_games(); loading.queue_free()
    if res.has("_error"):
        list.add_child(_body(res._error,12,T.RED)); return
    var games:Array=res.get("games",[])
    if games.is_empty(): list.add_child(_body("No open games yet. Create the first table from the left panel.",13,T.MUTED)); return
    for g in games:
        var row:=_panel(T.SURFACE_2,T.LINE); list.add_child(row)
        var h:=HBoxContainer.new(); row.add_child(h)
        var v:=VBoxContainer.new(); v.size_flags_horizontal=Control.SIZE_EXPAND_FILL; h.add_child(v)
        v.add_child(_title("TABLE %s" % str(g.get("game_code","??????")),15)); v.add_child(_body("%s  ·  Round %s  ·  up to %s players" % [str(g.get("game_mode","turn_based")).replace("_"," ").capitalize(),str(g.get("current_round",1)),str(g.get("max_players",4))],11,T.MUTED))
        var join:=_button("JOIN",true); join.custom_minimum_size=Vector2(94,44); h.add_child(join)
        join.pressed.connect(func(game_id=str(g.get("id","")), code=str(g.get("game_code",""))): _join_game(game_id,code))

func _create_game() -> void:
    var res:=await api.create_game(selected_island,4)
    if res.has("_error"): _toast(res._error,T.RED); return
    game_id=str(res.game.get("id","")); game_code=str(res.game.get("game_code","")); host_game=true
    show_waiting_room()

func _join_game(gid:String, game_code_hint:String="") -> void:
    var res:=await api.join_game(gid,selected_island)
    if res.has("_error"): _toast(res._error,T.RED); return
    game_id=gid; game_code=game_code_hint; host_game=false; show_waiting_room()

func show_waiting_room() -> void:
    _clear_screen(); current_screen="waiting"
    var center:=CenterContainer.new(); center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); screen_root.add_child(center)
    var card:=_panel(Color("#0e2631"),Color("#2a5661")); card.custom_minimum_size=Vector2(620,500); center.add_child(card)
    var m:=MarginContainer.new(); m.add_theme_constant_override("margin_left",36); m.add_theme_constant_override("margin_right",36); m.add_theme_constant_override("margin_top",32); m.add_theme_constant_override("margin_bottom",32); card.add_child(m)
    var v:=VBoxContainer.new(); v.add_theme_constant_override("separation",13); m.add_child(v)
    v.add_child(_body("WAITING ROOM",11,T.GOLD)); v.add_child(_title("Build your table",30)); v.add_child(_body("Share the game code with the other players on your LAN. Start only when everyone is ready.",13,T.MUTED))
    var code:=Label.new(); code.name="Code"; code.text="GAME %s" % (game_code if game_code != "" else "------"); code.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; code.add_theme_font_size_override("font_size",30); code.add_theme_color_override("font_color",T.TEAL); code.add_theme_stylebox_override("normal",T.pill(Color("#0b3138"),12)); code.custom_minimum_size.y=66; v.add_child(code)
    var status:=_body("Checking table…",13,T.MUTED); status.name="Status"; v.add_child(status)
    var players:=VBoxContainer.new(); players.name="Players"; players.add_theme_constant_override("separation",7); v.add_child(players)
    v.add_spacer(false)
    var actions:=HBoxContainer.new(); actions.add_theme_constant_override("separation",8); v.add_child(actions)
    var back:=_button("BACK TO LOBBY"); actions.add_child(back); back.pressed.connect(show_lobby)
    actions.add_spacer(false)
    var start:=_button("START GAME",true); start.visible=host_game; actions.add_child(start); start.pressed.connect(func(): await _start_game())
    await _refresh_waiting_room(status,players,start)


func _refresh_waiting_room(status:Label, players:VBoxContainer, start:Button) -> void:
    var table:=await api.get_game(game_id)
    if table.has("_error"): status.text=table._error; return
    var game_info:Dictionary=table.get("game",{})
    if str(game_info.get("status","waiting")) == "in_progress":
        show_game()
        return
    var res:=await api.get_state(game_id)
    if res.has("_error"): status.text=res._error; return
    var gs:Dictionary=res.get("state",{}); game_state=gs
    var islands:Array=gs.get("islands",[])
    status.text="%s of %s seats filled" % [str(islands.size()),str(game_info.get("max_players",4))]
    for child in players.get_children(): child.queue_free()
    for i in range(islands.size()):
        var isl:Dictionary=islands[i]
        var p:=Label.new(); p.text="  PLAYER %d  ·  %s island" % [i+1,str(isl.get("island_type","farming")).capitalize()]; p.add_theme_stylebox_override("normal",T.pill(Color("#102f39"))); p.add_theme_font_size_override("font_size",12); players.add_child(p)
    await get_tree().create_timer(2.5).timeout
    if current_screen=="waiting": await _refresh_waiting_room(status,players,start)

func _start_game() -> void:
    var res:=await api.start_game(game_id)
    if res.has("_error"): _toast(res._error,T.RED); return
    show_game()

func show_game() -> void:
    _clear_screen(); current_screen="game"; selected_tile=""; selected_rotation=0
    var root:=Control.new(); root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); screen_root.add_child(root)
    var bg:=ColorRect.new(); bg.color=T.BG; bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); root.add_child(bg); root.move_child(bg,0)
    var top:=MarginContainer.new(); top.set_anchors_preset(Control.PRESET_TOP_WIDE); top.offset_bottom=90; top.add_theme_constant_override("margin_left",20); top.add_theme_constant_override("margin_right",20); top.add_theme_constant_override("margin_top",14); top.add_theme_constant_override("margin_bottom",8); root.add_child(top)
    var top_row:=HBoxContainer.new(); top_row.add_theme_constant_override("separation",8); top.add_child(top_row)
    var brand:=VBoxContainer.new(); brand.custom_minimum_size.x=210; top_row.add_child(brand); brand.add_child(_body("CULTURAL ISLANDS",10,T.GOLD)); brand.add_child(_title("Island Command",20,T.TEXT))
    for res_id in D.RES_ORDER:
        var rc:=_panel(T.SURFACE,T.LINE); rc.custom_minimum_size=Vector2(94,60); top_row.add_child(rc)
        var rv:=VBoxContainer.new(); rv.add_theme_constant_override("separation",0); rc.add_child(rv)
        rv.add_child(_body(D.RES[res_id].label.to_upper(),9,D.RES[res_id].color)); var val:=Label.new(); val.name="Value"; val.text="0"; val.add_theme_font_size_override("font_size",19); val.add_theme_color_override("font_color",T.TEXT); rv.add_child(val)
    top_row.add_spacer(false)
    var round_card:=_panel(Color("#102f39"),T.TEAL_DARK); round_card.custom_minimum_size=Vector2(170,60); top_row.add_child(round_card)
    var rv:=VBoxContainer.new(); round_card.add_child(rv); var rlab:=_body("ROUND",9,T.MUTED); rv.add_child(rlab); var round:=_title("1 / 6",17,T.TEXT); round.name="Round"; rv.add_child(round)
    var turn:=_body("YOUR TURN",11,T.GREEN); turn.name="Turn"; rv.add_child(turn)

    var body:=MarginContainer.new(); body.set_anchors_preset(Control.PRESET_WIDE); body.offset_top=104; body.offset_bottom=-18; body.add_theme_constant_override("margin_left",20); body.add_theme_constant_override("margin_right",20); root.add_child(body)
    var row:=HBoxContainer.new(); row.add_theme_constant_override("separation",14); body.add_child(row)
    var board_panel:=_panel(Color("#0a202b"),T.LINE); board_panel.size_flags_horizontal=Control.SIZE_EXPAND_FILL; board_panel.size_flags_vertical=Control.SIZE_EXPAND_FILL; row.add_child(board_panel)
    var board:=BoardScript.new(); board.name="Board"; board.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); board_panel.add_child(board); board.hex_clicked.connect(_on_board_hex); board.tile_clicked.connect(_on_tile_clicked)
    var side:=_panel(Color("#0d222c"),T.LINE); side.custom_minimum_size.x=430; side.size_flags_vertical=Control.SIZE_EXPAND_FILL; row.add_child(side)
    var side_v:=VBoxContainer.new(); side_v.name="Side"; side_v.add_theme_constant_override("separation",10); side.add_child(side_v)
    var island_head:=VBoxContainer.new(); island_head.add_theme_constant_override("separation",3); side_v.add_child(island_head); island_head.add_child(_body("ISLAND STATUS",10,T.TEAL)); var it:=_title("Preparing…",22); it.name="IslandName"; island_head.add_child(it); var sub:=_body("",11,T.MUTED); sub.name="IslandSub"; island_head.add_child(sub)
    var event_holder:=VBoxContainer.new(); event_holder.name="Event"; side_v.add_child(event_holder)
    var tabs:=HBoxContainer.new(); tabs.add_theme_constant_override("separation",4); side_v.add_child(tabs)
    var build_tab:=_button("BUILD",true); var trade_tab:=_button("TRADE"); var task_tab:=_button("TASKS"); tabs.add_child(build_tab); tabs.add_child(trade_tab); tabs.add_child(task_tab)
    var action_holder:=ScrollContainer.new(); action_holder.name="ActionScroll"; action_holder.size_flags_vertical=Control.SIZE_EXPAND_FILL; side_v.add_child(action_holder)
    var action_content:=VBoxContainer.new(); action_content.name="ActionContent"; action_content.add_theme_constant_override("separation",8); action_holder.add_child(action_content)
    var bottom:=HBoxContainer.new(); bottom.custom_minimum_size.y=52; bottom.add_theme_constant_override("separation",8); side_v.add_child(bottom)
    var rotate_left:=_button("↶  ROTATE"); rotate_left.custom_minimum_size.x=120; bottom.add_child(rotate_left); rotate_left.pressed.connect(func(): selected_rotation=(selected_rotation+300)%360; _refresh_game_ui())
    var cancel:=_button("CLEAR"); cancel.custom_minimum_size.x=90; bottom.add_child(cancel); cancel.pressed.connect(func(): selected_tile=""; board.clear_build_mode(); _refresh_game_ui())
    bottom.add_spacer(false)
    var end_turn:=_button("END TURN",true); end_turn.name="EndTurn"; end_turn.custom_minimum_size.x=128; bottom.add_child(end_turn); end_turn.pressed.connect(func(): await _end_turn())
    build_tab.pressed.connect(func(): action_mode="build"; last_action_signature=""; _refresh_action_content())
    trade_tab.pressed.connect(func(): action_mode="trade"; last_action_signature=""; _refresh_action_content())
    task_tab.pressed.connect(func(): action_mode="task"; last_action_signature=""; _refresh_action_content())
    set_meta("GameRoot",root); set_meta("Board",board); set_meta("ActionContent",action_content); set_meta("EventHolder",event_holder); set_meta("Top",top_row); set_meta("Round",round); set_meta("Turn",turn); set_meta("IslandName",it); set_meta("IslandSub",sub); set_meta("EndTurn",end_turn)
    _start_game_poll()

func _refresh_action_content()->void:
    if not has_meta("ActionContent") or not has_meta("Board"): return
    var island:=_my_island()
    var resources:Dictionary=island.get("resources",{})
    var signature:=action_mode + "|" + str(game_state.get("round",1)) + "|" + str(island.get("trades_this_round",0)) + "|" + str(island.get("active_event",null) != null) + "|" + JSON.stringify(resources) + "|" + str(tasks.size())
    if signature == last_action_signature:
        return
    last_action_signature=signature
    var content:VBoxContainer=get_meta("ActionContent"); var board:CIBoard=get_meta("Board")
    if action_mode=="trade": _trade_tab(content)
    elif action_mode=="task": _task_tab(content)
    else: _build_tab(content,board)

func _start_game_poll()->void:
    if poll_task_running: return
    poll_task_running=true
    _game_poll_loop()

func _game_poll_loop() -> void:
    while current_screen=="game":
        var res:=await api.get_state(game_id)
        if res.has("_error"):
            _toast(res._error,T.RED)
        else:
            game_state=res.get("state",{}); tasks=res.get("available_tasks",[]); traders=res.get("traders",[]); _refresh_game_ui()
            if bool(game_state.get("game_over",false)):
                poll_task_running=false; show_results(); return
        await get_tree().create_timer(2.0).timeout
    poll_task_running=false

func _my_island()->Dictionary:
    var id:=str(api.player.get("id",""))
    for isl in game_state.get("islands",[]):
        if str(isl.get("player_id","")) == id: return isl
    return {}

func _refresh_game_ui()->void:
    if not has_meta("Board"): return
    var board:CIBoard=get_meta("Board"); board.set_island(_my_island()); board.set_build_mode(selected_tile)
    var island:=_my_island(); if island.is_empty(): return
    var top:HBoxContainer=get_meta("Top"); var ri:=0
    for child in top.get_children():
        if child is PanelContainer and child.get_node_or_null("VBoxContainer") != null and ri < D.RES_ORDER.size():
            var res_id:=D.RES_ORDER[ri]; var val:=child.get_node("VBoxContainer/Value") if child.has_node("VBoxContainer/Value") else null
            if val: val.text=str(island.get("resources",{}).get(res_id,0))
            ri+=1
    var round:Label=get_meta("Round"); round.text="%s / 6" % str(game_state.get("round",1))
    var turn:Label=get_meta("Turn"); var mine:=str(game_state.get("current_player_id",""))==str(api.player.get("id","")); turn.text="YOUR TURN" if mine else "WAITING FOR OTHER PLAYER"; turn.add_theme_color_override("font_color",T.GREEN if mine else T.MUTED)
    var it:Label=get_meta("IslandName"); it.text=str(D.ISLANDS.get(str(island.get("island_type","farming")),{"name":"Island"}).get("name","Island"))
    var sub:Label=get_meta("IslandSub"); sub.text="Harmony %s  ·  Score %s  ·  %s trades left" % [str(island.get("cultural_harmony",0)),str(int(island.get("task_score",0))+int(island.get("event_score",0))),str(max(0,2-int(island.get("trades_this_round",0))))]
    var end_btn:Button=get_meta("EndTurn"); end_btn.disabled=not mine or not bool(island.get("active_event",null)==null)
    _refresh_event_panel()
    _refresh_action_content()

func _refresh_event_panel()->void:
    var holder:VBoxContainer=get_meta("EventHolder")
    for c in holder.get_children(): c.queue_free()
    var isl:=_my_island(); var ev=isl.get("active_event",null)
    if typeof(ev)!=TYPE_DICTIONARY or ev == null: return
    if (ev as Dictionary).is_empty(): return
    var meta:=D.event_meta(str(ev.get("event_id","")))
    var danger:=str(meta.tone)=="danger"; var positive:=str(meta.tone)=="positive"
    var p:=_panel(Color("#3a1e23") if danger else Color("#1d332c") if positive else Color("#3a3120"), T.RED if danger else T.GREEN if positive else T.GOLD); holder.add_child(p)
    var v:=VBoxContainer.new(); v.add_theme_constant_override("separation",6); p.add_child(v)
    var top:=HBoxContainer.new(); top.add_child(_body("ACTIVE EVENT",10,T.RED if danger else T.GREEN if positive else T.GOLD)); top.add_spacer(false); top.add_child(_body(meta.cost,10,T.TEXT)); v.add_child(top)
    v.add_child(_title(meta.title,17)); v.add_child(_body(meta.desc,11,T.MUTED))
    var respond:=_button("RESPOND NOW",danger or not positive); respond.pressed.connect(func(): await _respond_event(str(meta.action),str(ev.get("event_id","")))); v.add_child(respond)

func _build_tab(content:VBoxContainer,board:CIBoard)->void:
    for c in content.get_children(): c.queue_free()
    content.add_child(_body("Select a tile, then click any highlighted hex on the island.",11,T.MUTED))
    for tile_id in D.TILE_ORDER:
        var d:=D.tile(tile_id)
        var b:=Button.new(); b.text="%s\n%s\n%s" % [d.name,D.cost_text(d.cost),d.desc]; b.custom_minimum_size.y=76; b.alignment=HORIZONTAL_ALIGNMENT_LEFT; b.add_theme_font_size_override("font_size",13)
        b.add_theme_stylebox_override("normal",T.card(T.SURFACE,T.LINE,12)); b.add_theme_stylebox_override("hover",T.card(T.SURFACE_2,d.color,12)); b.add_theme_color_override("font_color",T.TEXT); content.add_child(b)
        var isl:=_my_island(); var mine:=str(game_state.get("current_player_id","")) == str(api.player.get("id","")); b.disabled=(not mine) or (isl.get("active_event",null) != null) or (not _can_afford(d.cost))
        b.pressed.connect(func(id=tile_id): selected_tile=id; board.set_build_mode(id); _refresh_game_ui())

func _trade_tab(content:VBoxContainer)->void:
    for c in content.get_children(): c.queue_free()
    var isl:=_my_island(); var mine:=str(game_state.get("current_player_id","")) == str(api.player.get("id","")); var trades_left:=max(0,2-int(isl.get("trades_this_round",0)))
    content.add_child(_body("HAAT TRADING  ·  %s trade%s remaining this round" % [trades_left,"" if trades_left==1 else "s"],11,T.GOLD))
    for tr in traders:
        var row:=_panel(T.SURFACE,T.LINE); content.add_child(row); var h:=HBoxContainer.new(); row.add_child(h); var v:=VBoxContainer.new(); v.size_flags_horizontal=Control.SIZE_EXPAND_FILL; h.add_child(v)
        v.add_child(_title("%s  ·  %s" % [str(tr.get("avatar","")),str(tr.get("name","Trader"))],15)); v.add_child(_body("Give %s %s  →  receive %s %s" % [str(tr.get("requested_qty",0)),D.res_name(str(tr.get("requested_resource",""))),str(tr.get("offered_qty",0)),D.res_name(str(tr.get("offered_resource","")))],11,T.MUTED)); v.add_child(_body(str(tr.get("island_name","")),10,T.MUTED))
        var b:=_button("TRADE",true); b.custom_minimum_size=Vector2(84,42); h.add_child(b); b.disabled=(trades_left<=0) or (not mine) or (isl.get("active_event",null) != null); b.pressed.connect(func(id=str(tr.get("id",""))): await _trade(id))

func _task_tab(content:VBoxContainer)->void:
    for c in content.get_children(): c.queue_free()
    content.add_child(_body("DEVELOPMENT GOALS  ·  Complete one when the resources line up.",11,T.PURPLE))
    if tasks.is_empty(): content.add_child(_body("No tasks are available at this stage. The level will change after later rounds.",12,T.MUTED)); return
    for task in tasks:
        var row:=_panel(T.SURFACE,T.LINE); content.add_child(row); var v:=VBoxContainer.new(); v.add_theme_constant_override("separation",5); row.add_child(v)
        var top:=HBoxContainer.new(); v.add_child(top); top.add_child(_title("%s  %s" % [str(task.get("symbol","")),str(task.get("name","Task"))],15)); top.add_spacer(false); top.add_child(_body("+%s pts" % str(task.get("points",0)),11,T.GOLD))
        v.add_child(_body(str(task.get("description","")),11,T.MUTED)); v.add_child(_body(D.cost_text(_cost_array_to_dict(task.get("cost",[]))),10,T.MUTED))
        var mine:=str(game_state.get("current_player_id","")) == str(api.player.get("id","")); var b:=_button("COMPLETE TASK",true); b.disabled=(not _can_afford(_cost_array_to_dict(task.get("cost",[])))) or (not mine) or (_my_island().get("active_event",null) != null); v.add_child(b); b.pressed.connect(func(id=str(task.get("id",""))): await _complete_task(id))

func _cost_array_to_dict(items:Array)->Dictionary:
    var d:Dictionary = {}
    for pair in items:
        if pair is Array and pair.size() >= 2:
            d[str(pair[0])] = int(pair[1])
    return d

func _can_afford(cost:Dictionary)->bool:
    var r:=_my_island().get("resources",{}); for key in cost.keys(): if int(r.get(key,0)) < int(cost[key]): return false
    return true

func _on_board_hex(q:int,r:int)->void:
    if selected_tile=="": return
    if str(game_state.get("current_player_id","")) != str(api.player.get("id","")): _toast("It is not your turn.",T.MUTED); return
    var res:=await api.place_tile(game_id,q,r,selected_tile,selected_rotation)
    if res.has("_error"): _toast(res._error,T.RED); return
    selected_tile=""; _toast("Tile placed  ·  edge bonus +%s" % str(res.get("edge_bonus",0)),T.TEAL)
    _refresh_game_ui()

func _on_tile_clicked(tile:Dictionary)->void:
    var d:=D.tile(str(tile.get("tile_id","tile_farm"))); _toast("%s  ·  %s" % [d.name, d.desc], d.color)

func _respond_event(action:String,_event_id:String)->void:
    var res:=await api.respond_event(game_id,action,0)
    if res.has("_error"): _toast(res._error,T.RED); return
    _toast(str(res.get("message","Event resolved")),T.GREEN); _refresh_game_ui()

func _trade(id:String)->void:
    var res:=await api.trade(game_id,id); if res.has("_error"): _toast(res._error,T.RED); return
    _toast(str(res.get("message","Trade completed")),T.GOLD); _refresh_game_ui()

func _complete_task(id:String)->void:
    var res:=await api.complete_task(game_id,id); if res.has("_error"): _toast(res._error,T.RED); return
    _toast(str(res.get("message","Task completed")),T.PURPLE); _refresh_game_ui()

func _end_turn()->void:
    var res:=await api.end_turn(game_id); if res.has("_error"): _toast(res._error,T.RED); return
    if bool(res.get("state",{}).get("game_over",false)): show_results(); return
    _toast("Turn passed. Your island generated its round income.",T.TEAL); _refresh_game_ui()

func show_results()->void:
    _clear_screen(); current_screen="results"
    var center:=CenterContainer.new(); center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); screen_root.add_child(center)
    var card:=_panel(Color("#0d2631"),Color("#285864")); card.custom_minimum_size=Vector2(760,620); center.add_child(card)
    var m:=MarginContainer.new(); m.add_theme_constant_override("margin_left",38); m.add_theme_constant_override("margin_right",38); m.add_theme_constant_override("margin_top",34); m.add_theme_constant_override("margin_bottom",34); card.add_child(m)
    var v:=VBoxContainer.new(); v.add_theme_constant_override("separation",12); m.add_child(v)
    v.add_child(_body("SEASON COMPLETE",11,T.GOLD)); v.add_child(_title("The island made it through.",32)); v.add_child(_body("Final scores are calculated from task score, event score and cultural harmony.",13,T.MUTED))
    var rows:=VBoxContainer.new(); rows.add_theme_constant_override("separation",8); v.add_child(rows)
    var islands:Array=game_state.get("islands",[]); islands.sort_custom(func(a,b): return _total_score(a)>_total_score(b))
    for i in islands.size():
        var isl:Dictionary=islands[i]; var sc:=_total_score(isl); var r:=_panel(T.SURFACE,T.LINE); rows.add_child(r); var h:=HBoxContainer.new(); r.add_child(h); h.add_child(_title("%02d" % (i+1),18,T.GOLD if i==0 else T.MUTED)); var info:=VBoxContainer.new(); info.size_flags_horizontal=Control.SIZE_EXPAND_FILL; h.add_child(info); info.add_child(_title("%s Island" % str(isl.get("island_type","unknown")).capitalize(),15)); info.add_child(_body("Task %s  ·  Events %s  ·  Harmony %s" % [str(isl.get("task_score",0)),str(isl.get("event_score",0)),str(isl.get("cultural_harmony",0))],10,T.MUTED)); h.add_spacer(false); h.add_child(_title("%s" % sc,22,T.TEXT))
    v.add_spacer(false)
    var act:=HBoxContainer.new(); act.add_spacer(false); var home:=_button("BACK TO HOME",true); home.pressed.connect(show_home); act.add_child(home); v.add_child(act)

func _total_score(isl:Dictionary)->int:
    return int(isl.get("task_score",0))+int(isl.get("event_score",0))+int(int(isl.get("cultural_harmony",0))/10)

func show_leaderboard()->void:
    _clear_screen(); current_screen="leaderboard"
    var margin:=MarginContainer.new(); margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); margin.add_theme_constant_override("margin_left",90); margin.add_theme_constant_override("margin_right",90); margin.add_theme_constant_override("margin_top",48); margin.add_theme_constant_override("margin_bottom",42); screen_root.add_child(margin)
    var root:=VBoxContainer.new(); root.add_theme_constant_override("separation",14); margin.add_child(root); root.add_child(_top_nav("SEASON LEADERBOARD"))
    var panel:=_panel(T.SURFACE,T.LINE); panel.size_flags_vertical=Control.SIZE_EXPAND_FILL; root.add_child(panel)
    var scroll:=ScrollContainer.new(); panel.add_child(scroll); var list:=VBoxContainer.new(); list.add_theme_constant_override("separation",7); scroll.add_child(list)
    list.add_child(_body("Season standings from the existing backend ranking endpoint.",11,T.MUTED))
    var r:=await api.leaderboard()
    if r.has("_error"): list.add_child(_body(r._error,12,T.RED)); return
    var board:Array=r.get("leaderboard",[])
    if board.is_empty(): list.add_child(_body("No rankings yet. Play a complete game to populate the season table.",13,T.MUTED)); return
    for i in board.size():
        var e:Dictionary=board[i]; var row:=_panel(Color("#112d38") if i<3 else T.SURFACE,T.LINE); list.add_child(row); var h:=HBoxContainer.new(); row.add_child(h); h.add_child(_title("%02d" % (i+1),18,T.GOLD if i<3 else T.MUTED)); var name:=_title(str(e.get("username","Player")),15); name.size_flags_horizontal=Control.SIZE_EXPAND_FILL; h.add_child(name); h.add_child(_body("Score %s  ·  Wins %s  ·  Games %s" % [str(e.get("score",0)),str(e.get("wins",0)),str(e.get("games_played",0))],12,T.TEXT))

func _toast(message:String,color:Color)->void:
    var old:=toast_layer.get_node_or_null("Toast"); if old: old.queue_free()
    var p:=PanelContainer.new(); p.name="Toast"; p.add_theme_stylebox_override("panel",T.card(Color("#0d2530"),color,12)); p.set_anchors_preset(Control.PRESET_TOP_RIGHT); p.position=Vector2(-410,110); p.custom_minimum_size=Vector2(380,56); toast_layer.add_child(p)
    var l:=Label.new(); l.text=message; l.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; l.vertical_alignment=VERTICAL_ALIGNMENT_CENTER; l.add_theme_font_size_override("font_size",12); l.add_theme_color_override("font_color",T.TEXT); p.add_child(l)
    var tw:=create_tween(); tw.tween_interval(2.6); tw.tween_property(p,"modulate:a",0.0,0.35); tw.tween_callback(p.queue_free)

class _HomeArt extends Control:
    func _draw()->void:
        var c:=Vector2(size.x*0.5,size.y*0.54)
        for i in range(6): draw_circle(c,92+i*28,Color(0.25,0.75,0.72,0.025),false,2)
        var island:=PackedVector2Array([c+Vector2(-150,35),c+Vector2(-110,-42),c+Vector2(-25,-80),c+Vector2(67,-52),c+Vector2(150,14),c+Vector2(104,80),c+Vector2(10,96),c+Vector2(-90,80)])
        draw_colored_polygon(island,Color("#7aa66a")); draw_polyline(island,Color("#cce5bd"),2,true)
        for t in [[Vector2(-70,-10),Color("#b67a4c")],[Vector2(0,-34),Color("#9b6cc2")],[Vector2(65,0),Color("#4daec7")],[Vector2(5,40),Color("#cc975d")]]:
            draw_circle(c+t[0],30,Color("#0c2530")); draw_circle(c+t[0],25,t[1])
        draw_string(ThemeDB.fallback_font,c+Vector2(-170,132),"A LIVING ISLAND, NOT JUST A MAP",HORIZONTAL_ALIGNMENT_LEFT,-1,11,Color("#6d8d95"))
