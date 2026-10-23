import {type ArmorId, type ArmorItem, type ArmorSlot} from '../core/equipment.js';
import {type Attribute} from '../core/progression.js';
import {WEAPON_UPGRADE_COSTS, WEAPON_UPGRADE_DAMAGE_BONUS, type WeaponId, type WeaponProfile} from '../core/weaponCatalog.js';
import {buildEquipmentPanelModel, formatDelta, formatStat,
 type ActionAvailability, type EquipmentPanelAssets, type EquipmentPanelModel, type EquipmentPanelState, type StatComparison} from '../core/equipmentPanelView.js';
import './equipment-panel.css';

export type {EquipmentPanelState, EquipmentPanelAssets} from '../core/equipmentPanelView.js';
export interface ItemThumbnail {readonly src: string; readonly alt?: string}
export type EquipmentActionFeedback = void | string;
export interface EquipmentPanelCallbacks {
 readonly onEquipArmor: (slot: ArmorSlot, id: ArmorId) => EquipmentActionFeedback;
 readonly onEquipWeapon: (id: WeaponId) => EquipmentActionFeedback;
 readonly onSpendAttribute: (attribute: Attribute) => EquipmentActionFeedback;
 /** Explicit rest request. The component never changes current health/stamina. */
 readonly onRest: () => EquipmentActionFeedback;
 readonly onClose: () => void;
 /** Owner pauses/clears buffered gameplay input here; component never controls Phaser. */
 readonly onVisibilityChange: (visible: boolean) => void;
 readonly onUpgradeWeapon?: (id: WeaponId) => EquipmentActionFeedback;
 readonly onMessage?: (message: string) => void;
}
export interface EquipmentPanelOptions {
 readonly host: HTMLElement;
 readonly assets: EquipmentPanelAssets;
 readonly callbacks: EquipmentPanelCallbacks;
 /** Resolved URLs only: no asset lookup/path assumptions inside the panel. */
 readonly armorThumbnail: (item: ArmorItem) => ItemThumbnail | null;
 readonly weaponThumbnail: (item: WeaponProfile) => ItemThumbnail | null;
 readonly returnFocus?: () => HTMLElement | null;
}
let sequence = 0;
const SLOT_LABELS: Readonly<Record<ArmorSlot, string>> = {helmet: 'Helmet', chest: 'Chest', gauntlets: 'Gauntlets', legs: 'Legs'};
const FOCUSABLE = 'button:not(:disabled),[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';
function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
 const node = document.createElement(tag); node.className = className; if (text !== undefined) node.textContent = text; return node;
}

/** Controlled immutable equipment/training dialog; open/update take fresh authoritative snapshots. */
export class EquipmentPanel {
 private readonly root: HTMLDivElement;
 private readonly dialog: HTMLElement;
 private readonly body: HTMLDivElement;
 private readonly live: HTMLParagraphElement;
 private readonly abort = new AbortController();
 private state: EquipmentPanelState | null = null;
 private model: EquipmentPanelModel | null = null;
 private opened = false;
 private destroyed = false;
 private previousFocus: HTMLElement | null = null;
 private slot: ArmorSlot = 'helmet';
 private selectedArmor: ArmorId | null = null;
 private selectedWeapon: WeaponId | null = null;
 private tab: 'armor' | 'weapons' | 'training' = 'armor';
 private lastMessage = '';
 private readonly prefix = `equipment-panel-${++sequence}`;

