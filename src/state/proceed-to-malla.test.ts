import { describe, expect, test } from 'vitest';
import { getProceedToMallaCancelLabel } from './proceed-to-malla.tsx';

describe('getProceedToMallaCancelLabel', () => {
  test('usa copy contextual en escritorio', () => {
    expect(getProceedToMallaCancelLabel('/')).toBe('Seguir en la pantalla actual');
  });

  test('usa copy contextual en repositorio', () => {
    expect(getProceedToMallaCancelLabel('/blocks')).toBe('Seguir en la pantalla actual');
  });

  test('mantiene copy de edicion en el editor de bloques', () => {
    expect(getProceedToMallaCancelLabel('/block/design')).toBe('Seguir editando');
  });

  test('mantiene copy de malla como fallback', () => {
    expect(getProceedToMallaCancelLabel('/malla/design')).toBe('Seguir en la malla');
  });
});
