# Equipment/training panel integration contract

## Component boundary

The controlled vanilla-DOM component is wired by `game/CourtyardScene.ts` to the authoritative Adventure/core and `WorldView` readiness registry. It does not itself mutate gameplay, renderer or storage state. Verification/publication status is recorded separately in `STATUS.md`.

Exports:

- `src/ui/EquipmentPanel.ts`: `EquipmentPanel`, `EquipmentPanelOptions`, `EquipmentPanelCallbacks`, `EquipmentActionFeedback`, `ItemThumbnail`; re-exports `EquipmentPanelState` and `EquipmentPanelAssets`.
- `src/core/equipmentPanelView.ts`: pure `buildEquipmentPanelModel`, `armorCandidate`, `weaponCandidate`, `statComparisons`, `formatStat`, `formatDelta`; typed snapshot/model contracts.
- `src/ui/equipment-panel.css`: scoped charcoal/gold styles imported by `EquipmentPanel.ts`.

The component adds no external dependency.

## Lifecycle / callbacks

`new EquipmentPanel(options)` mounts a hidden dialog in `options.host` (prefer a UI root directly under `document.body`, not under a transformed canvas container). `open(snapshot)` saves focus and calls `onVisibilityChange(true)` once. `update(snapshot)` rebuilds presentation from current authoritative immutable data, retaining selection/focus where available. `close()` hides it, calls `onVisibilityChange(false)`, restores `returnFocus()` or prior focus, then calls `onClose()`. Repeated open/close are idempotent. `destroy()` closes and aborts/removes listeners; call on Scene shutdown.

Required typed callbacks: `onEquipArmor(slot,id)`, `onEquipWeapon(id)`, `onSpendAttribute(attribute)`, `onRest()`, `onClose()`, `onVisibilityChange(visible)`. Optional `onUpgradeWeapon(id)` preserves the existing equipped-weapon +1/+2 forge UI. Optional `onMessage(message)` forwards a callback-returned string to existing floating-text feedback. Mutation callbacks may return `void` or an authoritative message string; do not return a success message for a failed action. `snapshot.message` displays Scene-supplied save/gameplay feedback without forwarding it again, preventing feedback loops.

The Scene owns pausing and input cleanup. On visibility changes clear held/buffered gameplay input and apply/remove the **equipment-menu pause reason**, rather than blindly unpausing other menus/window-blur reasons. The dialog stops bubbled keyboard/pointer gameplay shortcuts, traps Tab/Shift+Tab, returns Esc, and recaptures external focus while open. This does not replace Scene-level paused-input guards; listeners already running in window capture cannot be retroactively stopped. Give the canvas `tabIndex=-1` if necessary and supply `returnFocus: () => canvas`.

The UI does not poll game state. Push a fresh snapshot after successful/failed actions, discovery, loading readiness changes, checkpoint/forge changes, and save notices. Avoid updating every animation frame unnecessarily.

## Authoritative state, no spoilers, no invented asset paths

`EquipmentPanelState` contains `equipment`, `armory`, `progression`, `base`, `context`, `atCheckpoint`, `atForge`, `currency`, and optional discovery/message fields. Use the canonical core types; do not map them to a second mutable UI inventory. Core functions provide all item statistics, armor comparison values, XP requirements, point availability and action preflight results. In particular there is **no separate UI defense-reduction formula**; normalizing starter Ward incoming damage in core does not require a UI arithmetic change.

`discoveredArmor` and `discoveredWeapons` reveal inspectable unowned candidates. If omitted, only owned items appear. Owned items always appear; unknown future loot is not enumerated by the UI. No code here grants items, spends points, changes currency or refills pools.

`EquipmentPanelAssets.armorReady(item)` and `.weaponReady(item)` must query the synchronously loaded renderer registry, not thumbnail presence, and must not start loads. Core `prepareEquip` checks every required candidate part before enabling an action. `supportHand` must reflect verified full-attack grip capability; a catalog entry/socket alone is insufficient. Construct the panel after the release's static capability is established.

`armorThumbnail(item)` / `weaponThumbnail(item)` return `{src,alt?}` from an **injected** asset registry or `null`. No assumed asset paths are present. Thumbnail failure/throw produces a small dash and tooltip, not a broken menu and not a false readiness claim. Thumbnails are decorative within clearly named item buttons. A missing thumbnail does not prohibit equip if the real renderer's complete assets are ready. Missing render assets do prohibit equip through core preflight.

## Scene adapter pattern (illustrative; see the active CourtyardScene implementation)

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

Callbacks must always revalidate the newest core snapshot. The UI's preflight is explanatory, not authorization to apply a stale candidate. Busy/dead/rolling/interaction armor and weapon actions display core failure messages. Training is checkpoint-only per `spendAttribute`; rest has a separate explicit request and never occurs automatically when viewing/training. Training must not implicitly rest or heal.

## Layout and verification

At 1440×1000, armor uses four vertical equipped slots beside candidates/comparison. At 900×700, the four slots move into one row above the candidates/comparison. The dialog is viewport-bounded and its body scrolls; the footer/header remain available. Smaller fallback layout is also included, without claiming mobile gameplay support.

Run `npm test` for the presentation/core rules and `npm run build` for strict TypeScript plus production bundling. Run `npx playwright test --config playwright.equipment.config.ts` for six isolated real-DOM cases: keyboard/pointer callbacks, focus/Escape/Tab/destroy, checkpoint training/rest, busy denials and 1440/900 layouts. The fixture runs separately on4175 and does not alter the game's browser configuration or expose a gameplay mutation API.

Run the normal `npm run test:browser` after changes to the active Scene. Use earned equipment in gameplay and inspect actual render sources, all four independent swaps/mixed sets, attack→menu/roll→menu denials, close/reopen/window blur, reload/fallback/quota protection, death/retry, upgrades and checkpoints. Isolated component tests do not prove those integrated flows. Keep exact-commit CI results and publication status in `STATUS.md`, not embedded test-count claims that drift from this component contract.