 constructor(private readonly options: EquipmentPanelOptions) {
  this.root = element('div', 'equipment-overlay'); this.root.hidden = true;
  this.dialog = element('section', 'equipment-panel'); this.dialog.setAttribute('role', 'dialog');
  this.dialog.setAttribute('aria-modal', 'true'); this.dialog.setAttribute('aria-labelledby', `${this.prefix}-title`); this.dialog.tabIndex = -1;
  const header = element('header', 'equipment-header');
  const heading = element('div'); heading.append(element('p', 'equipment-eyebrow', 'Ordinary steel · field equipment'));
  const title = element('h2', '', 'Equipment & training'); title.id = `${this.prefix}-title`; heading.append(title);
  const close = this.button('Close · Esc', 'close', () => this.close()); close.classList.add('equipment-close');
  header.append(heading, close); this.body = element('div', 'equipment-body');
  this.live = element('p', 'equipment-feedback'); this.live.setAttribute('role', 'status'); this.live.setAttribute('aria-live', 'polite'); this.live.setAttribute('aria-atomic', 'true');
  const footer = element('footer', 'equipment-footer', 'New idle/walk sprites use one outfit; equipped stats still apply. Attacks, rolls and lever pulls temporarily use earlier animations. Tab to move · Enter / Space to choose · Esc to return');
  this.dialog.append(header, this.body, this.live, footer); this.root.append(this.dialog); options.host.append(this.root);
  const signal = this.abort.signal;
  this.root.addEventListener('keydown', event => this.keydown(event), {signal});
  // Stop gameplay listeners, but retain native button activation and pointer behaviour.
  for (const name of ['keyup', 'pointerdown', 'pointerup', 'click'] as const) this.root.addEventListener(name, event => event.stopPropagation(), {signal});
  window.addEventListener('focusin', event => {
   if (this.opened && !this.root.contains(event.target as Node)) this.firstFocus().focus();
  }, {capture: true, signal});
  window.addEventListener('keydown', event => {
   if (this.opened && !this.root.contains(event.target as Node)) {
    event.preventDefault(); event.stopImmediatePropagation();
    if (event.key === 'Escape') this.close(); else this.firstFocus().focus();
   }
  }, {capture: true, signal});
 }
 get isOpen(): boolean {return this.opened;}
 open(state: EquipmentPanelState): void {
  if (this.destroyed) throw new Error('EquipmentPanel has been destroyed');
  if (this.opened) {this.update(state); return;}
  this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  this.opened = true; this.root.hidden = false;
  this.options.callbacks.onVisibilityChange(true);
  this.update(state); this.firstFocus().focus();
 }
 update(state: EquipmentPanelState): void {
  if (this.destroyed) return;
  this.state = state; this.model = buildEquipmentPanelModel(state, this.options.assets);
  this.render();
  if ((state.message ?? '') !== this.lastMessage) this.announce(state.message ?? '', false);
 }
 close(): void {
  if (!this.opened) return;
  this.opened = false; this.root.hidden = true;
  this.options.callbacks.onVisibilityChange(false);
  const target = this.options.returnFocus?.() ?? this.previousFocus;
  if (target?.isConnected) target.focus();
  this.options.callbacks.onClose();
 }
 destroy(): void {
  if (this.destroyed) return;
  this.close(); this.abort.abort(); this.root.remove(); this.state = null; this.model = null; this.destroyed = true;
 }
 private announce(message: string, forward = true): void {
  this.lastMessage = message; this.live.textContent = message;
  if (forward) this.options.callbacks.onMessage?.(message);
 }
 private button(label: string, key: string, action: () => void): HTMLButtonElement {
  const button = element('button', '', label); button.type = 'button'; button.dataset.focus = key;
  button.addEventListener('click', action); return button;
 }
 private action(label: string, key: string, availability: ActionAvailability, callback: () => EquipmentActionFeedback): HTMLElement {
  const wrap = element('div', 'equipment-action'); const button = this.button(label, key, () => {
   // Never commit a candidate locally. The owner must revalidate the latest core state.
   if (availability.enabled) {const feedback = callback(); if (typeof feedback === 'string') this.announce(feedback);}
  });
  button.disabled = !availability.enabled; button.classList.add('equipment-primary');
  wrap.append(button);
  if (availability.reason) {
   const reason = element('p', 'equipment-reason', availability.reason); reason.id = `${this.prefix}-${key}-reason`;
   button.setAttribute('aria-describedby', reason.id); wrap.append(reason);
  }
  return wrap;
 }
 private thumbnail(resolve: () => ItemThumbnail | null, name: string): HTMLElement {
  let thumbnail: ItemThumbnail | null = null;
  try {thumbnail = resolve();} catch { /* A missing thumbnail must not break the controlled menu. */ }
  const frame = element('span', 'equipment-thumbnail'); frame.setAttribute('aria-hidden', 'true');
  if (!thumbnail?.src) {frame.classList.add('equipment-thumbnail-empty'); frame.textContent = '—'; frame.title = `${name}: preview unavailable`; return frame;}
  const img = element('img'); img.src = thumbnail.src; img.alt = thumbnail.alt ?? ''; img.loading = 'eager'; img.draggable = false;
  img.addEventListener('error', () => {
   img.remove(); frame.classList.add('equipment-thumbnail-empty'); frame.textContent = '—';
   frame.title = `${name}: preview unavailable`;
  }, {once: true}); frame.append(img); return frame;
 }
 private firstFocus(): HTMLElement {return this.root.querySelector<HTMLElement>(FOCUSABLE) ?? this.dialog;}
 private keydown(event: KeyboardEvent): void {
  event.stopPropagation();
  if (event.key === 'Escape') {event.preventDefault(); this.close(); return;}
  if (event.key !== 'Tab') return;
  const focusable = Array.from(this.root.querySelectorAll<HTMLElement>(FOCUSABLE));
  const first = focusable[0], last = focusable.at(-1);
  if (!first || !last) {event.preventDefault(); this.dialog.focus(); return;}
  if (event.shiftKey && (document.activeElement === first || document.activeElement === this.dialog)) {event.preventDefault(); last.focus();}
  else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
 }
 private render(): void {
  if (!this.state || !this.model) return;
  const active = this.root.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.focus : undefined;
  const tabs = element('nav', 'equipment-tabs'); tabs.setAttribute('aria-label', 'Equipment sections');
  for (const [id, label] of [['armor', 'Armor'], ['weapons', 'Weapons'], ['training', 'Training']] as const) {
   const button = this.button(label, `tab-${id}`, () => {this.tab = id; this.render();});
   button.setAttribute('aria-pressed', String(this.tab === id)); tabs.append(button);
  }
  const content = this.tab === 'armor' ? this.renderArmor() : this.tab === 'weapons' ? this.renderWeapons() : this.renderTraining();
  this.body.replaceChildren(tabs, content);
  if (active) this.root.querySelector<HTMLElement>(`[data-focus="${active}"]`)?.focus();
  // An action can become disabled following an authoritative update.
  if (this.opened && !this.root.contains(document.activeElement)) this.firstFocus().focus();
 }
 private renderArmor(): HTMLElement {
  const model = this.model!; const content = element('div', 'equipment-armor');
  const slots = element('div', 'equipment-slots'); slots.setAttribute('aria-label', 'Equipped armor slots');
  for (const entry of model.slots) {
   const button = this.button('', `slot-${entry.slot}`, () => {this.slot = entry.slot; this.selectedArmor = null; this.render();});
   button.classList.add('equipment-slot'); button.setAttribute('aria-pressed', String(this.slot === entry.slot));
   button.append(this.thumbnail(() => this.options.armorThumbnail(entry.equipped), entry.equipped.name), element('span', '', SLOT_LABELS[entry.slot]), element('small', '', entry.equipped.name)); slots.append(button);
  }
  const entry = model.slots.find(entry => entry.slot === this.slot)!;
  const candidates = element('div', 'equipment-candidates');
  candidates.append(element('h3', '', `${SLOT_LABELS[this.slot]} · discovered pieces`));
  if (!entry.candidates.some(candidate => candidate.item.id === this.selectedArmor)) this.selectedArmor = entry.equipped.id;
  for (const candidate of entry.candidates) {
   const button = this.button('', `armor-${candidate.item.id}`, () => {this.selectedArmor = candidate.item.id; this.render();});
   button.classList.add('equipment-item'); button.setAttribute('aria-pressed', String(candidate.item.id === this.selectedArmor));
   button.append(this.thumbnail(() => this.options.armorThumbnail(candidate.item), candidate.item.name), element('span', '', candidate.item.name),
    element('small', '', candidate.equipped ? 'Equipped' : candidate.owned ? 'Owned' : 'Discovered · not owned'));
   candidates.append(button);
  }
  const candidate = entry.candidates.find(candidate => candidate.item.id === this.selectedArmor)!;
  const detail = element('section', 'equipment-detail'); detail.setAttribute('aria-label', 'Armor comparison');
  detail.append(element('h3', '', candidate.item.name), element('p', 'equipment-muted', `Compared with ${entry.equipped.name}. Other slots stay equipped.`));
  if (candidate.comparison) detail.append(this.comparisonTable(candidate.comparison));
  detail.append(this.action('Equip this piece', 'equip-armor', candidate.action, () => this.options.callbacks.onEquipArmor(this.slot, candidate.item.id)),
   element('p', 'equipment-muted', 'Equipment changes do not heal or refill stamina. Weight affects rolls and recovery, not walking speed.'));
  content.append(slots, candidates, detail); return content;
 }
 private comparisonTable(comparison: readonly StatComparison[]): HTMLTableElement {
  const table = element('table', 'equipment-comparison'); const caption = element('caption', 'equipment-sr-only', 'Whole-loadout statistics before and after this single-piece change');
  table.append(caption);
  const head = element('thead'); const tr = element('tr');
  for (const text of ['Whole loadout', 'Now', 'With piece', 'Change']) {const th = element('th', '', text); th.scope = 'col'; tr.append(th);} head.append(tr); table.append(head);
  const body = element('tbody');
  for (const stat of comparison) {
   const row = element('tr'); const label = element('th', '', `${stat.label}${stat.unit ? ` (${stat.unit})` : ''}`); label.scope = 'row';
   const delta = element('td', '', formatDelta(stat.delta));
   if (stat.delta !== 0) delta.className = (stat.delta > 0) === (stat.better === 'higher') ? 'equipment-gain' : 'equipment-loss';
   row.append(label, element('td', '', formatStat(stat.before)), element('td', '', formatStat(stat.after)), delta); body.append(row);
  }
  table.append(body); return table;
 }
 private renderWeapons(): HTMLElement {
  const content = element('div', 'equipment-weapons'); const candidates = element('div', 'equipment-candidates');
  candidates.append(element('h3', '', 'Discovered weapons'));
  if (!this.model!.weapons.some(candidate => candidate.item.id === this.selectedWeapon)) this.selectedWeapon = this.state!.armory.equipped;
  for (const candidate of this.model!.weapons) {
   const button = this.button('', `weapon-${candidate.item.id}`, () => {this.selectedWeapon = candidate.item.id; this.render();});
   button.classList.add('equipment-item'); button.setAttribute('aria-pressed', String(candidate.item.id === this.selectedWeapon));
   button.append(this.thumbnail(() => this.options.weaponThumbnail(candidate.item), candidate.item.name), element('span', '', `${candidate.item.name}${candidate.upgrade ? ` +${candidate.upgrade}` : ''}`),
    element('small', '', candidate.equipped ? 'Equipped' : candidate.owned ? 'Owned' : 'Discovered · not owned')); candidates.append(button);
  }
  const candidate = this.model!.weapons.find(candidate => candidate.item.id === this.selectedWeapon)!;
  const equipped = this.model!.weapons.find(candidate => candidate.item.id === this.state!.armory.equipped)!;
  const detail = element('section', 'equipment-detail');
  detail.append(element('h3', '', `${candidate.item.name} +${candidate.upgrade}`), element('p', '', candidate.item.description));
  const stats = element('dl', 'equipment-weapon-stats');
  for (const [label, now, next, unit] of [
   ['Damage', equipped.damage, candidate.damage, ''], ['Reach', equipped.item.range, candidate.item.range, 'px'],
   ['Attack cost', equipped.item.cost, candidate.item.cost, 'stamina'],
   ['Windup', equipped.item.windup, candidate.item.windup, 's'], ['Contact', equipped.item.active, candidate.item.active, 's'], ['Recovery', equipped.item.recovery, candidate.item.recovery, 's'],
  ] as const) stats.append(element('dt', '', label), element('dd', '', `${formatStat(now)} → ${formatStat(next)} ${unit}`));
  detail.append(stats,
   element('p', 'equipment-damage-breakdown', `Selected damage: ${formatStat(candidate.damage)} = ${formatStat(candidate.item.damage)} base + ${formatStat(candidate.upgradeDamage)} improvement.`),
   element('p', 'equipment-muted', `${candidate.item.hands === 2 ? 'Two-handed' : 'One-handed'} · ${candidate.item.motion.kind} · values compare equipped ${equipped.item.name} +${equipped.upgrade} → selected ${candidate.item.name} +${candidate.upgrade}`),
   this.action('Equip weapon', 'equip-weapon', candidate.action, () => this.options.callbacks.onEquipWeapon(candidate.item.id)));
  if (this.options.callbacks.onUpgradeWeapon) {
   const upgrade = this.model!.upgrade;
   const forge = element('section', 'equipment-forge');
   const target = `${equipped.item.name} +${equipped.upgrade}`;
   forge.append(element('h4', '', `Forge · equipped ${target}`),
    element('p', 'equipment-upgrade-preview', upgrade.nextDamage === null ? `Equipped damage: ${formatStat(upgrade.damage)} · maximum improvement (+2).` : `Equipped damage: ${formatStat(upgrade.damage)} → ${formatStat(upgrade.nextDamage)} (${formatDelta(upgrade.nextDamage - upgrade.damage)}) at +${equipped.upgrade + 1}.`),
    element('p', 'equipment-muted', `Each improvement adds ${WEAPON_UPGRADE_DAMAGE_BONUS * 100}% of base damage. Reach, stamina cost and attack timing do not change.`),
    element('p', 'equipment-muted', `${this.state!.currency} iron marks · +1 costs ${WEAPON_UPGRADE_COSTS[0]} · +2 costs ${WEAPON_UPGRADE_COSTS[1]}`),
    this.action(upgrade.cost === null ? `Fully improved ${target}` : `Improve equipped ${equipped.item.name} to +${equipped.upgrade + 1} for ${upgrade.cost} marks`, 'upgrade-weapon', candidate.upgradeAction, () => this.options.callbacks.onUpgradeWeapon?.(equipped.item.id)));
   detail.append(forge);
  }
  content.append(candidates, detail); return content;
 }
 private renderTraining(): HTMLElement {
  const p = this.model!.progression; const content = element('section', 'equipment-training');
  content.append(element('h3', '', `Level ${p.level} / ${p.cap}`),
   element('p', 'equipment-xp', `${p.xp} total XP · ${p.nextTotal === null ? 'Level cap reached' : `Next level at ${p.nextTotal} total XP (${p.remaining} remaining)`}`),
   element('p', 'equipment-points', `${p.points} available training ${p.points === 1 ? 'point' : 'points'}`),
   element('p', 'equipment-muted', this.state!.atCheckpoint ? 'At a checkpoint. Choose one attribute per point.' : 'Level gains are immediate. Return to a checkpoint to spend points or rest.'));
  const choices = element('div', 'equipment-attributes');
  for (const attribute of p.attributes) {
   const card = element('section', 'equipment-attribute');
   card.append(element('h4', '', `${attribute.label} · ${attribute.value}`), element('p', '', attribute.description),
    this.action(`Train ${attribute.label}`, `train-${attribute.id}`, attribute.action, () => this.options.callbacks.onSpendAttribute(attribute.id))); choices.append(card);
  }
  content.append(choices, this.action('Rest at checkpoint', 'rest', this.model!.rest, () => this.options.callbacks.onRest()),
   element('p', 'equipment-muted', 'Training changes your maximums only. Rest is an explicit action; this menu never restores health or stamina.'));
  return content;
 }
}
