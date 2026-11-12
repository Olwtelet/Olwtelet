// c2. Security: the hostile interface. The frame goes red, the colour of a system that does not trust you. The camera is on
// the street at the tower's foot, close, looking up: the tower is one dark silhouette, the frame's darkest red, against a
// red city that is a step lighter even at the top, its edges cut out by pink rim bands with pale cores where they face the
// light: a warning beacon blown out on a far tower's shoulder, ringed in the open sky up and to the right, and the slit,
// which burns white-hot where the attack has torn it open (static there and nothing else, sparks thrown out of it).
// The city is one red: far megastructures a step lighter than the sky on the same converging verticals, salted with small
// lights; red shafts fall through the air.
// The owner's review lies over the shot the way the show's hostile interface does: thin red line, translucent sheets that
// float over the target and over each other. One great lock-on holds the slit, and DENIED is stamped on the attack, across
// the lock's left edge at the height of the tear, larger than any sheet. The four checks are sheets on the right, the
// review's side, away from the stamp: one large sheet with its rules, then three compact ones layered in pairs round the
// lock's right corner, each a thin red frame round a translucent red sheet, its head a dark band with the row's warning
// triangle knocked out of a red tab and the word in pale pink, and under the head a full bar (the check ran to the end).
// The large one carries WARNING on a plate over its head. The title is a plate cut by the frame's top left corner; the role
// sits on one more sheet receding at the lower left, in cyan under the one cyan bar that says the review is complete. The
// one place the page names the company the work is done for: in the text, never as the title or a link.
// Painted after the next section so that nothing of a later field reaches into this frame; nothing here passes 5326.
import { C, rng, line, tint, lerp, lerpP, homography } from '../kit/draw.mjs';
import { capOf } from '../kit/type.mjs';
import { nightMap, towerSolid, CEL, rimLights, rimBand, drawRims, shaft, staticBlocks, glow, lamp, inside, inward } from '../kit/light.mjs';
import { platePoly } from '../kit/ui.mjs';

