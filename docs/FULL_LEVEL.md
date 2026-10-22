# Station route — prototype expansion

This is one continuous level, not four selectable levels. The original Lower Ward remains intact; its northern station gate opens into the Lamp Ascent, Transfer Court and Upper Watch. These names and encounters are local prototype adaptations, not additions to campaign canon. The station gate is not a revelation of the true sealed Vault. All plate and weapon upgrades remain mundane.

## Route and pacing

- **Lower Ward:** existing three encounters, three equipment caches, forge, starting checkpoint and lever-operated shortcut. The original captain no longer ends the whole expedition.
- **Lamp Ascent:** pass through the monumental station gate into a bent, lamp-marked approach with two melee guards and a bow lookout.
- **Transfer Court:** crossing walls, optional fourth cache, another three encounters and a second safe checkpoint. Reload/retry can resume here after resting.
- **Upper Watch:** another bent approach with melee guard, bow lookout and final captain; interact with the marked exit after defeating the captain to finish. Remaining loot and return exploration remain available.

The world contains four courtyard-sized connected sections and twelve enemies versus the original one and three. `src/core/level.ts` records the route metric and deterministic tests check connectivity. These are content/distance measurements, not a claim of exact human playtime. The camera pans rather than reducing the knight's readable scale.

## Gate and input contract

The station lever is distinct from the original shortcut lever. Interaction first performs a visible pull, then opens the heavy door leaves. Movement through the threshold remains blocked until the full animation completes. Pausing freezes the animation. Repeated interactions do not restart it or give rewards.

**F** is the primary keyboard attack; **J** remains an alias. Both attack using current movement or the last keyboard heading even after the keys are released, independent of the cursor. Clicking explicitly aims and attacks toward the cursor. Space rolls and E interacts. No pointer movement is required for keyboard combat.

## Durable progression

Version-one saves retain equipment, upgrades, marks, looted caches, cleared original enemies and the shortcut; the expanded route starts undiscovered and incomplete. Version-two saves also retain the fully opened station gate, selected checkpoint and final completion. Partial gate animations resume safely closed at the checkpoint. Death retains earned progress and resets surviving enemies. The separate `?qa=1` save never reads or erases the normal expedition.

## Verification

Rules tests cover passage collision, gate interruption/retry, v1 migration, v2 checkpoint/completion, content metrics and reachable interactions. Browser tests use native keyboard/mouse inputs and read-only snapshots; they do not inject player state or award equipment. Browser screenshots and exact-commit CI results are recorded separately in STATUS and the pull request. A draft PR is not a live deployment.
