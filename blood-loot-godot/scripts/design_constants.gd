extends Node
## Autoload singleton **Design** — felles referanse for layout og samtale.
## Les `docs/SCREEN-REFERENCE.md` for kontrakten.

const WIDTH: int = 1920
const HEIGHT: int = 1080


func get_center() -> Vector2:
	return Vector2(WIDTH * 0.5, HEIGHT * 0.5)


func get_size() -> Vector2:
	return Vector2(WIDTH, HEIGHT)


## Typiske ankre vi kan bruke i prat (samme som web-design 1920×1080).
func top_left() -> Vector2:
	return Vector2.ZERO


func top_center() -> Vector2:
	return Vector2(WIDTH * 0.5, 0.0)


func bottom_center() -> Vector2:
	return Vector2(WIDTH * 0.5, HEIGHT)


func clamp_to_design(p: Vector2) -> Vector2:
	return Vector2(clampf(p.x, 0.0, WIDTH), clampf(p.y, 0.0, HEIGHT))