// the kit's warning triangle (kit/ui.mjs) as geometry, so that a run of them is one path: the outline, its bar and dot
const tri = (cx, cy, s) => { const h = s * 0.87; return [[cx, cy - h * 0.62], [cx + s / 2, cy + h * 0.38], [cx - s / 2, cy + h * 0.38]]; };
const bang = (cx, cy, s) => {
  const h = s * 0.87;
  return [[[cx - s * 0.05, cy - h * 0.24], [cx + s * 0.05, cy - h * 0.24], [cx + s * 0.035, cy + h * 0.1], [cx - s * 0.035, cy + h * 0.1]],
    [[cx - s * 0.05, cy + h * 0.17], [cx + s * 0.05, cy + h * 0.17], [cx + s * 0.05, cy + h * 0.27], [cx - s * 0.05, cy + h * 0.27]]];
};
// a lock-on: a square turned 45 degrees (and tw more) about c, r from centre to corner; corners right, down, left, up
const diamond = ([cx, cy], r, tw = 0) => [0, 1, 2, 3].map((k) => { const a = ((tw + k * 90) * Math.PI) / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
// a rectangle with its upper right corner cut off by k; and one with its lower right corner cut off
const chamfer = (x0, y0, x1, y1, k) => [[x0, y0], [x1 - k, y0], [x1, y0 + k], [x1, y1], [x0, y1]];
const notch = (x0, y0, x1, y1, k) => [[x0, y0], [x1, y0], [x1, y1 - k], [x1 - k, y1], [x0, y1]];
// turn a point about o by deg degrees
const turn = (o, deg) => { const t = (deg * Math.PI) / 180, co = Math.cos(t), si = Math.sin(t); return ([u, v]) => [o[0] + u * co - v * si, o[1] + u * si + v * co]; };

function frame(page, ctx) {
  const { Y, COPY, SIGNS, faces } = ctx;
  const y0 = Y.security, y1 = Y.productions, keep = { from: y0, before: y1 };
  const P = (x, y) => [x, y0 + y], yb = y1 + 14; // a point given from the frame's top; the field's foot
  const map = nightMap({ s: 0.76, tx: 380, ty: y0 - 84 });
  // a vertical of the set through the point x at the frame's foot: where it stands at height y (verticals meet at map.up)
  const vert = (xb, y) => map.up[0] + (xb - map.up[0]) * (y - map.up[1]) / (y1 + 14 - map.up[1]);
  const { fronts, walls, slit } = towerSolid(map);

  // a plane of the interface: local (u, v) to the page through a homography; text is set into it through the plane's own
  // local frame at the middle of the line, so a line stays on its sheet however far the plane recedes. `floor` holds a line's
  // size on the page at or above the phone's floor where the plane recedes
  const plane = (src, dst) => {
    const H = homography(src, dst.map(([x, y]) => P(x, y)));
    const at = (poly) => poly.map(H);
    const jac = (u, v) => { const a = H([u + 1, v]), b = H([u - 1, v]), c = H([u, v + 1]), d = H([u, v - 1]); return [(a[0] - b[0]) / 2, (a[1] - b[1]) / 2, (c[0] - d[0]) / 2, (c[1] - d[1]) / 2]; };
    const set = (F, str, u, v, size, { floor = 0, ...o } = {}) => {
      let w = page.measure(F, str, size), J = jac(u + w / 2, v);
      for (let i = 0; i < 3; i++) {
        const k = Math.sqrt(Math.abs(J[0] * J[3] - J[1] * J[2]));
        if (size * k >= floor) break;
        size = (floor + 0.2) / k; w = page.measure(F, str, size); J = jac(u + w / 2, v);
      }
      const m = H([u + w / 2, v]), e = m[0] - J[0] * w / 2, f = m[1] - J[1] * w / 2;
      page.text(F, str, e, f, { size, matrix: [...J, e, f], ...keep, ...o });
    };
    return { at, set };
  };

  // ==== the interface, planned first (painted last) so the city knows where it will be covered ====
  // the great lock holds the slit from end to end, a little off the square; the small lock on the tear inside it makes it the
  // slit's double lock
  const sm = lerpP(slit[0], slit[2], 0.5), great = diamond(sm, 160, -6), gL = great[2], tearLock = map([512, 560]);
  // The checks: one sheet per row of COPY.review, each in its own frame (x right, y down from its top left, turned deg about
  // it). A sheet is a thin red frame round a translucent red fill with its lower right corner cut; its head is an opaque dark
  // band (so no rim, shaft or line of the shot runs behind a letter) holding a solid red tab with the row's warning triangle
  // knocked out and the word in pale pink; under the head, the row's thin underline in the sheet's red, and no
  // rules, columns or bars that carry no fact: the one full bar is the role's, below. The first sheet is the large one, a
  // taller foot under the same single row. They lie on the right of the shot, the review's side, in two layered pairs round
  // the great lock's right corner: the vulnerabilities sheet with the code sheet tucked under its foot, then dependencies
  // over configurations. Every word ends at least 24u inside the frame; the sheets themselves run off its right edge. `d`
  // and `m` copies, each placed for its column: per row, the top left, the turn, the type size, the sheet's width, and the
  // extra foot (in rows) of a sheet that is taller or has another tucked under it, so the lower sheet's head lies on the
  // foot and never on the underline (the phone's last sheet gets one too, so its foot runs off the frame's foot instead of
  // grazing it)
  const SHEETS = {
    d: [[[872, 175], -3, 34, 360, 2], [[950, 333], -3, 28, 270, 1.5], [[1000, 251], -3, 28, 220], [[912, 391], -3, 28, 300]],
    m: [[[812, 128], -3, 41, 420, 0.8], [[845, 455], -3, 41, 380, 0.8], [[1000, 205], -3, 41, 230], [[800, 544], -3, 41, 420, 1.5]],
  };
  const UI = {};
  for (const [k, list] of Object.entries(SHEETS)) {
    const G = UI[k] = { fills: [[], []], frames: [], heads: [], tabs: [], tris: [], bangs: [], unders: [], words: [] };
    const lw = k === 'm' ? 6 : 1.5, ul = k === 'm' ? 6 : 2.5;
    COPY.review.forEach((word, i) => {
      const [at, deg, s, wide, foot = 0] = list[i], str = word.toUpperCase();
      const cap = capOf(faces.ui, s), pad = 0.34 * s, hh = cap + 2 * pad, tab = hh * 1.1, tw = page.measure(faces.ui, str, s);
      const w = Math.max(wide, tab + pad + tw + 2 * pad), gap = k === 'm' ? 22 : 0.46 * s;
      const h = hh + gap * (1.7 + foot), T = turn(P(...at), deg), q = (poly) => poly.map(T);
      const body = q(notch(0, 0, w, h, 0.5 * gap + 6));
      G.fills[i % 2].push(body);
      G.frames.push(body);
      G.heads.push(q(platePoly(lw / 2, lw / 2, w - lw, hh - lw / 2)));
      G.tabs.push(q(platePoly(lw / 2, lw / 2, tab - lw / 2, hh - lw / 2)));
      G.tris.push(q(tri(tab / 2, hh / 2 + 0.04 * hh, hh * 0.72)));
      G.bangs.push(...bang(tab / 2, hh / 2 + 0.04 * hh, hh * 0.72).map(q));
      const y = hh + 0.85 * gap, x1 = w - pad - 0.5 * gap;
      G.unders.push(q(platePoly(pad, y - ul / 2, x1 - pad, ul)));
      G.words.push([str, T([tab + pad, pad + cap]), s, deg]);
    });
  }
  // WARNING (and its kanji on desktop) knocked out of a red plate sitting on the first sheet's head
  const FLAG = Object.entries({ d: [40, 46], m: [46, 0] }).map(([k, [ws, js]]) => {
    const [at, deg] = SHEETS[k][0], wd = page.measure(faces.ui, COPY.warning.toUpperCase(), ws), wc = capOf(faces.ui, ws);
    const jw = js ? page.measure(faces.jp, SIGNS.warning, js) + 12 : 0, pw = 12 + wd + jw + 12, ph = wc + 22, T = turn(P(...at), deg);
    return { k, ws, js, wd, wc, T, deg, plate: chamfer(0, -ph + 2, pw, 2, 12).map(T), base: [12, -11] };
  });
  // what the work does to the attack: denied, stamped on the attack itself. The plate turns with the great lock and crosses
  // its left edge at the height of the tear, so its last third lies inside the lock and its end stops just short of the
  // tear's own lock; no review sheet stands on this side of the lock
  const ds = 62, dc = capOf(faces.ui, ds), dw = page.measure(faces.ui, COPY.denied.toUpperCase(), ds);
  const dTab = dc + 30, dLen = dTab + 16 + dw + 20, dEnd = [gL[0] + 108, tearLock[1] + 8], dA = (6 * Math.PI) / 180;
  const DN = turn([dEnd[0] - dLen * Math.cos(dA), dEnd[1] + dLen * Math.sin(dA)], -6);
  const denied = platePoly(0, -dc - 15, dLen, dc + 30).map(DN);
  // the title on a warning plate, tilted with the camera and cut by the frame's top left corner: SECURITY knocked out of
  // red, the plate running on past the top and the left edge
  const DEG = -5, ts = 62, tw = page.measure(faces.wide, COPY.securityTitle.toUpperCase(), ts), tc = capOf(faces.wide, ts);
  const T0 = P(92, tc + 14 + tw * Math.sin((-DEG * Math.PI) / 180)), TU = turn(T0, DEG);
  const title = [[-140, -tc - 60], [tw + 34, -tc - 60], [tw + 34, -6], [tw + 18, 16], [-140, 16]].map(TU);
  // the role's sheet: it recedes with the camera and runs off the frame's lower left; the review's one cyan bar across its
  // head, then the role in cyan on opaque dark bands (the region the far lights keep out of)
  const role = plane([[0, 0], [456, 0], [456, 226], [0, 226]], [[98, 464], [530, 456], [542, 648], [90, 702]]);
  const roleSheet = role.at(notch(0, 0, 456, 226, 22)), roleBand = role.at(platePoly(8, 30, 440, 160));

  // ==== the city, one deep red: the dark sky; far megastructures a step lighter on the camera's verticals, with set-back
  // tops and small lights; nearer blocks back down to the sky's dark ====
  page.polys([platePoly(-14, y0, 1228, 654)], `fill="${C.rDeep}"`, keep);
  // the glow of the street under the low camera: the sky steps lighter in hard bands toward the foot of the frame, each band
  // laid over the last (so no ground shows at an edge), tilted with the camera's roll. Even the top band is one step off the
  // dark, so the tower, in the frame's darkest red, stands out of the sky as a silhouette from its top to its foot
  for (const yt of [-400, 170, 300, 420, 530]) page.polys([[[-14, y0 + yt - 190], [1214, y0 + yt + 199], [1214, yb], [-14, yb]]], tint(C.rLine, 0.09), keep);
  const block = (a, b, tA, tB, f = 0.5) => {
    const m = lerp(a, b, f), A = y0 + tA, B = y0 + tB;
    return [[vert(a, A), A], [vert(m, A), A], [vert(m, B), B], [vert(b, B), B], [b, yb], [a, yb]];
  };
  const far = [[-60, 150, 30, -20, 0.6], [180, 330, 120, 170, 0.4], [360, 470, -40, 20, 0.7], [1100, 1300, 60, -10, 0.35]];
  const near = [block(-40, 120, 330, 280, 0.5), block(170, 290, 430, 392, 0.6), block(1150, 1280, 260, 320, 0.4)];
  page.polys(far.map((b) => block(...b)), tint(C.rLine, 0.2), keep);
  // the far towers' lights: lit floors come in runs with dark floors between, and the floors close up toward the top as the
  // towers recede from the low camera. A lit floor is a row of rooms of uneven width, only some of them lit, so a floor
  // shows a single window as often as a short run. Each light is its own short stroke (no dash pattern, so nothing repeats);
  // mostly red, a few hot pink. Only where a tower shows: never behind the nearer blocks, the tower and its band, or an opaque
  // plate of the interface. Desktop only: they are under a pixel on a phone
  const hidden = [...near, title, FLAG[0].plate, denied, roleBand, ...UI.d.heads];
  const seen = (p) => !hidden.some((q) => inside(q, p)) && ![[0, 0], [16, 0], [-16, 0], [0, 16], [0, -16]].some(([dx, dy]) => fronts.some((f) => inside(f, [p[0] + dx, p[1] + dy])));
  const R0 = rng(4701), lit = [[], []];
  far.forEach(([a, b, tA, tB]) => {
    let on = R0() < 0.5, left = 1 + Math.floor(R0() * 3), p = 0.4;
    for (let y = 612, step = 14; y > Math.max(tA, tB) + 14; y -= step * (0.8 + R0() * 0.4), step = Math.max(6.5, step * 0.955)) {
      if (--left < 0) { on = !on; left = on ? 1 + Math.floor(R0() * 4) : 1 + Math.floor(R0() * 3); p = 0.2 + R0() * 0.4; }
      if (!on) continue;
      const yy = Math.round(y0 + y), xb = vert(b, yy) - 8;
      for (let x = Math.max(66, vert(a, yy) + 8 + R0() * 8); x < xb;) {
        const L = 2 + Math.round(R0() * 6);
        if (x + L <= xb && R0() < p && seen([x, yy]) && seen([x + L, yy])) lit[R0() < 0.22 ? 1 : 0].push([Math.round(x), yy, Math.round(x) + L, yy]);
        x += L + 3 + R0() * 5;
      }
    }
  });
  page.segs(lit[0], `stroke="${C.rLine}" stroke-width="2.6"`, { cls: 'd', ...keep });
  page.segs(lit[1], `stroke="${C.rPink}" stroke-width="2.6"`, { cls: 'd', ...keep });
  page.polys(near, `fill="${C.rDeep}"`, keep);
  // the key light: a warning beacon on the far tower's shoulder, up and to the right of the tower where every pink rim turns,
  // blown out to a pale core, with two flat rings round it in the open sky
  const beacon = P(1080, 44);
  lamp(page, beacon, 14, C.rLine, { core: C.rPinkW, ...keep });
  const ring = (r) => Array.from({ length: 30 }, (_, k) => [beacon[0] + r * Math.cos(k * Math.PI / 15), beacon[1] + r * Math.sin(k * Math.PI / 15)]);
  page.polys([ring(30)], line(C.rLine, 4, { op: 0.6 }), keep);
  page.polys([ring(46)], line(C.rLine, 3, { op: 0.3 }), keep);
  // shafts of red light falling through the air, each on the camera's vertical
  [[560, 46, C.rPink], [300, 30, C.rPink], [1130, 60, C.rPink]].forEach(([xb, w, col]) => {
    const xt = vert(xb, y0);
    shaft(page, xt, y0, y1 + 14, w, col, { lean: xb - xt, ops: [0.16, 0.08, 0.6], ...keep });
  });

  // ==== the tower, one dark mass: a dark band round its faces cuts it out of the city, then the walls and the faces, all
  // in the frame's darkest red; the faces that turn to the beacon take one step of its light, and the cels' spiky shadows
  // fall back to the dark. No floors: the mass is drawn by its light ====
  page.polys(fronts, line(C.rDeep, 26), keep);
  page.polys([...walls.map((w) => w.q), ...fronts], `fill="${C.rDeep}"`, keep);
  page.polys([1, 3, 4].map((k) => fronts[k]), tint(C.rLine, 0.16), keep);
  page.polys(CEL.map((p) => p.map((q) => map(q))), `fill="${C.rDeep}"`, keep);
  // rim bands: pink with a pale core on every edge that faces the beacon (up and to the right); on the edges that face the
  // burning slit, pale pink bands, the slit's light landing on the tower round it
  const light = [{ dir: [0.6, -0.8], col: C.rPink, min: 0.62, w: 1, core: C.rPinkW }];
  const rims = rimLights(fronts, { R: rng(4687), lights: light, width: [16, 13, 12, 12, 12, 9], skip: [2] });
  const beamOutline = fronts.map((f, k) => (k === 2 ? [[443, 658], [725, 764], [734, 863], [497, 766], [439, 793]].map((p) => map(p)) : f));
  const beamRims = rimLights(beamOutline, { R: rng(4689), lights: light, width: 12, skip: [0, 1, 3, 4, 5], spikes: 0 });
  rims[0].bands.push(...beamRims[0].bands);
  rims[0].cores.push(...beamRims[0].cores);
  rims[0].edges.push(...beamRims[0].edges);
  drawRims(page, rims, keep);
  const R4 = rng(4695), toward = [];
  [[0, 14], [1, 14], [2, 12], [3, 10]].forEach(([k, w]) => {
    const f = k === 2 ? beamOutline[2] : fronts[k];
    for (let i = 0; i < f.length; i++) {
      const a = f[i], b = f[(i + 1) % f.length], m = lerpP(a, b, 0.5), [nx, ny] = inward(f, i), L = Math.hypot(sm[0] - m[0], sm[1] - m[1]);
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 40 || L > 330 || (-nx * (sm[0] - m[0]) - ny * (sm[1] - m[1])) / L < 0.55) continue;
      toward.push(rimBand(f, i, w, R4, { spikes: 1 }));
    }
  });
  page.polys(toward, `fill="${C.rPinkW}"`, keep);

  // ==== the attack, at the slit: the slit burns white-hot, its light lands on the faces either side of it as hard cels
  // (pink on the blade, lit red on the slab); lower down the attack has torn it open, and there is static and nothing
  // else. The tear is narrow and comes to a point at both ends; the slit's white core shows clean above it ====
  const cel = (p0, p1, side, w0, w1, n, R) => {
    const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), nx = (-(p1[1] - p0[1]) / L) * side, ny = ((p1[0] - p0[0]) / L) * side, out = [];
    for (let k = 0; k <= n; k++) { const p = lerpP(p0, p1, k / n), w = (k % 2 ? w1 : w0) * (0.7 + R() * 0.6) * Math.sin((Math.PI * (k + 0.5)) / (n + 1)); out.push([p[0] + nx * w, p[1] + ny * w]); }
    return [p0, ...out, p1].map((p) => map(p));
  };
  const R2 = rng(4691);
  page.polys([cel([440, 300], [452, 480], 1, 14, 30, 5, R2)], `fill="${C.rBody}"`, keep);
  page.polys([cel([486, 360], [546, 690], -1, 12, 34, 7, R2)], `fill="${C.rPink}"`, keep);
  glow(page, [slit], C.rLine, { fill: C.rPinkW, core: C.rPinkW, coreW: 4, widths: [26, 12, 5], phone: [44, 22, 9], ...keep });
  const tear = [[484, 412], [492, 434], [503, 444], [498, 458], [515, 470], [509, 484], [524, 496], [517, 510], [531, 524], [523, 540], [535, 554],
    [526, 570], [534, 586], [527, 602], [530, 622], [517, 604], [506, 590], [510, 574], [495, 560], [501, 544], [486, 530], [492, 514], [479, 500],
    [485, 484], [473, 470], [480, 456], [474, 440]].map((p) => map(p));
  staticBlocks(page, tear, rng(4688), keep);
  // the attack throws shards of hot light out of the tear, thin and pointed, the way the show draws sparks off an impact
  const R3 = rng(4693), sc = map([506, 515]), shards = [];
  for (let k = 0; k < 7; k++) {
    const a = (-160 + k * 52 + (R3() - 0.5) * 24) * (Math.PI / 180), r0 = 26 + R3() * 16, r1 = r0 + 50 + R3() * 80, w = 2.4 + R3() * 2.2;
    const u = [Math.cos(a), Math.sin(a)], n = [-u[1], u[0]], b = [sc[0] + u[0] * r0, sc[1] + u[1] * r0];
    shards.push([[b[0] + n[0] * w, b[1] + n[1] * w], [sc[0] + u[0] * r1, sc[1] + u[1] * r1], [b[0] - n[0] * w, b[1] - n[1] * w]]);
  }
  page.polys(shards, `fill="${C.rPinkW}"`, keep);

  // ==== the interface over the shot: the locks (lines only), the sheets, the flag, the stamp, the title, the role ====
  for (const [cls, w, r] of [['d', 3, 20], ['m', 6, 30]]) {
    page.polys([great], line(C.rLine, w), { cls, ...keep });
    page.polys([diamond(tearLock, r)], line(C.rPinkW, w), { cls, ...keep });
  }
  // each composition's sheets, one path per part
  for (const [cls, G] of Object.entries(UI)) {
    const m = cls === 'm';
    G.fills.forEach((list) => page.polys(list, tint(C.rLine, 0.42), { cls, ...keep }));
    page.polys(G.unders, `fill="${C.rLine}"`, { cls, ...keep });
    page.polys(G.frames, line(C.rLine, m ? 6 : 1.5), { cls, ...keep });
    page.polys(G.heads, `fill="${C.rDeep}"`, { cls, ...keep });
    page.polys(G.tabs, `fill="${C.rLine}"`, { cls, ...keep });
    page.polys(G.tris, line(C.rDeep, m ? 5 : 2.5), { cls, ...keep });
    page.polys(G.bangs, `fill="${C.rDeep}"`, { cls, ...keep });
    for (const [str, o, s, deg] of G.words) page.text(faces.ui, str, ...o, { size: s, rot: deg, fill: C.rPinkW, cls, ...keep });
  }
  for (const { k, ws, js, wd, wc, T, deg, plate, base } of FLAG) {
    page.polys([plate], `fill="${C.rLine}"`, { cls: k, ...keep });
    page.text(faces.ui, COPY.warning.toUpperCase(), ...T(base), { size: ws, rot: deg, fill: C.rDeep, cls: k, ...keep });
    if (js) page.text(faces.jp, SIGNS.warning, ...T([base[0] + wd + 12, base[1] + (capOf(faces.jp, js) - wc) / 2]), { size: js, rot: deg, fill: C.rDeep, cls: k, ...keep });
  }
  page.polys([denied], `fill="${C.rLine}"`, keep);
  page.polys([tri(dTab / 2, -dc / 2, dc * 1.15).map(DN)], line(C.rDeep, 5), keep);
  page.polys(bang(dTab / 2, -dc / 2, dc * 1.15).map((q) => q.map(DN)), `fill="${C.rDeep}"`, keep);
  page.text(faces.ui, COPY.denied.toUpperCase(), ...DN([dTab + 16, 0]), { size: ds, rot: -6, fill: C.rDeep, ...keep });
  page.polys([title], `fill="${C.rLine}"`, keep);
  page.text(faces.wide, COPY.securityTitle.toUpperCase(), ...T0, { size: ts, fill: C.rDeep, rot: DEG, ...keep });
  // the role and what it is (desktop), the role in three lines (phone), on the last sheet under the review's one full cyan
  // bar, the role in the bar's cyan the way the show sets a line under a full bar; the bands under the type are opaque
  page.polys([roleSheet], tint(C.rLine, 0.42), keep);
  // desktop: two rows, the role and then the work, the sheet showing between them; phone: one row of three lines
  page.polys([30, 126].map((v, i) => role.at(platePoly(8, v, 440, i ? 50 : 86))), `fill="${C.rDeep}"`, { cls: 'd', ...keep });
  page.polys([roleBand], `fill="${C.rDeep}"`, { cls: 'm', ...keep });
  page.polys([role.at(platePoly(8, 8, 440, 16))], `fill="${C.prog}"`, keep);
  for (const [cls, w] of [['d', 1.5], ['m', 6]]) page.polys([roleSheet], line(C.rLine, w), { cls, ...keep });
  COPY.securityRole.forEach((l, i) => role.set(faces.ui, l, 26, 70 + i * 36, 34, { fill: C.prog, cls: 'd' }));
  COPY.securityBody.forEach((l, i) => role.set(faces.ui, l, 26, 146 + i * 24, 24, { fill: C.rPink, cls: 'd' }));
  COPY.securityPhone.forEach((l, i) => role.set(faces.ui, l, 26, 74 + i * 46, 44, { fill: C.prog, cls: 'm', floor: 42 }));
}

export function draw(page, ctx) {
  ctx.after('productions', () => frame(page, ctx));
}
