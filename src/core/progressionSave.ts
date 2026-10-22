import {freshEquipment, readEquipment, type Equipment} from './equipment.js';
import {awardReward, freshProgression, readProgression, type Progression, type RewardCatalog} from './progression.js';
import {STATION_ENCOUNTERS, STATION_REWARDS} from './rewardCatalog.js';
import {freshArmory, readArmory, type Armory, type WeaponId} from './weaponCatalog.js';

/** Extension only. The sole scene/save integrator remains responsible for validating the complete world. */
export interface ProgressionExtension {readonly schema: 1; readonly progression: Progression; readonly equipment: Equipment; readonly armory: Armory}
export type LegacyWeaponId = 'sword' | 'spear' | 'hammer';
export interface ValidatedLegacyProgress {
 readonly archetype: 'vanguard' | 'wayfarer'; readonly owned: readonly LegacyWeaponId[];
 readonly equipped: LegacyWeaponId; readonly levels: Readonly<Record<LegacyWeaponId, number>>;
 readonly defeated: readonly string[]; readonly looted: readonly string[];
 readonly shortcut: boolean; readonly gateOpen: boolean; readonly completed: boolean;
}
export function freshProgressionExtension(archetype: 'vanguard' | 'wayfarer'): ProgressionExtension {
 return {schema: 1, progression: freshProgression(), equipment: freshEquipment(), armory: freshArmory(archetype)};
}
export function readProgressionExtension(raw: unknown, rewards: RewardCatalog): ProgressionExtension | null {
 if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
 const d = raw as Record<string, unknown>;
 if (d.schema !== 1) return null;
 const progression = readProgression(d.progression, rewards), equipment = readEquipment(d.equipment), armory = readArmory(d.armory);
 return progression && equipment && armory ? {schema: 1, progression, equipment, armory} : null;
}
/** Accept only AFTER the existing v1/v2 world validator. No world fields or durable keys are changed here. */
export function migrateLegacyProgression(legacy: ValidatedLegacyProgress, rewards: RewardCatalog = STATION_REWARDS): ProgressionExtension | null {
 let progression = freshProgression();
 for (const encounter of legacy.defeated) {
  if (!(STATION_ENCOUNTERS as readonly string[]).includes(encounter)) return null;
  progression = awardReward(progression, `station:${encounter}`, rewards);
 }
 if (legacy.gateOpen) progression = awardReward(progression, 'station:gate-open', rewards);
 if (legacy.shortcut) progression = awardReward(progression, 'station:shortcut-open', rewards);
 if (legacy.completed) progression = awardReward(progression, 'station:secure-exit', rewards);
 if (legacy.looted.includes('transfer-cache')) progression = awardReward(progression, 'station:transfer-cache', rewards);
 const base = freshArmory(legacy.archetype);
 const armory: Armory = {...base, owned: [...legacy.owned], equipped: legacy.equipped, levels: {...base.levels, ...legacy.levels}};
 return readProgressionExtension({schema: 1, progression, equipment: freshEquipment(), armory}, rewards);
}

