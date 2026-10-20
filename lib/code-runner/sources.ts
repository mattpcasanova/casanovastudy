// Source code for the student-code sandbox (see lib/code-runner/client.ts).
//
// Layers, outermost first:
//   page  →  hidden <iframe sandbox="allow-scripts" srcdoc>  →  Web Worker per language
// The iframe has an opaque ("null") origin, so code in it can't read the app's
// cookies, storage or DOM, and its requests to our API carry no session
// (SameSite cookies, CORS). That matters because guides are shared by link: a
// guide's tests come from someone else. The worker lets us kill an endless
// loop (terminate) without freezing the page.
//
// Kept as plain JS strings (not TS functions) so minification can't rename
// anything the sandbox relies on. The JS harness is unit-tested by evaluating
// JS_HARNESS in Node (code-runner.test.ts); the Python one runs in Pyodide.

export const PYODIDE_VERSION = '0.26.4'
export const PYODIDE_INDEX = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

/** Splits a test at its top-level == / === so "got X, expected Y" can be shown. */
export const JS_HARNESS = String.raw`
function __csSplitEq(expr) {
  var depth = 0, quote = null;
  for (var i = 0; i < expr.length; i++) {
    var c = expr[i];
    if (quote) { if (c === '\\') { i++; continue } if (c === quote) quote = null; continue }
    if (c === '"' || c === "'" || c === '\x60') { quote = c; continue }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (depth === 0 && c === '=' && expr[i + 1] === '=' && expr[i - 1] !== '!' && expr[i - 1] !== '<' && expr[i - 1] !== '>' && expr[i - 1] !== '=') {
      var len = expr[i + 2] === '=' ? 3 : 2;
      var left = expr.slice(0, i).trim(), right = expr.slice(i + len).trim();
      if (!left || !right) return null;
      if (__csSplitEq(right)) return null; // a == b == c: leave it alone
      return [left, right];
    }
  }
  return null;
}
function __csShow(v, seen) {
  seen = seen || [];
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'function') return '[function ' + (v.name || 'anonymous') + ']';
  if (typeof v === 'bigint') return v + 'n';
  if (v === undefined) return 'undefined';
  if (v === null || typeof v !== 'object') return String(v);
  if (seen.indexOf(v) >= 0) return '[circular]';
  seen = seen.concat([v]);
  if (Array.isArray(v)) return '[' + v.map(function (x) { return __csShow(x, seen) }).join(', ') + ']';
  if (v instanceof Map) return 'Map(' + __csShow(Array.from(v.entries()), seen) + ')';
  if (v instanceof Set) return 'Set(' + __csShow(Array.from(v.values()), seen) + ')';
  var keys = Object.keys(v);
  return '{' + keys.map(function (k) { return k + ': ' + __csShow(v[k], seen) }).join(', ') + '}';
}
function __csPrint(v) { return typeof v === 'string' ? v : __csShow(v) }
function __csEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-9;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (a instanceof Map || a instanceof Set) return __csShow(a) === __csShow(b);
  var ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (var i = 0; i < ka.length; i++) if (!__csEqual(a[ka[i]], b[ka[i]])) return false;
  return true;
}
function __csLine(err) {
  var m = String((err && err.stack) || '').match(/<anonymous>:(\d+):\d+/);
  return m ? Number(m[1]) - 2 : null; // new Function adds two header lines
}
function __csError(err) {
  var name = (err && err.name) || 'Error';
  var msg = err && err.message !== undefined ? err.message : String(err);
  return { message: name + ': ' + msg, line: __csLine(err) };
}
function __csRun(code, tests) {
  var out = [];
  var push = function () { out.push(Array.prototype.map.call(arguments, __csPrint).join(' ')) };
  var fakeConsole = { log: push, info: push, warn: push, error: push, debug: push, table: push };
  var noPrompt = function () { throw new Error("prompt() isn't available here. Set the value in your code instead.") };
  var evalIn;
  try {
    evalIn = new Function('console', 'prompt', 'alert', code + '\n;return function (__csT) { return eval(__csT) }')(fakeConsole, noPrompt, push);
  } catch (err) {
    return { stdout: out.join('\n'), error: __csError(err), tests: [] };
  }
  var results = [];
  for (var i = 0; i < tests.length; i++) {
    var t = tests[i], r = { test: t, pass: false };
    try {
      var parts = __csSplitEq(t);
      if (parts) {
        var got = evalIn('(' + parts[0] + ')'), want = evalIn('(' + parts[1] + ')');
        r.pass = __csEqual(got, want);
        r.got = __csShow(got);
        r.expected = __csShow(want);
      } else {
        r.pass = !!evalIn('(' + t + ')');
      }
    } catch (err) {
      r.error = __csError(err);
      r.error.line = null;
    }
    results.push(r);
  }
  return { stdout: out.join('\n'), error: null, tests: results };
}
`

