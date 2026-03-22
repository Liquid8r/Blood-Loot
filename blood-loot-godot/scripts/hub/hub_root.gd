extends Control
## Hub menu ported from web `showMainMenu` — hover swaps pod art, polygons match `main.js`.

const HUB_DIR := "res://assets/graphics/hub/"
const HUB_W := 1536.0
const HUB_H := 1024.0
const SETTINGS_PATH := "user://blood_loot_settings.cfg"

const PLACEHOLDER := preload("res://scenes/hub/menu_placeholder.tscn")

@onready var _hub_plane: Control = %HubPlane
@onready var _tex_bg: TextureRect = %TexBg
@onready var _tex_highlight: TextureRect = %TexHighlight
@onready var _hit: Control = %HitDetector
@onready var _music_slider: HSlider = %MusicSlider
@onready var _sfx_slider: HSlider = %SfxSlider
@onready var _music_pct: Label = %MusicPct
@onready var _sfx_pct: Label = %SfxPct
@onready var _menu_music: AudioStreamPlayer = %MenuMusic

var _tex_default_bg: Texture2D
var _tex_default_hl: Texture2D
## Each entry: id, bg, hl, poly (PackedVector2Array)
var _zones: Array[Dictionary] = []
var _hover_id: String = ""

var _music_vol: float = 0.28
var _sfx_vol: float = 1.0


func _ready() -> void:
	_load_settings()
	_load_textures_and_zones()
	_apply_hover_textures("")
	_music_slider.value = _music_vol * 100.0
	_sfx_slider.value = _sfx_vol * 100.0
	_update_volume_labels()
	_music_slider.value_changed.connect(_on_music_slider_changed)
	_sfx_slider.value_changed.connect(_on_sfx_slider_changed)
	_hit.gui_input.connect(_on_hit_gui_input)
	_setup_optional_menu_music()
	set_process(true)
	call_deferred("_fit_hub_plane")


func _process(_delta: float) -> void:
	if _tex_highlight == null:
		return
	## Match web CSS `hubHighlightPulse` (~5s ease loop) via sine opacity 0..1.
	var t := Time.get_ticks_msec() * 0.001 * (TAU / 5.0)
	var a := (sin(t) + 1.0) * 0.5
	_tex_highlight.modulate = Color(1, 1, 1, a)


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_fit_hub_plane()


func _fit_hub_plane() -> void:
	## NOTIFICATION_RESIZED can run before _ready(); @onready refs are still null.
	if _hub_plane == null:
		return
	var vp := get_viewport_rect().size
	var scale_v := maxf(vp.x / HUB_W, vp.y / HUB_H)
	_hub_plane.scale = Vector2(scale_v, scale_v)
	_hub_plane.position = (vp - Vector2(HUB_W, HUB_H) * scale_v) * 0.5
	_hub_plane.custom_minimum_size = Vector2(HUB_W, HUB_H)
	_hub_plane.size = Vector2(HUB_W, HUB_H)


func _load_settings() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(SETTINGS_PATH) != OK:
		return
	_music_vol = clampf(cfg.get_value("audio", "music", _music_vol), 0.0, 1.0)
	_sfx_vol = clampf(cfg.get_value("audio", "sfx", _sfx_vol), 0.0, 1.0)


func _save_settings() -> void:
	var cfg := ConfigFile.new()
	cfg.load(SETTINGS_PATH)
	cfg.set_value("audio", "music", _music_vol)
	cfg.set_value("audio", "sfx", _sfx_vol)
	cfg.save(SETTINGS_PATH)


func _load_textures_and_zones() -> void:
	_tex_default_bg = load(HUB_DIR + "pod.png") as Texture2D
	_tex_default_hl = load(HUB_DIR + "pod_high_light.png") as Texture2D
	_tex_bg.texture = _tex_default_bg
	_tex_highlight.texture = _tex_default_hl
	_zones = [
		_zone(
			"contracts",
			"pod_contracts.png",
			"pod_high_light_contracts.png",
			[Vector2(80, 335), Vector2(303, 347), Vector2(319, 567), Vector2(78, 577)]
		),
		_zone(
			"chem",
			"pod_chemistry_lab.png",
			"pod_high_light_chemistry_lab.png",
			[Vector2(314, 296), Vector2(532, 290), Vector2(526, 635), Vector2(319, 631)]
		),
		_zone(
			"armory",
			"pod_armory.png",
			"pod_high_light_armory.png",
			[Vector2(623, 277), Vector2(885, 277), Vector2(885, 639), Vector2(623, 639)]
		),
		_zone(
			"intel",
			"pod_intel.png",
			"pod_high_light_intel.png",
			[Vector2(964, 289), Vector2(1182, 293), Vector2(1188, 634), Vector2(963, 638)]
		),
		_zone(
			"core",
			"pod_core_systems.png",
			"pod_high_light_core_systems.png",
			[Vector2(1215, 315), Vector2(1487, 289), Vector2(1488, 495), Vector2(1215, 500)]
		),
		_zone(
			"options",
			"pod_options.png",
			"pod_high_light_options.png",
			[Vector2(1222, 586), Vector2(1335, 593), Vector2(1306, 696), Vector2(1193, 685)]
		),
		_zone(
			"drop",
			"pod_drop-zone.png",
			"pod_high_light_drop_zone.png",
			[Vector2(550, 728), Vector2(953, 728), Vector2(1048, 882), Vector2(470, 882)]
		),
	]