/** An envelope codec lets the integrator own world layout, checkpoint and gate invariants. */
export interface WorldSaveCodec<World> {
 /** Must reject unknown IDs, invalid currency/upgrades/flags and impossible checkpoint/gate combinations. */
 readonly readWorld: (raw: unknown) => World | null;
 readonly writeWorld: (world: World) => unknown;
 /** Optional separate legacy parser: prevents a legacy-shaped world nested in a v3 envelope. */
 readonly readLegacyWorld?: (raw: unknown) => World | null;
 /** Reconstruct newly authored cache contents before cross-field validation during migration only. */
 readonly completeLegacyExtension?: (world: World, extension: ProgressionExtension) => ProgressionExtension | null;
 /** Called only with a validated legacy world; returns fields needed for the extension migration. */
 readonly legacyProgress: (world: World) => ValidatedLegacyProgress;
 /** Validate cross-field invariants, including equipped ownership and earned IDs against durable world progress. */
 readonly extensionAgrees: (world: World, extension: ProgressionExtension) => boolean;
}
export interface VersionedProgressionSave<World> {readonly version: 3; readonly world: World; readonly extension: ProgressionExtension}
export const MAX_SAVE_CHARACTERS = 100000;
export function readVersionedProgressionSave<World>(raw: string, codec: WorldSaveCodec<World>, rewards: RewardCatalog): {save: VersionedProgressionSave<World>; migrated: boolean} | null {
 if (raw.length > MAX_SAVE_CHARACTERS) return null;
 try {
  const d: unknown = JSON.parse(raw);
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const record = d as Record<string, unknown>;
  if (record.version === 3) {
   const world = codec.readWorld(record.world), extension = readProgressionExtension(record.extension, rewards);
   return world && extension && codec.extensionAgrees(world, extension) ? {save: {version: 3, world, extension}, migrated: false} : null;
  }
  if (record.version !== 1 && record.version !== 2) return null;
  const world = (codec.readLegacyWorld ?? codec.readWorld)(d);
  if (!world) return null;
  const migrated = migrateLegacyProgression(codec.legacyProgress(world), rewards);
  const extension = migrated && (codec.completeLegacyExtension ? codec.completeLegacyExtension(world, migrated) : migrated);
  return extension && codec.extensionAgrees(world, extension) ? {save: {version: 3, world, extension}, migrated: true} : null;
 } catch { return null; }
}
/** In-memory prepare+roundtrip before any write. Caller writes on success and never deletes the old key first. */
export function prepareVersionedProgressionSave<World>(save: VersionedProgressionSave<World>, codec: WorldSaveCodec<World>, rewards: RewardCatalog): {raw: string; save: VersionedProgressionSave<World>} | null {
 try {
  const raw = JSON.stringify({version: 3, world: codec.writeWorld(save.world), extension: save.extension});
  const verified = readVersionedProgressionSave(raw, codec, rewards);
  return verified && !verified.migrated ? {raw, save: verified.save} : null;
 } catch { return null; }
}
export type SaveCandidate = {readonly source: 'current' | 'last-known-good' | 'legacy'; readonly raw: string | null};
export type SaveSelection<World> =
 | {status: 'loaded'; source: SaveCandidate['source']; save: VersionedProgressionSave<World>; migrated: boolean; notice: string | null}
 | {status: 'empty' | 'corrupt'; notice: string | null};
/** Read-only fallback selection. Never silently creates a fresh character or clears a corrupt save. */
export function selectProgressionSave<World>(candidates: readonly SaveCandidate[], codec: WorldSaveCodec<World>, rewards: RewardCatalog): SaveSelection<World> {
 let rejected = false;
 for (const candidate of candidates) {
  if (candidate.raw === null) continue;
  const result = readVersionedProgressionSave(candidate.raw, codec, rewards);
  if (result) return {status: 'loaded', source: candidate.source, ...result, notice: rejected || candidate.source === 'last-known-good' ? 'The newest save could not be read. Earlier valid progress was restored.' : result.migrated ? 'Earlier progress was preserved and prepared for the new equipment system.' : null};
  rejected = true;
 }
 return rejected ? {status: 'corrupt', notice: 'Saved progress could not be read. It has not been erased. Confirm a reset to start over.'} : {status: 'empty', notice: null};
}

/** Existing weapon fields remain in the legacy world until its integrator adopts the six-item armory. */
export function legacyWeaponStateAgrees(extension: ProgressionExtension, legacy: Pick<ValidatedLegacyProgress, 'owned' | 'equipped' | 'levels'>): boolean {
 const ids: readonly WeaponId[] = ['sword', 'spear', 'hammer'];
 return extension.armory.equipped === legacy.equipped && ids.every(id => extension.armory.owned.includes(id) === legacy.owned.includes(id as LegacyWeaponId) && extension.armory.levels[id] === legacy.levels[id as LegacyWeaponId]);
}
