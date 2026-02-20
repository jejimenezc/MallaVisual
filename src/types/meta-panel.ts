export type MetaCellMode = 'count';

export interface TermConditionConfig {
  controlKey: string;
  equals: string | number | boolean;
}

export type TermOp = 'sum' | 'avg' | 'count' | 'countIf';

export interface TermConfig {
  id: string;
  sign: 1 | -1;
  templateId: string;
  controlKey: string;
  op: TermOp;
  condition?: TermConditionConfig;
}

export interface MetaCellConfig {
  id: string;
  label?: string;
  mode?: MetaCellMode;
  terms: TermConfig[];
}

export interface MetaPanelRowConfig {
  id: string;
  label?: string;
  defaultCell: MetaCellConfig;
  columns?: Record<number, MetaCellConfig>;
}

export interface MetaPanelConfig {
  enabled?: boolean;
  rows: MetaPanelRowConfig[];
}
