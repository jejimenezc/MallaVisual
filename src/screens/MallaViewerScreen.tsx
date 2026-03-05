import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import type { MallaSnapshot } from '../types/malla-snapshot.ts';
import type { ViewerTheme } from '../types/viewer-theme.ts';
import {
  applyViewerTheme,
  createDefaultViewerTheme,
  normalizeViewerTheme,
  VIEWER_MAX_ZOOM,
  VIEWER_MIN_ZOOM,
  VIEWER_THEME_STORAGE_KEY,
  VIEWER_ZOOM_STEP,
} from '../utils/viewer-theme.ts';
import styles from './MallaViewerScreen.module.css';

interface Props {
  snapshot: MallaSnapshot | null;
  onImportSnapshotFile: (file: File) => Promise<void> | void;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const formatSnapshotDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const borderStyleFromSnapshot = (value: 'none' | 'thin' | 'strong') => {
  if (value === 'none') return 'none';
  if (value === 'strong') return '2px solid rgba(15, 23, 42, 0.65)';
  return '1px solid rgba(15, 23, 42, 0.38)';
};

const cellTextFromType = (text: string, type: string, checked?: boolean): string => {
  if (type === 'checkbox') {
    return checked ? `\u2611 ${text}` : `\u2610 ${text}`;
  }
  return text;
};

export function MallaViewerScreen({ snapshot, onImportSnapshotFile }: Props): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isAppearanceOpen, setAppearanceOpen] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [theme, setTheme] = useState<ViewerTheme>(() => {
    if (typeof window === 'undefined') return createDefaultViewerTheme();
    try {
      const raw = window.localStorage.getItem(VIEWER_THEME_STORAGE_KEY);
      if (!raw) return createDefaultViewerTheme();
      return normalizeViewerTheme(JSON.parse(raw));
    } catch {
      return createDefaultViewerTheme();
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(VIEWER_THEME_STORAGE_KEY, JSON.stringify(theme));
    } catch {
      // no-op: localStorage can fail in restricted environments
    }
  }, [theme]);

  const renderModel = useMemo(() => {
    if (!snapshot) return null;
    return applyViewerTheme(snapshot, theme);
  }, [snapshot, theme]);

  const zoomPct = `${Math.round(zoom * 100)}%`;

  const setZoomSafe = useCallback((value: number) => {
    setZoom(clamp(value, VIEWER_MIN_ZOOM, VIEWER_MAX_ZOOM));
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomSafe(zoom + VIEWER_ZOOM_STEP);
  }, [setZoomSafe, zoom]);

  const handleZoomOut = useCallback(() => {
    setZoomSafe(zoom - VIEWER_ZOOM_STEP);
  }, [setZoomSafe, zoom]);

  const handleOpenImporter = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      void (async () => {
        try {
          await onImportSnapshotFile(file);
        } finally {
          event.target.value = '';
        }
      })();
    },
    [onImportSnapshotFile],
  );

  const handleExportSnapshot = useCallback(() => {
    if (!snapshot) return;
    const json = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snapshot.projectName || 'malla'}-snapshot-v1.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [snapshot]);

  const handleViewportMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!event.altKey || event.button !== 0) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    };
    setIsPanning(true);
    window.getSelection()?.removeAllRanges();
    event.preventDefault();
  }, []);

  useEffect(() => {
    if (!isPanning) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleMouseMove = (event: MouseEvent) => {
      const deltaX = event.clientX - panStartRef.current.x;
      const deltaY = event.clientY - panStartRef.current.y;
      viewport.scrollLeft = panStartRef.current.scrollLeft - deltaX;
      viewport.scrollTop = panStartRef.current.scrollTop - deltaY;
    };
    const handleMouseUp = () => setIsPanning(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning]);

  if (!snapshot || !renderModel) {
    return (
      <section className={styles.viewerEmpty}>
        <h2>Viewer de malla</h2>
        <p>No hay snapshot cargado.</p>
        <Button type="button" variant="primary" onClick={handleOpenImporter}>
          Cargar snapshot
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportInputChange}
          accept="application/json"
          className={styles.hiddenInput}
        />
      </section>
    );
  }

  return (
    <section className={styles.viewerScreen}>
      <Header
        className={styles.viewerHeader}
        left={
          <div className={styles.viewerTitleWrap}>
            <h2
              className={styles.viewerTitle}
              style={{ fontWeight: renderModel.theme.titleWeight === 'bold' ? 700 : 400 }}
            >
              {renderModel.projectName}
            </h2>
            <span className={styles.snapshotMeta}>
              Snapshot {formatSnapshotDate(snapshot.createdAt)}
            </span>
          </div>
        }
        right={
          <div className={styles.viewerActions}>
            <Button type="button" onClick={() => setAppearanceOpen((prev) => !prev)}>
              Apariencia
            </Button>
            <Button type="button" onClick={handleExportSnapshot}>
              Exportar
            </Button>
          </div>
        }
      />
      <div className={styles.viewerBody}>
        <aside className={`${styles.appearancePanel} ${isAppearanceOpen ? styles.appearanceOpen : ''}`}>
          <h3>Apariencia v1</h3>
          <label className={styles.field}>
            <span>Gap columnas</span>
            <input
              type="range"
              min={0}
              max={96}
              value={theme.gapX}
              onChange={(event) => setTheme((prev) => ({ ...prev, gapX: Number(event.target.value) }))}
            />
          </label>
          <label className={styles.field}>
            <span>Gap filas</span>
            <input
              type="range"
              min={0}
              max={96}
              value={theme.gapY}
              onChange={(event) => setTheme((prev) => ({ ...prev, gapY: Number(event.target.value) }))}
            />
          </label>
          <label className={styles.field}>
            <span>Ancho minimo columna</span>
            <input
              type="range"
              min={0}
              max={500}
              step={5}
              value={theme.minColumnWidth}
              onChange={(event) =>
                setTheme((prev) => ({ ...prev, minColumnWidth: Number(event.target.value) }))
              }
            />
          </label>
          <label className={styles.field}>
            <span>Alto minimo fila</span>
            <input
              type="range"
              min={0}
              max={500}
              step={5}
              value={theme.minRowHeight}
              onChange={(event) =>
                setTheme((prev) => ({ ...prev, minRowHeight: Number(event.target.value) }))
              }
            />
          </label>
          <label className={styles.field}>
            <span>Padding celdas</span>
            <input
              type="range"
              min={0}
              max={32}
              value={theme.cellPadding}
              onChange={(event) =>
                setTheme((prev) => ({ ...prev, cellPadding: Number(event.target.value) }))
              }
            />
          </label>
          <label className={styles.field}>
            <span>Borde bloques</span>
            <input
              type="range"
              min={0}
              max={8}
              value={theme.blockBorderWidth}
              onChange={(event) =>
                setTheme((prev) => ({ ...prev, blockBorderWidth: Number(event.target.value) }))
              }
            />
          </label>
          <label className={styles.field}>
            <span>Radio borde</span>
            <input
              type="range"
              min={0}
              max={32}
              value={theme.blockBorderRadius}
              onChange={(event) =>
                setTheme((prev) => ({ ...prev, blockBorderRadius: Number(event.target.value) }))
              }
            />
          </label>
          <label className={styles.field}>
            <span>Escala tipografica</span>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              value={theme.typographyScale}
              onChange={(event) =>
                setTheme((prev) => ({ ...prev, typographyScale: Number(event.target.value) }))
              }
            />
          </label>
          <label className={styles.field}>
            <span>Peso titulo</span>
            <select
              value={theme.titleWeight}
              onChange={(event) =>
                setTheme((prev) => ({
                  ...prev,
                  titleWeight: event.target.value === 'normal' ? 'normal' : 'bold',
                }))
              }
            >
              <option value="bold">Bold</option>
              <option value="normal">Normal</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Header text</span>
            <input
              type="text"
              value={theme.headerText}
              onChange={(event) => setTheme((prev) => ({ ...prev, headerText: event.target.value }))}
            />
          </label>
          <label className={styles.field}>
            <span>Footer text</span>
            <input
              type="text"
              value={theme.footerText}
              onChange={(event) => setTheme((prev) => ({ ...prev, footerText: event.target.value }))}
            />
          </label>
          <label className={styles.toggleField}>
            <input
              type="checkbox"
              checked={theme.showHeaderFooter}
              onChange={(event) =>
                setTheme((prev) => ({ ...prev, showHeaderFooter: event.target.checked }))
              }
            />
            <span>Mostrar header/footer</span>
          </label>
          <Button type="button" onClick={() => setTheme(createDefaultViewerTheme())}>
            Restablecer
          </Button>
        </aside>

        <div className={styles.viewerMain}>
          <div className={styles.viewerToolbar}>
            <div className={styles.zoomControl}>
              <Button type="button" onClick={handleZoomOut} disabled={zoom <= VIEWER_MIN_ZOOM}>
                -
              </Button>
              <input
                type="range"
                min={VIEWER_MIN_ZOOM}
                max={VIEWER_MAX_ZOOM}
                step={VIEWER_ZOOM_STEP}
                value={zoom}
                onChange={(event) => setZoomSafe(Number(event.target.value))}
              />
              <Button type="button" onClick={handleZoomIn} disabled={zoom >= VIEWER_MAX_ZOOM}>
                +
              </Button>
              <span>{zoomPct}</span>
            </div>
            <span className={styles.panHint}>Paneo: scroll o Alt+arrastrar</span>
          </div>

          {renderModel.theme.showHeaderFooter && renderModel.theme.headerText.trim() ? (
            <div className={styles.runtimeHeader}>{renderModel.theme.headerText}</div>
          ) : null}

          <div
            ref={viewportRef}
            className={`${styles.viewerViewport} ${isPanning ? styles.viewerViewportPanning : ''}`}
            onMouseDown={handleViewportMouseDown}
          >
            <div
              className={styles.viewerCanvasScaled}
              style={{
                width: `${Math.max(renderModel.width, 1)}px`,
                height: `${Math.max(renderModel.height, 1)}px`,
                transform: `scale(${zoom})`,
              }}
            >
              {renderModel.items.map((item) => (
                <article
                  key={item.id}
                  className={styles.viewerPiece}
                  style={{
                    left: `${item.left}px`,
                    top: `${item.top}px`,
                    width: `${item.width}px`,
                    height: `${item.height}px`,
                    borderWidth: `${renderModel.theme.blockBorderWidth}px`,
                    borderRadius: `${renderModel.theme.blockBorderRadius}px`,
                  }}
                >
                  <div className={styles.viewerPieceGrid} style={item.gridStyle}>
                    {item.cells.map((cell) => (
                      <div
                        key={`${item.id}-${cell.row}-${cell.col}`}
                        className={styles.viewerCell}
                        style={{
                          gridRow: `${cell.row + 1} / ${cell.row + cell.rowSpan + 1}`,
                          gridColumn: `${cell.col + 1} / ${cell.col + cell.colSpan + 1}`,
                          backgroundColor: cell.style.backgroundColor,
                          color: cell.style.textColor,
                          border: borderStyleFromSnapshot(cell.style.border),
                          textAlign: cell.style.textAlign,
                          fontSize: `${cell.style.fontSizePx}px`,
                          padding: `${cell.style.paddingY}px ${cell.style.paddingX}px`,
                          fontWeight: cell.style.bold ? 700 : 400,
                          fontStyle: cell.style.italic ? 'italic' : 'normal',
                        }}
                        title={cell.text}
                      >
                        <span>{cellTextFromType(cell.text, cell.type, cell.checked)}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>

          {renderModel.theme.showHeaderFooter && renderModel.theme.footerText.trim() ? (
            <div className={styles.runtimeFooter}>{renderModel.theme.footerText}</div>
          ) : null}
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportInputChange}
        accept="application/json"
        className={styles.hiddenInput}
      />
    </section>
  );
}
