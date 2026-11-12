// z1 to z3. The end roll, back at night: the studio's street after hours, seen from low on the wet pavement, tilted, looking
// up along the facade as it runs off to the right. One picture over the seven tiles, under one camera: the studio (three
// floors), the lower building next door and a taller one past it; over their roofs the sky, the far towers dense with small
// lights and the owner's tower among them on its plinth, its lights off, only its slit lit. Every link is a lit sign of its own
// kind, at its own distance and its own size: the nearer, the bigger. Its light lands: on the wall and the slabs as hard torn
// cel shapes in two tones and as rim bands, and on the wet pavement as pools and broken streaks.
import { C, camera, tint, line, framed, rng, lerp, lerpP, taper, clipConvex, bboxOf, lineSpans } from '../kit/draw.mjs';
import { N3, NIGHT, CEL, inside, towerSolid, glow, lamp, skyBands, NIGHT_SKY, tube, rimLights, drawRims, rimBand } from '../kit/light.mjs';
import { logo } from '../kit/scene.mjs';

// The camera: on the pavement 0.8 m up, turned 27.5 degrees down the street, looking up 11.5 degrees, rolled 3.7. World units
// are metres: x runs down the street, y up, z away from the camera. The studio's wall is the plane z = WALL; it runs to
// x = JOINT, where the lower building next door starts; past x = THIRD a taller one stands a step back.
const CAM = { pos: [0, 0.8, 0], yaw: 0.48, pitch: 0.2, roll: -0.065, f: 1000, cx: 640, cy: 398 };
const WALL = 19, JOINT = 15.5, THIRD = 24, ROOF = 13.4, NROOF = 8.6, TROOF = 12.2;
const DEG = 180 / Math.PI;
// The tower in the same world: the logo's solid (N3 units, read as metres) turned square to the camera far down the street, on
// a plinth. EYE is the camera in the tower's own frame (x and y as N3, z from its front face): 30 left of its axis, 195 under
// its foot, 560 in front of it.
const EYE = [-30, -195, -560], TURN = 0.771;

