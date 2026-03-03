export interface ColumnHeaderTextOverride {
  id: string;
  text: string;
  bold?: boolean;
}

export interface ColumnHeaderRowConfig {
  id: string;
  defaultText: string;
  defaultBold?: boolean;
  usePaletteBg?: boolean;
  hidden?: boolean;
  columns?: Record<number, ColumnHeaderTextOverride>;
}

export interface ColumnHeadersConfig {
  enabled: boolean;
  rows: ColumnHeaderRowConfig[];
}
