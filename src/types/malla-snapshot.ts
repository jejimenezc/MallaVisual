import type { InputType } from './curricular.ts';
import type { ViewerTheme } from './viewer-theme.ts';

/**
 * Formato portable para Viewer:
 * contiene solo layout/render (grid + items + merges + texto + estilos resueltos),
 * sin repositorio, historial ni estado UI del editor.
 */
export const MALLA_SNAPSHOT_FORMAT_VERSION = 1 as const;

export interface SnapshotCellStyle {
  backgroundColor: string;
  textColor: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  border: 'none' | 'thin' | 'strong';
  fontSizePx: number;
  paddingX: number;
  paddingY: number;
  bold: boolean;
  italic: boolean;
}

export interface MallaSnapshotCell {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  type: InputType | 'empty';
  text: string;
  value?: string | number | boolean;
  placeholder?: string;
  checked?: boolean;
  style: SnapshotCellStyle;
}

export interface MallaSnapshotMerge {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

export interface MallaSnapshotItem {
  id: string;
  row: number;
  col: number;
  aspect: string;
  rows: number;
  cols: number;
  merges: MallaSnapshotMerge[];
  cells: MallaSnapshotCell[];
}

export interface SnapshotBandCell {
  col: number;
  text: string;
  label?: string;
  bold?: boolean;
  style: SnapshotCellStyle;
}

export interface SnapshotHeaderRow {
  id: string;
  cells: SnapshotBandCell[];
}

export interface SnapshotMetricRow {
  id: string;
  label?: string;
  cells: SnapshotBandCell[];
}

export interface SnapshotHeaderBand {
  rows: SnapshotHeaderRow[];
}

export interface SnapshotMetricsBand {
  rows: SnapshotMetricRow[];
}

export interface SnapshotBands {
  headers?: SnapshotHeaderBand;
  metrics?: SnapshotMetricsBand;
}

export interface MallaSnapshotV1 {
  formatVersion: typeof MALLA_SNAPSHOT_FORMAT_VERSION;
  createdAt: string;
  projectName: string;
  snapshotId?: string;
  appVersion?: string;
  grid: {
    rows: number;
    cols: number;
  };
  items: MallaSnapshotItem[];
  bands?: SnapshotBands;
  appearance?: ViewerTheme;
}

export type MallaSnapshot = MallaSnapshotV1;

export interface MallaSnapshotValidationOk {
  ok: true;
  normalizedSnapshot: MallaSnapshotV1;
}

export interface MallaSnapshotValidationError {
  ok: false;
  error: string;
}

export type MallaSnapshotValidationResult =
  | MallaSnapshotValidationOk
  | MallaSnapshotValidationError;
