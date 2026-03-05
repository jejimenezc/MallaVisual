export type ViewerTitleWeight = 'normal' | 'bold';

export interface ViewerTheme {
  gapX: number;
  gapY: number;
  minColumnWidth: number;
  minRowHeight: number;
  cellPadding: number;
  blockBorderWidth: number;
  blockBorderRadius: number;
  typographyScale: number;
  titleWeight: ViewerTitleWeight;
  headerText: string;
  footerText: string;
  showHeaderFooter: boolean;
}

export interface ViewerThemePersistence {
  lastUsed?: ViewerTheme;
}
