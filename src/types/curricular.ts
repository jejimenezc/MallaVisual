// src/types/curricular.ts

import type { VisualTemplate, BlockAspect } from './visual';

export type InputType =
  | 'staticText'
  | 'text'
  | 'checkbox'
  | 'select'
  | 'number'
  | 'calculated';
  
export interface CellStyle {
  alignment?: 'left' | 'center' | 'right';
  bold?: boolean;
  italic?: boolean;
  bgColor?: string;
  textColor?: string;
}

export interface BlockTemplateCell {
  active: boolean;
  type?: InputType;
  label?: string;
  dropdownOptions?: string[];  // Solo para 'select'
  mergedWith?: string;         // Referencia a la celda base: 'row-col'
  placeholder?: string;       // ✅ agregado para text
  decimalDigits?: number;     // Solo para 'number'
  expression?: string;        // Solo para 'calculated'
  style?: CellStyle; // ✅ agregado para preview
  // Estilos visuales (solo afectan presentación)
  visualStyle?: {
    backgroundColor?: string;
    textAlign?: 'left' | 'center' | 'right';
    border?: boolean;
    fontSize?: 'small' | 'normal' | 'large';
  };
}

export type BlockTemplate = BlockTemplateCell[][];


export interface CurricularBlock {
  id: string;
  template: BlockTemplate;
  visual: VisualTemplate;
  aspect: BlockAspect;
  x: number;
  y: number;
}

// --- NUEVO: piezas en la malla con doble modalidad ---

export interface BlockSourceRef {
  /** Identificador del maestro asociado a la pieza */
  sourceId: string;
  /** Recorte activo */
  bounds: { minRow: number; maxRow: number; minCol: number; maxCol: number; rows: number; cols: number; };
  /** Aspecto heredado del maestro en el momento de creación (puedes recalcular si lo prefieres) */
  aspect: BlockAspect;
}

/**
 * Pieza viva: no almacena template/visual; los deriva del maestro + bounds.
 */
export interface CurricularPieceRef {
  kind: 'ref';
  id: string;
  ref: BlockSourceRef;
  x: number;
  y: number;
}

/**
 * Pieza congelada: almacena una copia materializada (snapshot).
 */
export interface CurricularPieceSnapshot {
  kind: 'snapshot';
  id: string;
  template: BlockTemplate;
  visual: VisualTemplate;
  aspect: BlockAspect;
  x: number;
  y: number;
  /** <-- NUEVO: si existe, habilita "Descongelar" (volver a referenciado) */
  origin?: BlockSourceRef;
}

export type CurricularPiece = CurricularPieceRef | CurricularPieceSnapshot;

export interface MasterBlockData {
  template: BlockTemplate;
  visual: VisualTemplate;
  aspect: BlockAspect;
}

export interface MasterBlockRepository {
  list(): string[];
  load(id: string): MasterBlockData | null;
  save(id: string, data: MasterBlockData): void;
  remove(id: string): void;
}