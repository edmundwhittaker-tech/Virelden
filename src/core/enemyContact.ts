/** Certified feature-event continuous contact for the optional sprite-enemy contract.
 * Geometry is piecewise LINEAR in projected pixels, including capsule radius.
 * Exact dyadic predicates describe the supplied IEEE-754 numbers, not intended
 * decimal/rotation curves. No sampling, reach inflation or epsilon tie grouping.
 * Unsupported/over-budget input throws EnemyContactError: never convert to none.
 */
import type { EnemyContactInput, EnemyContactResult } from './enemySimulation.js';
import type { EnemyCapsule, EnemyPolygon } from './enemyGeometry.js';
import type { EnemyPoint } from './enemyPose.js';
type Poly = readonly bigint[];
interface Dyad {
    readonly n: bigint;
    readonly k: number;
}
interface Root {
    readonly p: Poly;
    readonly sturm: readonly Poly[];
    lo: Dyad;
    hi: Dyad;
}
interface Vec {
    readonly x: Poly;
    readonly y: Poly;
}
interface MovingPolygon {
    readonly points: readonly Vec[];
}
interface MovingCapsule {
    readonly a: Vec;
    readonly b: Vec;
    readonly radius: Poly;
}
interface Contact {
    readonly kind: 'body' | 'shield';
    readonly root: Root;
}
export interface EnemyContactDiagnostics {
    work: number;
    pairTests: number;
    candidatePairs: number;
    polynomials: number;
    rootIntervals: number;
    refinements: number;
}
export interface EnemyContactResolution extends EnemyContactResult {
    readonly diagnostics: Readonly<EnemyContactDiagnostics>;
}
export interface EnemyContactOptions {
    readonly maxWork?: number;
}
export class EnemyContactError extends Error {
    readonly code: 'invalid' | 'unsupported' | 'budget' | 'unresolved';
    readonly diagnostics: Readonly<EnemyContactDiagnostics>;
    constructor(code: EnemyContactError['code'], message: string, diagnostics: EnemyContactDiagnostics) { super(message); this.name = 'EnemyContactError'; this.code = code; this.diagnostics = { ...diagnostics }; }
}
const MAX_WORK = 1000000, MAX_POLYGONS = 4096, MAX_CAPSULES = 128, MAX_VERTICES = 8, MAX_COORDINATE = 1000000, MAX_GRID_BITS = 256, OUTPUT_BITS = 42, MAX_ROOT_BITS = 52;
const ieeeBuffer = new ArrayBuffer(8), ieeeView = new DataView(ieeeBuffer);
const ZERO: Dyad = { n: 0n, k: 0 }, ONE: Dyad = { n: 1n, k: 0 };
const abs = (x: bigint) => x < 0n ? -x : x;
const sign = (x: bigint) => x < 0n ? -1 : x > 0n ? 1 : 0;
const gcd = (a: bigint, b: bigint): bigint => { a = abs(a); b = abs(b); while (b) {
    const r = a % b;
    a = b;
    b = r;
} return a; };
function trim(p: Poly): bigint[] { const r = [...p]; while (r.length && r[r.length - 1] === 0n)
    r.pop(); return r; }
function primitive(p: Poly): bigint[] { const r = trim(p); let g = 0n; for (const x of r)
    g = gcd(g, x); return g > 1n ? r.map(x => x / g) : r; }
function add(a: Poly, b: Poly): bigint[] { return trim(Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0n) + (b[i] ?? 0n))); }
function neg(a: Poly): bigint[] { return a.map(x => -x); }
const sub = (a: Poly, b: Poly) => add(a, neg(b));
function mul(a: Poly, b: Poly): bigint[] { if (!a.length || !b.length)
    return []; const r = Array<bigint>(a.length + b.length - 1).fill(0n); a.forEach((x, i) => b.forEach((y, j) => r[i + j] += x * y)); return trim(r); }
