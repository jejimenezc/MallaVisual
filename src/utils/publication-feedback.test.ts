import assert from 'node:assert/strict';
import { test } from 'vitest';
import { getPublicationActionButtonLabel } from './publication-feedback.ts';

test('publication feedback resolves button labels by operation status', () => {
  assert.equal(getPublicationActionButtonLabel('pdf', 'idle'), 'Exportar PDF');
  assert.equal(getPublicationActionButtonLabel('pdf', 'running'), 'Exportar PDF');
  assert.equal(getPublicationActionButtonLabel('pdf', 'waiting'), 'Exportar PDF');
  assert.equal(getPublicationActionButtonLabel('html-download', 'success'), 'OK');
  assert.equal(getPublicationActionButtonLabel('print', 'error'), 'Imprimir ahora');
  assert.equal(
    getPublicationActionButtonLabel('snapshot-json', 'idle', 'certify'),
    'Emitir acta certificada',
  );
});
