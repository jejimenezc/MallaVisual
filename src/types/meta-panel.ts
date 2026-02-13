export type MetaCellMode = 'count';

export interface MetaCellConfig {
  id: string;
  mode?: MetaCellMode;
}

export interface MetaPanelRowConfig {
  id: string;
  label?: string;
  columns: Record<number, MetaCellConfig>;
}

export interface MetaPanelConfig {
  rows: MetaPanelRowConfig[];
}
