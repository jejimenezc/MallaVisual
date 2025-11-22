import { describe, it, expect } from 'vitest';
import { expandBoundsToMerges, type ActiveBounds } from './block-active';
import type { BlockTemplate } from '../types/curricular';

describe('expandBoundsToMerges', () => {
  const createTemplate = (rows: number, cols: number): BlockTemplate =>
    Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ active: true }))
    );

  it('should return original bounds if no merges exist', () => {
    const tpl = createTemplate(5, 5);
    const bounds: ActiveBounds = { minRow: 1, maxRow: 2, minCol: 1, maxCol: 2, rows: 2, cols: 2 };
    const result = expandBoundsToMerges(tpl, bounds);
    expect(result).toEqual(bounds);
  });

  it('should expand to include a simple merge group partially inside bounds', () => {
    // 0 1 2
    // 0 [A A]
    // 1 [A A]
    // Group A covers (0,1), (0,2), (1,1), (1,2). Base is (0,1).
    const tpl = createTemplate(3, 3);
    tpl[0][1].mergedWith = undefined; // Base
    tpl[0][2].mergedWith = '0-1';
    tpl[1][1].mergedWith = '0-1';
    tpl[1][2].mergedWith = '0-1';

    // Selection only touches (1,1)
    const bounds: ActiveBounds = { minRow: 1, maxRow: 1, minCol: 1, maxCol: 1, rows: 1, cols: 1 };
    const result = expandBoundsToMerges(tpl, bounds);

    expect(result).toEqual({
      minRow: 0,
      maxRow: 1,
      minCol: 1,
      maxCol: 2,
      rows: 2,
      cols: 2,
    });
  });

  it('should expand recursively if groups are connected (though current logic treats groups as distinct)', () => {
    // In the current implementation, groups are distinct sets of cells sharing a base.
    // If we select a cell that is part of Group A, we get all of Group A.
    // If Group A "visually" touches Group B, they are still distinct unless logic changes.
    // The function contract is: expand to include ALL members of any group touched by the bounds.
    
    const tpl = createTemplate(4, 4);
    // Group A: (0,0)-(0,1)
    tpl[0][0].mergedWith = undefined;
    tpl[0][1].mergedWith = '0-0';
    
    // Group B: (0,2)-(0,3)
    tpl[0][2].mergedWith = undefined;
    tpl[0][3].mergedWith = '0-2';

    // Select (0,1) [part of A] and (0,2) [part of B]
    const bounds: ActiveBounds = { minRow: 0, maxRow: 0, minCol: 1, maxCol: 2, rows: 1, cols: 2 };
    const result = expandBoundsToMerges(tpl, bounds);

    // Should include all of A and all of B -> (0,0) to (0,3)
    expect(result).toEqual({
      minRow: 0,
      maxRow: 0,
      minCol: 0,
      maxCol: 3,
      rows: 1,
      cols: 4,
    });
  });

  it('should handle disjoint groups correctly', () => {
    const tpl = createTemplate(5, 5);
    // Group A at top-left
    tpl[0][0].mergedWith = undefined;
    tpl[0][1].mergedWith = '0-0';

    // Group B at bottom-right
    tpl[4][4].mergedWith = undefined;
    tpl[4][3].mergedWith = '4-4';

    // Bounds touch both
    const bounds: ActiveBounds = { minRow: 0, maxRow: 4, minCol: 0, maxCol: 4, rows: 5, cols: 5 };
    const result = expandBoundsToMerges(tpl, bounds);

    expect(result).toEqual(bounds); // Already maxed out
  });
  
  it('should handle L-shaped groups', () => {
      const tpl = createTemplate(3, 3);
      // L-shape base at 0,0
      // X X
      // X
      tpl[0][0].mergedWith = undefined;
      tpl[0][1].mergedWith = '0-0';
      tpl[1][0].mergedWith = '0-0';
      
      // Select only the corner (1,0)
      const bounds: ActiveBounds = { minRow: 1, maxRow: 1, minCol: 0, maxCol: 0, rows: 1, cols: 1 };
      const result = expandBoundsToMerges(tpl, bounds);
      
      expect(result).toEqual({
          minRow: 0,
          maxRow: 1,
          minCol: 0,
          maxCol: 1,
          rows: 2,
          cols: 2
      });
  });
});
