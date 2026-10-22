/** Small, finite checkpoint progression. These mechanics and names are prototype adaptations. */
export const XP_THRESHOLDS = Object.freeze([0, 60, 150, 270, 420, 600, 810, 1050, 1320, 1620] as const);
export const LEVEL_CAP = XP_THRESHOLDS.length;
export const XP_CAP = XP_THRESHOLDS[LEVEL_CAP - 1];
export const ATTRIBUTES = Object.freeze(['vigor', 'endurance', 'resolve'] as const);
export type Attribute = typeof ATTRIBUTES[number];
export type Attributes = Readonly<Record<Attribute, number>>;
export interface Progression {
 readonly schema: 1;
 readonly xp: number;
 readonly attributes: Attributes;
 /** Stable catalogued encounter/objective IDs; retained after death, travel and reload. */
 readonly earned: readonly string[];
}
export type RewardCatalog = Readonly<Record<string, number>>;
export const ATTRIBUTE_EFFECTS = Object.freeze({
 vigor: Object.freeze({label: 'Vigor', description: '+8 maximum health', maxHp: 8}),
 endurance: Object.freeze({label: 'Endurance', description: '+5 maximum stamina', maxStamina: 5}),
 resolve: Object.freeze({label: 'Resolve', description: '+5 defense', defense: 5}),
});

export function freshProgression(): Progression {
 return {schema: 1, xp: 0, attributes: {vigor: 0, endurance: 0, resolve: 0}, earned: []};
}
export function level(p: Pick<Progression, 'xp'>): number {
 return XP_THRESHOLDS.filter(threshold => p.xp >= threshold).length;
}
export function availablePoints(p: Progression): number {
 return level(p) - 1 - ATTRIBUTES.reduce((sum, attribute) => sum + p.attributes[attribute], 0);
}
export function xpRequirement(p: Pick<Progression, 'xp'>): {level: number; nextTotal: number | null; remaining: number} {
 const current = level(p), nextTotal = XP_THRESHOLDS[current] ?? null;
 return {level: current, nextTotal, remaining: nextTotal === null ? 0 : nextTotal - p.xp};
}
export function isAttribute(value: unknown): value is Attribute {
 return typeof value === 'string' && (ATTRIBUTES as readonly string[]).includes(value);
}
export function rewardAmount(catalog: RewardCatalog, id: unknown): number | null {
 if (typeof id !== 'string' || !Object.hasOwn(catalog, id)) return null;
 const amount = catalog[id];
 return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}
/** The amount is looked up, never accepted from an event payload. Capped rewards still become spent IDs. */
export function awardReward(p: Progression, id: unknown, catalog: RewardCatalog): Progression {
 const amount = rewardAmount(catalog, id);
 if (amount === null || typeof id !== 'string' || p.earned.includes(id)) return p;
 // Subtract before adding so even a catalog entry near MAX_SAFE_INTEGER cannot overflow.
 return {...p, xp: p.xp + Math.min(XP_CAP - p.xp, amount), earned: [...p.earned, id]};
}
/** Call from the alive -> defeated edge; polling an already defeated enemy cannot earn XP. */
export function awardDefeat(p: Progression, id: unknown, beforeHp: number, afterHp: number, catalog: RewardCatalog): Progression {
 return Number.isFinite(beforeHp) && Number.isFinite(afterHp) && beforeHp > 0 && afterHp <= 0
  ? awardReward(p, id, catalog) : p;
}
export type SpendResult = {ok: true; next: Progression} | {ok: false; reason: 'not-at-checkpoint' | 'invalid-attribute' | 'no-points'};
/** Training itself does not heal. The checkpoint integrator may explicitly rest after committing it. */
export function spendAttribute(p: Progression, attribute: unknown, atCheckpoint: boolean): SpendResult {
 if (!atCheckpoint) return {ok: false, reason: 'not-at-checkpoint'};
 if (!isAttribute(attribute)) return {ok: false, reason: 'invalid-attribute'};
 if (availablePoints(p) < 1) return {ok: false, reason: 'no-points'};
 return {ok: true, next: {...p, attributes: {...p.attributes, [attribute]: p.attributes[attribute] + 1}}};
}

function record(value: unknown): value is Record<string, unknown> {
 return value !== null && typeof value === 'object' && !Array.isArray(value);
}
/** XP must agree with the once-only ledger, not merely be within the level cap. */
export function readProgression(raw: unknown, catalog: RewardCatalog): Progression | null {
 if (!record(raw) || raw.schema !== 1 || !Number.isSafeInteger(raw.xp) || Number(raw.xp) < 0 || Number(raw.xp) > XP_CAP) return null;
 const a = raw.attributes;
 if (!record(a) || Object.keys(a).length !== ATTRIBUTES.length || ATTRIBUTES.some(key => !Number.isSafeInteger(a[key]) || Number(a[key]) < 0 || Number(a[key]) >= LEVEL_CAP)) return null;
 if (!Array.isArray(raw.earned) || raw.earned.length > Object.keys(catalog).length || new Set(raw.earned).size !== raw.earned.length) return null;
 let expectedXp = 0;
 for (const id of raw.earned) {
  const amount = rewardAmount(catalog, id);
  if (amount === null) return null;
  expectedXp += Math.min(XP_CAP - expectedXp, amount);
 }
 if (raw.xp !== expectedXp) return null;
 const p: Progression = {schema: 1, xp: raw.xp as number, attributes: {vigor: a.vigor as number, endurance: a.endurance as number, resolve: a.resolve as number}, earned: [...raw.earned] as string[]};
 return availablePoints(p) >= 0 ? p : null;
}
