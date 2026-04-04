import assert from 'node:assert/strict';
import { test } from 'vitest';
import { getPublicationActionButtonLabel } from './publication-feedback.ts';

test('publication feedback resolves button labels by operation status', () => {
  assert.equal(getPublicationActionButtonLabel('pdf', 'idle'), 'Exportar PDF');
  assert.equal(getPublicationActionButtonLabel('pdf', 'running'), 'Exportar PDF');
  assert.equal(getPublicationActionButtonLabel('pdf', 'waiting'), 'Exportar PDF');
  assert.equal(getPublicationActionButtonLabel('html-download', 'success'), '\u2713');
  assert.equal(getPublicationActionButtonLabel('print', 'error'), 'Imprimir ahora');
});
