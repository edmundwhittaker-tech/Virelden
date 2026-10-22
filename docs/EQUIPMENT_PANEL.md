# Equipment/training panel integration contract

## Status and ownership

This is a standalone vanilla-DOM UI on top of pure equipment/progression modules at `70ac4db4230e386e977a3aa4f7cb7bf32420ce1e`. It does **not** change or import Scene, Adventure, WorldView, renderer, input, storage, artwork or gameplay state. It is not yet playable integration or a public release. The sole integration owner wires it after the gate milestone is stable.

Exports:

- `src/ui/EquipmentPanel.ts`: `EquipmentPanel`, `EquipmentPanelOptions`, `EquipmentPanelCallbacks`, `EquipmentActionFeedback`, `ItemThumbnail`; re-exports `EquipmentPanelState` and `EquipmentPanelAssets`.
- `src/core/equipmentPanelView.ts`: pure `buildEquipmentPanelModel`, `armorCandidate`, `weaponCandidate`, `statComparisons`, `formatStat`, `formatDelta`; typed snapshot/model contracts.
- `src/ui/equipment-panel.css`: scoped charcoal/gold styles imported by `EquipmentPanel.ts`.

No dependency or existing file changes are required.

## Lifecycle / callbacks

`new EquipmentPanel(options)` mounts a hidden dialog in `options.host` (prefer a UI root directly under `document.body`, not under a transformed canvas container). `open(snapshot)` saves focus and calls `onVisibilityChange(true)` once. `update(snapshot)` rebuilds presentation from current authoritative immutable data, retaining selection/focus where available. `close()` hides it, calls `onVisibilityChange(false)`, restores `returnFocus()` or prior focus, then calls `onClose()`. Repeated open/close are idempotent. `destroy()` closes and aborts/removes listeners; call on Scene shutdown.

Required typed callbacks: `onEquipArmor(slot,id)`, `onEquipWeapon(id)`, `onSpendAttribute(attribute)`, `onRest()`, `onClose()`, `onVisibilityChange(visible)`. Optional `onUpgradeWeapon(id)` preserves the existing equipped-weapon +1/+2 forge UI. Optional `onMessage(message)` forwards a callback-returned string to existing floating-text feedback. Mutation callbacks may return `void` or an authoritative message string; do not return a success message for a failed action. `snapshot.message` displays parent-supplied save/gameplay feedback without forwarding it again, preventing feedback loops.

The parent owns pausing and input cleanup. On visibility changes clear held/buffered gameplay input and apply/remove the **equipment-menu pause reason**, rather than blindly unpausing other menus/window-blur reasons. The dialog stops bubbled keyboard/pointer gameplay shortcuts, traps Tab/Shift+Tab, returns Esc, and recaptures external focus while open. This does not replace Scene-level paused-input guards; listeners already running in window capture cannot be retroactively stopped. Give the canvas `tabIndex=-1` if necessary and supply `returnFocus: () => canvas`.

The UI does not poll game state. Push a fresh snapshot after successful/failed actions, discovery, loading readiness changes, checkpoint/forge changes, and save notices. Avoid updating every animation frame unnecessarily.

## Authoritative state, no spoilers, no invented asset paths

`EquipmentPanelState` contains `equipment`, `armory`, `progression`, `base`, `context`, `atCheckpoint`, `atForge`, `currency`, and optional discovery/message fields. Use the canonical core types; do not map them to a second mutable UI inventory. Core functions provide all item statistics, armor comparison values, XP requirements, point availability and action preflight results. In particular there is **no separate UI defense-reduction formula**; normalizing starter Ward incoming damage in core does not require a UI arithmetic change.

`discoveredArmor` and `discoveredWeapons` reveal inspectable unowned candidates. If omitted, only owned items appear. Owned items always appear; unknown future loot is not enumerated by the UI. No code here grants items, spends points, changes currency or refills pools.

`EquipmentPanelAssets.armorReady(item)` and `.weaponReady(item)` must query the synchronously loaded renderer registry, not thumbnail presence, and must not start loads. Core `prepareEquip` checks every required candidate part before enabling an action. `supportHand` must reflect verified full-attack grip capability; a catalog entry/socket alone is insufficient. Construct the panel after the release's static capability is established.

`armorThumbnail(item)` / `weaponThumbnail(item)` return `{src,alt?}` from an **injected** asset registry or `null`. No assumed asset paths are present. Thumbnail failure/throw produces a small dash and tooltip, not a broken menu and not a false readiness claim. Thumbnails are decorative within clearly named item buttons. A missing thumbnail does not prohibit equip if the real renderer's complete assets are ready. Missing render assets do prohibit equip through core preflight.

## Scene adapter pattern (illustrative, not pasted into gameplay)