const derivative = (p: Poly) => trim(p.slice(1).map((x, i) => x * BigInt(i + 1)));
const vsub = (a: Vec, b: Vec): Vec => ({ x: sub(a.x, b.x), y: sub(a.y, b.y) });
const dot = (a: Vec, b: Vec) => add(mul(a.x, b.x), mul(a.y, b.y));
const cross = (a: Vec, b: Vec) => sub(mul(a.x, b.y), mul(a.y, b.x));
function dyadCompare(a: Dyad, b: Dyad): number { const k = Math.max(a.k, b.k); return sign((a.n << BigInt(k - a.k)) - (b.n << BigInt(k - b.k))); }
function midpoint(a: Dyad, b: Dyad): Dyad { const k = Math.max(a.k, b.k); return { n: (a.n << BigInt(k - a.k)) + (b.n << BigInt(k - b.k)), k: k + 1 }; }
const asNumber = (a: Dyad) => Number(a.n) / 2 ** a.k;
const exactRoot = (t: Dyad): Root => ({ p: [-t.n, 1n << BigInt(t.k)], sturm: [], lo: t, hi: t });
const isExact = (r: Root) => dyadCompare(r.lo, r.hi) === 0;
class Solver {
    readonly stats: EnemyContactDiagnostics = { work: 0, pairTests: 0, candidatePairs: 0, polynomials: 0, rootIntervals: 0, refinements: 0 };
    readonly limit: number;
    gridExponent = 0;
    readonly integers = new Map<number, bigint>();
    readonly dyadics = new Map<number, {
        n: bigint;
        e: number;
    }>();
    constructor(options: EnemyContactOptions) { if (!options || typeof options !== 'object') this.fail('invalid', 'Invalid solver options'); this.limit = options.maxWork ?? MAX_WORK; if (!Number.isInteger(this.limit) || this.limit < 1 || this.limit > MAX_WORK)
        this.fail('invalid', 'maxWork must be an integer in 1..1,000,000'); }
    fail(code: EnemyContactError['code'], message: string): never { throw new EnemyContactError(code, message, this.stats); }
    work(n = 1) { this.stats.work += n; if (this.stats.work > this.limit)
        this.fail('budget', 'Contact work budget exhausted; contact is NOT resolved'); }
    eval(p: Poly, t: Dyad): bigint { this.work(); if (!p.length)
        return 0n; const d = 1n << BigInt(t.k); let r = p[p.length - 1], power = d; for (let i = p.length - 2; i >= 0; i--) {
        r = r * t.n + p[i] * power;
        power *= d;
    } return r; }
    /** Positive-scaled pseudo-remainder preserves the signs needed by Sturm. */
    remainder(a: Poly, b: Poly): Poly { if (!b.length)
        this.fail('unresolved', 'Internal zero polynomial divisor'); let r = trim(a); const lc = b[b.length - 1], scale = abs(lc), s = BigInt(sign(lc)); while (r.length >= b.length) {
        this.work();
        const shift = r.length - b.length, lead = r[r.length - 1];
        r = r.map(x => x * scale);
        for (let j = 0; j < b.length; j++)
            r[j + shift] -= s * lead * b[j];
        r = primitive(r);
    } return r; }
    sequence(p: Poly): readonly Poly[] { const a = primitive(p); if (a.length < 2)
        return [a]; const result: Poly[] = [a, primitive(derivative(a))]; while (result[result.length - 1].length) {
        const next = primitive(neg(this.remainder(result[result.length - 2], result[result.length - 1])));
        if (!next.length)
            break;
        result.push(next);
    } return result; }
    common(a: Poly, b: Poly): Poly { let x: Poly = primitive(a), y: Poly = primitive(b); while (y.length) {
        const r = this.remainder(x, y);
        x = y;
        y = r;
    } return primitive(x); }
    variations(seq: readonly Poly[], t: Dyad): number { let previous = 0, n = 0; for (const p of seq) {
        const s = sign(this.eval(p, t));
        if (s) {
            if (previous && s !== previous)
                n++;
            previous = s;
        }
    } return n; }
    count(seq: readonly Poly[], lo: Dyad, hi: Dyad): number { return this.variations(seq, lo) - this.variations(seq, hi); }
    refine(r: Root) { if (isExact(r))
        return; if (Math.max(r.lo.k, r.hi.k) >= MAX_ROOT_BITS)
        this.fail('unresolved', 'Algebraic event separation exceeds 52 dyadic bisections'); this.stats.refinements++; const m = midpoint(r.lo, r.hi); if (this.eval(r.p, m) === 0n) {
        r.lo = m;
        r.hi = m;
        return;
    } if (this.count(r.sturm, r.lo, m) > 0)
        r.hi = m;
    else
        r.lo = m; }
    roots(source: Poly): Root[] {
        this.stats.polynomials++;
        let p = primitive(source);
        if (p.length < 2)
            return [];
        const result: Root[] = [];
        // Strip endpoint factors before open-interval isolation. Multiplicity is irrelevant.
        if (this.eval(p, ZERO) === 0n) {
            result.push(exactRoot(ZERO));
            while (p.length > 1 && p[0] === 0n)
                p = p.slice(1);
        }
        if (p.length > 1 && this.eval(p, ONE) === 0n) {
            result.push(exactRoot(ONE));
            do {
                const q = Array<bigint>(p.length - 1).fill(0n);
                q[q.length - 1] = p[p.length - 1];
                for (let i = q.length - 2; i >= 0; i--)
                    q[i] = p[i + 1] + q[i + 1];
                p = primitive(q);
            } while (p.length > 1 && this.eval(p, ONE) === 0n);
        }
        if (p.length < 2)
            return result;
        const sturm = this.sequence(p), visit = (lo: Dyad, hi: Dyad, n: number): void => { if (!n)
            return; this.work(); if (n === 1) {
            const r: Root = { p, sturm, lo, hi };
            if (this.eval(p, hi) === 0n)
                r.lo = hi;
            result.push(r);
            this.stats.rootIntervals++;
            return;
        } if (Math.max(lo.k, hi.k) >= MAX_ROOT_BITS)
            this.fail('unresolved', 'Distinct contact roots cannot be isolated within 52 bisections'); const m = midpoint(lo, hi), left = this.count(sturm, lo, m); visit(lo, m, left); visit(m, hi, n - left); };
        visit(ZERO, ONE, this.count(sturm, ZERO, ONE));
        return result;
    }
    /** Sign enclosure using exact Bernstein coefficients on the root bracket. */
    enclosure(p: Poly, r: Root): number | null {
        if (!p.length)
            return 0;
        const degree = p.length - 1, k = Math.max(r.lo.k, r.hi.k), D = 1n << BigInt(k), A = r.lo.n << BigInt(k - r.lo.k), B = (r.hi.n << BigInt(k - r.hi.k)) - A;
        const choose = (n: number, j: number): bigint => { let x = 1n; for (let i = 1; i <= j; i++)
            x = x * BigInt(n - i + 1) / BigInt(i); return x; };
        const c = Array<bigint>(p.length).fill(0n);
        for (let i = 0; i <= degree; i++)
            for (let j = 0; j <= i; j++)
                c[j] += p[i] * choose(i, j) * A ** BigInt(i - j) * B ** BigInt(j) * D ** BigInt(degree - i);
        let factorial = 1n;
        for (let i = 2; i <= degree; i++)
            factorial *= BigInt(i);
        const b = c.map((_, i) => { let sum = 0n; for (let j = 0; j <= i; j++)
            sum += c[j] * choose(i, j) * (factorial / choose(degree, j)); return sum; });
        if (b.every(x => x > 0n))
            return 1;
        if (b.every(x => x < 0n))
            return -1;
        if (b.every(x => x === 0n))
            return 0;
        return null;
    }
    signAt(p: Poly, r: Root): number {
        if (!p.length)
            return 0;
        if (isExact(r))
            return sign(this.eval(p, r.lo));
        let s = this.enclosure(p, r);
        if (s !== null)
            return s;
        const shared = this.common(r.p, p);
        if (shared.length > 1 && this.count(this.sequence(shared), r.lo, r.hi) > 0)
            return 0;
        while ((s = this.enclosure(p, r)) === null) {
            this.refine(r);
            if (isExact(r))
                return sign(this.eval(p, r.lo));
        }
        return s;
    }
    compare(a: Root, b: Root): number {
        if (dyadCompare(a.hi, b.lo) < 0)
            return -1;
        if (dyadCompare(b.hi, a.lo) < 0)
            return 1;
        if (isExact(a) && isExact(b))
            return dyadCompare(a.lo, b.lo);
        if (isExact(a) && this.eval(b.p, a.lo) === 0n && dyadCompare(a.lo, b.lo) >= 0 && dyadCompare(a.lo, b.hi) <= 0)
            return 0;
        if (isExact(b) && this.eval(a.p, b.lo) === 0n && dyadCompare(b.lo, a.lo) >= 0 && dyadCompare(b.lo, a.hi) <= 0)
            return 0;
        const shared = this.common(a.p, b.p);
        if (shared.length > 1) {
            const lo = dyadCompare(a.lo, b.lo) > 0 ? a.lo : b.lo, hi = dyadCompare(a.hi, b.hi) < 0 ? a.hi : b.hi;
            if (dyadCompare(lo, hi) < 0 && this.count(this.sequence(shared), lo, hi) > 0)
                return 0;
        }
        for (;;) {
            if (dyadCompare(a.hi, b.lo) <= 0)
                return -1;
            if (dyadCompare(b.hi, a.lo) <= 0)
                return 1;
            if (!isExact(a) && (isExact(b) || asNumber(a.hi) - asNumber(a.lo) >= asNumber(b.hi) - asNumber(b.lo)))
                this.refine(a);
            else
                this.refine(b);
        }
    }
    /** Finite IEEE-754 number as exact n*2^exponent. */
    dyadic(value: number): {
        n: bigint;
        e: number;
    } { const cached = this.dyadics.get(value); if (cached)
        return cached; if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > MAX_COORDINATE)
        this.fail('invalid', 'Coordinates/radii must be finite and have magnitude <= 1,000,000'); if (!value)
        return { n: 0n, e: 0 }; const v = ieeeView; v.setFloat64(0, value, false); const bits = v.getBigUint64(0, false), exponent = Number((bits >> 52n) & 2047n), mantissa = bits & ((1n << 52n) - 1n); let n = exponent ? mantissa | (1n << 52n) : mantissa, e = exponent ? exponent - 1023 - 52 : -1074; if (bits >> 63n)
        n = -n; while (n % 2n === 0n) {
        n /= 2n;
        e++;
    } const result = { n, e }; this.dyadics.set(value, result); return result; }
    prepareGrid(values: readonly number[]) { let maxExponent = 0; for (const value of values) {
        const x = this.dyadic(value);
        if (x.n) {
            this.gridExponent = Math.min(this.gridExponent, x.e);
            maxExponent = Math.max(maxExponent, x.e + abs(x.n).toString(2).length);
        }
    } if (maxExponent - this.gridExponent > MAX_GRID_BITS)
        this.fail('unsupported', 'Input dynamic range exceeds 256-bit exact grid'); }
    integer(x: number): bigint { const cached = this.integers.get(x); if (cached !== undefined)
        return cached; const { n, e } = this.dyadic(x), result = !n ? 0n : n << BigInt(e - this.gridExponent); this.integers.set(x, result); return result; }
    scalar(a: number, b: number): Poly { const x = this.integer(a), y = this.integer(b); return trim([x, y - x]); }
    vector(a: EnemyPoint, b: EnemyPoint): Vec { return { x: this.scalar(a.x, b.x), y: this.scalar(a.y, b.y) }; }
    staticPoint(p: Vec): Vec { return { x: p.x.length ? [p.x[0]] : [], y: p.y.length ? [p.y[0]] : [] }; }
    positiveThroughout(p: Poly): boolean { if ((p[0] ?? 0n) <= 0n || p.reduce((a, b) => a + b, 0n) <= 0n)
        return false; const [a = 0n, b = 0n, c = 0n] = p; if (c > 0n && b < 0n && -b < 2n * c)
        return 4n * a * c - b * b > 0n; return true; }
    polygon(a: EnemyPolygon, b: EnemyPolygon): MovingPolygon {
        if (a.equipment !== b.equipment || a.layer !== b.layer || a.points.length !== b.points.length)
            this.fail('unsupported', 'Polygon topology/identity changed; split at the discontinuity');
        const points = a.points.map((p, i) => this.vector(p, b.points[i])), first = cross(vsub(points[1], points[0]), vsub(points[2], points[0])), orientation = sign(first[0] ?? 0n);
        if (!orientation)
            this.fail('unsupported', 'Degenerate polygon');
        for (let i = 0; i < points.length; i++)
            for (let j = 0; j < points.length; j++)
                if (j !== i && j !== (i + 1) % points.length) {
                    const c = cross(vsub(points[(i + 1) % points.length], points[i]), vsub(points[j], points[i]));
                    if (!this.positiveThroughout(orientation > 0 ? c : neg(c)))
                        this.fail('unsupported', 'Polygon must remain strictly convex and nondegenerate throughout linear motion');
                }
        return { points };
    }
    capsule(a: EnemyCapsule, b: EnemyCapsule): MovingCapsule { const x = this.vector(a.a, b.a), y = this.vector(a.b, b.b), radius = this.scalar(a.radius, b.radius); return { a: x, b: y, radius }; }
    inside(p: Vec, poly: readonly Vec[]): boolean { let positive = false, negative = false; for (let i = 0; i < poly.length; i++) {
        const n = this.eval(cross(vsub(poly[(i + 1) % poly.length], poly[i]), vsub(p, poly[i])), ZERO);
        positive ||= n > 0n;
        negative ||= n < 0n;
    } return !(positive && negative); }
    segmentPoint(p: Vec, a: Vec, b: Vec, radius: Poly): boolean { const v = vsub(b, a), w = vsub(p, a), l = this.eval(dot(v, v), ZERO), projection = this.eval(dot(w, v), ZERO), r2 = this.eval(mul(radius, radius), ZERO); if (projection <= 0n)
        return this.eval(dot(w, w), ZERO) <= r2; if (projection >= l)
        return this.eval(dot(vsub(p, b), vsub(p, b)), ZERO) <= r2; const c = this.eval(cross(v, w), ZERO); return c * c <= r2 * l; }
    segments(a: Vec, b: Vec, c: Vec, d: Vec): boolean { const orient = (x: Vec, y: Vec, z: Vec) => sign(this.eval(cross(vsub(y, x), vsub(z, x)), ZERO)); const abC = orient(a, b, c), abD = orient(a, b, d), cdA = orient(c, d, a), cdB = orient(c, d, b); if (abC * abD < 0 && cdA * cdB < 0)
        return true; return !abC && this.segmentPoint(c, a, b, []) || !abD && this.segmentPoint(d, a, b, []) || !cdA && this.segmentPoint(a, c, d, []) || !cdB && this.segmentPoint(b, c, d, []); }
    staticPolygons(a: MovingPolygon, b: MovingPolygon): boolean { const x = a.points.map(p => this.staticPoint(p)), y = b.points.map(p => this.staticPoint(p)); if (this.inside(x[0], y) || this.inside(y[0], x))
        return true; return x.some((p, i) => y.some((q, j) => this.segments(p, x[(i + 1) % x.length], q, y[(j + 1) % y.length]))); }
    staticCapsule(poly: MovingPolygon, cap: MovingCapsule): boolean { const p = poly.points.map(p => this.staticPoint(p)), a = this.staticPoint(cap.a), b = this.staticPoint(cap.b), r = cap.radius.length ? [cap.radius[0]] : []; if (this.inside(a, p) || this.inside(b, p))
        return true; return p.some((v, i) => this.segmentPoint(v, a, b, r) || this.segmentPoint(a, v, p[(i + 1) % p.length], r) || this.segmentPoint(b, v, p[(i + 1) % p.length], r) || this.segments(a, b, v, p[(i + 1) % p.length])); }
    segmentGuard(point: Vec, a: Vec, b: Vec, r: Root): boolean { const v = vsub(b, a), w = vsub(point, a), l = dot(v, v), p = dot(w, v); return this.signAt(l, r) > 0 && this.signAt(p, r) >= 0 && this.signAt(sub(l, p), r) >= 0; }
    polygonEvents(a: MovingPolygon, b: MovingPolygon, accept: (r: Root) => void) {
        for (const [x, y] of [[a, b], [b, a]])
            for (const p of x.points)
                for (let j = 0; j < y.points.length; j++) {
                    const q = y.points[j], next = y.points[(j + 1) % y.points.length];
                    for (const r of this.roots(cross(vsub(next, q), vsub(p, q))))
                        if (this.segmentGuard(p, q, next, r))
                            accept(r);
                }
        // Essential for collinear sliding edges (cross polynomial identically zero).
        for (const p of a.points)
            for (const q of b.points) {
                const w = vsub(p, q);
                for (const r of this.roots(dot(w, w)))
                    accept(r);
            }
    }
    capsuleEvents(poly: MovingPolygon, cap: MovingCapsule, accept: (r: Root) => void) {
        const radius2 = mul(cap.radius, cap.radius), edge = (p: Vec, a: Vec, b: Vec) => { const v = vsub(b, a), w = vsub(p, a), c = cross(v, w); for (const r of this.roots(sub(mul(c, c), mul(radius2, dot(v, v)))))
            if (this.segmentGuard(p, a, b, r))
                accept(r); };
        for (let i = 0; i < poly.points.length; i++) {
            const p = poly.points[i], q = poly.points[(i + 1) % poly.points.length];
            for (const endpoint of [cap.a, cap.b]) {
                const w = vsub(p, endpoint);
                for (const r of this.roots(sub(dot(w, w), radius2)))
                    accept(r);
                edge(endpoint, p, q);
            }
            edge(p, cap.a, cap.b);
        }
    }
}
function validateSnapshot(s: Solver, polygons: readonly EnemyPolygon[], body: readonly EnemyCapsule[], shield: readonly EnemyPolygon[]): number[] {
    if (!Array.isArray(polygons) || !Array.isArray(body) || !Array.isArray(shield))
        s.fail('invalid', 'Geometry collections must be arrays');
    if (polygons.length > MAX_POLYGONS || shield.length > MAX_POLYGONS || body.length > MAX_CAPSULES)
        s.fail('unsupported', 'Geometry collection exceeds bounded solver limits');
    const values: number[] = [];
    const point = (p: EnemyPoint) => { if (!p || typeof p !== 'object')
        s.fail('invalid', 'Missing geometry point'); values.push(p.x, p.y); };
    for (const p of [...polygons, ...shield]) {
        if (!p || typeof p.equipment !== 'string' || !Number.isFinite(p.layer) || !Array.isArray(p.points) || p.points.length < 3 || p.points.length > MAX_VERTICES)
            s.fail('invalid', 'Expected identified convex polygons with 3..8 vertices');
        for (const q of p.points)
            point(q);
    }
    for (const c of body) {
        if (!c || typeof c.radius !== 'number' || !Number.isFinite(c.radius) || c.radius < 0)
            s.fail('invalid', 'Capsule radius must be finite and nonnegative');
        point(c.a);
        point(c.b);
        values.push(c.radius);
    }
    return values;
}
/** Same contract for enemy→player and player→giant. Does not apply damage/immunity.
 * `motion` defaults to linear; matched array/vertex indices MUST describe the same
 * physical features. Split intervals at equipment swaps, authored pose cuts,
 * teleports or topology changes. Such discontinuities cannot be inferred from two
 * snapshots; explicitly marked discontinuity is rejected. Entry ignores previous
 * geometry entirely and checks only the current instant. */
