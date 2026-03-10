import assert from 'node:assert/strict';
import { test } from 'vitest';
import { validateViewerEffectivePrintPageMeasurement } from './viewer-print-page-measure.ts';

test('effective print page measurement accepts consistent geometry', () => {
  assert.equal(
    validateViewerEffectivePrintPageMeasurement({
      paperWidthPx: 1000,
      paperHeightPx: 700,
      contentWidthPx: 900,
      contentHeightPx: 600,
      marginTopPx: 20,
      marginRightPx: 30,
      marginBottomPx: 80,
      marginLeftPx: 70,
    }),
    true,
  );
});

test('effective print page measurement rejects inconsistent horizontal sum', () => {
  assert.equal(
    validateViewerEffectivePrintPageMeasurement({
      paperWidthPx: 1000,
      paperHeightPx: 700,
      contentWidthPx: 900,
      contentHeightPx: 600,
      marginTopPx: 20,
      marginRightPx: 10,
      marginBottomPx: 80,
      marginLeftPx: 70,
    }),
    false,
  );
});

test('effective print page measurement rejects invalid or non-positive values', () => {
  assert.equal(
    validateViewerEffectivePrintPageMeasurement({
      paperWidthPx: 1000,
      paperHeightPx: 700,
      contentWidthPx: 0,
      contentHeightPx: 600,
      marginTopPx: 20,
      marginRightPx: 30,
      marginBottomPx: 80,
      marginLeftPx: 70,
    }),
    false,
  );
});