```ts
import {EquipmentPanel, type EquipmentPanelState} from '../ui/EquipmentPanel';
import {prepareEquip, clampPools} from '../core/equipment';
import {prepareWeaponEquip, prepareWeaponUpgrade} from '../core/weaponCatalog';
import {spendAttribute} from '../core/progression';

// All capitalized owner functions below are integration responsibilities, not new APIs.
const snapshot = (): EquipmentPanelState => ReadAuthoritativePanelSnapshot();
const panel = new EquipmentPanel({
  host: uiRoot,
  assets: {armorReady: registry.armorReady, weaponReady: registry.weaponReady,
    supportHand: registry.verifiedSupportGrip},
  armorThumbnail: item => registry.armorThumbnail(item.visual),
  weaponThumbnail: item => registry.weaponThumbnail(item.id),
  returnFocus: () => canvas,
  callbacks: {
    onVisibilityChange: visible => { ClearGameplayInput(); SetEquipmentPauseReason(visible); },
    onClose: () => MarkEquipmentMenuClosed(),
    onMessage: message => ExistingFloatingText(message),
    onEquipArmor: (slot, id) => {
      const s = snapshot();
      const result = prepareEquip(s.equipment, slot, id, s.context, s.base,
        s.progression.attributes, registry.armorReady);
      if (!result.ok) { panel.update({...s, message: DescribeEquipFailure(result.reason)}); return; }
      // Re-preflight the *renderer* too; only then commit equipment + stats + renderer together.
      if (!RendererCanCommit(result.next)) { panel.update({...s, message: 'Artwork not ready.'}); return; }
      CommitArmorAndRenderer(result.next, result.stats);
      // Use clampPools on the authoritative current pools; never refill maxima on equip.
      CommitPools(clampPools(ReadCurrentPools(), result.stats));
      PersistWithoutDiscardingLastGoodSave();
      panel.update(snapshot());
      return result.changed ? 'Equipment changed.' : undefined;
    },
    onEquipWeapon: id => {
      const s = snapshot();
      const result = prepareWeaponEquip(s.armory, id, s.context,
        {supportHand: registry.verifiedSupportGrip, visualReady: registry.weaponReady});
      if (result.ok && RendererCanCommitWeapon(result.next)) CommitWeaponAndRenderer(result.next);
      panel.update(snapshot());
      // Return the actual result message if the owner wants floating-text feedback.
    },
    onSpendAttribute: attribute => {
      const s = snapshot();
      const result = spendAttribute(s.progression, attribute, s.atCheckpoint);
      if (result.ok) CommitProgressionAndRecalculateMaximaWithoutRefill(result.next);
      panel.update(snapshot());
    },
    onRest: () => { RequestCoreCheckpointRest(); panel.update(snapshot()); },
    onUpgradeWeapon: id => {
      const s = snapshot();
      if (s.armory.equipped !== id) return; // stale callback; do not improve a different weapon
      const result = prepareWeaponUpgrade(s.armory, s.currency, s.atForge, s.context);
      if (result.ok) CommitArmoryAndCurrencyTogether(result.next, result.currency);
      panel.update(snapshot());
    },
  },
});
// Equipment shortcut: gate opening/Scene pause rules remain with the integration owner.
panel.open(snapshot());
// Scene shutdown:
panel.destroy();
```

Callbacks must always revalidate the newest core snapshot. The UI's preflight is explanatory, not authorization to apply a stale candidate. Busy/dead/rolling/interaction armor and weapon actions display core failure messages. Training is checkpoint-only per `spendAttribute`; rest has a separate explicit request and never occurs automatically when viewing/training. If the owner deliberately makes training also rest, that must be explicit Scene behavior and feedback.

## Layout and verification

At 1440×1000, armor uses four vertical equipped slots beside candidates/comparison. At 900×700, the four slots move into one row above the candidates/comparison. The dialog is viewport-bounded and its body scrolls; the footer/header remain available. Smaller fallback layout is also included, without claiming mobile gameplay support.

- `npm test`: **78/78** pass, including 9 new pure presentation tests covering all slots/real comparison values, noops/unowned/discovery, every weapon, missing/throwing assets, busy states, checkpoint training, cap/zero-points, additive forge costs, accurate timing formatting.
- `npm run build`: strict TypeScript and normal production build pass. Because no Scene imports the component yet, production bundling does not establish rendered integration.
- `npx playwright test --config playwright.equipment.config.ts --list`: six isolated DOM tests successfully discovered/parsed. This is **not** browser execution.
- `tests/fixtures/equipment-panel.html` is isolated test input only, with its own fixture state/callbacks. It is not imported by the game and exposes no gameplay mutation API.
- Optional actual browser command: `npx playwright test --config playwright.equipment.config.ts`. This starts Vite on 4175 and covers real keyboard/pointer callbacks, focus/Escape/Tab/destroy, checkpoint training/rest, busy denials and 1440/900 layout captures. No browser bypass flags are set. The game's existing `npm run test:browser` config is unchanged and does not collect this separate fixture suite.
- Actual browser run, rendered screenshot inspection and Scene/gameplay/save integration are **not yet performed**. Prior Chromium launch restriction was respected rather than retried or bypassed. No screenshot/mock is claimed.
- Public push, CI, merge and deployment are **not performed by this module task**.

The integrator must run the existing full browser suite after wiring, use earned equipment in gameplay, validate attack→menu/roll→menu denial, close/reopen/window blur, all four independent piece swaps, reload/save fallback, death/retry, checkpoints, thumbnail readiness and full renderer consistency. Isolated test-fixture interaction does not prove those game flows.