const JS_WORKER = `${JS_HARNESS}
self.onmessage = function (e) {
  var d = e.data;
  var result;
  try { result = __csRun(d.code, d.tests || []) }
  catch (err) { result = { stdout: '', error: __csError(err), tests: [] } }
  self.postMessage({ type: 'result', id: d.id, result: result });
};
self.postMessage({ type: 'ready' });
`

export const PY_HARNESS = String.raw`
import sys, io, ast, json

def __cs_err(e):
    line = None
    if isinstance(e, SyntaxError):
        line = e.lineno
    else:
        tb = e.__traceback__
        while tb is not None:
            if tb.tb_frame.f_code.co_filename == '<your code>':
                line = tb.tb_lineno
            tb = tb.tb_next
    text = str(e)
    return {'message': type(e).__name__ + (': ' + text if text else ''), 'line': line}

def __cs_no_input(*args, **kwargs):
    raise RuntimeError("input() isn't available here. Set the value in your code instead.")

def __cs_eval(node, ns):
    expr = ast.fix_missing_locations(ast.Expression(node))
    return eval(compile(expr, '<test>', 'eval'), ns)

def __cs_run(payload):
    data = json.loads(payload)
    out = io.StringIO()
    ns = {'__name__': '__main__', 'input': __cs_no_input}
    saved = (sys.stdout, sys.stderr)
    sys.stdout = sys.stderr = out
    error = None
    results = []
    try:
        try:
            exec(compile(data['code'], '<your code>', 'exec'), ns)
        except BaseException as e:
            error = __cs_err(e)
        if error is None:
            for t in data.get('tests') or []:
                r = {'test': t, 'pass': False}
                try:
                    tree = ast.parse(t.strip(), mode='eval').body
                    if isinstance(tree, ast.Compare) and len(tree.ops) == 1 and isinstance(tree.ops[0], ast.Eq):
                        got = __cs_eval(tree.left, ns)
                        want = __cs_eval(tree.comparators[0], ns)
                        r['pass'] = bool(got == want)
                        r['got'] = repr(got)
                        r['expected'] = repr(want)
                    else:
                        r['pass'] = bool(__cs_eval(tree, ns))
                except BaseException as e:
                    r['error'] = __cs_err(e)
                    r['error']['line'] = None
                results.append(r)
    finally:
        sys.stdout, sys.stderr = saved
    return json.dumps({'stdout': out.getvalue(), 'error': error, 'tests': results})
`

const PY_WORKER = `
var pyodide = null;
var queue = [];
function run(d) {
  var result;
  try {
    pyodide.globals.set('__cs_payload', JSON.stringify({ code: d.code, tests: d.tests || [] }));
    result = JSON.parse(pyodide.runPython('__cs_run(__cs_payload)'));
  } catch (err) {
    result = { stdout: '', error: { message: String((err && err.message) || err).split('\\n').slice(-2).join(' ').trim(), line: null }, tests: [] };
  }
  self.postMessage({ type: 'result', id: d.id, result: result });
}
self.onmessage = function (e) { if (pyodide) run(e.data); else queue.push(e.data) };
(async function () {
  try {
    importScripts(${JSON.stringify(PYODIDE_INDEX + 'pyodide.js')});
    pyodide = await loadPyodide({ indexURL: ${JSON.stringify(PYODIDE_INDEX)} });
    pyodide.runPython(${JSON.stringify(PY_HARNESS)});
    self.postMessage({ type: 'ready' });
    var q = queue; queue = []; q.forEach(run);
  } catch (err) {
    self.postMessage({ type: 'load-error', message: String((err && err.message) || err) });
  }
})();
`

