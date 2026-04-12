import { describe, expect, test } from 'vitest';
import {
  resolvePublicationActionDetail,
  resolvePublicationOutputConfigForSource,
  resolvePublicationOutputConfigForProduct,
  resolvePublishModalContext,
} from './use-publication-workflow.ts';
import { createDefaultPublicationOutputConfig } from '../utils/publication-output.ts';
import { MALLA_SNAPSHOT_PAYLOAD_KIND } from '../types/malla-snapshot.ts';

const baseConfig = createDefaultPublicationOutputConfig();

describe('resolvePublishModalContext', () => {
  test('uses viewer origin and document mode from print preview', () => {
    expect(
      resolvePublishModalContext({
        locationPathname: '/malla/viewer',
        viewerMode: 'preview',
        viewerPanelModePreference: 'print-preview',
      }),
    ).toEqual({
      origin: 'viewer',
      mode: 'document',
    });
  });

  test('falls back to editor presentation outside viewer preview', () => {
    expect(
      resolvePublishModalContext({
        locationPathname: '/malla/design',
        viewerMode: null,
        viewerPanelModePreference: 'preview',
      }),
    ).toEqual({
      origin: 'editor',
      mode: 'presentation',
    });
  });
});

describe('resolvePublicationOutputConfigForProduct', () => {
  test('removes editorial extras for html-embed', () => {
    expect(
      resolvePublicationOutputConfigForProduct(baseConfig, 'html-embed'),
    ).toEqual({
      ...baseConfig,
      flags: {
        ...baseConfig.flags,
        includeEditorial: false,
      },
    });
  });

  test('keeps the original config for other products', () => {
    expect(resolvePublicationOutputConfigForProduct(baseConfig, 'html-download')).toBe(baseConfig);
  });
});

describe('resolvePublicationOutputConfigForSource', () => {
  test('prioritizes snapshot appearance for publication-mode outputs', () => {
    const config = {
      ...baseConfig,
      theme: {
        ...baseConfig.theme,
        showTitle: false,
        titleText: 'Local',
        showHeaderFooter: false,
        headerText: '',
        footerText: '',
      },
    };

    const resolved = resolvePublicationOutputConfigForSource({
      config,
      product: 'html-download',
      viewerMode: 'publication',
      snapshot: {
        payloadKind: MALLA_SNAPSHOT_PAYLOAD_KIND,
        formatVersion: 1,
        createdAt: '2026-04-12T12:00:00.000Z',
        projectName: 'Snapshot',
        grid: { rows: 1, cols: 1 },
        items: [],
        appearance: {
          ...baseConfig.theme,
          showTitle: true,
          titleText: 'Titulo congelado',
          showHeaderFooter: true,
          headerText: 'Header congelado',
          footerText: 'Footer congelado',
        },
      },
    });

    expect(resolved.theme.showTitle).toBe(true);
    expect(resolved.theme.titleText).toBe('Titulo congelado');
    expect(resolved.theme.headerText).toBe('Header congelado');
    expect(resolved.theme.footerText).toBe('Footer congelado');
  });

  test('keeps current config outside publication mode', () => {
    const resolved = resolvePublicationOutputConfigForSource({
      config: baseConfig,
      product: 'html-download',
      viewerMode: 'preview',
      snapshot: null,
    });

    expect(resolved).toBe(baseConfig);
  });
});

describe('resolvePublicationActionDetail', () => {
  test('returns a contextual detail for html-web', () => {
    expect(resolvePublicationActionDetail('html-web')).toContain('revision inmediata');
  });

  test('returns a contextual detail for html-embed', () => {
    expect(resolvePublicationActionDetail('html-embed')).toContain('sin elementos editoriales extra');
  });

  test('returns undefined for products without extra detail', () => {
    expect(resolvePublicationActionDetail('pdf')).toBeUndefined();
  });
});
