import React from 'react';

interface MathBadgeProps {
  expression: string;
  size?: 'sm' | 'md';
}

const GREEK: Record<string, string> = {
  phi: 'φ', pi: 'π', sigma: 'Σ', delta: 'Δ', omega: 'Ω',
  alpha: 'α', beta: 'β', gamma: 'γ', lambda: 'λ', theta: 'θ',
};

function renderMathExpression(expr: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let i = 0;

  while (i < expr.length) {
    // Superscript: ^{...} or ^n
    if (expr[i] === '^') {
      i++;
      if (expr[i] === '{') {
        const end = expr.indexOf('}', i);
        const content = expr.slice(i + 1, end);
        parts.push(<sup key={i} className="text-[0.65em]">{content}</sup>);
        i = end + 1;
      } else {
        parts.push(<sup key={i} className="text-[0.65em]">{expr[i]}</sup>);
        i++;
      }
    }
    // Subscript: _{...} or _n
    else if (expr[i] === '_') {
      i++;
      if (expr[i] === '{') {
        const end = expr.indexOf('}', i);
        const content = expr.slice(i + 1, end);
        parts.push(<sub key={i} className="text-[0.65em]">{content}</sub>);
        i = end + 1;
      } else {
        parts.push(<sub key={i} className="text-[0.65em]">{expr[i]}</sub>);
        i++;
      }
    }
    // Greek letters: \phi, \pi, etc.
    else if (expr[i] === '\\') {
      const rest = expr.slice(i + 1);
      const match = Object.keys(GREEK).find((g) => rest.startsWith(g));
      if (match) {
        parts.push(<span key={i} className="italic">{GREEK[match]}</span>);
        i += match.length + 1;
      } else {
        parts.push(expr[i]);
        i++;
      }
    } else {
      parts.push(expr[i]);
      i++;
    }
  }

  return parts;
}

export default function MathBadge({ expression, size = 'sm' }: MathBadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';

  return (
    <span
      className={`inline-flex items-center font-mono bg-black/5 border border-black/10 rounded-sm ${sizeClasses}`}
    >
      {renderMathExpression(expression)}
    </span>
  );
}