/**
 * The sandbox page. Talks to the app with postMessage:
 *   in:  { kind: 'run', id, lang, code, tests, timeoutMs } | { kind: 'warm', lang }
 *   out: { kind: 'hello' } | { kind: 'status', id, status: 'loading' | 'running' } | { kind: 'result', id, result }
 * The timeout starts once the language is loaded, so Python's first download
 * doesn't count against the student's code.
 */
export function sandboxDocument(): string {
  const script = `
var SOURCES = { python: ${JSON.stringify(PY_WORKER)}, javascript: ${JSON.stringify(JS_WORKER)} };
var langs = {};
function send(msg) { parent.postMessage(msg, '*') }
function fail(id, message) { send({ kind: 'result', id: id, result: { stdout: '', error: { message: message, line: null }, tests: [], failed: true } }) }
function start(lang) {
  var url = URL.createObjectURL(new Blob([SOURCES[lang]], { type: 'text/javascript' }));
  var st = { worker: new Worker(url), ready: false, queue: [], running: null };
  langs[lang] = st;
  st.worker.onmessage = function (e) {
    var d = e.data;
    if (d.type === 'ready') { st.ready = true; next(lang) }
    else if (d.type === 'load-error') {
      var q = st.queue.concat(st.running ? [st.running] : []);
      kill(lang);
      q.forEach(function (job) { fail(job.id, "Couldn't load " + (lang === 'python' ? 'Python' : 'JavaScript') + '. Check your connection and try again.') });
    } else if (d.type === 'result' && st.running && st.running.id === d.id) {
      clearTimeout(st.timer);
      st.running = null;
      send({ kind: 'result', id: d.id, result: d.result });
      next(lang);
    }
  };
  st.worker.onerror = function (e) { e.preventDefault && e.preventDefault() };
  return st;
}
function kill(lang) {
  var st = langs[lang];
  if (!st) return;
  clearTimeout(st.timer);
  try { st.worker.terminate() } catch (e) {}
  delete langs[lang];
}
function next(lang) {
  var st = langs[lang];
  if (!st || !st.ready || st.running || !st.queue.length) return;
  var job = st.running = st.queue.shift();
  send({ kind: 'status', id: job.id, status: 'running' });
  st.worker.postMessage({ id: job.id, code: job.code, tests: job.tests });
  st.timer = setTimeout(function () {
    var rest = st.queue;
    kill(lang);
    fail(job.id, 'Your code ran for more than ' + Math.round(job.timeoutMs / 1000) + ' seconds and was stopped. Look for a loop that never ends.');
    if (rest.length) { var fresh = start(lang); fresh.queue = rest }
  }, job.timeoutMs);
}
window.addEventListener('message', function (e) {
  if (e.source !== parent) return;
  var d = e.data || {};
  if (!SOURCES[d.lang]) return;
  var st = langs[d.lang];
  try { if (!st) st = start(d.lang) } catch (err) { if (d.kind === 'run') fail(d.id, "This browser can't run code here."); return }
  if (d.kind !== 'run') return;
  st.queue.push({ id: d.id, code: String(d.code || ''), tests: Array.isArray(d.tests) ? d.tests.map(String) : [], timeoutMs: Math.min(Math.max(Number(d.timeoutMs) || 5000, 1000), 20000) });
  if (!st.ready) send({ kind: 'status', id: d.id, status: 'loading' });
  next(d.lang);
});
send({ kind: 'hello' });
`
  return `<!doctype html><html><head><meta charset="utf-8"></head><body><script>${script.replace(/<\//g, '<\\/')}</script></body></html>`
}