func _zone(id: String, pod_fn: String, hl_fn: String, pts: Array) -> Dictionary:
	var poly := PackedVector2Array()
	for p in pts:
		poly.append(p)
	return {
		"id": id,
		"bg": load(HUB_DIR + pod_fn) as Texture2D,
		"hl": load(HUB_DIR + hl_fn) as Texture2D,
		"poly": poly,
	}


func _on_hit_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion:
		var id := _zone_at(event.position)
		if id != _hover_id:
			_hover_id = id
			_apply_hover_textures(id)
	elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var id := _zone_at(event.position)
		if id.is_empty():
			return
		_open_zone(id)


func _zone_at(local_pos: Vector2) -> String:
	for z in _zones:
		if _point_in_polygon(local_pos, z["poly"]):
			return z["id"]
	return ""


func _point_in_polygon(p: Vector2, poly: PackedVector2Array) -> bool:
	var inside := false
	var n := poly.size()
	var j := n - 1
	for i in range(n):
		var pi: Vector2 = poly[i]
		var pj: Vector2 = poly[j]
		if (pi.y > p.y) != (pj.y > p.y):
			var x_intersect := (pj.x - pi.x) * (p.y - pi.y) / (pj.y - pi.y + 1e-9) + pi.x
			if p.x < x_intersect:
				inside = not inside
		j = i
	return inside


func _apply_hover_textures(zone_id: String) -> void:
	if zone_id.is_empty():
		_tex_bg.texture = _tex_default_bg
		_tex_highlight.texture = _tex_default_hl
		return
	for z in _zones:
		if z["id"] == zone_id:
			_tex_bg.texture = z["bg"]
			_tex_highlight.texture = z["hl"]
			return


func _open_zone(zone_id: String) -> void:
	match zone_id:
		"contracts":
			_push_placeholder("Contracts", "Mission selection will be ported from the web build.")
		"chem":
			_push_placeholder("Chemistry Lab", "Blood exchange and lab UI will be ported here.")
		"armory":
			_push_placeholder("Armory", "Equipment and inventory will be ported here.")
		"intel":
			_push_placeholder("Intel & Lore", "Orders, bestiary, and lore will be ported here.")
		"core":
			_push_placeholder("Core Systems", "Skill trees and token upgrades will be ported here.")
		"options":
			_push_placeholder("Coming Soon", "Options and settings are not ported yet. Use volume sliders on the hub.")
		"drop":
			_push_placeholder("Drop Zone", "Choose level / start run will be ported here.")


func _push_placeholder(title: String, subtitle: String) -> void:
	var p := PLACEHOLDER.instantiate() as MenuPlaceholder
	## add_child before setup() so @onready (%TitleLabel etc.) resolve in menu_placeholder.gd
	add_child(p)
	p.set_anchors_preset(Control.PRESET_FULL_RECT)
	p.offset_left = 0
	p.offset_top = 0
	p.offset_right = 0
	p.offset_bottom = 0
	p.setup(title, subtitle)


func _on_music_slider_changed(v: float) -> void:
	_music_vol = clampf(v / 100.0, 0.0, 1.0)
	_update_volume_labels()
	_save_settings()
	if _menu_music.stream != null:
		_menu_music.volume_db = linear_to_db(_music_vol) if _music_vol > 0.0001 else -80.0
		if _music_vol > 0.0 and not _menu_music.playing:
			_menu_music.play()


func _on_sfx_slider_changed(v: float) -> void:
	_sfx_vol = clampf(v / 100.0, 0.0, 1.0)
	_update_volume_labels()
	_save_settings()


func _update_volume_labels() -> void:
	_music_pct.text = "%d%%" % int(round(_music_vol * 100.0))
	_sfx_pct.text = "%d%%" % int(round(_sfx_vol * 100.0))


func _setup_optional_menu_music() -> void:
	var candidates := ["res://assets/audio/main_menu.ogg", "res://assets/audio/Main Menu.ogg", "res://assets/audio/main_menu.mp3"]
	for path in candidates:
		if ResourceLoader.exists(path):
			_menu_music.stream = load(path)
			_menu_music.volume_db = linear_to_db(_music_vol) if _music_vol > 0.0001 else -80.0
			_menu_music.play()
			return
