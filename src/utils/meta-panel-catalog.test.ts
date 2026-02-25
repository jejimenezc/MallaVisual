import { describe, expect, test } from 'vitest';
import type { BlockTemplate, CurricularPieceRef, CurricularPieceSnapshot } from '../types/curricular.ts';
import {
  buildMetaPanelCatalogForColumn,
  buildMetaPanelCatalogForMalla,
  getTermAvailability,
} from './meta-panel-catalog.ts';

const templateMasterA: BlockTemplate = [[
  { active: true, type: 'number', label: 'Monto' },
  { active: true, type: 'checkbox', label: 'Activo' },
]];

const templateMasterB: BlockTemplate = [[
  { active: true, type: 'calculated', label: 'Total' },
]];

describe('buildMetaPanelCatalogForColumn', () => {
  test('builds unique template catalog from pieces in a column', () => {
    const refA: CurricularPieceRef = {
      kind: 'ref',
      id: 'ref-a',
      ref: {
        sourceId: 'master-a',
        bounds: { minRow: 0, maxRow: 0, minCol: 0, maxCol: 1, rows: 1, cols: 2 },
        aspect: '1/1',
      },
      x: 0,
      y: 0,
    };
    const refB: CurricularPieceRef = {
      kind: 'ref',
      id: 'ref-b',
      ref: {
        sourceId: 'master-b',
        bounds: { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0, rows: 1, cols: 1 },
        aspect: '1/1',
      },
      x: 0,
      y: 1,
    };
    const snapshotWithoutOrigin: CurricularPieceSnapshot = {
      kind: 'snapshot',
      id: 'snap-no-origin',
      template: templateMasterA,
      visual: {},
      aspect: '1/1',
      x: 0,
      y: 2,
    };
    const malla = {
      grid: { cols: 1, rows: 3 },
      pieces: [refA, refB, snapshotWithoutOrigin],
    };

    const catalog = buildMetaPanelCatalogForColumn({
      malla,
      colIndex: 0,
      resolveTemplateForPiece: (piece) =>
        piece.kind === 'ref'
          ? piece.ref.sourceId === 'master-a'
            ? templateMasterA
            : templateMasterB
          : piece.template,
      resolveTemplateLabel: (templateId) => `Template ${templateId}`,
    });

    expect(catalog.templates).toHaveLength(2);
    expect(catalog.controlsByTemplateId['master-a']?.numericControls).toEqual([
      { controlKey: 'r0c0', label: 'Monto', type: 'number' },
    ]);
    expect(catalog.controlsByTemplateId['master-a']?.conditionControls).toEqual([
      { controlKey: 'r0c0', label: 'Monto', type: 'number' },
      { controlKey: 'r0c1', label: 'Activo', type: 'checkbox' },
    ]);
    expect(catalog.controlsByTemplateId['master-b']?.numericControls).toEqual([
      { controlKey: 'r0c0', label: 'Total', type: 'calculated' },
    ]);
  });

  test('builds global catalog across full malla', () => {
    const pieceCol0: CurricularPieceRef = {
      kind: 'ref',
      id: 'ref-a',
      ref: {
        sourceId: 'master-a',
        bounds: { minRow: 0, maxRow: 0, minCol: 0, maxCol: 1, rows: 1, cols: 2 },
        aspect: '1/1',
      },
      x: 0,
      y: 0,
    };
    const pieceCol1: CurricularPieceRef = {
      kind: 'ref',
      id: 'ref-b',
      ref: {
        sourceId: 'master-b',
        bounds: { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0, rows: 1, cols: 1 },
        aspect: '1/1',
      },
      x: 1,
      y: 0,
    };
    const malla = {
      grid: { cols: 2, rows: 1 },
      pieces: [pieceCol0, pieceCol1],
    };

    const catalog = buildMetaPanelCatalogForMalla({
      malla,
      resolveTemplateForPiece: (piece) =>
        piece.kind === 'ref' && piece.ref.sourceId === 'master-a'
          ? templateMasterA
          : templateMasterB,
    });

    expect(catalog.templates.map((template) => template.templateId).sort()).toEqual([
      'master-a',
      'master-b',
    ]);
  });

  test('reports term availability for missing template/control', () => {
    const malla = {
      grid: { cols: 1, rows: 1 },
      pieces: [{
        kind: 'ref',
        id: 'ref-a',
        ref: {
          sourceId: 'master-a',
          bounds: { minRow: 0, maxRow: 0, minCol: 0, maxCol: 1, rows: 1, cols: 2 },
          aspect: '1/1',
        },
        x: 0,
        y: 0,
      } as CurricularPieceRef],
    };
    const catalog = buildMetaPanelCatalogForColumn({
      malla,
      colIndex: 0,
      resolveTemplateForPiece: () => templateMasterA,
    });

    expect(getTermAvailability({
      id: 't1',
      sign: 1,
      templateId: 'master-x',
      controlKey: 'r0c0',
      op: 'sum',
    }, catalog)).toEqual({ ok: false, reason: 'missing-template' });

    expect(getTermAvailability({
      id: 't2',
      sign: 1,
      templateId: 'master-a',
      controlKey: 'r9c9',
      op: 'sum',
    }, catalog)).toEqual({ ok: false, reason: 'missing-control' });
  });
});
