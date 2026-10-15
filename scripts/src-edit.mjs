// Source edits behind Debug mode's Delete button (served by scripts/serve.mjs).
//   removeElement(text, line, col)          removes the statement whose build call starts at line:col
//   removeOpening(text, line, col, index)   removes entry `index` of the ops:[...] list in the W({...}) call at line:col
// Both return { text, removed, line } or throw an Error whose message explains why the edit isn't safe. Every result is
// syntax-checked; a declaration such as `const p=T(...)` takes its whole block (and an emptied loop) with it so nothing is left dangling.
import vm from 'node:vm';

const OPEN = '([{', CLOSE = ')]}';
// matching bracket for every bracket outside strings, template text, comments and regex literals (m.comment marks comment characters)
function brackets(t) {
  const m = new Int32Array(t.length).fill(-1), st = []; m.comment = new Uint8Array(t.length);
  const prevSig = i => { for (let j = i - 1; j >= 0; j--) if (!/\s/.test(t[j])) return t[j]; return ''; };
  let i = 0;
  const template = () => { // i is just past a backtick, or just past the } that closes a ${...}
    while (i < t.length) {
      if (t[i] === '\\') { i += 2; continue; }
      if (t[i] === '`') { i++; return; }
      if (t[i] === '$' && t[i + 1] === '{') { st.push(-(i + 1) - 1); i += 2; return; } // negative marks a template hole
      i++;
    }
  };
  while (i < t.length) {
    const c = t[i], n = t[i + 1];
    if (c === '/' && n === '/') { let e = t.indexOf('\n', i); if (e < 0) e = t.length; m.comment.fill(1, i, e); i = e; continue; }
    if (c === '/' && n === '*') { let e = t.indexOf('*/', i + 2); e = e < 0 ? t.length : e + 2; m.comment.fill(1, i, e); i = e; continue; }
    if (c === '"' || c === "'") { i++; while (i < t.length && t[i] !== c && t[i] !== '\n') { if (t[i] === '\\') i++; i++; } i++; continue; }
    if (c === '`') { i++; template(); continue; }
    if (c === '/') {
      const p = prevSig(i);
      if (!p || '(,=:[!&|?{};+-*%<>~^'.includes(p)) {
        i++; let cls = false;
        while (i < t.length && t[i] !== '\n') { const d = t[i]; if (d === '\\') { i += 2; continue; } if (d === '[') cls = true; else if (d === ']') cls = false; else if (d === '/' && !cls) break; i++; }
        i++; continue;
      }
    }
    if (OPEN.includes(c)) st.push(i);
    else if (CLOSE.includes(c)) {
      const o = st.pop();
      if (o !== undefined && o < 0 && c === '}') { i++; template(); continue; } // end of a ${...} hole
      if (o !== undefined && o >= 0) { m[o] = i; m[i] = o; }
    }
    i++;
  }
  return m;
}
const offsetOf = (t, line, col) => { let o = 0; for (let l = 1; l < line; l++) { o = t.indexOf('\n', o) + 1; if (!o) throw new Error('line ' + line + ' is past the end of the file'); } return o + col - 1; };
const lineOf = (t, o) => t.slice(0, o).split('\n').length;
const ws = c => c === ' ' || c === '\t' || c === '\r' || c === '\n';
// the statement around offset p: climbs out of argument lists, stops at ; { } on the way back and ; or the enclosing } on the way forward
function statement(t, m, p) {
  let s = p - 1, open = -1;
  while (s >= 0) {
    const c = t[s];
    if (c === ';' || (c === '}' && m[s] >= 0) || m.comment[s]) break;
    if (CLOSE.includes(c) && m[s] >= 0) { s = m[s] - 1; continue; }
    if (c === '{') { open = s; break; }
    s--; // includes climbing out of an enclosing ( or [
  }
  let start = s + 1; while (start < t.length && ws(t[start])) start++;
  let e = p;
  while (e < t.length) {
    const c = t[e];
    if (OPEN.includes(c) && m[e] >= 0) { e = m[e] + 1; continue; }
    if (c === ';') { e++; break; }
    if (c === '}') break; // end of the enclosing block
    e++; // includes climbing out of an enclosing ) or ]
  }
  return { start, end: e, open };
}
// a { at `o`: is it a loop/if body, a plain block, or something we must not touch (function body, object)?
function blockKind(t, m, o) {
  let j = o - 1; while (j >= 0 && ws(t[j])) j--;
  if (j < 0 || ';{}'.includes(t[j])) return { kind: 'block', start: o };
  if (t[j] === ')' && m[j] >= 0) {
    let k = m[j] - 1; while (k >= 0 && ws(t[k])) k--;
    const kw = t.slice(0, k + 1).match(/(?:^|[^\w$.])(for|while|if)$/);
    if (kw) return { kind: kw[1], start: k + 1 - kw[1].length };
  }
  return { kind: 'other' };
}
function cut(t, start, end) {
  // take the whole line if nothing else is left on it
  let a = start; while (a > 0 && (t[a - 1] === ' ' || t[a - 1] === '\t')) a--;
  let b = end; while (b < t.length && (t[b] === ' ' || t[b] === '\t' || t[b] === '\r')) b++;
  if ((a === 0 || t[a - 1] === '\n') && (b >= t.length || t[b] === '\n')) return t.slice(0, a) + t.slice(b + 1);
  // otherwise drop one separating space: after it, or before it at the end of a line
  const ls = t.lastIndexOf('\n', start - 1) + 1, atIndent = !t.slice(ls, start).trim();
  if (t[end] === ' ' && (atIndent || t[start - 1] === ' ')) end++;
  else if ((t[end] === '\n' || t[end] === '\r') && t[start - 1] === ' ') start--;
  return t.slice(0, start) + t.slice(end);
}
function check(text, file) { try { new vm.Script(text, { filename: file || 'edited.js' }); } catch (e) { throw new Error('the edit would leave a syntax error (' + e.message + '), so nothing was changed'); } }

