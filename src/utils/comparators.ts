/**
 * Centralized utility for object comparison and cloning.
 * This module encapsulates the logic for deep equality checks and deep cloning,
 * allowing for future optimizations (e.g., memoization, faster hashing) without
 * changing consumer code.
 */

/**
 * Checks if two values are deeply equal.
 * Currently uses JSON serialization for comparison.
 */
export function areContentsEqual<T>(a: T, b: T): boolean {
    if (a === b) return true;
    return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Computes a string signature for a value.
 * Currently uses JSON serialization.
 */
export function computeSignature<T>(value: T): string {
    return JSON.stringify(value);
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
