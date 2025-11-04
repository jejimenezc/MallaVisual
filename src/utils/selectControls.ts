// src/utils/selectControls.ts

import type { BlockTemplate, BlockTemplateCell } from '../types/curricular';
import { coordKey } from '../types/visual';

export interface SelectControlInfo {
  coord: string;
  row: number;
  col: number;
  cell: BlockTemplateCell;
  name: string;
  options: string[];
}

const deriveBaseName = (cell: BlockTemplateCell, row: number, col: number): string => {
  const trimmed = cell.label?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }
  return `Select sin título (${row + 1}, ${col + 1})`;
};

export const collectSelectControls = (template: BlockTemplate): SelectControlInfo[] => {
  const counts = new Map<string, number>();
  const controls: SelectControlInfo[] = [];

  template.forEach((row, rIdx) => {
    row.forEach((cell, cIdx) => {
      if (!cell || cell.type !== 'select') return;
      const baseName = deriveBaseName(cell, rIdx, cIdx);
      const occurrence = counts.get(baseName) ?? 0;
      const name = occurrence === 0 ? baseName : `${baseName} #${occurrence + 1}`;
      counts.set(baseName, occurrence + 1);
      controls.push({
        coord: coordKey(rIdx, cIdx),
        row: rIdx,
        col: cIdx,
        cell,
        name,
        options: cell.dropdownOptions ?? [],
      });
    });
  });

  return controls;
};

export const mapSelectControlsByName = (
  template: BlockTemplate,
): Map<string, SelectControlInfo> => {
  const controls = collectSelectControls(template);
  return new Map(controls.map((control) => [control.name, control]));
};

export const mapSelectControlsByCoord = (
  template: BlockTemplate,
): Map<string, SelectControlInfo> => {
  const controls = collectSelectControls(template);
  return new Map(controls.map((control) => [control.coord, control]));
};

export const findSelectControlNameAt = (
  template: BlockTemplate,
  row: number,
  col: number,
): string | null => {
  const counts = new Map<string, number>();

  for (let r = 0; r < template.length; r += 1) {
    const templateRow = template[r] ?? [];
    for (let c = 0; c < templateRow.length; c += 1) {
      const cell = templateRow[c];
      if (!cell || cell.type !== 'select') continue;
      const baseName = deriveBaseName(cell, r, c);
      const occurrence = counts.get(baseName) ?? 0;
      const name = occurrence === 0 ? baseName : `${baseName} #${occurrence + 1}`;
      counts.set(baseName, occurrence + 1);
      if (r === row && c === col) {
        return name;
      }
    }
  }

  return null;
};