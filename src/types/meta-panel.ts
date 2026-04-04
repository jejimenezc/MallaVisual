export type MetaCellMode = 'count';

export interface TermConditionConfig {
  controlKey: string;
  equals: string | number | boolean;
}

export type TermOp = 'sum' | 'avg' | 'count' | 'countIf';

export type MetricExprOp = '+' | '-' | '*' | '/';

export type MetricExprToken =
  | { type: 'term'; termId: string }
  | { type: 'const'; value: number }
  | { type: 'op'; op: MetricExprOp }
  | { type: 'paren'; paren: '(' | ')' };

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
  expr?: MetricExprToken[];
}

export interface MetaPanelRowConfig {
  id: string;
  label?: string;
  hidden?: boolean;
  defaultCell: MetaCellConfig;
  columns?: Record<number, MetaCellConfig>;
}

export interface MetaPanelConfig {
  enabled?: boolean;
  rows: MetaPanelRowConfig[];
}
