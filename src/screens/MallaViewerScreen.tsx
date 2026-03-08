import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import type { MallaSnapshot } from '../types/malla-snapshot.ts';
import type { ViewerTheme } from '../types/viewer-theme.ts';
import {
  applyViewerTheme,
  createDefaultViewerTheme,
  VIEWER_MAX_ZOOM,
  VIEWER_MIN_ZOOM,
  VIEWER_ZOOM_STEP,
} from '../utils/viewer-theme.ts';
import styles from './MallaViewerScreen.module.css';

interface Props {
  snapshot: MallaSnapshot | null;
  mode: 'preview' | 'publication' | null;
  theme: ViewerTheme;
  onThemeChange: (theme: ViewerTheme) => void;
  onBackToEditor: () => void;
  onPublish: () => Promise<void> | void;
  onImportPublicationFile: (file: File) => Promise<void> | void;
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

const resolveBandCellTextAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
  if (align === 'justify') return 'left';
  return align;
};

export function MallaViewerScreen({
  snapshot,
  mode,
  theme,
  onThemeChange,
  onBackToEditor,
  onPublish,
  onImportPublicationFile,
}: Props): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isAppearanceOpen, setAppearanceOpen] = useState(true);
  const [isPanning, setIsPanning] = useState(false);
  const [pointerMode] = useState<'select' | 'pan'>('pan');
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const renderModel = useMemo(() => {
    if (!snapshot) return null;
    return applyViewerTheme(snapshot, theme);
  }, [snapshot, theme]);

  const zoomPct = `${Math.round(zoom * 100)}%`;

  const setZoomSafe = useCallback((value: number) => {
    setZoom(clamp(value, VIEWER_MIN_ZOOM, VIEWER_MAX_ZOOM));
  }, []);

  const setThemeSafe = useCallback(
    (next: ViewerTheme | ((prev: ViewerTheme) => ViewerTheme)) => {
      if (typeof next === 'function') {
        const updater = next as (prev: ViewerTheme) => ViewerTheme;
        onThemeChange(updater(theme));
        return;
      }
      onThemeChange(next);
    },
    [onThemeChange, theme],
  );

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
          await onImportPublicationFile(file);
        } finally {
          event.target.value = '';
        }
      })();
    },
    [onImportPublicationFile],
  );

  const handleViewportMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (pointerMode !== 'pan' || event.button !== 0) return;
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
  }, [pointerMode]);

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
        <h2>{mode === 'publication' ? 'Version publicada' : 'Vista previa de malla'}</h2>
        <p>
          {mode === 'publication'
            ? 'No hay una version publicada cargada.'
            : 'No hay datos para vista previa.'}
        </p>
        {mode === 'publication' ? (
          <Button type="button" variant="primary" onClick={handleOpenImporter}>
            Abrir version publicada
          </Button>
        ) : (
          <Button type="button" variant="primary" onClick={onBackToEditor}>
            Volver al editor
          </Button>
        )}
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
              {mode === 'publication' ? 'Viendo publicacion' : 'Vista previa'} -{' '}
              {formatSnapshotDate(snapshot.createdAt)}
            </span>
          </div>
        }
        center={
          <label className={styles.zoomControl}>
            <div className={styles.zoomControlGroup}>
              <button
                type="button"
                className={styles.zoomButton}
                onClick={handleZoomOut}
                disabled={zoom <= VIEWER_MIN_ZOOM}
                aria-label="Reducir zoom"
              >
                -
              </button>
              <input
                className={styles.zoomSlider}
                type="range"
                min={VIEWER_MIN_ZOOM}
                max={VIEWER_MAX_ZOOM}
                step={VIEWER_ZOOM_STEP}
                value={zoom}
                onChange={(event) => setZoomSafe(Number(event.target.value))}
                aria-label="Nivel de zoom de la publicacion"
              />
              <button
                type="button"
                className={styles.zoomButton}
                onClick={handleZoomIn}
                disabled={zoom >= VIEWER_MAX_ZOOM}
                aria-label="Aumentar zoom"
              >
                +
              </button>
              <span className={styles.zoomValue}>{zoomPct}</span>
            </div>
            <div className={styles.pointerToggle} role="group" aria-label="Modo del puntero">
              <button
                type="button"
                className={styles.pointerToggleButton}
                aria-pressed={false}
                disabled
                title="Seleccion deshabilitada en vista previa/publicacion"
              >
                👉🏻
              </button>
              <button
                type="button"
                className={`${styles.pointerToggleButton} ${styles.pointerToggleButtonActive}`}
                aria-pressed={true}
                title="Arrastre activo"
              >
                🤚🏻
              </button>
            </div>
          </label>
        }
        right={
          <div className={styles.viewerActions}>
            <Button type="button" onClick={onBackToEditor}>
              Volver al editor
            </Button>
            {mode === 'preview' ? (
              <Button type="button" onClick={() => void onPublish()}>
                Publicar esta version
              </Button>
            ) : (
              <Button type="button" onClick={handleOpenImporter}>
                Abrir publicacion
              </Button>
            )}
          </div>
        }
      />
      <div className={`${styles.viewerBody} ${!isAppearanceOpen ? styles.appearanceCollapsed : ''}`}>
        {!isAppearanceOpen ? (
          <Button
            type="button"
            className={`${styles.appearanceToggle} ${styles.appearanceToggleRestore}`}
            onClick={() => setAppearanceOpen(true)}
            aria-label="Mostrar panel de apariencia"
            title="Mostrar panel de apariencia"
          >
            ›
          </Button>
        ) : null}
        <aside className={`${styles.appearancePanel} ${isAppearanceOpen ? styles.appearanceOpen : ''}`}>
          <div className={styles.appearanceToggleRow}>
            <Button
              type="button"
              className={`${styles.appearanceToggle} ${styles.appearanceToggleHide}`}
              onClick={() => setAppearanceOpen(false)}
              aria-label="Ocultar panel de apariencia"
              title="Ocultar panel de apariencia"
            >
              ‹
            </Button>
          </div>
          <h3>Apariencia v1</h3>
          <label className={styles.field}>
            <span>Gap columnas</span>
            <input
              type="range"
              min={0}
              max={96}
              value={theme.gapX}
              onChange={(event) => setThemeSafe((prev) => ({ ...prev, gapX: Number(event.target.value) }))}
            />
          </label>
          <label className={styles.field}>
            <span>Gap filas</span>
            <input
              type="range"
              min={0}
              max={96}
              value={theme.gapY}
              onChange={(event) => setThemeSafe((prev) => ({ ...prev, gapY: Number(event.target.value) }))}
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
                setThemeSafe((prev) => ({ ...prev, minColumnWidth: Number(event.target.value) }))
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
                setThemeSafe((prev) => ({ ...prev, minRowHeight: Number(event.target.value) }))
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
                setThemeSafe((prev) => ({ ...prev, cellPadding: Number(event.target.value) }))
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
                setThemeSafe((prev) => ({ ...prev, blockBorderWidth: Number(event.target.value) }))
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
                setThemeSafe((prev) => ({ ...prev, blockBorderRadius: Number(event.target.value) }))
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
                setThemeSafe((prev) => ({ ...prev, typographyScale: Number(event.target.value) }))
              }
            />
          </label>
          <label className={styles.field}>
            <span>Peso titulo</span>
            <select
              value={theme.titleWeight}
              onChange={(event) =>
                setThemeSafe((prev) => ({
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
              onChange={(event) => setThemeSafe((prev) => ({ ...prev, headerText: event.target.value }))}
            />
          </label>
          <label className={styles.field}>
            <span>Footer text</span>
            <input
              type="text"
              value={theme.footerText}
              onChange={(event) => setThemeSafe((prev) => ({ ...prev, footerText: event.target.value }))}
            />
          </label>
          <label className={styles.toggleField}>
            <input
              type="checkbox"
              checked={theme.showHeaderFooter}
              onChange={(event) =>
                setThemeSafe((prev) => ({ ...prev, showHeaderFooter: event.target.checked }))
              }
            />
            <span>Mostrar header/footer</span>
          </label>
          <Button type="button" onClick={() => onThemeChange(createDefaultViewerTheme())}>
            Restablecer
          </Button>
        </aside>

        <div className={styles.viewerMain}>
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
              {renderModel.bandsRenderRows.map((row) => (
                <div
                  key={`band-row-${row.kind}-${row.id}`}
                  className={`${styles.viewerBandRow} ${row.kind === 'header' ? styles.viewerBandRowHeader : styles.viewerBandRowMetric}`}
                  style={{
                    top: `${row.top}px`,
                    height: `${row.height}px`,
                    width: `${Math.max(renderModel.width, 1)}px`,
                  }}
                >
                  {row.cells.map((cell, index) => (
                    <div
                      key={`band-cell-${row.kind}-${row.id}-${cell.col}-${index}`}
                      className={styles.viewerBandCell}
                      style={{
                        left: `${cell.left}px`,
                        width: `${cell.width}px`,
                        height: `${row.height}px`,
                        backgroundColor: cell.style.backgroundColor,
                        color: cell.style.textColor,
                        border: borderStyleFromSnapshot(cell.style.border),
                        textAlign: resolveBandCellTextAlign(cell.style.textAlign),
                        fontSize: `${cell.style.fontSizePx}px`,
                        padding: `${cell.style.paddingY}px ${cell.style.paddingX}px`,
                        fontWeight: cell.bold || cell.style.bold ? 700 : 400,
                        fontStyle: cell.style.italic ? 'italic' : 'normal',
                      }}
                    >
                      {cell.label ? (
                        <div className={styles.viewerBandCellMetric}>
                          <span className={styles.viewerBandCellMetricLabel}>{cell.label}</span>
                          <span className={styles.viewerBandCellMetricValue}>{cell.text}</span>
                        </div>
                      ) : (
                        <span>{cell.text}</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
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
