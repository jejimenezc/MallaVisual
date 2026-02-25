import type { MetaCellConfig, MetricExprToken, TermConfig } from '../types/meta-panel.ts';

const precedence: Record<'+' | '-' | '*' | '/', number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const getSafeTermId = (term: Partial<TermConfig>, index: number): string => {
  if (typeof term.id === 'string' && term.id.trim().length > 0) {
    return term.id.trim();
  }
  return `legacy-term-${index + 1}`;
};

export interface ExprValidationResult {
  isValid: boolean;
  message?: string;
}

export function areMetricExprTokensEqual(
  leftTokens: MetricExprToken[] | undefined,
  rightTokens: MetricExprToken[] | undefined,
): boolean {
  const left = leftTokens ?? [];
  const right = rightTokens ?? [];
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    const leftToken = left[index];
    const rightToken = right[index];
    if (!leftToken || !rightToken) {
      return false;
    }

    if (leftToken.type !== rightToken.type) {
      return false;
    }

    if (leftToken.type === 'const' && rightToken.type === 'const') {
      if (leftToken.value !== rightToken.value) return false;
      continue;
    }
    if (leftToken.type === 'term' && rightToken.type === 'term') {
      if (leftToken.termId !== rightToken.termId) return false;
      continue;
    }
    if (leftToken.type === 'op' && rightToken.type === 'op') {
      if (leftToken.op !== rightToken.op) return false;
      continue;
    }
    if (leftToken.type === 'paren' && rightToken.type === 'paren') {
      if (leftToken.paren !== rightToken.paren) return false;
      continue;
    }

    return false;
  }

  return true;
}

export function deriveExprFromTerms(cell: MetaCellConfig): MetricExprToken[] {
  if (Array.isArray(cell.expr)) {
    return cell.expr;
  }

  const terms = Array.isArray(cell.terms) ? cell.terms : [];
  if (terms.length === 0) {
    return [];
  }

  const tokens: MetricExprToken[] = [];
  terms.forEach((term, index) => {
    const termId = getSafeTermId(term, index);
    const sign = term.sign === -1 ? -1 : 1;
    if (index === 0) {
      if (sign === -1) {
        tokens.push({ type: 'const', value: 0 }, { type: 'op', op: '-' }, { type: 'term', termId });
      } else {
        tokens.push({ type: 'term', termId });
      }
      return;
    }
    tokens.push({ type: 'op', op: sign === -1 ? '-' : '+' }, { type: 'term', termId });
  });

  return tokens;
}

export function evaluateMetricExpr(
  tokens: MetricExprToken[],
  resolveTermValue: (termId: string) => number,
): number | null {
  try {
    if (!Array.isArray(tokens) || tokens.length === 0) {
      return null;
    }

    const postfix = toPostfix(tokens);
    if (!postfix) {
      return null;
    }

    const stack: number[] = [];
    for (const token of postfix) {
      if (token.type === 'const') {
        if (!isFiniteNumber(token.value)) return null;
        stack.push(token.value);
        continue;
      }

      if (token.type === 'term') {
        const resolved = resolveTermValue(token.termId);
        if (!isFiniteNumber(resolved)) {
          return null;
        }
        stack.push(resolved);
        continue;
      }

      if (token.type !== 'op') {
        return null;
      }

      const right = stack.pop();
      const left = stack.pop();
      if (!isFiniteNumber(left) || !isFiniteNumber(right)) {
        return null;
      }

      let computed: number | null = null;
      if (token.op === '+') computed = left + right;
      if (token.op === '-') computed = left - right;
      if (token.op === '*') computed = left * right;
      if (token.op === '/') computed = right === 0 ? null : left / right;

      if (!isFiniteNumber(computed)) {
        return null;
      }
      stack.push(computed);
    }

    if (stack.length !== 1 || !isFiniteNumber(stack[0])) {
      return null;
    }
    return stack[0];
  } catch {
    return null;
  }
}

export function validateExprTokens(tokens: MetricExprToken[]): ExprValidationResult {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return { isValid: true };
  }

  let expectsOperand = true;
  let openParens = 0;

  for (const token of tokens) {
    if (token.type === 'term' || token.type === 'const') {
      if (!expectsOperand) {
        return { isValid: false, message: 'Falta un operador entre valores.' };
      }
      expectsOperand = false;
      continue;
    }

    if (token.type === 'op') {
      if (expectsOperand) {
        return { isValid: false, message: 'Expresion incompleta.' };
      }
      expectsOperand = true;
      continue;
    }

    if (token.type !== 'paren') {
      return { isValid: false, message: 'Expresion invalida.' };
    }

    if (token.paren === '(') {
      if (!expectsOperand) {
        return { isValid: false, message: 'Falta un operador antes del parentesis.' };
      }
      openParens += 1;
      expectsOperand = true;
      continue;
    }

    if (expectsOperand) {
      return { isValid: false, message: 'Expresion incompleta.' };
    }
    openParens -= 1;
    if (openParens < 0) {
      return { isValid: false, message: 'Parentesis de cierre sin apertura.' };
    }
    expectsOperand = false;
  }

  if (openParens > 0) {
    return { isValid: false, message: 'Parentesis sin cerrar.' };
  }
  if (expectsOperand) {
    return { isValid: false, message: 'Expresion incompleta.' };
  }

  return { isValid: true };
}

function toPostfix(tokens: MetricExprToken[]): Array<MetricExprToken & { type: 'const' | 'term' | 'op' }> | null {
  const output: Array<MetricExprToken & { type: 'const' | 'term' | 'op' }> = [];
  const operators: MetricExprToken[] = [];
  let expectsOperand = true;

  for (const token of tokens) {
    if (token.type === 'const' || token.type === 'term') {
      if (!expectsOperand) {
        return null;
      }
      output.push(token);
      expectsOperand = false;
      continue;
    }

    if (token.type === 'paren') {
      if (token.paren === '(') {
        if (!expectsOperand) {
          return null;
        }
        operators.push(token);
        continue;
      }

      if (expectsOperand) {
        return null;
      }

      let foundOpenParen = false;
      while (operators.length > 0) {
        const top = operators.pop()!;
        if (top.type === 'paren' && top.paren === '(') {
          foundOpenParen = true;
          break;
        }
        if (top.type !== 'op') {
          return null;
        }
        output.push(top);
      }
      if (!foundOpenParen) {
        return null;
      }
      expectsOperand = false;
      continue;
    }

    if (token.type !== 'op') {
      return null;
    }

    if (expectsOperand) {
      if (token.op === '+') {
        continue;
      }
      if (token.op === '-') {
        output.push({ type: 'const', value: 0 });
      } else {
        return null;
      }
    } else {
      while (operators.length > 0) {
        const top = operators[operators.length - 1]!;
        if (top.type !== 'op') break;
        if (precedence[top.op] < precedence[token.op]) break;
        output.push(operators.pop() as MetricExprToken & { type: 'op' });
      }
    }

    operators.push(token);
    expectsOperand = true;
  }

  if (expectsOperand) {
    return null;
  }

  while (operators.length > 0) {
    const top = operators.pop()!;
    if (top.type === 'paren') {
      return null;
    }
    if (top.type !== 'op') {
      return null;
    }
    output.push(top);
  }

  return output;
}
