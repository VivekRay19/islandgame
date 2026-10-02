class_name CIT
extends RefCounted

const BG := Color("#07141d")
const BG_2 := Color("#0b1e29")
const SURFACE := Color("#102936")
const SURFACE_2 := Color("#153441")
const SURFACE_3 := Color("#1a3c49")
const LINE := Color("#264a57")
const TEXT := Color("#edf4f3")
const MUTED := Color("#8ea7ad")
const TEAL := Color("#41d9c3")
const TEAL_DARK := Color("#187f78")
const GOLD := Color("#f2c66d")
const SAND := Color("#d8b37a")
const RED := Color("#ed765f")
const RED_DARK := Color("#8e382f")
const BLUE := Color("#61a8e8")
const GREEN := Color("#73cc8d")
const PURPLE := Color("#a38be8")
const WATER := Color("#3eadd4")
const SHADOW := Color(0,0,0,0.3)

static func panel(radius := 16, fill := SURFACE, border := LINE, border_width := 1) -> StyleBoxFlat:
    var s := StyleBoxFlat.new()
    s.bg_color = fill
    s.border_color = border
    s.set_border_width_all(border_width)
    s.set_corner_radius_all(radius)
    s.content_margin_left = 18
    s.content_margin_right = 18
    s.content_margin_top = 14
    s.content_margin_bottom = 14
    return s

static func card(fill := SURFACE, border := LINE, radius := 14) -> StyleBoxFlat:
    return panel(radius, fill, border, 1)

static func button(normal := SURFACE_2, hover := SURFACE_3, pressed := Color("#20525b"), border := LINE) -> StyleBoxFlat:
    var s := StyleBoxFlat.new()
    s.bg_color = normal
    s.border_color = border
    s.set_border_width_all(1)
    s.set_corner_radius_all(12)
    s.content_margin_left = 16
    s.content_margin_right = 16
    s.content_margin_top = 10
    s.content_margin_bottom = 10
    s.set_expand_margin_all(1)
    return s

static func pill(fill := SURFACE_2, radius := 99) -> StyleBoxFlat:
    var s := StyleBoxFlat.new()
    s.bg_color = fill
    s.set_corner_radius_all(radius)
    s.content_margin_left = 10
    s.content_margin_right = 10
    s.content_margin_top = 5
    s.content_margin_bottom = 5
    return s

static func apply_button(b: Button, accent := false) -> void:
    b.add_theme_stylebox_override("normal", button(accent ? Color("#176b67") : SURFACE_2, accent ? Color("#2a9088") : SURFACE_2, Color("#1c7f78") if accent else Color("#20525b"), accent ? TEAL_DARK : LINE))
    b.add_theme_stylebox_override("hover", button(accent ? Color("#218a82") : SURFACE_3, accent ? Color("#35a79c") : Color("#214a57"), Color("#1c7f78"), accent ? TEAL : LINE))
    b.add_theme_stylebox_override("pressed", button(accent ? Color("#125650") : Color("#173a44"), accent ? Color("#176b67") : Color("#173a44"), Color("#0e3e3b"), accent ? TEAL_DARK : LINE))
    b.add_theme_color_override("font_color", TEXT)
    b.add_theme_color_override("font_hover_color", Color.WHITE)
    b.add_theme_color_override("font_pressed_color", Color.WHITE)
    b.add_theme_color_override("font_disabled_color", Color("#5c7075"))

static func style_root(root: Control) -> void:
    root.add_theme_color_override("font_color", TEXT)
    root.add_theme_color_override("font_placeholder_color", MUTED)
    root.add_theme_color_override("font_hover_color", TEXT)
    root.add_theme_color_override("font_pressed_color", TEXT)
    root.add_theme_color_override("font_outline_color", Color(0,0,0,0.2))
