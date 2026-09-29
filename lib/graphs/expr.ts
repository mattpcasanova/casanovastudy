// Safe math-expression parser for graph figures (never uses eval).
//
// Understands what the generator writes for functions of x:
//   2x + 1, x^2 - 3x, 3(x + 1)^2, sqrt(x), |x - 2|, 2^x, 1/(x-1), sin(x), pi
// with implicit multiplication ("2x", "3(x+1)", "x(x-2)"). `log` is base 10,
// `ln` is natural log. Unknown identifiers are errors, not silently zero.
// toLatex() produces Desmos-compatible LaTeX for "Open in Desmos".

export type Expr =
  | { t: 'num'; v: number }
  | { t: 'x' }
  | { t: 'const'; name: 'pi' | 'e' }
  | { t: 'neg'; a: Expr }
  | { t: 'bin'; op: '+' | '-' | '*' | '/' | '^'; a: Expr; b: Expr }
  | { t: 'call'; fn: Fn; a: Expr }

const FNS = ['sqrt', 'abs', 'asin', 'acos', 'atan', 'sin', 'cos', 'tan', 'ln', 'log', 'exp', 'floor', 'ceil'] as const
type Fn = (typeof FNS)[number]

type Tok =
  | { k: 'num'; v: number }
  | { k: 'x' }
  | { k: 'const'; name: 'pi' | 'e' }
  | { k: 'fn'; name: Fn }
  | { k: 'op'; v: '+' | '-' | '*' | '/' | '^' }
  | { k: '(' }
  | { k: ')' }
  | { k: '|' }

export class ExprError extends Error {}

function tokenize(src: string): Tok[] {
  const s = src
    .replace(/[−–]/g, '-')
    .replace(/[·×⋅]/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'pi')
    .replace(/√/g, 'sqrt')
    .replace(/\*\*/g, '^')
    .replace(/[²]/g, '^2')
    .replace(/[³]/g, '^3')
  const out: Tok[] = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (/\s/.test(c)) { i++; continue }
    if (/[0-9.]/.test(c)) {
      const m = s.slice(i).match(/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i)
      if (!m) throw new ExprError(`Bad number at "${s.slice(i)}"`)
      out.push({ k: 'num', v: parseFloat(m[0]) })
      i += m[0].length
      continue
    }
    if (/[a-z]/i.test(c)) {
      const word = s.slice(i).match(/^[a-z]+/i)![0].toLowerCase()
      i += word.length
      // Split a run of letters into known names: "xsqrt" → x, sqrt; "pix" → pi, x.
      let w = word
      while (w) {
        const fn = FNS.find((f) => w.startsWith(f))
        if (fn) { out.push({ k: 'fn', name: fn }); w = w.slice(fn.length); continue }
        if (w.startsWith('pi')) { out.push({ k: 'const', name: 'pi' }); w = w.slice(2); continue }
        if (w[0] === 'x') { out.push({ k: 'x' }); w = w.slice(1); continue }
        if (w[0] === 'e') { out.push({ k: 'const', name: 'e' }); w = w.slice(1); continue }
        throw new ExprError(`Unknown name "${word}"`)
      }
      continue
    }
    if ('+-*/^'.includes(c)) { out.push({ k: 'op', v: c as '+' }); i++; continue }
    if (c === '(' || c === '[') { out.push({ k: '(' }); i++; continue }
    if (c === ')' || c === ']') { out.push({ k: ')' }); i++; continue }
    if (c === '|') { out.push({ k: '|' }); i++; continue }
    throw new ExprError(`Unexpected "${c}"`)
  }
  return out
}

class Parser {
  i = 0
  // Inside |…| a bar closes the group, so it can't start an implicit product.
  absDepth = 0
  constructor(private toks: Tok[]) {}

  peek(): Tok | undefined { return this.toks[this.i] }
  next(): Tok | undefined { return this.toks[this.i++] }

  parse(): Expr {
    if (this.toks.length === 0) throw new ExprError('Empty expression')
    const e = this.expr()
    if (this.i < this.toks.length) throw new ExprError('Unexpected input after expression')
    return e
  }

  expr(): Expr {
    let a = this.term()
    for (let t = this.peek(); t?.k === 'op' && (t.v === '+' || t.v === '-'); t = this.peek()) {
      this.next()
      a = { t: 'bin', op: t.v, a, b: this.term() }
    }
    return a
  }

  term(): Expr {
    let a = this.unary()
    for (;;) {
      const t = this.peek()
      if (t?.k === 'op' && (t.v === '*' || t.v === '/')) {
        this.next()
        a = { t: 'bin', op: t.v, a, b: this.unary() }
      } else if (t && (t.k === 'num' || t.k === 'x' || t.k === 'const' || t.k === 'fn' || t.k === '(' || (t.k === '|' && this.absDepth === 0))) {
        a = { t: 'bin', op: '*', a, b: this.power() }
      } else {
        return a
      }
    }
  }

