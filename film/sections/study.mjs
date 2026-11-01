// c8. Study: the rest before the credits, and the last paper on the page. Real sheets, in pencil, with what is written on them.
// Obsidian Second Brain is the one project title not in cut letters, on purpose: this row is the page's rest, and the sheets are its drawing.
// Pegged and cross-linked in red on the left. Numbered and fanned up out of the ink on the right, on a ground of blue hatch.
import { C, W, rng, pencil, hatch, redLine } from '../kit/draw.mjs';
import { para } from '../kit/type.mjs';

const RAD = Math.PI / 180;
const NOTE = 48, NUMBER = 44; // the hand's sizes here

export function draw(page, ctx) {
  const { Y, COPY, L0, faces } = ctx;
  const { gothic: Zen, hand: Hand } = faces;
  const y0 = Y.study, y1 = Y.credits, X = 750;
  const yt = y0 + 62;
  const R = rng(1303);
  // what stands under the seam into the ink never reaches the tile below it, where the ink would only cover it
  const here = { before: y1 };
  page.polys([[[-14, y0 - 4], [W + 14, y0 - 4], [W + 14, y1 + 30], [-14, y1 + 30]]], `fill="${C.douga}"`);

  page.text(Zen, COPY.brainTitle, L0, yt, { size: 41, fill: C.sumi });
  para(page, Zen, COPY.brainPhone, L0, yt + 38, 24, 31, { cls: 'd', measure: X - L0 });
  page.text(Zen, COPY.brainTarget, L0, yt + 108, { size: 18, fill: C.blue, cls: 'd' });
  para(page, Zen, COPY.brainPhone, L0, yt + 50, 41, 46, { cls: 'm', measure: X - L0 });
  // the stack, then the MIT heading directly on its own sheets, so that nothing under it reads as taught by it
  para(page, Zen, COPY.studyBody, X, y0 + 38, 18, 24, { cls: 'd', measure: W - X });
  page.text(Zen, COPY.studyTitle, X, y0 + 140, { size: 30, fill: C.sumi, cls: 'd' });
  page.text(Zen, COPY.studyWhen, X, y0 + 166, { size: 18, fill: C.sumi, cls: 'd' });
  para(page, Zen, COPY.studyPhone, X, y0 + 42, 41, 44, { cls: 'm', measure: W - X });
  page.text(Zen, COPY.studyTitlePhone, X, y0 + 174, { size: 41, fill: C.sumi, cls: 'm' });

  const edge = (a, b, w, over) => pencil(a, b, { w, over, R, restate: 0.2, wander: 0.6 });

  // the vault: three sheets lying loose, each with the page's own peg marks along its top, every one linked to the other two
  const sheet = (cx, cy, w, h, deg, word) => {
    const co = Math.cos(deg * RAD), si = Math.sin(deg * RAD), at = (a, b) => [cx + a * co - b * si, cy + a * si + b * co];
    const q = [at(-w / 2, -h / 2), at(w / 2, -h / 2), at(w / 2, h / 2), at(-w / 2, h / 2)];
    const pill = (a, half, r) => { const o = [], b = -h / 2 + 13; for (const s of [1, -1]) for (let i = 0; i <= 3; i++) { const t = (s * Math.PI) / 2 * -1 + (i / 3) * Math.PI; o.push(at(a + s * half + Math.cos(t) * r, b + Math.sin(t) * r)); } return o; };
    page.polys(q.flatMap((p, k) => edge(p, q[(k + 1) % 4], 5, 11)), `fill="${C.graphite}"`, { cls: 'pl' });
    page.polys([pill(0, 0, 5.5), pill(-w * 0.3, 9, 4), pill(w * 0.3, 9, 4)], `fill="${C.graphite}"`);
    const tw = page.measure(Hand, word, NOTE), o = at(-tw / 2, h * 0.25);
    page.text(Hand, word, o[0], o[1], { size: NOTE, fill: C.graphite, R, jit: 5, rot: deg });
    return at;
  };
  const [cs, code, logs] = COPY.brainNotes;
  const A = sheet(258, y0 + 238, 318, 92, -2.5, cs);
  const B = sheet(590, y0 + 236, 268, 92, 2.5, code);
  const D = sheet(618, y0 + 92, 186, 92, -4.01, logs);
  redLine(page, A(159, -14), B(-134, -8), R, 4.4);
  redLine(page, A(112, -46), D(-93, 30), R, 4.4);
  redLine(page, D(62, 46), B(66, -46), R, 4.4);

  // the courses: five sheets fanned up out of the ink, each with its number in its corner. The ground behind them is hatched,
  // so that they are paper shapes and not lines. They are laid right to left, so no sheet covers a neighbour's number.
  const radius = 1010, P = [1011, y1 - 86 + radius];
  const swing = [-10, -5, 0, 5, 10], turn = [-9.3, -4.01, 0, 4.01, 9.3], wide = [92, 110, 110, 110, 110];
  const ground = [[756, y1 - 74], [850, y1 - 110], [1011, y1 - 120], [1172, y1 - 110], [W + 14, y1 - 94], [W + 14, y1 - 60], [1172, y1 - 76], [1011, y1 - 84], [850, y1 - 76], [756, y1 - 50]];
  page.polys(hatch(ground, { angle: -52, gap: 11, w: 4.4, R, miss: 0.03, over: 3, doubleBack: 0 }), `fill="${C.blue}"`);
  [...COPY.studyNumbers.keys()].reverse().forEach((i) => {
    const th = swing[i] * RAD, c = [P[0] + Math.sin(th) * radius, P[1] - Math.cos(th) * radius];
    const co = Math.cos(turn[i] * RAD), si = Math.sin(turn[i] * RAD), down = 118;
    const q = [[c[0] - co * wide[i], c[1] - si * wide[i]], c, [c[0] - si * down, c[1] + co * down], [c[0] - co * wide[i] - si * down, c[1] - si * wide[i] + co * down]];
    page.polys([q], `fill="${C.douga}"`, here);
    page.polys([...edge(q[0], q[1], 5, 10), ...edge(q[1], q[2], 5, 8), ...(i ? [] : edge(q[0], q[3], 5, 8))], `fill="${C.graphite}"`, { cls: 'pl', ...here });
    const num = COPY.studyNumbers[i], w = page.measure(Hand, num, NUMBER), gap = 42;
    page.text(Hand, num, c[0] - co * (w + 9) - si * gap, c[1] - si * (w + 9) + co * gap, { size: NUMBER, fill: C.graphite, R, jit: 5, rot: turn[i] });
  });
}
