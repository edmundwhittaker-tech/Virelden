# Poleaxe: actual rendered two-hand registration

`tests/fixtures/poleaxe-support.html` loads the production Phaser Canvas renderer, armour atlases and textured poleaxe. It changes no saved expedition or gameplay capability. Its native pose selector covers 160 arrangements: eight projected aims, both previous horizontal sides (including north/south reflection), carry, and windup/active/recovery at 0, 0.5 and 1.

`ModularKnightSprite.snapshot().registration` measures registered source landmarks through the **actual pooled Phaser images' world-transform matrices**. Hand landmarks use the loaded hand texture/frame's distal point; weapon landmarks use its primary/support grip pixels. These copied audit values are separate from theoretical rig sockets. No pose, image placement, timing, damage or support-hand gate is changed.

Run:

```sh
npx playwright test --config playwright.poleaxe.config.ts --output test-results/poleaxe-browser
```

The browser case requires both rendered hands to meet their actual weapon grips within 0.05 px, real 11 px grip spacing, 15 visible armour parts, the ordinary textured poleaxe, both views/reflections and visible source pixels in a 3 × 3 primary/support-grip neighbourhood. It writes 160 compact copied observations and selected native 640 × 400 contact/carry images under `test-results/poleaxe-support/`, without traces.

This is a focused registration check, not earned-loot, damage, animation-quality or whole-game acceptance. Fixture discovery is not evidence of browser success. Record actual browser results and inspect the rendered contact images before enabling the area weapon capability; the project's separate physical-contact and visual review still apply.

## Recorded acceptance

[Native rendered-grip run 39737281394, job 119685845157](https://github.com/edmundwhittaker-tech/Virelden/actions/runs/39737281394/job/119685845157) passed 160 poses on commit `fcc3cdceb20e7202237c40bd2195a502b5efbe19`. Maximum actual image-landmark errors were 0.0000232 px primary and 0.0000288 px support; grip spacing was 10.9999997–11.0000004 px. Selected native contact/carry images and all observations are in artifact `connected-expedition-poleaxe-evidence`. Together with the separately reviewed production weapon-contact evidence, this closes the support-hand capability gate; it does not waive earned ownership, idle-state or loaded-artwork checks.