  unary(): Expr {
    const t = this.peek()
    if (t?.k === 'op' && t.v === '-') { this.next(); return { t: 'neg', a: this.unary() } }
    if (t?.k === 'op' && t.v === '+') { this.next(); return this.unary() }
    return this.power()
  }

  power(): Expr {
    const base = this.primary()
    const t = this.peek()
    if (t?.k === 'op' && t.v === '^') {
      this.next()
      return { t: 'bin', op: '^', a: base, b: this.unary() }
    }
    return base
  }

  primary(): Expr {
    const t = this.next()
    if (!t) throw new ExprError('Expression ends too early')
    switch (t.k) {
      case 'num': return { t: 'num', v: t.v }
      case 'x': return { t: 'x' }
      case 'const': return { t: 'const', name: t.name }
      case 'fn': {
        // sin(x) or sin x^2 → sin(x^2)
        if (this.peek()?.k === '(') return { t: 'call', fn: t.name, a: this.primary() }
        return { t: 'call', fn: t.name, a: this.power() }
      }
      case '(': {
        const e = this.expr()
        if (this.next()?.k !== ')') throw new ExprError('Missing )')
        return e
      }
      case '|': {
        this.absDepth++
        const e = this.expr()
        this.absDepth--
        if (this.next()?.k !== '|') throw new ExprError('Missing closing |')
        return { t: 'call', fn: 'abs', a: e }
      }
      default:
        throw new ExprError('Unexpected symbol')
    }
  }
}

/** Parses an expression in x. Accepts and strips a leading "y =" or "f(x) =". */
export function parseExpr(src: string): Expr {
  const body = src.trim().replace(/^(?:y|[a-z]\s*\(\s*x\s*\))\s*=\s*/i, '')
  return new Parser(tokenize(body)).parse()
}

const FN_IMPL: Record<Fn, (v: number) => number> = {
  sqrt: Math.sqrt, abs: Math.abs, sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  ln: Math.log, log: Math.log10, exp: Math.exp, floor: Math.floor, ceil: Math.ceil,
}

export function evaluate(e: Expr, x: number): number {
  switch (e.t) {
    case 'num': return e.v
    case 'x': return x
    case 'const': return e.name === 'pi' ? Math.PI : Math.E
    case 'neg': return -evaluate(e.a, x)
    case 'call': return FN_IMPL[e.fn](evaluate(e.a, x))
    case 'bin': {
      const a = evaluate(e.a, x)
      const b = evaluate(e.b, x)
      switch (e.op) {
        case '+': return a + b
        case '-': return a - b
        case '*': return a * b
        case '/': return a / b
        case '^': return Math.pow(a, b)
      }
    }
  }
}

/** Compiles to a plain function; NaN/±Infinity mean "undefined here". */
export function compileExpr(src: string): (x: number) => number {
  const e = parseExpr(src)
  return (x: number) => evaluate(e, x)
}

// ── LaTeX (Desmos) ──────────────────────────────────────────────────────────

const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, neg: 3, '^': 4 } as const

function prec(e: Expr): number {
  if (e.t === 'bin') return PREC[e.op]
  if (e.t === 'neg') return PREC.neg
  return 5
}

function fmtNum(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(10)))
}

function wrap(s: string, cond: boolean): string {
  return cond ? `\\left(${s}\\right)` : s
}

export function toLatex(e: Expr): string {
  switch (e.t) {
    case 'num': return fmtNum(e.v)
    case 'x': return 'x'
    case 'const': return e.name === 'pi' ? '\\pi' : 'e'
    case 'neg': return `-${wrap(toLatex(e.a), prec(e.a) < PREC.neg)}`
    case 'call': {
      const inner = toLatex(e.a)
      if (e.fn === 'sqrt') return `\\sqrt{${inner}}`
      if (e.fn === 'abs') return `\\left|${inner}\\right|`
      if (e.fn === 'exp') return `e^{${inner}}`
      if (e.fn === 'floor') return `\\operatorname{floor}\\left(${inner}\\right)`
      if (e.fn === 'ceil') return `\\operatorname{ceil}\\left(${inner}\\right)`
      const name = e.fn === 'asin' ? 'arcsin' : e.fn === 'acos' ? 'arccos' : e.fn === 'atan' ? 'arctan' : e.fn
      return `\\${name}\\left(${inner}\\right)`
    }
    case 'bin': {
      if (e.op === '/') return `\\frac{${toLatex(e.a)}}{${toLatex(e.b)}}`
      if (e.op === '^') return `${wrap(toLatex(e.a), prec(e.a) <= PREC['^'])}^{${toLatex(e.b)}}`
      const p = PREC[e.op]
      const left = wrap(toLatex(e.a), prec(e.a) < p)
      // Right side of - needs parens for equal precedence: a-(b+c).
      const right = wrap(toLatex(e.b), e.b.t === 'neg' || (e.op === '-' ? prec(e.b) <= p : prec(e.b) < p))
      if (e.op === '*') return `${left}\\cdot ${right}`
      return `${left}${e.op}${right}`
    }
  }
}