export function removeElement(text, line, col, file) {
  const m = brackets(text), p = offsetOf(text, line, col);
  let { start, end, open } = statement(text, m, p);
  const stmt = text.slice(start, end), decl = stmt.match(/^(?:const|let|var)\s+([\w$]+)\s*=/);
  if (decl) { // a declared piece is used by what follows it in the block: take the block
    if (open < 0) throw new Error(`"${decl[1]}" is declared outside a block, so removing it could break code that uses it`);
    const rest = text.slice(end, m[open]);
    if (new RegExp('(^|[^\\w$.])' + decl[1].replace(/\$/g, '\\$') + '(?![\\w$])').test(rest)) {
      const bk = blockKind(text, m, open);
      if (bk.kind === 'other') throw new Error('it is built inside a function or object body, so it has to be removed by hand');
      if (bk.kind === 'if') throw new Error('it is built inside an if statement, so it has to be removed by hand');
      start = bk.start; end = m[open] + 1;
    }
  }
  // an enclosing loop left with nothing in it goes too
  for (;;) {
    let o = start - 1; while (o >= 0 && ws(text[o])) o--;
    if (text[o] !== '{' || m[o] < 0) break;
    let c = end; while (c < text.length && ws(text[c])) c++;
    if (c !== m[o]) break;
    const bk = blockKind(text, m, o);
    if (bk.kind !== 'for' && bk.kind !== 'while' && bk.kind !== 'block') break;
    start = bk.start; end = m[o] + 1;
  }
  const removed = text.slice(start, end), out = cut(text, start, end);
  check(out, file);
  return { text: out, removed, line: lineOf(text, start) };
}

export function removeOpening(text, line, col, index, file) {
  const m = brackets(text), p = offsetOf(text, line, col), par = text.indexOf('(', p);
  if (par < 0 || m[par] < 0) throw new Error('could not find the wall call at line ' + line);
  const body = text.slice(par, m[par]), re = /\bops\s*:\s*\[/g; let hit, arr = -1;
  while ((hit = re.exec(body))) { arr = par + hit.index + hit[0].length - 1; break; }
  if (arr < 0 || m[arr] < 0) throw new Error('this wall gets its openings from elsewhere, so the opening has to be removed by hand');
  const items = []; let i = arr + 1, s = i;
  while (i < m[arr]) { const c = text[i]; if (OPEN.includes(c) && m[i] >= 0) { i = m[i] + 1; continue; } if (c === ',') { items.push([s, i]); s = i + 1; } i++; }
  if (text.slice(s, m[arr]).trim()) items.push([s, m[arr]]);
  if (index < 0 || index >= items.length) throw new Error(`the wall lists ${items.length} openings in its code, not ${index + 1}`);
  let [a, b] = items[index];
  if (index < items.length - 1) b = items[index + 1][0]; else if (index > 0) a = items[index - 1][1];
  const removed = text.slice(items[index][0], items[index][1]).trim(), out = text.slice(0, a) + text.slice(b);
  check(out, file);
  return { text: out, removed, line: lineOf(text, items[index][0]) };
}
