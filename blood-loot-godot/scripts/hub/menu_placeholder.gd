extends Control
class_name MenuPlaceholder
## Temporary full-screen menu until the web UI is ported (contracts, armory, etc.).

signal closed

@onready var _title: Label = %TitleLabel
@onready var _subtitle: Label = %SubtitleLabel


func setup(title: String, subtitle: String = "") -> void:
	_title.text = title
	_subtitle.text = subtitle
	_subtitle.visible = subtitle.length() > 0


func _on_back_pressed() -> void:
	closed.emit()
	queue_free()


func _on_dimmer_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_on_back_pressed()
