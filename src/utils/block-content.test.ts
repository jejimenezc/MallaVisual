import { describe, it, expect } from 'vitest';
import { blockContentEquals, cloneBlockContent, type BlockContent } from './block-content.ts';

describe('block-content', () => {
    const createSampleContent = (): BlockContent => ({
        template: [
            [{ active: true, label: 'A', type: undefined }],
        ],
        visual: {
            '0,0': { backgroundColor: 'red' },
        },
        aspect: '1/1',
    });

    describe('cloneBlockContent', () => {
        it('should create a deep copy', () => {
            const original = createSampleContent();
            const clone = cloneBlockContent(original);

            expect(clone).not.toBe(original);
            expect(clone).toEqual(original);
            expect(clone.template).not.toBe(original.template);
            expect(clone.visual).not.toBe(original.visual);

            // Verify independence
            clone.template[0][0].label = 'B';
            expect(original.template[0][0].label).toBe('A');
        });
    });

    describe('blockContentEquals', () => {
        it('should return true for identical objects', () => {
            const a = createSampleContent();
            expect(blockContentEquals(a, a)).toBe(true);
        });

        it('should return true for deep equal objects', () => {
            const a = createSampleContent();
            const b = createSampleContent();
            expect(blockContentEquals(a, b)).toBe(true);
        });

        it('should return false if aspect differs', () => {
            const a = createSampleContent();
            const b = createSampleContent();
            b.aspect = '16/9';
            expect(blockContentEquals(a, b)).toBe(false);
        });

        it('should return false if template differs', () => {
            const a = createSampleContent();
            const b = createSampleContent();
            b.template[0][0].label = 'B';
            expect(blockContentEquals(a, b)).toBe(false);
        });

        it('should return false if visual differs', () => {
            const a = createSampleContent();
            const b = createSampleContent();
            b.visual['0,0']!.backgroundColor = 'blue';
            expect(blockContentEquals(a, b)).toBe(false);
        });

        it('should handle null/undefined', () => {
            const a = createSampleContent();
            expect(blockContentEquals(a, null)).toBe(false);
            expect(blockContentEquals(null, a)).toBe(false);
            expect(blockContentEquals(null, null)).toBe(true);
            expect(blockContentEquals(undefined, undefined)).toBe(true);
        });
    });
});
