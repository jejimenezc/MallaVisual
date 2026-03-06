import { describe, expect, test } from 'vitest';
import type { MallaSnapshot } from '../types/malla-snapshot.ts';
import {
  applyViewerTheme,
  createDefaultViewerTheme,
  normalizeViewerTheme,
} from './viewer-theme.ts';

const buildSnapshotFixture = (): MallaSnapshot => ({
  formatVersion: 1,
  createdAt: '2026-03-05T12:00:00.000Z',
  projectName: 'Plan 2026',
  grid: { rows: 2, cols: 2 },
  bands: {
    headers: {
      rows: [
        {
          id: 'hdr-1',
          cells: [
            {
              col: 0,
              text: 'Sem 1',
              style: {
                backgroundColor: '#f8fafc',
                textColor: '#475569',
                textAlign: 'center',
                border: 'thin',
                fontSizePx: 12,
                paddingX: 6,
                paddingY: 4,
                bold: true,
                italic: false,
              },
            },
            {
              col: 1,
              text: 'Sem 2',
              style: {
                backgroundColor: '#f8fafc',
                textColor: '#475569',
                textAlign: 'center',
                border: 'thin',
                fontSizePx: 12,
                paddingX: 6,
                paddingY: 4,
                bold: true,
                italic: false,
              },
            },
          ],
        },
      ],
    },
    metrics: {
      rows: [
        {
          id: 'metric-1',
          label: 'Creditos',
          cells: [
            {
              col: 0,
              label: 'Creditos',
              text: '#3',
              style: {
                backgroundColor: '#fff',
                textColor: '#6b7280',
                textAlign: 'right',
                border: 'thin',
                fontSizePx: 12,
                paddingX: 6,
                paddingY: 4,
                bold: false,
                italic: false,
              },
            },
            {
              col: 1,
              label: 'Creditos',
              text: '#4',
              style: {
                backgroundColor: '#fff',
                textColor: '#6b7280',
                textAlign: 'right',
                border: 'thin',
                fontSizePx: 12,
                paddingX: 6,
                paddingY: 4,
                bold: false,
                italic: false,
              },
            },
          ],
        },
      ],
    },
  },
  items: [
    {
      id: 'piece-1',
      row: 0,
      col: 1,
      aspect: '1/1',
      rows: 1,
      cols: 1,
      merges: [],
      cells: [
        {
          row: 0,
          col: 0,
          rowSpan: 1,
          colSpan: 1,
          type: 'staticText',
          text: 'Hola',
          style: {
            backgroundColor: '#fff',
            textColor: '#111827',
            textAlign: 'left',
            border: 'thin',
            fontSizePx: 14,
            paddingX: 8,
            paddingY: 6,
            bold: false,
            italic: false,
          },
        },
      ],
    },
  ],
});

describe('viewer-theme', () => {
  test('createDefaultViewerTheme returns stable defaults', () => {
    const defaults = createDefaultViewerTheme();
    expect(defaults.gapX).toBe(16);
    expect(defaults.gapY).toBe(16);
    expect(defaults.minColumnWidth).toBe(0);
    expect(defaults.minRowHeight).toBe(0);
    expect(defaults.typographyScale).toBe(1);
    expect(defaults.titleWeight).toBe('bold');
    expect(defaults.showHeaderFooter).toBe(true);
  });

  test('normalizeViewerTheme clamps invalid values', () => {
    const normalized = normalizeViewerTheme({
      gapX: -10,
      gapY: 200,
      minColumnWidth: 1000,
      minRowHeight: -5,
      typographyScale: 20,
      titleWeight: 'weird',
      showHeaderFooter: false,
    });
    expect(normalized.gapX).toBe(0);
    expect(normalized.gapY).toBe(96);
    expect(normalized.minColumnWidth).toBe(500);
    expect(normalized.minRowHeight).toBe(0);
    expect(normalized.typographyScale).toBe(2);
    expect(normalized.titleWeight).toBe('bold');
    expect(normalized.showHeaderFooter).toBe(false);
  });

  test('applyViewerTheme does not mutate snapshot input', () => {
    const snapshot = buildSnapshotFixture();
    const before = JSON.parse(JSON.stringify(snapshot));
    const theme = {
      ...createDefaultViewerTheme(),
      typographyScale: 1.25,
      cellPadding: 2,
    };

    const model = applyViewerTheme(snapshot, theme);

    expect(snapshot).toEqual(before);
    expect(model.items).toHaveLength(1);
    expect(model.items[0]?.cells[0]?.style.fontSizePx).toBe(17.5);
    expect(model.items[0]?.cells[0]?.style.paddingX).toBe(10);
    expect(model.items[0]?.cells[0]?.style.paddingY).toBe(8);
  });

  test('applyViewerTheme separates columns and rows using measured block sizes', () => {
    const snapshot = buildSnapshotFixture();
    snapshot.items.push({
      id: 'piece-2',
      row: 0,
      col: 0,
      aspect: '1/1',
      rows: 1,
      cols: 1,
      merges: [],
      cells: [
        {
          row: 0,
          col: 0,
          rowSpan: 1,
          colSpan: 1,
          type: 'staticText',
          text: 'B',
          style: {
            backgroundColor: '#fff',
            textColor: '#111827',
            textAlign: 'left',
            border: 'thin',
            fontSizePx: 14,
            paddingX: 8,
            paddingY: 6,
            bold: false,
            italic: false,
          },
        },
      ],
    });

    const model = applyViewerTheme(snapshot, createDefaultViewerTheme());
    const piece0 = model.items.find((item) => item.id === 'piece-2');
    const piece1 = model.items.find((item) => item.id === 'piece-1');

    expect(piece0?.left).toBe(0);
    expect(piece1?.left).toBeGreaterThanOrEqual((piece0?.width ?? 0) + 16);
  });

  test('applyViewerTheme enforces min column width and row height', () => {
    const snapshot = buildSnapshotFixture();
    const model = applyViewerTheme(snapshot, {
      ...createDefaultViewerTheme(),
      minColumnWidth: 300,
      minRowHeight: 180,
      gapX: 10,
      gapY: 12,
    });

    expect(model.colOffsets[1]).toBe(310);
    expect(model.rowOffsets[1]).toBe(192);
  });

  test('applyViewerTheme renders aligned bands and offsets pieces below bands', () => {
    const snapshot = buildSnapshotFixture();
    const model = applyViewerTheme(snapshot, createDefaultViewerTheme());
    expect(model.bandsRenderRows.length).toBe(2);
    expect(model.bandsHeight).toBe(58);
    expect(model.columnWidths.length).toBe(2);
    expect(model.bandsRenderRows[0]?.cells[0]?.left).toBe(model.colOffsets[0]);
    expect(model.bandsRenderRows[0]?.cells[1]?.left).toBe(model.colOffsets[1]);
    const firstPiece = model.items.find((item) => item.id === 'piece-1');
    expect(firstPiece?.top).toBeGreaterThanOrEqual(model.bandsHeight);
  });
});
