// Generated regions of README.md (SPEC §1.2). A region is
//   <!-- tv:begin ID -->\n{markup}\n<!-- tv:end ID -->
// Everything outside the markers (header comment, <a id="top">, the bio paragraph) is hand-written and preserved.

/** Region ids in README order. */
export const REGION_IDS = Object.freeze(['hero', 'remote', 'on-air', 'archive', 'certificates', 'playlists', 'signal-log', 'sign-off']);

const MARKER = /<!-- tv:(begin|end) ([^ ]+) -->/g;

/** True when the README contains any tv marker (false means "regions not integrated yet"). */
export const hasRegions = (md) => /<!-- tv:(?:begin|end) /.test(md);

/**
 * Locate every region. Returns [{ id, from, to }] where md.slice(from, to) is the markup between the markers.
 * Throws on an unknown id, a duplicate, nesting, an end without a begin, an unclosed region, or a marker
 * that is not on its own line.
 */
function scan(md) {
  const found = [];
  let open = null;
  for (const m of md.matchAll(MARKER)) {
    const [marker, kind, id] = m;
    if (!REGION_IDS.includes(id)) throw new Error(`README: unknown region id "${id}"`);
    const lineStart = m.index === 0 || md[m.index - 1] === '\n';
    const lineEnd = md[m.index + marker.length] === '\n' || m.index + marker.length === md.length;
    if (!lineStart || !lineEnd) throw new Error(`README: marker "${marker}" must be on its own line`);
    if (kind === 'begin') {
      if (open) throw new Error(`README: region "${id}" begins inside region "${open.id}"`);
      if (found.some((r) => r.id === id)) throw new Error(`README: region "${id}" appears twice`);
      open = { id, from: m.index + marker.length + 1 };
    } else {
      if (!open || open.id !== id) throw new Error(`README: "${marker}" has no matching begin marker`);
      found.push({ id, from: open.from, to: Math.max(open.from, m.index - 1) });
      open = null;
    }
  }
  if (open) throw new Error(`README: region "${open.id}" is never closed`);
  return found;
}

/** Normalize line endings so a Windows checkout (core.autocrlf) compares equal to the LF build output. */
export const toLF = (s) => s.replace(/\r\n/g, '\n');

/**
 * Read the generated markup of every region.
 * @example extractRegions(fs.readFileSync('README.md', 'utf8'))['sign-off']
 */
export function extractRegions(md) {
  const text = toLF(md);
  return Object.fromEntries(scan(text).map((r) => [r.id, text.slice(r.from, r.to)]));
}

/**
 * Replace the markup of the given regions and return the new README (LF line endings).
 * Throws if a requested region has no markers in `md`. Regions not named in `regions` are left untouched.
 * @example replaceRegions(md, { hero: '<a href="…"><img …></a>' })
 */
export function replaceRegions(md, regions) {
  const text = toLF(md);
  const spans = scan(text);
  for (const id of Object.keys(regions)) {
    if (!spans.some((r) => r.id === id)) throw new Error(`README: no markers for region "${id}"`);
  }
  let out = '';
  let cursor = 0;
  for (const r of spans) {
    if (!(r.id in regions)) continue;
    const markup = String(regions[r.id]).replace(/^\n+|\n+$/g, '');
    out += text.slice(cursor, r.from) + markup;
    cursor = r.to;
  }
  return out + text.slice(cursor);
}
