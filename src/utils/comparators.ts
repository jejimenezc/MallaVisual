/**
 * Centralized utility for object comparison and cloning.
 * This module encapsulates the logic for deep equality checks and deep cloning,
 * allowing for future optimizations (e.g., memoization, faster hashing) without
 * changing consumer code.
 * 
 * PHASE 3: Memoization has been added to cache computed signatures for object references.
 * This assumes objects are treated as immutable - the same reference will always have the same signature.
 */

/**
 * WeakMap cache for memoizing signatures by object reference.
 * Using WeakMap allows garbage collection of objects that are no longer referenced elsewhere.
 */
const signatureCache = new WeakMap<object, string>();

/**
 * Internal function to compute and cache the signature for an object.
 * For primitive values, computes directly without caching.
 * For objects, uses WeakMap to cache by reference.
 */
function computeSignatureMemoized<T>(value: T): string {
    // For primitives and null, compute directly (no caching needed)
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }

    // For objects, check cache first
    const cached = signatureCache.get(value as object);
    if (cached !== undefined) {
        return cached;
    }

    // Compute and cache the signature
    const signature = JSON.stringify(value);
    signatureCache.set(value as object, signature);
    return signature;
}

/**
 * Checks if two values are deeply equal.
 * Uses memoized signatures for efficient comparison.
 */
export function areContentsEqual<T>(a: T, b: T): boolean {
    if (a === b) return true;
    return computeSignatureMemoized(a) === computeSignatureMemoized(b);
}

/**
 * Computes a string signature for a value.
 * Uses memoization for objects to avoid redundant serialization.
 */
export function computeSignature<T>(value: T): string {
    return computeSignatureMemoized(value);
}

/**
 * Creates a deep clone of a value.
 * Uses structuredClone if available, falling back to JSON parse/stringify.
 */
export function deepClone<T>(value: T): T {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
}