export function resolveEnemyContact(input: EnemyContactInput, options: EnemyContactOptions = {}): EnemyContactResolution {
    const s = new Solver(options);
    if (!input || typeof input !== 'object' || !input.interval)
        s.fail('invalid', 'Missing contact input/interval');
    const { interval } = input;
    const entry = interval.kind === 'active-entry';
    if (!['active-entry', 'active-step', 'active-exit'].includes(interval.kind) || !Number.isSafeInteger(input.tick) || input.tick < 0 || !Number.isSafeInteger(input.attack) || input.attack < 0 || !Number.isSafeInteger(interval.fromTick) || interval.fromTick < 0 || !Number.isSafeInteger(interval.toTick) || interval.toTick !== input.tick || interval.toTick < interval.fromTick || typeof interval.endExclusive !== 'boolean' || entry && (interval.fromTick !== interval.toTick || interval.endExclusive) || !entry && (interval.toTick !== interval.fromTick + 1 || interval.endExclusive !== (interval.kind === 'active-exit')))
        s.fail('invalid', 'Invalid active interval semantics');
    if (input.motion !== undefined && input.motion !== 'linear' && input.motion !== 'discontinuous')
        s.fail('invalid', 'Unknown motion declaration');
    if (!entry && input.motion === 'discontinuous')
        s.fail('unsupported', 'Discontinuous pose has no physical sweep; split the active interval');
    if (!input.currentTarget || !entry && !input.previousTarget)
        s.fail('invalid', 'Missing target snapshot');
    const currentValues = validateSnapshot(s, input.weaponPolygons, input.currentTarget.body, input.currentTarget.shield), previous = entry ? input.currentTarget : input.previousTarget, previousWeapons = entry ? input.weaponPolygons : input.previousWeaponPolygons;
    const previousValues = entry ? [] : validateSnapshot(s, previousWeapons, previous.body, previous.shield);
    // Validate all scalar inputs even when broadphase can certify a distant miss.
    for (const value of [...currentValues, ...previousValues])
        if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > MAX_COORDINATE)
            s.fail('invalid', 'Coordinates/radii must be finite and have magnitude <= 1,000,000');
    if (previousWeapons.length !== input.weaponPolygons.length || previous.body.length !== input.currentTarget.body.length || previous.shield.length !== input.currentTarget.shield.length)
        s.fail('unsupported', 'Geometry topology changed; split at the discontinuity');
    const match = (a: readonly EnemyPolygon[], b: readonly EnemyPolygon[]) => a.forEach((p, i) => { if (p.equipment !== b[i].equipment || p.layer !== b[i].layer || p.points.length !== b[i].points.length)
        s.fail('unsupported', 'Polygon topology/identity changed; split at the discontinuity'); });
    match(previousWeapons, input.weaponPolygons);
    match(previous.shield, input.currentTarget.shield);
    // Outward-rounded AABBs only reject candidates; they NEVER establish a hit.
    type Box = readonly [
        number,
        number,
        number,
        number
    ];
    const outward = (value: number, up: boolean): number => { if (!value)
        return up ? Number.MIN_VALUE : -Number.MIN_VALUE; ieeeView.setFloat64(0, value, false); let bits = ieeeView.getBigUint64(0, false); bits += (value > 0 === up) ? 1n : -1n; ieeeView.setBigUint64(0, bits, false); return ieeeView.getFloat64(0, false); };
    const polygonBox = (a: EnemyPolygon, b: EnemyPolygon): Box => { let l = Infinity, t = Infinity, r = -Infinity, bt = -Infinity; for (const p of [...a.points, ...b.points]) {
        l = Math.min(l, p.x);
        t = Math.min(t, p.y);
        r = Math.max(r, p.x);
        bt = Math.max(bt, p.y);
    } return [l, t, r, bt]; };
    const capsuleBox = (a: EnemyCapsule, b: EnemyCapsule): Box => { let l = Infinity, t = Infinity, r = -Infinity, bt = -Infinity; for (const cap of [a, b])
        for (const p of [cap.a, cap.b]) {
            l = Math.min(l, outward(p.x - cap.radius, false));
            t = Math.min(t, outward(p.y - cap.radius, false));
            r = Math.max(r, outward(p.x + cap.radius, true));
            bt = Math.max(bt, outward(p.y + cap.radius, true));
        } return [l, t, r, bt]; };
    const weaponBoxes = input.weaponPolygons.map((p, i) => polygonBox(previousWeapons[i], p)), shieldBoxes = input.currentTarget.shield.map((p, i) => polygonBox(previous.shield[i], p)), bodyBoxes = input.currentTarget.body.map((p, i) => capsuleBox(previous.body[i], p));
    interface Pair {
        readonly weapon: number;
        readonly target: number;
        readonly kind: 'shield' | 'body';
    }
    const pairs: Pair[] = [];
    for (const [kind, boxes] of [['shield', shieldBoxes], ['body', bodyBoxes]] as const)
        for (let i = 0; i < weaponBoxes.length; i++)
            for (let j = 0; j < boxes.length; j++) {
                s.work();
                s.stats.pairTests++;
                const a = weaponBoxes[i], b = boxes[j];
                if (a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3]) {
                    pairs.push({ kind, weapon: i, target: j });
                    s.stats.candidatePairs++;
                }
            }
    if (!pairs.length)
        return { kind: 'none', toi: 1, diagnostics: { ...s.stats } };
    const relevantValues: number[] = [];
    const weaponIndices = new Set(pairs.map(p => p.weapon)), shieldIndices = new Set(pairs.filter(p => p.kind === 'shield').map(p => p.target)), bodyIndices = new Set(pairs.filter(p => p.kind === 'body').map(p => p.target));
    for (const i of weaponIndices)
        relevantValues.push(...validateSnapshot(s, [previousWeapons[i], input.weaponPolygons[i]], [], []));
    for (const i of shieldIndices)
        relevantValues.push(...validateSnapshot(s, [], [], [previous.shield[i], input.currentTarget.shield[i]]));
    for (const i of bodyIndices)
        relevantValues.push(...validateSnapshot(s, [], [previous.body[i], input.currentTarget.body[i]], []));
    s.prepareGrid(relevantValues);
    const weapons = new Map<number, MovingPolygon>(), shields = new Map<number, MovingPolygon>(), body = new Map<number, MovingCapsule>();
    const weaponAt = (i: number) => { let p = weapons.get(i); if (!p) {
        p = s.polygon(previousWeapons[i], input.weaponPolygons[i]);
        weapons.set(i, p);
    } return p; };
    const shieldAt = (i: number) => { let p = shields.get(i); if (!p) {
        p = s.polygon(previous.shield[i], input.currentTarget.shield[i]);
        shields.set(i, p);
    } return p; };
    const bodyAt = (i: number) => { let p = body.get(i); if (!p) {
        p = s.capsule(previous.body[i], input.currentTarget.body[i]);
        body.set(i, p);
    } return p; };
    const boxesOverlap = (a: Box, b: Box) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
    const initialWeaponBoxes = previousWeapons.map(p => polygonBox(p, p)), initialShieldBoxes = previous.shield.map(p => polygonBox(p, p)), initialBodyBoxes = previous.body.map(p => capsuleBox(p, p));
    let best: Contact | undefined;
    const accept = (kind: 'body' | 'shield', root: Root) => { if (interval.endExclusive && isExact(root) && dyadCompare(root.lo, ONE) === 0)
        return; if (!best) {
        best = { kind, root };
        return;
    } const comparison = s.compare(root, best.root); if (comparison < 0 || comparison === 0 && kind === 'shield')
        best = { kind, root }; };
    // Resolve EVERY initial shield first: a true TOI0 hit needs no swept work.
    for (const pair of pairs) {
        if (!boxesOverlap(initialWeaponBoxes[pair.weapon], (pair.kind === 'shield' ? initialShieldBoxes : initialBodyBoxes)[pair.target]))
            continue;
        const weapon = weaponAt(pair.weapon);
        if (pair.kind === 'shield' ? s.staticPolygons(weapon, shieldAt(pair.target)) : s.staticCapsule(weapon, bodyAt(pair.target))) {
            accept(pair.kind, exactRoot(ZERO));
            break;
        }
    }
    if (!best && !entry)
        for (const pair of pairs) {
            const weapon = weaponAt(pair.weapon);
            if (pair.kind === 'shield')
                s.polygonEvents(weapon, shieldAt(pair.target), r => accept('shield', r));
            else
                s.capsuleEvents(weapon, bodyAt(pair.target), r => accept('body', r));
        }
    if (!best)
        return { kind: 'none', toi: 1, diagnostics: { ...s.stats } };
    const root = best.root;
    while (!isExact(root) && asNumber(root.hi) - asNumber(root.lo) > 2 ** -OUTPUT_BITS)
        s.refine(root);
    const toi = isExact(root) ? asNumber(root.lo) : (asNumber(root.lo) + asNumber(root.hi)) / 2;
    if (entry && toi !== 0)
        s.fail('unresolved', 'Internal entry contact was not instantaneous');
    return { kind: best.kind, toi, diagnostics: { ...s.stats } };
}
/** Non-throwing host boundary. An unresolved outcome is NOT a miss. The adapter
 * must withhold/abort that contact and record the reason, never apply body damage
 * or silently certify clearance. Unexpected programming errors still propagate. */
export function tryResolveEnemyContact(input: EnemyContactInput, options: EnemyContactOptions = {}): {
    readonly status: 'resolved';
    readonly result: EnemyContactResolution;
} | {
    readonly status: 'unresolved';
    readonly error: EnemyContactError;
} {
    try {
        return { status: 'resolved', result: resolveEnemyContact(input, options) };
    }
    catch (error) {
        if (error instanceof EnemyContactError)
            return { status: 'unresolved', error };
        throw error;
    }
}
