// src/types/visual.ts

export type VisualFontSize = 'small' | 'normal' | 'large';

/** Relación de aspecto del bloque completo en modo vista */
export type BlockAspect = '1/1' | '1/2' | '2/1';

export interface ConditionalSelectSource {
  controlName?: string;
  coord?: string;
  colors: Record<string, string>;
}

export interface ConditionalBg {
  selectSource?: ConditionalSelectSource;
  /** Color de fondo para celdas marcadas */
  checkedColor?: string;
  /** Color hover para celdas marcadas */
  hoverCheckedColor?: string;
}

export interface VisualStyle {
  backgroundColor?: string;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  border?: boolean;

  /** Compatibilidad con versiones anteriores */
  fontSize?: VisualFontSize;

  /** Tamaño de fuente granular (px). Si está, tiene prioridad sobre 'fontSize'. */
  fontSizePx?: number;

  /** Relleno interno horizontal (px) aplicado al contenido de la celda en modo vista */
  paddingX?: number;

  /** Relleno interno vertical (px) aplicado al contenido de la celda en modo vista */
  paddingY?: number;

  /** Colores de fondo condicionales */
  conditionalBg?: ConditionalBg;

  /** Usa tokens de paleta del proyecto cuando están disponibles */
  paintWithPalette?: boolean;
}

/** Clave = "row-col" del base (o la propia si no hay merge) */
export type VisualTemplate = Record<string, VisualStyle | undefined>;

/** Utilidad: coord -> "r-c" */
export const coordKey = (row: number, col: number) => `${row}-${col}`;
