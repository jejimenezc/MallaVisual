export interface ColumnHeaderTextOverride {
  id: string;
  text: string;
}

export interface ColumnHeaderRowConfig {
  id: string;
  defaultText: string;
  hidden?: boolean;
  columns?: Record<number, ColumnHeaderTextOverride>;
}

export interface ColumnHeadersConfig {
  enabled: boolean;
  rows: ColumnHeaderRowConfig[];
}