export function draw(page, ctx) {
  const { Y, COPY, SIGNS, faces, lightRows } = ctx;
  const y0 = Y.lights, y1 = Y.end;
  const [z1, z2, z3] = lightRows;
  const yA = z2.y, yB = z3.y;
  const cam = camera({ ...CAM, cy: CAM.cy + y0 });
  const at = (p) => { const q = cam.project(p); return [q[0], q[1]]; };
  const Q = (pts) => pts.map(at);
  // a rectangle on the plane z: x from xa to xb, y from ya to yb
  const rect = (xa, xb, ya, yb, z = WALL) => Q([[xa, ya, z], [xb, ya, z], [xb, yb, z], [xa, yb, z]]);
  // a level plate at height y from the plane z out to z - d (a slab's underside, a sill)
  const flat = (xa, xb, y, z, d) => Q([[xa, y, z], [xb, y, z], [xb, y, z - d], [xa, y, z - d]]);
  // a plane across the street at x, from z out to z - d (a pier's side, a blade)
  const across = (x, ya, yb, z, d) => Q([[x, ya, z], [x, ya, z - d], [x, yb, z - d], [x, yb, z]]);
  // a board standing on the pavement at (x, z), w wide, square to the camera's view of it
  const board = (x, z, w, ya, yb) => {
    const l = Math.hypot(x, z), t = [z / l, -x / l], a = [x - (t[0] * w) / 2, z - (t[1] * w) / 2], b = [x + (t[0] * w) / 2, z + (t[1] * w) / 2];
    return Q([[a[0], ya, a[1]], [b[0], ya, b[1]], [b[0], yb, b[1]], [a[0], yb, a[1]]]);
  };
  const poly = (list, col, opt) => page.polys(list, `fill="${col}"`, opt);
  const lit = (list, col, op, opt) => page.polys(list, tint(col, op), opt);
  // text lying on a plane through p with its baseline along dir: its start on the page, its rotation, and the shear that
  // stands its caps up the plane's verticals (all leaning toward the vanishing point far over the frame)
  const frame = (p, dir = [1, 0, 0]) => {
    const a = at(p), b = at([p[0] + dir[0], p[1] + dir[1], p[2] + dir[2]]), c = at([p[0], p[1] + 1, p[2]]);
    const r = Math.atan2(b[1] - a[1], b[0] - a[0]), vx = (c[0] - a[0]) * Math.cos(r) + (c[1] - a[1]) * Math.sin(r), vy = -(c[0] - a[0]) * Math.sin(r) + (c[1] - a[1]) * Math.cos(r);
    return { x: a[0], y: a[1], rot: r * DEG, skew: Math.atan(vx / vy) * DEG };
  };
  // the same for a word w wide whose middle sits at p
  const centred = (p, w) => { const f = frame(p), r = f.rot / DEG; return { ...f, x: f.x - (w / 2) * Math.cos(r), y: f.y - (w / 2) * Math.sin(r) }; };
  // a word set into a plane with the plane's own foreshortening (one affine at p): its baseline along the world direction u,
  // its caps up the direction v, a cap of the given size measured along v. Returns a matrix for page.text.
  const onPlane = (p, u, v) => {
    const a = at(p), b = at(p.map((c, i) => c + u[i])), c = at(p.map((q, i) => q + v[i])), l = Math.hypot(c[0] - a[0], c[1] - a[1]);
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l, (a[0] - c[0]) / l, (a[1] - c[1]) / l, a[0], a[1]];
  };
  // the rotation of a page segment, in degrees
  const angle = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * DEG;
  // a cel patch of light: the polygon with its edges torn, points between its corners thrown in and out
  const torn = (pts, amp, seed) => {
    const R = rng(seed), n = pts.length, c = pts.reduce((s, p) => [s[0] + p[0] / n, s[1] + p[1] / n], [0, 0]), out = [];
    pts.forEach((p, i) => {
      out.push(p);
      for (const f of [0.3, 0.55, 0.8]) { const m = lerpP(p, pts[(i + 1) % n], f), d = [m[0] - c[0], m[1] - c[1]], l = Math.hypot(...d) || 1, k = (R() - 0.35) * amp; out.push([m[0] + (d[0] / l) * k, m[1] + (d[1] / l) * k]); }
    });
    return out;
  };
  // a light's reflection on the wet pavement: a column of short ripples h tall under it from yt down past the frame, narrowing
  const streak = (xc, w, yt, col, op, seed, h = 4) => {
    const R = rng(seed), out = [];
    for (let y = yt, i = 0; y < y1 + 6; i++) {
      const hh = h + R() * h, ww = w * (1 - i * 0.06) * (0.45 + R() * 0.55), x = xc + (R() - 0.5) * w * 0.3;
      if (ww > 6) out.push([[x - ww / 2, y], [x + ww / 2, y], [x + ww / 2 - 2, y + hh], [x - ww / 2 - 2, y + hh]]);
      y += hh + h + R() * 2 * h;
    }
    lit(out, col, op, k3);
  };
  // the pool a light throws on the pavement round a point (x, z): a torn quad, wider toward the camera
  const pool = (x, z, w, d, col, op, seed) => lit([torn(Q([[x - w / 2, 0, z + d / 3], [x + w / 2, 0, z + d / 3], [x + w * 0.7, 0, z - d], [x - w * 0.7, 0, z - d]]), 16, seed)], col, op, k3);
  const k1 = { from: y0, before: yA }, k12 = { from: y0, before: yB }, k2 = { from: yA, before: yB }, k3 = { from: yB }, k23 = { from: yA }, all = { from: y0 };
  const UPV = at([0, 1e7, WALL]); // where every vertical meets, far over the frame
  const foot = (x, z = WALL) => at([x, 0, z])[1];

  // ---- the sky: hard bands along the horizon, which runs through the street's two vanishing points ----
  const hz = [at([0, CAM.pos[1], 1e6]), at([1e6, CAM.pos[1], WALL])];
  skyBands(page, hz, NIGHT_SKY, [640, 560, 490, 420], { top: y0, foot: 40, ...k1 });

  // ---- the tower among them, lights off, under the street's camera: dark faces, one clean band of violet on the edge that
  // faces the kana sign, the slit lit. The walls the camera sees are worked out from the camera's own place (EYE) ----
  const map = (p, d = 0) => {
    const n = N3(p, d), r = [n[0] - EYE[0], n[1] - EYE[1], n[2] - NIGHT.z0 - EYE[2]], c = Math.cos(TURN), s = Math.sin(TURN);
    return at([r[0] * c + r[2] * s, CAM.pos[1] + r[1], r[2] * c - r[0] * s]);
  };
  const { fronts, slit } = towerSolid(map), walls = [];
  logo.slice(0, 6).forEach((pl) => pl.forEach((a, i) => {
    const b = pl[(i + 1) % pl.length], A = N3(a), B = N3(b), L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, m = lerpP(a, b, 0.5);
    const o = inside(pl, [m[0] - ((b[1] - a[1]) / L) * 3, m[1] + ((b[0] - a[0]) / L) * 3]) ? -1 : 1, n = [(-(b[1] - a[1]) / L) * o, (-(b[0] - a[0]) / L) * o], M = lerpP(A, B, 0.5);
    if (n[0] * (EYE[0] - M[0]) + n[1] * (EYE[1] - M[1]) > 0) walls.push({ q: [map(a), map(b), map(b, NIGHT.depth), map(a, NIGHT.depth)], down: n[1] < -0.5, d: Math.hypot(EYE[0] - M[0], EYE[1] - M[1]) });
  }));
  walls.sort((p, q) => q.d - p.d);

  // ---- the far city as megastructures, flat silhouettes darker than the sky behind them: one great stepped mass on the
  // right running out of the frame, a lower pair over the studio's roof, their sides running up toward the vertical vanishing
  // point. Their
  // lights are a dense texture of tiny ones clustered along floors that follow the horizon's tilt, never a grid: short dashed
  // strokes in an uneven rhythm, floors lit in bands, dark between; only where the camera sees past the roofs and the tower ----
  const slope = (hz[1][1] - hz[0][1]) / (hz[1][0] - hz[0][0]);
  const farS = (pts, ft = y0 + 330) => {
    const up = (x, y) => [x + ((UPV[0] - x) * (ft - y)) / (ft - UPV[1]), y];
    return [[pts[0][0], ft], ...pts.map(([x, t]) => up(x, y0 + t)), [pts[pts.length - 1][0], ft]];
  };
  const mega = farS([[992, 96], [992, 52], [1016, 52], [1016, 8], [1046, 8], [1046, -40], [1230, -40]]);
  const pair = [farS([[548, 58], [548, 20], [600, 20], [600, -20], [668, -20], [668, 30], [700, 30], [700, 80]]), farS([[720, 120], [720, 92], [800, 92], [800, 140]])];
  poly([mega, ...pair], C.sky4, k1);
  const hidden = [...fronts, ...walls.map((wl) => wl.q), rect(-20, JOINT, 0, ROOF + 0.3), rect(JOINT, THIRD + 0.6, 0, NROOF + 0.2), rect(THIRD, 90, 0, TROOF, WALL + 2), rect(19.5, 22.5, NROOF, NROOF + 2.6, WALL + 3)];
  const seen = (p) => !hidden.some((h) => inside(h, p));
  // a kit stroke for page.segs, which writes its own fill: the stroke's attributes from its colour on
  const stroked = (col, w, o) => { const a = line(col, w, o); return a.slice(Math.max(0, a.indexOf(`stroke="${col}"`))); };
  // the lights of a far tower: bays (columns of windows) a few floors lit together, each light a dot or a short dash, the
  // floors following the horizon's tilt; now and then a whole floor lit as a strip. Only what the camera sees past the roofs
  const farLights = (shape, pitch, cols, seed, w) => {
    const R = rng(seed), [xa, ya, xb, yb] = bboxOf(shape), by = cols.map(() => []);
    const put = (k, x, e, y) => { const yy = Math.round(y + (x - xa) * slope); if (inside(shape, [x, yy]) && inside(shape, [e, yy]) && seen([x, yy]) && seen([e, yy])) by[k].push([Math.round(x), yy, Math.round(e), yy]); };
    const top = Math.max(ya, y0 - 6) + 3;
    for (let x = xa + 3 + R() * 4; x < xb - 3; x += 4.1 + R() * R() * 14) {
      const bw = R() < 0.5 ? 1 : 2 + R() * R() * 8, k = Math.floor(R() * R() * cols.length);
      for (let r = 0; r < 2 + Math.floor(R() * 4); r++) {
        const f0 = top + Math.floor(R() * ((yb - top) / pitch)) * pitch, n = 2 + Math.floor(R() * R() * 8);
        for (let j = 0; j < n; j++) if (R() > 0.2) put(k, x, x + bw, f0 + j * pitch);
      }
    }
    for (let y = top + pitch * 2; y < yb - 3; y += pitch * (3 + Math.floor(R() * 9))) {
      for (const [a, b] of lineSpans([xa - 1, y], [xb + 1, y], shape)) {
        const l = lerp(xa - 1, xb + 1, a) + 4, r = lerp(xa - 1, xb + 1, b) - 4, x = l + R() * (r - l) * 0.7;
        if (R() < 0.6) put(Math.floor(R() * cols.length), x, Math.min(r, x + 10 + R() * 34), y);
      }
    }
    by.forEach((list, i) => list.length && page.segs(list, stroked(cols[i], w, { cap: true }), k1));
  };
  farLights(mega, 6.4, [C.led, C.mint, C.amber], 3, 2.3);
  farLights(pair[0], 5.2, [C.led, C.amber], 5, 1.8);
  farLights(pair[1], 5.2, [C.mint, C.led], 8, 1.8);

  // ---- the tower, painted ----
  poly([[map([300, 911]), map([600, 911]), map([600, 1400]), map([300, 1400])]], C.far2, k1); // its plinth
  poly(walls.filter((wl) => !wl.down).map((wl) => wl.q), C.far2, k1);
  poly(walls.filter((wl) => wl.down).map((wl) => wl.q), C.deep, k1);
  [C.far, C.face, C.shade].forEach((col, k) => poly(fronts.filter((f, i) => [0, 1, 2, 1, 0, 2][i] === k), col, k1));
  poly(CEL.slice(0, 2).map((pts) => pts.map((p) => map(p))), C.far2, k1); // the cels' cast shadows, a tone down
  drawRims(page, rimLights(fronts, { R: rng(4), lights: [{ dir: [-0.97, 0.24], col: C.rimViolet, min: 0.8, w: 0.75 }], width: 12, skip: [1, 2, 5], spikes: 0 }), { ...k1 });
  glow(page, [slit], C.pink, { core: C.pinkW, coreW: 1.5, phone: [34, 18, 8], ...k1 });
  lamp(page, map([432, 130]), 3.4, C.rLine, k1);

  // ---- on the roofs, against the sky: the studio's water tank and mast, a stair house next door; the sky's violet on them ----
  const tank = rect(9.6, 12.2, ROOF, ROOF + 2.6, WALL + 3), mast = rect(13.2, 13.4, ROOF, ROOF + 7.5, WALL + 1.5), stair = rect(19.5, 22.5, NROOF, NROOF + 2.6, WALL + 3);
  poly([tank, mast, rect(12.6, 14, ROOF + 6.2, ROOF + 6.4, WALL + 1.5)], C.deep, k1);
  poly([stair], C.far2, k1);
  // a cable slung from the mast over next door, sagging (desktop only: on a phone it would be a hairline)
  const cable = (a, b, sag) => taper(Array.from({ length: 13 }, (_, i) => { const t = i / 12; return at([lerp(a[0], b[0], t), lerp(a[1], b[1], t) - sag * 4 * t * (1 - t), lerp(a[2], b[2], t)]); }), { w: 2.6 });
  poly([cable([13.3, ROOF + 6.3, WALL + 1.5], [44, ROOF + 3, WALL + 4], 2.6)], C.deep, { cls: 'd', ...k1 });
  poly([rimBand(tank, 3, 6, rng(6), { spikes: 0 }), rimBand(stair, 3, 6, rng(7), { spikes: 0 })], C.rimViolet, k1);

  // ---- the street, wet: the far pavement catching the shopfronts' light, the kerb, the road dark ----
  poly([[[-14, foot(-20) - 30], [1214, foot(60) - 30], [1214, y1 + 14], [-14, y1 + 14]]], C.shade, k23);
  const kerb = (z) => [[-14, foot(-20, z)], [1214, foot(60, z)]];
  poly([[...kerb(WALL - 5.6), [1214, y1 + 14], [-14, y1 + 14]]], C.navy, k3);
  poly([[...kerb(WALL - 5.6), ...kerb(WALL - 5.9).reverse()]], C.far, k3);

  // ---- the third building, past next door: taller, a step back ----
  poly([rect(THIRD, 90, 0, TROOF, WALL + 2)], C.far, all);
  // ---- next door: lower, two floors ----
  poly([rect(JOINT, THIRD + 0.6, 0, NROOF)], C.far2, all);
  poly([rect(JOINT, THIRD + 0.6, NROOF - 0.45, NROOF, WALL - 0.2)], C.face, all); // its parapet, lit from the sky
  poly([across(THIRD + 0.6, 0, NROOF, WALL, 0.2), rect(23.4, THIRD + 0.6, 0, NROOF - 0.45, WALL - 0.25)], C.deep, all); // its pier, a step darker
  poly([rect(JOINT, THIRD + 0.6, 3.8, 4.2, WALL - 0.5)], C.far, all); // its canopy
  poly([flat(JOINT, THIRD + 0.6, 3.8, WALL, 0.5)], C.deep, all);
  poly([rect(16.6, 18, 5.2, 7.2), rect(21.8, 23.2, 5.2, 7.2)], C.panel, all); // its first floor windows, one lit warm
  poly([rect(17, 17.7, 5.7, 7.2)], C.amber, all);
  poly([rect(15.9, 23.9, 0, 3.4, WALL + 0.2)], C.deep, k23); // its shop: dark glass, a door lit pink inside
  poly([rect(16.2, 17.6, 0, 2.7, WALL + 0.2)], C.wall, k3);
  lit([torn(rect(16.4, 17.4, 0, 2.5, WALL + 0.4), 5, 18)], C.pink, 0.28, k3);
  lit([torn(rect(16.4, 17.4, 1.3, 2.5, WALL + 0.4), 5, 8)], C.pink, 0.45, k3);

  // ---- the studio: three floors, its slabs seen from below ----
  poly([rect(-20, JOINT, 0, ROOF)], C.wall, all);
  const parapet = rect(-20, JOINT, ROOF - 0.5, ROOF, WALL - 0.3);
  poly([parapet], C.shade, all);
  poly([rimBand(parapet, 2, 11, rng(2), { spikes: 2 })], C.rimViolet, all); // the sky on its top edge
  poly([rect(-20, JOINT - 0.5, 4.4, 8)], C.far2, all); // the first floor a step lighter: the wall reads as a plane
  poly([flat(-20, JOINT, 8, WALL, 0.6), flat(-20, JOINT, 4, WALL, 0.9)], C.deep, all); // the slabs' undersides
  poly([rect(-20, JOINT, 8, 8.4, WALL - 0.6), rect(-20, JOINT, 4, 4.4, WALL - 0.9)], C.shade, all); // their fronts
  poly([across(JOINT, 0, ROOF, WALL, 0.5), rect(JOINT - 0.5, JOINT, 0, ROOF, WALL - 0.5)], C.shade, all); // the pier at the joint
  // EMAIL's light under the ledge: a hard cel zone on the first floor wall following the slab, a hotter tone close under it
  lit([torn(Q([[-1.6, 8, WALL], [14.4, 8, WALL], [13.4, 6.9, WALL], [-0.6, 6.25, WALL]]), 9, 23)], C.led, 0.1, k12);
  lit([torn(Q([[0.2, 8, WALL], [12.8, 8, WALL], [12.2, 7.45, WALL], [0.8, 7.2, WALL]]), 7, 24)], C.led, 0.12, k1);
  // the first floor, never a row: a shutter, a lit pane under a half-drawn blind, a tall dark pane, a unit on the wall, a
  // warm pane; under the address a run of panes and boxes of every size, dark, two lit cold. The tall pane and the blind's foot
  // lit from inside: a white-hot strip at the ceiling, the back wall under it a step lit, dark below
  const shutter = rect(7.4, 9.1, 4.62, 7.25);
  poly([shutter, rect(12.75, 13.65, 6.35, 6.95)], C.far, k12);
  poly([rect(9.55, 10.35, 5.95, 7.5), rect(10.8, 12.3, 6.05, 7.65), ...[5.3, 5.85, 6.4].map((h) => rect(7.4, 9.1, h, h + 0.07)), across(12.75, 6.35, 6.95, WALL, 0.35)], C.deep, k12);
  poly([rect(9.55, 10.35, 5.95, 6.75)], C.mint, k12);
  poly([rect(14.05, 14.75, 6.1, 7.3)], C.amber, k12);
  lit([rect(10.8, 12.3, 6.85, 7.65)], C.led, 0.24, k12);
  poly([rect(10.8, 12.3, 7.4, 7.55), rect(9.55, 10.35, 6.64, 6.75)], C.mintW, k12);
  poly([rect(-7.2, -3.5, 4.62, 5.2), rect(-1.7, 2.3, 4.62, 5.05), rect(3.9, 6.6, 4.62, 5.35)], C.deep, k12);
  poly([rect(-3.1, -2.2, 4.62, 5.85), rect(2.7, 3.4, 4.62, 5.5)], C.ledOff, k12);
  // the shopfronts: the first lit cold inside, its shutter down to a hand over the pavement, the light under it lit hot and
  // thrown out over the wet pavement as a raked wedge in two steps; a pier; the fascia over it
  poly([rect(-6, 5.4, 0, 2.34, WALL + 0.4)], C.panel, k23);
  poly([rect(-6, 5.4, 0.46, 2.34, WALL + 0.35)], C.far, k23);
  poly([0.9, 1.35, 1.8].map((h) => rect(-6, 5.4, h, h + 0.05, WALL + 0.35)), C.deep, k23);
  lit([rect(-6, 5.4, 0, 0.46, WALL + 0.4)], C.led, 0.5, k3);
  poly([rect(-6, 5.4, 0.38, 0.46, WALL + 0.4)], C.mintW, k3);
  lit([torn(Q([[-6, 0, WALL + 0.35], [5.4, 0, WALL + 0.35], [5.8, 0, WALL - 9.5], [-9, 0, WALL - 9.5]]), 14, 29)], C.led, 0.12, k3);
  lit([torn(Q([[-5, 0, WALL + 0.35], [5.2, 0, WALL + 0.35], [5.3, 0, WALL - 4.4], [-7, 0, WALL - 4.4]]), 10, 30)], C.led, 0.16, k3);
  poly([rect(5.4, 6.2, 0, 4, WALL - 0.3), rect(-6, 5.4, 2.34, 4, WALL)], C.wall, k23);
  poly([across(5.4, 0, 4, WALL, 0.3)], C.shade, k23);
  // a drainpipe down the pier from under the slab to the pavement, its brackets; the shop's cold light along its near side. It
  // stops under the slab: over it, the address needs a plain wall
  const pipe = rect(5.62, 5.8, 0, 4, WALL - 0.36);
  poly([pipe, ...[1.2, 2.9].map((h) => rect(5.55, 5.87, h, h + 0.12, WALL - 0.36))], C.deep, k23);
  poly([rimBand(pipe, 3, 3, rng(51), { spikes: 0, t0: 0.08, t1: 0.92 })], C.led, k23);

  // ---- z1: EMAIL in tube letters on the top floor, its light on the wall and the slab's edge under it ----
  // its light washes up the wall from the ledge to the parapet in two hard cel tones, their sides fanning out (straight edges:
  // the parapet is their top); round the tubes a close halo in two steps; on the slab's front under it a lit band with a
  // thick rim on its top edge, white-hot under the middle letters
  const fan = (a, b, c, d) => Q([[a, 8.4, WALL], [b, 8.4, WALL], [d, ROOF - 0.5, WALL], [c, ROOF - 0.5, WALL]]);
  lit([fan(-2.2, 13.4, -5.4, JOINT)], C.led, 0.1, k1);
  lit([fan(0.4, 11.6, -1.8, 13.6)], C.led, 0.13, k1);
  const ledge = rect(-6, JOINT, 8, 8.4, WALL - 0.6);
  lit([torn(rect(-1, 13.6, 8, 8.4, WALL - 0.6), 12, 21)], C.led, 0.34, k1);
  poly([rimBand(ledge, 2, 10, rng(3), { spikes: 3, t0: 0.18, t1: 0.88 })], C.led, k1);
  poly([rimBand(ledge, 2, 3.4, rng(13), { spikes: 0, t0: 0.4, t1: 0.7 })], C.mintW, k1);
  // the tube sign runs along the wall and its caps stand up the wall's own verticals: every layer the tube draws is sheared as
  // the plane is at the word's middle (a single shear: the verticals there lean 6 degrees, 10 at the E and 2 at the L)
  const em = frame([0, 8.62, WALL]), sk = frame([6, 8.62, WALL]).skew;
  const onWall = Object.create(page, { text: { value: (F, s, x, y, o) => page.text(F, s, x, y, { ...o, skew: sk }) } });
  const word = z1.tiles[0].word.toUpperCase();
  tube(onWall, faces.tube, word, em.x, em.y, 176, C.led, C.mintW, { rot: em.rot, edge: C.deep, halo: [[0.7, 0.13], [0.25, 0.16]], ...k1 });
  // one letter blooms: its core blown out wide and white-hot, a wider step of its light round it
  {
    const i = 2, ch = word[i], r = em.rot / DEG, o = page.measure(faces.tube, word.slice(0, i + 1), 176) - page.measure(faces.tube, ch, 176), k = 200 / 176;
    const x = em.x + o * Math.cos(r) + 1.2, y = em.y + o * Math.sin(r) - 1.2, b = { size: 176, rot: em.rot, ...k1 };
    onWall.text(faces.tube, ch, x, y, { ...b, paint: line(C.led, 44 * k, { op: 0.12 }) });
    onWall.text(faces.tube, ch, x, y, { ...b, paint: line(C.mintW, 10 * k) });
  }
  const ad = frame([-0.2, 6.6, WALL]);
  page.text(faces.ui, COPY.emailAddress, ad.x, ad.y, { size: 24, rot: ad.rot, skew: ad.skew, fill: C.mint, cls: 'd', ...k1 });
  page.text(faces.ui, COPY.emailAddress, ad.x, ad.y + 10, { size: 41, rot: ad.rot, skew: ad.skew, fill: C.mint, cls: 'm', ...k1 });
  // studio, in Japanese, on a blade off the corner: its pink on the wall right beside the blade, hot against it, torn where
  // it falls off
  lit([torn(rect(13.4, JOINT - 0.6, 8.7, 12.5), 12, 5)], C.pink, 0.2, k1);
  lit([torn(rect(14.15, JOINT - 0.6, 9.3, 11.9), 9, 15)], C.pink, 0.34, k1);
  // the blade on two arms, in front of the pier: the pier's face catches the pink (behind the blade, so the blade hides it
  // where they cross), then the blade, its outer edge rimmed by its own pink (its foot too, on desktop). Nothing crosses the
  // kana: they sit inside the blade, under its top
  const bx = JOINT - 0.6, blade = across(bx, 7.7, 12.8, WALL, 2.6);
  poly([rimBand(across(JOINT, 7.9, 12.9, WALL, 0.5), 1, 8, rng(36), { spikes: 1 })], C.pink, { cls: 'd', ...k1 });
  // and down the pier under it: a hard pink tone on its face, a rim on its edge, torn where it falls off
  lit([torn(rect(JOINT - 0.5, JOINT, 4.8, 7.6, WALL - 0.5), 5, 41)], C.pink, 0.3, k12);
  poly([rimBand(across(JOINT, 4.6, 7.6, WALL, 0.5), 1, 7, rng(42), { spikes: 0, taper: 0.1 })], C.pink, k12);
  poly([across(bx, 12.8, 13.05, WALL, 2.3), across(bx, 7.45, 7.7, WALL, 2.3)], C.deep, k1);
  poly([blade], C.deep, k1);
  poly([rimBand(blade, 1, 7, rng(33), { spikes: 0 })], C.pink, k1);
  poly([rimBand(blade, 0, 6, rng(34), { spikes: 0 })], C.pink, { cls: 'd', ...k1 });
  const kb = frame([bx, 12.02, WALL - 1.3], [0, -1, 0]);
  tube(page, faces.jp, SIGNS.studio, kb.x, kb.y, 46, C.pink, C.pinkW, { vstep: 50, rot: kb.rot - 90, ...k1 });

  // ---- z2 and z3: the signs, each its own kind at its own distance and height, the nearer the bigger, none of them alike,
  // none square in its tile; the two nearest run on over their tile's edge as drawing (each word stays whole in its own tile).
  // Every one lands: a hard tone of its light on what is next to it, a rim band on the edges that face it, a pool in two hard
  // steps on the wet ground. Drawn far to near ----
  const [P, R, K] = z2.tiles, [J, N, O] = z3.tiles;
  const F = faces.cond, CAP = 0.686; // cond's cap height as a share of its em
  // a box standing at (x, z): w wide, d deep, from ya to yb, turned be from square to the camera so its right side shows and
  // tilted in its own plane (its right end up by tilt radians). Its face and side as page quads [bottom left, bottom right,
  // top right, top left], a point on its face (u across, v up, from its bottom left) on the page and in the world, a point on
  // the ground k out in front of its face's foot
  const box = (x, z, w, d, ya, yb, be, tilt = 0) => {
    const l = Math.hypot(x, z), n = [-(x / l) * Math.cos(be) + (z / l) * Math.sin(be), -(z / l) * Math.cos(be) - (x / l) * Math.sin(be)], tv = [-n[1], n[0]], ct = Math.cos(tilt), st = Math.sin(tilt);
    const W3 = (u, v) => { const p = w * (u - 0.5), q = (yb - ya) * (v - 0.5), r = p * ct - q * st; return [x + (n[0] * d) / 2 + tv[0] * r, (ya + yb) / 2 + p * st + q * ct, z + (n[1] * d) / 2 + tv[1] * r]; };
    const back = (p, k = d) => [p[0] - n[0] * k, p[1], p[2] - n[1] * k];
    const G = (u, k) => { const p = W3(u, 0); return [p[0] + n[0] * k, 0, p[2] + n[1] * k]; };
    return { W3, G, back, at: (u, v) => at(W3(u, v)), tv, n, face: Q([W3(0, 0), W3(1, 0), W3(1, 1), W3(0, 1)]), side: Q([W3(1, 0), back(W3(1, 0)), back(W3(1, 1)), W3(1, 1)]) };
  };
  // a word set a few letters at a time (n, a run) on a flat face in the world, each run under the face's own foreshortening
  // where it stands (the nearer, the bigger): W3(s, h) is the world point s metres along the face's baseline and h metres up
  // it, em the letters' em in metres. Each run starts where it falls in the word and takes the face's affine at its middle (a
  // word whose size changes fast along it takes runs of one, or the step between runs shows). The matrix
  // carries 4 times the scale and the size a quarter (the page is the same, and the guards read the size it lands at): the
  // canvas writes a matrix-set glyph into every tile within two sizes of it, and this keeps a word whole in its tile out of the
  // next one. lean: the letters' slant, as a share of their height (the oblique of the film's own type)
  const setOn = (str, W3, s0, h0, em, look, lean = 0, n = 3) => {
    const m = (q) => (page.measure(F, q, 100) * em) / 100;
    for (let i = 0; i < str.length; i += n) {
      const run = str.slice(i, i + n), s = s0 + m(str.slice(0, i + 1)) - m(str[i]), sm = s + m(run) / 2, o = at(W3(s, h0));
      const a = at(W3(sm, h0)), b = at(W3(sm + 0.05, h0)), c = at(W3(sm + lean * 0.05, h0 + 0.05)), l = Math.hypot(...[0, 1].map((j) => at(W3(sm, h0 + 0.05))[j] - a[j])) / 4;
      const mk = [(b[0] - a[0]) / l, (b[1] - a[1]) / l, (a[0] - c[0]) / l, (a[1] - c[1]) / l, o[0], o[1]];
      page.text(F, run, 0, 0, { size: (em * l) / 0.05, matrix: mk, rot: Math.atan2(mk[1], mk[0]) * DEG, ...look });
    }
  };
  // Tube letters bent for the words the tube face does not carry: each letter is a few centre lines on a unit cap (x across
  // from 0 to its width, y up from 0 to 1), set on a plane through put(u, v) (u along the word, v up, both in caps). Drawn as
  // a lit tube is, in one pass over one path: its light on what is behind it, two hard bands that follow the strokes (the
  // word's own shape, its counters filled), then its body .8 of a tube wide and a near-white core down its middle. On a phone
  // no line is under 6u. A letter missing here stops the build.
  const STROKES = {
    R: [[[0, 0], [0, 1], [0.4, 1], [0.54, 0.87], [0.54, 0.63], [0.4, 0.5], [0, 0.5]], [[0.26, 0.5], [0.56, 0]]],
    E: [[[0.5, 1], [0, 1], [0, 0], [0.5, 0]], [[0, 0.52], [0.42, 0.52]]],
    S: [[[0.54, 0.85], [0.42, 1], [0.12, 1], [0, 0.87], [0, 0.64], [0.12, 0.53], [0.42, 0.48], [0.54, 0.37], [0.54, 0.13], [0.42, 0], [0.12, 0], [0, 0.15]]],
    U: [[[0, 1], [0, 0.14], [0.13, 0], [0.41, 0], [0.54, 0.14], [0.54, 1]]],
    M: [[[0, 0], [0, 1], [0.33, 0.4], [0.66, 1], [0.66, 0]]],
    K: [[[0, 0], [0, 1]], [[0.52, 1], [0.04, 0.42]], [[0.2, 0.6], [0.54, 0]]],
    O: [[[0.13, 0], [0.43, 0], [0.56, 0.13], [0.56, 0.87], [0.43, 1], [0.13, 1], [0, 0.87], [0, 0.13], [0.13, 0]]],
    N: [[[0, 0], [0, 1], [0.54, 0], [0.54, 1]]],
    C: [[[0.52, 0.85], [0.4, 1], [0.13, 1], [0, 0.87], [0, 0.13], [0.13, 0], [0.4, 0], [0.52, 0.15]]],
    T: [[[0, 1], [0.56, 1]], [[0.28, 1], [0.28, 0]]],
    I: [[[0, 0], [0, 1]]],
    D: [[[0, 0], [0, 1], [0.32, 1], [0.54, 0.8], [0.54, 0.2], [0.32, 0], [0, 0]]],
  };
  const tubeWord = (str, put, cap, col, { core, hot = 0.3, opt }) => {
    const lines = [];
    let u = 0;
    for (const ch of str) {
      const g = STROKES[ch];
      g.forEach((l) => lines.push(l.map(([x, y]) => put(u + x, y))));
      u += Math.max(...g.flat().map((p) => p[0])) + 0.3;
    }
    const tw = Math.max(0.14 * cap, 6);
    glow(page, lines, col, { open: true, fill: null, widths: [2.3 * tw, 1.2 * tw, 0.4 * tw], phone: [1.7 * tw, 0.9 * tw, Math.max(0.4 * tw, 3)], ops: [0.12, 0.22, 1], core, coreW: hot * tw, ...opt });
    return u - 0.3;
  };
  // how many page units one metre up a plane makes at a point on it
  const perM = (p) => { const a = at(p), b = at([p[0], p[1] + 1, p[2]]); return Math.hypot(b[0] - a[0], b[1] - a[1]); };
  // a pool of light on the ground in hard steps, one inside the other: its corners in the world, each step [op, scale]
  const spill = (pts, col, list, seed, opt = k3) => list.forEach(([op, k], i) => { const c = pts.reduce((s, p) => s.map((v, j) => v + p[j] / pts.length), [0, 0, 0]); lit([torn(Q(pts.map((p) => p.map((v, j) => c[j] + (v - c[j]) * k))), 10, seed + i)], col, op, opt); });

  // linkedin, the farthest and highest: a blade box hung askew from an arm off next door, seen across the street, its free
  // end and its underside showing, the word set into its near face. The letters are the light: white-hot down their middle,
  // edged pink, two bands of pink round them. Its pink lands on next door's wall as one raked wedge from the arm's root down to
  // the canopy, hotter inside it; across the canopy's face, white-hot along its top edge; on the blade's own free end and the
  // near edge of its underside; in a pool on the pavement
  {
    const s = 51, t = K.word.toUpperCase(), th = 0.42, zb = WALL - 0.14, a = 0.1, bx = 20.75, ca = Math.cos(a), sa = Math.sin(a), h0 = 5.9, hh = 1.6, len = 5, ay = h0 + hh + 0.08;
    // a point on the blade: o along it from the wall, h up from its foot, k across it from its near face (m)
    const B3 = (o, h, k = 0) => [bx - th / 2 + k, h0 + h * ca - o * sa, zb - o * ca - h * sa];
    lit([torn(Q([[bx + 0.3, ay, WALL], [bx + 3.1, 4.2, WALL], [bx - 2.7, 4.2, WALL], [bx - 0.3, ay, WALL]]), 9, 43)], C.pink, 0.2, k2);
    lit([torn(Q([[bx + 0.15, ay - 0.15, WALL], [bx + 1.6, 4.2, WALL], [bx - 1.3, 4.2, WALL], [bx - 0.15, ay - 0.15, WALL]]), 6, 44)], C.pink, 0.16, k2);
    const cn = rect(18.4, 23.4, 3.8, 4.2, WALL - 0.5);
    lit([cn], C.pink, 0.28, k2);
    lit([rect(19.4, 22.2, 3.8, 4.2, WALL - 0.5)], C.pink, 0.42, k2);
    poly([rimBand(cn, 2, 5, rng(45), { spikes: 0, t0: 0.12, t1: 0.88 })], C.pinkW, k2);
    spill([[bx - 1.6, 0, WALL - 0.6], [bx + 1.2, 0, WALL - 0.6], [bx + 1.6, 0, WALL - 3.4], [bx - 2.4, 0, WALL - 3.4]], C.pink, [[0.14, 1], [0.16, 0.55]], 48);
    const arm = across(bx, ay, ay + 0.16, WALL, len + 0.1), rod = (o) => Q([B3(o, hh), B3(o + 0.07, hh), [bx, ay, WALL - o - 0.07], [bx, ay, WALL - o]]);
    poly([arm, rod(0.5), rod(len - 0.6)], C.deep, k2);
    poly([rimBand(arm, 0, 2.6, rng(49), { spikes: 0 })], C.pink, k2);
    const und = Q([B3(0, 0), B3(len, 0), B3(len, 0, th), B3(0, 0, th)]), end = Q([B3(len, 0), B3(len, 0, th), B3(len, hh, th), B3(len, hh)]), bd = Q([B3(0, 0), B3(len, 0), B3(len, hh), B3(0, hh)]);
    poly([und, end, bd], C.deep, k2);
    lit([end], C.pink, 0.35, k2);
    poly([rimBand(und, 0, 3, rng(12), { spikes: 0 })], C.pink, k2);
    poly([rimBand(bd, 2, 3, rng(11), { spikes: 0 })], C.face2, k2); // the sky on its top edge
    const mk = onPlane(B3(0.3, 0.27), [0, -sa, -ca], [0, ca - 0.22 * sa, -sa - 0.22 * ca]), o = { size: s, matrix: mk, rot: Math.atan2(mk[1], mk[0]) * DEG, ...k2 };
    page.text(F, t, 0, 0, { ...o, paint: line(C.pink, 20, { op: 0.18 }) });
    page.text(F, t, 0, 0, { ...o, paint: line(C.pink, 8, { op: 0.42 }) });
    page.text(F, t, 0, 0, { ...o, paint: framed(C.lavW, C.pink, 3.4) });
  }
  // resume, in the middle distance, high on the first floor: mint tube letters on a dark box that stands off the wall (its
  // end and its underside show), white-hot down their middle. Its light: a hard tone on the wall round the box, the box's
  // underside lit mint, the slab's front under it lit with a hot rim on its top edge, mint on the sills of the panes over it.
  // Under the slab its shop's upper floor is open to the street: the glass lit mint inside, white-hot along its head and
  // dark at the counter, its frame dark and trussed (a diagonal across each bay, alternating), the slab's underside over it
  // catching the light
  {
    const x0 = 10.8, yb = 4.8, cm = 0.78, zb = WALL - 0.32, w = 4.8 * cm * 0.86, put = (u, v) => at([x0 + u * cm * 0.86, yb + v * cm, zb - 0.02]);
    const bx0 = x0 - 0.32, bx1 = x0 + w + 0.32, b0 = yb - 0.24, b1 = yb + cm + 0.24;
    lit([torn(rect(bx0 - 0.9, bx1 + 0.5, 4.4, b1 + 0.75), 8, 46)], C.led, 0.12, k12);
    poly([rect(9.55, 10.35, 5.95, 7.5), rect(10.8, 12.3, 6.05, 7.65)].map((q, i) => rimBand(q, 0, 5, rng(47 + i), { spikes: 0 })), C.mint, k12);
    const g0 = 8, g1 = 14.6, gb = 2.52, gh = 3.86, zm = WALL + 0.15;
    poly([rect(g0, g1, gb, gh, zm)], C.ledOff, k23);
    lit([Q([[g0, gh, zm], [g1, gh, zm], [g1, 2.9, zm], [12.4, 2.9, zm], [g0, 3.45, zm]])], C.mint, 0.45, k23);
    poly([rect(g0, g1, 3.66, gh, zm)], C.mintW, k23);
    poly([rect(g0, g1, gb, 2.9, zm), ...[9.6, 11.2, 12.8].map((x) => rect(x, x + 0.16, gb, gh, zm)), ...[[8.1, 9.5], [11.1, 9.85], [11.45, 12.7], [14.5, 13.05]].map(([p, q]) => Q([[p - 0.08, gb, zm], [p + 0.08, gb, zm], [q + 0.08, 3.66, zm], [q - 0.08, 3.66, zm]]))], C.panel, k23);
    lit([flat(g0 - 0.4, g1 + 0.3, 4, WALL, 0.9)], C.mint, 0.2, k2);
    const sl = rect(8.6, 14.6, 4, 4.4, WALL - 0.9);
    lit([sl], C.led, 0.3, k2);
    poly([rimBand(sl, 2, 10, rng(8), { spikes: 0, t0: 0.06, t1: 0.94 })], C.mint, k2);
    poly([rimBand(sl, 2, 4, rng(9), { spikes: 0, t0: 0.2, t1: 0.8 })], C.mintW, k2);
    poly([across(bx0, b0, b1, WALL, 0.32)], C.deep, k2);
    poly([rect(bx0, bx1, b0, b1, zb)], C.panel, k2);
    lit([flat(bx0, bx1, b0, WALL, 0.32)], C.mint, 0.6, k2);
    tubeWord(R.word.toUpperCase(), put, perM([12, yb, zb]) * cm, C.mint, { core: C.mintW, hot: 0.36, opt: k2 });
  }
  // konect, far and small, low in the second shop's window: the glass a lit room, white-hot at its head and stepping down to
  // a deep violet floor, the tube word hung inside it in pale violet, white-hot down its middle. The fascia and the frame are
  // one dark mass round the opening; the opening's head (its underside) lit violet from inside, the near jamb lit, the mullion
  // and the sill rimmed on the edges that face the word; the light out on the wet pavement in front of the shop in two steps
  {
    const x0 = 8.05, yb = 0.62, cm = 0.8, zg = WALL + 0.3, gt = 2.12, put = (u, v) => at([x0 + u * cm * 0.9, yb + v * cm, zg - 0.05]);
    poly([rect(7.3, 14.9, 0, 2.52, WALL)], C.deep, k23);
    poly([rect(7.6, 14.6, 0.3, gt, zg)], C.vDeep, k3);
    lit([Q([[7.6, gt, zg], [14.6, gt, zg], [14.6, 0.3, zg], [12.3, 0.3, zg], [7.6, 1.42, zg]])], C.vMid, 0.45, k3);
    poly([Q([[7.6, gt, zg], [14.6, gt, zg], [14.6, 1.3, zg], [7.6, 1.86, zg]])], C.vMid, k3);
    poly([rect(7.6, 14.6, 1.98, gt, zg)], C.lavW, k3);
    const mul = rect(12.95, 13.1, 0.3, gt, zg), sill = rect(7.6, 14.6, 0, 0.3, zg), jb = across(14.6, 0, gt, zg, 0.3);
    poly([sill, mul], C.deep, k3);
    lit([jb], C.rimViolet, 0.3, k3);
    lit([flat(7.6, 14.6, gt, zg, 0.3)], C.rimViolet, 0.75, k3);
    poly([rimBand(mul, 3, 4, rng(56), { spikes: 0 }), rimBand(sill, 2, 3, rng(55), { spikes: 0, t0: 0.04, t1: 0.96 })], C.rimViolet, k3);
    lit([[at([7.6, 0, zg]), at([14.6, 0, zg]), at([16.4, 0, WALL - 5.6]), at([6.8, 0, WALL - 5.6])]], C.rimViolet, 0.16, k3);
    lit([[at([8.4, 0, zg]), at([13.8, 0, zg]), at([14.6, 0, WALL - 2.4]), at([8, 0, WALL - 2.4])]], C.rimViolet, 0.22, k3);
    tubeWord(N.word.toUpperCase(), put, perM([11.2, yb, zg]) * cm, C.vField, { core: C.lavW, hot: 0.55, opt: k3 });
  }
  // orcid: a dark totem on a post on the pavement by next door, turned toward the street's far end, the word in green tube
  // letters reading up its face, white-hot down their middle. Its green down its post, hard on the ground round its foot in
  // two steps and on out toward the camera as a raked wedge, cast up next door's glass behind it as another. The end card on
  // next door's wall behind it, unlit: a lantern box hung from a bracket, the kanji on its face, its near side and its
  // underside showing, the side catching the green
  {
    const t = O.word.toUpperCase(), w = 1.15, hb = 2.38, cap = 0.62, b = box(13.3, 10.1, w, 0.42, 0.36, hb, -0.55), q = b.face;
    lit([Q([[17.9, 0, WALL + 0.2], [25.6, 0, WALL + 0.2], [25.6, 3.3, WALL + 0.2], [17.9, 0.8, WALL + 0.2]])], C.rimGreen, 0.22, k3);
    lit([Q([[20.6, 0, WALL + 0.2], [25.6, 0, WALL + 0.2], [25.6, 2.5, WALL + 0.2], [20.6, 0.8, WALL + 0.2]])], C.rimGreen, 0.24, k3);
    lit([torn(Q([[13.4, 0, 10.6], [19.5, 0, 9.6], [17.2, 0, 6.2]]), 12, 61)], C.rimGreen, 0.2, k3);
    pool(13.3, 10.1, 3.4, 2.6, C.rimGreen, 0.16, 6);
    pool(13.3, 10.1, 1.9, 1.3, C.rimGreen, 0.26, 16);
    streak((q[0][0] + q[1][0]) / 2, 50, q[0][1] + 2, C.rimGreen, 0.45, 6, 3);
    pool(17.1, WALL - 0.5, 1, 1.6, C.pink, 0.22, 7); // the door's spill on the pavement
    // the lantern and the kanji set into its face's plane: an em of the given size centred on the face
    const lantern = (xa, xb, ya, yb, dz, size, fw, cls) => {
      const zf = WALL - dz, zk = WALL - 0.1, xc = (xa + xb) / 2, c = [xc, (ya + yb) / 2, zf], e = size / perM(c), mk = onPlane([c[0] - e / 2, c[1] - 0.365 * e, zf], [1, 0, 0], [0, 1, 0]);
      page.polys([across(xc, yb, yb + 0.1, WALL, dz - 0.15), flat(xa, xb, ya, zk, zk - zf)], `fill="${C.deep}"`, { cls, ...k3 });
      page.polys([across(xa, ya, yb, zk, zk - zf)], `fill="${C.gMid}"`, { cls, ...k3 });
      page.polys([rect(xa, xb, ya, yb, zf)], framed(C.face, C.far2, fw), { cls, ...k3 });
      page.text(faces.jp, SIGNS.end, 0, 0, { size: size / 4, matrix: mk.map((v, i) => (i < 4 ? v * 4 : v)), rot: Math.atan2(mk[1], mk[0]) * DEG, fill: C.lavW, cls, ...k3 }); // as setOn: out of the next tile
    };
    lantern(19, 21.1, 1.5, 2.9, 0.62, 46, 6, 'd');
    lantern(18.2, 21.5, 0.95, 3.25, 0.4, 72, 7, 'm');
    const post = Q([b.W3(0.3, -0.2), b.W3(0.7, -0.2), b.W3(0.7, 0), b.W3(0.3, 0)]), pside = Q([b.W3(0.7, -0.2), b.back(b.W3(0.7, -0.2), 0.28), b.back(b.W3(0.7, 0), 0.28), b.W3(0.7, 0)]);
    poly([pside], C.deep, k3);
    poly([post], C.gDeep, k3);
    lit([post], C.rimGreen, 0.3, k3);
    poly([rimBand(post, 3, 5, rng(58), { spikes: 0, taper: 0.2 })], C.rimGreen, k3);
    poly([b.side], C.deep, k3);
    poly([q], C.panel, k3);
    const put = (u, v) => b.at(0.8 - (v * cap) / w, 0.08 + (u * cap * 0.86) / (hb - 0.36));
    tubeWord(t, put, perM(b.W3(0.5, 0.5)) * cap, C.rimGreen, { core: C.gWhite, hot: 0.36, opt: k3 });
  }
  // portfolio, near and big: channel letters on a long beam angled off the studio's wall toward the street, its near end out
  // past the frame's edge, its far end on the wall over the second shop (in the next tile). Under the one camera its top and
  // foot run to their own vanishing point and its underside shows; the letters, oblique, are set where they stand (the near
  // ones bigger), white-hot faces edged cyan, their returns showing under them, a hard band of their light round them a step
  // over the wall.
  // Their light lands: on the beam's top edge and its underside, as a hard raked wedge on the wall behind from the beam's foot,
  // on the slab's underside, on the pier's side and on the canopy under it
  {
    const t = P.word.toUpperCase(), be = 26 / DEG, d = [Math.cos(be), 0, Math.sin(be)], nf = [d[2], 0, -d[0]], L = 9.6, xf = 7, zf = WALL - 0.2, ya = 2.55, em = 1.1 / CAP;
    // s metres along the beam from its near end, h up, k out from its face toward the street
    const S3 = (s, h, k = 0) => [xf - d[0] * (L - s) + nf[0] * k, h, zf - d[2] * (L - s) + nf[2] * k];
    lit([torn(Q([[xf, 2.3, WALL], [xf, 3.2, WALL], [-4, 4, WALL], [-4, 2.3, WALL]]), 10, 25)], C.led, 0.13, k2);
    lit([torn(Q([[xf, 2.45, WALL], [xf, 3, WALL], [0.5, 3.75, WALL], [0.5, 2.4, WALL]]), 8, 26)], C.led, 0.2, k2);
    lit([flat(-9, 5.4, 4, WALL, 0.9)], C.led, 0.2, k2);
    lit([flat(-1.5, 5.2, 4, WALL, 0.9)], C.led, 0.28, k2);
    lit([across(5.4, 1.2, 4, WALL, 0.3)], C.led, 0.3, k23);
    const cf = rect(-9, 5.4, 2.04, 2.3, WALL - 0.8);
    poly([flat(-9, 5.4, 2.04, WALL, 0.8)], C.deep, k23);
    poly([cf], C.shade, k23);
    lit([rect(-9, 5.4, 2.17, 2.3, WALL - 0.8)], C.led, 0.3, k23);
    poly([rimBand(cf, 2, 6, rng(70), { spikes: 1, t0: 0.08, t1: 0.96 })], C.led, k23);
    const bb = ya - 0.34, front = Q([S3(0, bb), S3(L, bb), S3(L, ya), S3(0, ya)]);
    poly([Q([S3(0, bb), S3(L, bb), S3(L, bb, -0.38), S3(0, bb, -0.38)])], C.teal, k23);
    poly([front], C.panel, k23);
    poly([rimBand(front, 2, 7, rng(71), { spikes: 0 })], C.led, k23);
    const s0 = L - 1.35 - (page.measure(F, t, 100) * em) / 100;
    setOn(t, (s, h) => S3(s, h, 0.02), s0, ya, em, { paint: line(C.teal, 13), ...k2 }, 0.22, 1);
    setOn(t, (s, h) => S3(s, h, -0.13), s0, ya, em, { fill: C.ledOff, ...k2 }, 0.22);
    setOn(t, (s, h) => S3(s, h, 0.02), s0, ya, em, { paint: framed(C.mintW, C.led, 3.6), ...k2 }, 0.22, 1);
  }
  // projects, the nearest of all: a lightbox knocked askew on its post at the kerb, its near end toward the camera and over
  // its tile's edge, receding to the left, tilted up toward its near end. Lit from inside: a white-hot band through its face
  // stepping out to pink at its top and its foot in hard steps, the word dark on it and set where it stands; a short bloom
  // round it, its near end rimmed pink. Its light on its post and on the wet ground round its foot in two hard steps
  {
    const t = J.word.toUpperCase(), wb = 3, H = 0.68, b = box(2.2, 7.9, wb, 0.16, 0.08, 0.08 + H, -1.05, 0.25), em = 0.4 / CAP;
    const P4 = (u0, u1, v0, v1) => Q([b.W3(u0, v0), b.W3(u1, v0), b.W3(u1, v1), b.W3(u0, v1)]);
    spill([b.G(0.16, -0.3), b.G(1.04, -0.3), b.G(1.14, 0.9), b.G(0.04, 0.9)], C.pink, [[0.18, 0.66], [0.26, 0.36]], 50);
    const posts = [0.5].map((u) => { const a = b.W3(u - 0.03, 0), c = b.W3(u + 0.03, 0); return Q([[a[0], 0, a[2]], [c[0], 0, c[2]], c, a]); });
    poly(posts, C.deep, k3);
    poly(posts.map((p, i) => rimBand(p, 3, 5, rng(52 + i * 10), { spikes: 0, taper: 0.2 })), C.pink, k3);
    page.polys([b.face], line(C.pink, 14, { op: 0.14 }), k3);
    page.polys([b.face], line(C.pink, 6, { op: 0.26 }), k3);
    poly([b.side, b.face], C.deep, k3);
    poly([rimBand(b.side, 3, 5, rng(53), { spikes: 0 })], C.pink, k3);
    poly([P4(0.012, 0.988, 0.07, 0.93)], C.pink, k3);
    poly([P4(0.018, 0.982, 0.18, 0.82)], C.pinkW, k3);
    poly([P4(0.022, 0.978, 0.34, 0.66)], C.lavW, k3);
    setOn(t, (s, h) => b.W3(s / wb, h / H), 0.12, 0.14, em, { fill: C.deep, ...k3 });
  }
}
