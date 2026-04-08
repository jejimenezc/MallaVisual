import { describe, expect, test } from 'vitest';
import {
  resolvePublicationActionDetail,
  resolvePublicationOutputConfigForProduct,
  resolvePublishModalContext,
} from './use-publication-workflow.ts';
import { createDefaultPublicationOutputConfig } from '../utils/publication-output.ts';

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
