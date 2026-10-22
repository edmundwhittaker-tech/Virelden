# Poleaxe: actual rendered two-hand registration

`tests/fixtures/poleaxe-support.html` loads the production Phaser Canvas renderer, armour atlases and textured poleaxe. It changes no saved expedition or gameplay capability. Its native pose selector covers160 arrangements: eight projected aims, both previous horizontal sides (including north/south reflection), carry, and windup/active/recovery at0,.5,1.

`ModularKnightSprite.snapshot().registration` measures registered source landmarks through the **actual pooled Phaser images' world-transform matrices**. Hand landmarks use the loaded hand texture/frame's distal point; weapon landmarks use its primary/support grip pixels. These copied audit values are separate from theoretical rig sockets. No pose, image placement, timing, damage or support-hand gate is changed.

Run:

```sh
npx playwright test --config playwright.poleaxe.config.ts --output test-results/poleaxe-browser
```

The browser case requires both rendered hands to meet their actual weapon grips within.05px, real11px grip spacing,15 visible armour parts, the ordinary textured poleaxe, both views/reflections and visible source pixels in a3×3 primary/support-grip neighbourhood. It writes160 compact copied observations and selected native640×400 contact/carry images under `test-results/poleaxe-support/`, without traces.

This is a focused registration check, not earned-loot, damage, animation-quality or whole-game acceptance. Fixture discovery is not evidence of browser success. Record actual browser results and inspect the rendered contact images before enabling the area weapon capability; the project's separate physical-contact and visual review still apply.
