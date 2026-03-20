export interface ViewerTheme {
  gapX: number;
  gapY: number;
  minColumnWidth: number;
  minRowHeight: number;
  cellPadding: number;
  blockBorderWidth: number;
  blockBorderRadius: number;
  typographyScale: number;
  showTitle: boolean;
  titleText: string;
  titleFontSize: number;
  headerText: string;
  footerText: string;
  showHeaderFooter: boolean;
}

export interface ViewerThemePersistence {
  lastUsed?: ViewerTheme;
}
