// ─────────────────────────────────────────────────────────────────────────────
//  阿羞 — gongbi portrait on silk.  One bust, three-quarter to the left, with
//  switchable dress (red courtesan silk / plain white), hair (up in a flying
//  bun with gold / down and loose) and expression (cool, tearful, smiling,
//  eyes closed).  Head paths live in head space and can be tilted about the
//  neck, so the same face can look down or lift.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const AXH = [720, 690];                                    // head pivot (base of the skull)
// Catmull-Rom spline through points → SVG path (smooth curves from landmarks)
function spl(pts, closed = false, k = 1 / 6) {
  const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    d += ` C${(p1[0] + (p2[0] - p0[0]) * k).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) * k).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) * k).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) * k).toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return d + (closed ? ' Z' : '');
}
const FACE_OUT = [[598, 452], [591, 488], [589, 526], [594, 562], [605, 600], [621, 636], [641, 666], [660, 684], [680, 693], [710, 690], [740, 677], [766, 656], [786, 628], [798, 596], [803, 564]];
const FACE_TOP = [[806, 530], [802, 480], [770, 436], [700, 414], [636, 424]];
const HAIRLINE = [[594, 474], [608, 449], [634, 432], [664, 423], [696, 419], [728, 421], [758, 430], [783, 448], [800, 478], [806, 520]];
const CAP_OUT = [[806, 520], [812, 560], [812, 600], [826, 620], [846, 598], [864, 552], [874, 492], [868, 430], [846, 380], [800, 346], [740, 332], [676, 340], [628, 364], [596, 398], [584, 440], [590, 476]];
const AF = {
  face: spl(FACE_OUT.concat(FACE_TOP), true),
  contour: spl(FACE_OUT),
  hairline: spl(HAIRLINE),
  neck: spl([[656, 676], [656, 712], [652, 742], [648, 772], [730, 776], [812, 770], [806, 720], [802, 660], [800, 600], [780, 640], [746, 674], [700, 692]], true),
  neckFar: spl([[656, 690], [655, 720], [652, 746], [648, 772]]), neckNear: spl([[800, 606], [802, 660], [806, 718], [812, 770]]),
  browN: spl([[663, 512], [688, 499], [722, 494], [760, 503]]), browF: spl([[634, 516], [620, 508], [604, 506], [591, 510]]),
  nose: spl([[654, 566], [649, 584], [643, 598]]), noseTip: 'M634 607 C640 613 650 613 657 607', nostril: 'M650 604 C655 604 659 608 656 612',
  lipU: 'M636 639 C643 634 649 633 654 636 C658 633 666 634 673 639 C665 643 659 645 654 644 C647 645 641 643 636 639 Z',
  lipL: 'M639 641 C645 652 664 653 671 640 C663 646 649 647 639 641 Z',
  lipLine: 'M632 638 C640 643 648 644 654 644 C662 644 669 642 676 637',
  smileLine: 'M628 635 C637 640 645 643 654 643 C664 643 673 638 682 629',
  lipUs: 'M630 636 C636 633 641 631 645 631.5 C649 632 651 634 653 634.5 C656 633 659 631 663 630.8 C669 630.5 675 630.5 679 631 C672 638 662 642 654 642 C645 642 637 640 630 636 Z',
  lipLs: 'M633 638 C638 648 648 652 656 652 C665 652 673 645 677 634 C670 640 662 643 654 643 C645 643 638 641 633 638 Z',
  dimples: ['M682 629 C684 628 685 626.5 686 624.5', 'M628 635 C626.5 634.5 625 633.5 624 631.5'],
  huadian: 'M648 460 C642 468 642 476 648 483 C654 476 654 468 648 460 Z M637 472 C642 472 646 476 648 483 C642 483 638 479 637 472 Z M659 472 C654 472 650 476 648 483 C654 483 658 479 659 472 Z',
  ear: 'M801 532 C815 522 831 530 833 554 C835 580 827 600 815 610 C807 616 801 608 802 598 Z',
  // hair
  cap: spl(HAIRLINE.concat(CAP_OUT.slice(1)), true),
  puff: spl([[798, 474], [834, 492], [856, 540], [854, 590], [836, 632], [812, 660], [818, 620], [818, 576], [812, 536]], true),
  lock: 'M802 496 C816 536 820 586 814 636 C810 666 802 690 796 710 C808 688 820 658 826 622 C834 572 828 526 810 488 Z',
  bun: spl([[662, 352], [632, 302], [628, 246], [650, 198], [694, 172], [744, 174], [776, 202], [784, 242], [770, 286], [740, 320], [716, 348]], true) + ' ' + spl([[704, 280], [726, 258], [732, 228], [716, 208], [690, 210], [674, 232], [676, 262]], true),
  bun2: spl([[758, 336], [786, 304], [816, 290], [840, 302], [842, 328], [822, 348], [790, 354]], true),
  knot: 'M640 352 C636 316 676 292 736 290 C798 288 846 312 852 350 C800 336 700 336 640 352 Z',
  backUp: 'M818 560 C856 614 866 694 854 764 L806 780 C812 704 808 634 796 588 Z',
  crown: 'M644 358 C690 326 792 320 848 348 L842 368 C790 342 694 346 658 380 Z',
};
// dress shapes (canvas space)
const BODY = [[648, 772], [600, 788], [548, 806], [500, 832], [468, 868], [454, 930], [446, 1040], [442, 1200], [440, 1400], [1036, 1400], [1032, 1200], [1028, 1040], [1020, 930], [1004, 862], [970, 826], [920, 800], [864, 782], [812, 770]];
const AD = {
  body: spl(BODY, true, 0.12),
  armN: spl([[986, 846], [1004, 930], [1004, 1060], [1000, 1200], [996, 1400]]), armF: spl([[486, 850], [478, 930], [476, 1060], [480, 1200], [484, 1400]]),
  collarA: 'M618 784 C666 846 758 852 846 784', collarB: 'M602 800 C658 876 766 884 862 796',
  chest: 'M618 784 C666 846 758 852 846 784 L812 770 L648 772 Z',
  clav: ['M676 796 C696 804 720 806 740 802', 'M770 800 C788 794 808 792 826 796'],
  crossBand: 'M648 772 C684 824 712 866 736 916 L756 904 C734 866 708 824 678 774 Z',
  crossBand2: 'M812 770 C796 814 772 860 736 916 L716 904 C750 860 776 814 790 772 Z',
  crossSkin: 'M648 772 C684 824 712 866 736 916 C772 860 796 814 812 770 Z',
  pibFar: 'M612 796 C556 806 508 834 486 878 C462 924 456 996 462 1076 C470 1166 494 1256 520 1336 L534 1400 L596 1400 C574 1330 556 1250 546 1170 C536 1090 534 1010 544 950 C554 890 582 848 630 820 Z',
  pibNear: 'M842 786 C904 798 962 826 990 872 C1014 914 1020 988 1012 1072 C1004 1162 980 1252 956 1332 L944 1400 L880 1400 C900 1330 922 1254 934 1174 C946 1094 950 1014 942 956 C932 894 898 850 842 814 Z',
  pibFolds: ['M596 816 C548 854 518 924 512 1004 C506 1094 522 1184 548 1274', 'M858 802 C914 834 952 884 970 964 C986 1044 978 1144 954 1244'],
  whiteFolds: ['M600 960 C608 1100 610 1250 604 1400', 'M880 960 C888 1100 894 1250 900 1400', 'M740 960 C744 1100 748 1250 748 1400'],
};

// ── eyes ──
// inner/outer corners, lid opening, look (−1 left … 1 right), mode: open | smile | down | closed
function axEye(c, x0, y0, x1, y1, open, o = {}) {
  const { look = 0, mode = 'open', lw = 3, near = true, tear = false } = o;
  const w = x1 - x0, mx = (x0 + x1) / 2, my = (y0 + y1) / 2, sgn = Math.sign(w);
  if (mode === 'closed') {
    const d = `M${x0} ${y0} C${x0 + w * 0.3} ${my + open * 0.9} ${x0 + w * 0.72} ${my + open * 0.8} ${x1} ${y1}`;
    mline(c, d, { w: lw, color: '#241616', taper: [0.1, 0.2], seed: 11 });
    for (let k = 0; k < (near ? 5 : 3); k++) { const u = 0.45 + k * 0.12, px = x0 + w * u, py = my + open * 0.75 * Math.sin(Math.PI * u) + (1 - u) * (y0 - my); mline(c, `M${px} ${py} l${sgn * (4 + k * 1.5)} ${6 + k}`, { w: lw * 0.4, color: '#241616', seed: 12 + k, taper: [0, 0.8] }); }
    mline(c, `M${x0 + w * 0.12} ${my - open * 0.9} C${x0 + w * 0.4} ${my - open * 1.6} ${x0 + w * 0.75} ${my - open * 1.5} ${x1 - w * 0.05} ${y1 - open * 0.6}`, { w: lw * 0.35, color: '#9A5A48', alpha: 0.5, seed: 13 });
    return;
  }
  if (mode === 'smile') {                                   // crescent: the cheeks lift the lower lid, the iris half hidden, a bright catchlight
    const up = `M${x0} ${y0} C${x0 + w * 0.22} ${my - open * 1.12} ${x0 + w * 0.68} ${my - open * 1.2} ${x1} ${y1}`;
    const lo = `C${x0 + w * 0.7} ${my - open * 0.22} ${x0 + w * 0.3} ${my - open * 0.28} ${x0} ${y0}`;
    const white = up + ' ' + lo + ' Z';
    pigment(c, white, '#F6EFE4', { edge: 0.35, edgeW: 2, edgeCol: '#C9A896', mottle: 0.03, grain: 0.02, seed: 5 });
    const ix = mx + look * Math.abs(w) * 0.2, iy = my - open * 0.42, ir = open * (near ? 0.92 : 0.84);
    c.save(); c.clip(P2(white));
    const g = c.createRadialGradient(ix, iy - ir * 0.2, ir * 0.1, ix, iy, ir);
    g.addColorStop(0, '#74483A'); g.addColorStop(0.55, '#3A2219'); g.addColorStop(1, '#170D0A');
    c.fillStyle = g; c.beginPath(); c.ellipse(ix, iy, ir * (near ? 1 : 0.8), ir, 0, 0, TAU); c.fill();
    c.fillStyle = '#0B0605'; c.beginPath(); c.ellipse(ix, iy, ir * 0.4 * (near ? 1 : 0.8), ir * 0.4, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(40,20,14,0.3)'; c.fillRect(x0 - 20, my - open * 2, Math.abs(w) + 40, open * 1.35);
    c.fillStyle = 'rgba(255,252,246,0.95)'; c.beginPath(); c.arc(ix - ir * 0.3, my - open * 0.52, ir * 0.2, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,252,246,0.6)'; c.beginPath(); c.arc(ix + ir * 0.34, my - open * 0.3, ir * 0.09, 0, TAU); c.fill();
    c.restore();
    mline(c, up + ` l${sgn * Math.abs(w) * 0.08} ${-open * 0.32}`, { w: lw, color: '#1C1212', taper: [0.12, 0.18], seed: 21 });
    mline(c, `M${x0 + w * 0.06} ${y0 - open * 0.04} C${x0 + w * 0.3} ${my - open * 0.24} ${x0 + w * 0.7} ${my - open * 0.2} ${x1 - w * 0.03} ${y1 - open * 0.05}`, { w: lw * 0.42, color: '#5A2A22', alpha: 0.85, seed: 22, taper: [0.3, 0.3] });
    mline(c, `M${x0 + w * 0.14} ${my + open * 0.34} C${x0 + w * 0.38} ${my + open * 0.18} ${x0 + w * 0.7} ${my + open * 0.14} ${x1 - w * 0.04} ${y1 - open * 0.12}`, { w: lw * 0.32, color: '#B0685A', alpha: 0.5, seed: 26, taper: [0.4, 0.4] });   // 卧蚕: the fold a smile pushes up under the eye
    mline(c, `M${x0 + w * 0.16} ${my - open * 1.45} C${x0 + w * 0.4} ${my - open * 1.95} ${x0 + w * 0.76} ${my - open * 1.9} ${x1 - w * 0.02} ${y1 - open * 0.9}`, { w: lw * 0.35, color: '#8A4A3A', alpha: 0.5, seed: 23 });
    for (let k = 0; k < (near ? 5 : 3); k++) {
      const u = 0.6 + k * 0.08, px = x0 + w * u, py = my - open * 0.95 * Math.sin(Math.PI * Math.min(u, 0.95)) + (u > 0.9 ? (y1 - my) : 0);
      mline(c, `M${px} ${py} q${sgn * (5 + k * 2)} ${-(3 + k)} ${sgn * (9 + k * 2.5)} ${-(2 + k * 0.6)}`, { w: lw * 0.42, color: '#1C1212', seed: 24 + k, taper: [0, 0.9] });
    }
    return;
  }
  const lowK = mode === 'smile' ? 0.2 : mode === 'down' ? 0.5 : 0.55, upK = mode === 'down' ? 0.9 : mode === 'smile' ? 1.2 : 1.3;
  const up = `M${x0} ${y0} C${x0 + w * 0.24} ${my - open * upK} ${x0 + w * 0.7} ${my - open * (upK + 0.1)} ${x1} ${y1}`;
  const lo = `C${x0 + w * 0.72} ${my + open * lowK} ${x0 + w * 0.3} ${my + open * (lowK + 0.1)} ${x0} ${y0}`;
  const white = up + ' ' + lo + ' Z';
  pigment(c, white, '#F6EFE4', { edge: 0.35, edgeW: 3, edgeCol: '#C9A896', mottle: 0.03, grain: 0.02, seed: 5 });
  const ix = mx + look * Math.abs(w) * 0.2, iy = my + (mode === 'down' ? open * 0.35 : -open * 0.05), ir = open * (near ? 0.98 : 0.9);
  c.save(); c.clip(P2(white));
  let g = c.createRadialGradient(ix, iy - ir * 0.2, ir * 0.1, ix, iy, ir);
  g.addColorStop(0, '#6B4232'); g.addColorStop(0.55, '#3A2219'); g.addColorStop(1, '#170D0A');
  c.fillStyle = g; c.beginPath(); c.ellipse(ix, iy, ir * (near ? 1 : 0.8), ir, 0, 0, TAU); c.fill();
  c.fillStyle = '#0B0605'; c.beginPath(); c.ellipse(ix, iy, ir * 0.42 * (near ? 1 : 0.8), ir * 0.42, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(40,20,14,0.35)'; c.fillRect(x0 - 20, my - open * 2, Math.abs(w) + 40, open * 0.9);  // lid shadow on the eyeball
  c.fillStyle = 'rgba(255,252,246,0.95)'; c.beginPath(); c.arc(ix - ir * 0.32, iy - ir * 0.32, ir * (tear ? 0.26 : 0.2), 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,252,246,0.7)'; c.beginPath(); c.arc(ix + ir * 0.35, iy + ir * 0.3, ir * 0.1, 0, TAU); c.fill();
  if (tear) { c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(mx, my + open * 0.45, Math.abs(w) * 0.4, open * 0.22, 0, 0, TAU); c.fill(); }
  c.restore();
  // lids, crease, lashes
  mline(c, up + ` l${sgn * Math.abs(w) * 0.1} ${-open * 0.45}`, { w: lw, color: '#1C1212', taper: [0.12, 0.18], seed: 21 });
  mline(c, `M${x0 + w * 0.45} ${my - open * upK * 0.95} C${x0 + w * 0.7} ${my - open * (upK + 0.05)} ${x0 + w * 0.9} ${y1 - open * 0.5} ${x1 + sgn * Math.abs(w) * 0.08} ${y1 - open * 0.42}`, { w: lw * 0.9, color: '#1C1212', taper: [0.3, 0.3], seed: 29, alpha: 0.9 });
  mline(c, `M${x0 + w * 0.1} ${y0 + 1} ${lo.replace('C', 'C').split(' ').slice(0, 0).join('')}C${x0 + w * 0.35} ${my + open * (lowK + 0.1)} ${x0 + w * 0.75} ${my + open * lowK} ${x1 - w * 0.04} ${y1 + 1}`, { w: lw * 0.4, color: tear ? '#B8584A' : '#9A5A48', alpha: 0.8, seed: 22, taper: [0.3, 0.3] });
  mline(c, `M${x0 + w * 0.16} ${my - open * 1.5} C${x0 + w * 0.4} ${my - open * 2.1} ${x0 + w * 0.76} ${my - open * 2.0} ${x1 - w * 0.02} ${y1 - open * 0.95}`, { w: lw * 0.35, color: '#8A4A3A', alpha: 0.55, seed: 23 });
  if (near && mode !== 'smile') for (let k = 0; k < 4; k++) { const u = 0.55 + k * 0.1, px = x0 + w * u, py = my + open * lowK * 0.9 * Math.sin(Math.PI * u) + 2; mline(c, `M${px} ${py} l${sgn * 2} ${3 + k * 0.6}`, { w: lw * 0.28, color: '#3A2420', alpha: 0.6, seed: 30 + k, taper: [0, 0.9] }); }
  for (let k = 0; k < (near ? 6 : 3); k++) {
    const u = 0.58 + k * 0.075, px = x0 + w * u, py = my - open * upK * 0.78 * Math.sin(Math.PI * Math.min(u, 0.95)) + (u > 0.9 ? (y1 - my) : 0);
    mline(c, `M${px} ${py} q${sgn * (5 + k * 2)} ${-(3 + k)} ${sgn * (9 + k * 2.5)} ${-(2 + k * 0.6)}`, { w: lw * 0.42, color: '#1C1212', seed: 24 + k, taper: [0, 0.9] });
  }
}

// ── the portrait ──
// v: { dress: 'red'|'white', hair: 'up'|'down', face: 'cool'|'tear'|'smile'|'closed', tilt: radians }
function paintAxiu(c, v) {
  const { dress = 'red', hair = 'up', face = 'cool', tilt = 0 } = v;
  const hairCol = '#16131B', hairHi = '#3E3B4C', skin = '#F3DCC6', skinSh = '#D9A48C', blush = '#E58D7C', line = '#9C5444';
  const R = rng(7);
  // hair that falls behind the shoulders
  if (hair === 'down') {
    pigment(c, 'M606 480 C570 560 552 670 560 780 C566 870 546 960 522 1060 C504 1140 500 1250 512 1400 L656 1400 C636 1260 638 1140 656 1030 C672 930 672 820 660 720 C652 640 640 560 630 500 Z', hairCol, { seed: 31, edge: 0.3, mottle: 0.05, grain: 0.05, shade: (t, sc) => sLine(t, sc, 'M598 560 C586 680 590 800 572 920', hairHi, 22, 0.45, 14) });
    pigment(c, 'M824 560 C872 640 892 760 884 880 C876 980 902 1080 930 1180 C950 1250 958 1330 954 1400 L842 1400 C852 1300 842 1200 822 1100 C802 1000 808 880 802 780 Z', hairCol, { seed: 32, edge: 0.3, mottle: 0.05, grain: 0.05 });
  } else pigment(c, AF.backUp, hairCol, { seed: 33, edge: 0.3, mottle: 0.06 });
  // neck
  pigment(c, AF.neck, skin, { seed: 41, edgeW: 5, edgeCol: skinSh, mottle: 0.05, grain: 0.04, shade: (t, sc) => { sEdge(t, sc, AF.neck, skinSh, 18, 0.45); sLine(t, sc, 'M646 706 C700 722 760 700 796 640', '#C98A74', 46, 0.35, 30); } });
  mlines(c, [AF.neckFar, AF.neckNear], { w: 1.6, color: line, seed: 42, alpha: 0.8 });
  // dress
  if (dress === 'red') {
    pigment(c, AD.body, '#B5302A', { seed: 51, edge: 0.45, edgeW: 12, edgeCol: '#6E1715', mottle: 0.12, grain: 0.08,
      shade: (t, sc) => { sLine(t, sc, AD.armN, '#6E1715', 80, 0.45, 50); sLine(t, sc, AD.armF, '#6E1715', 80, 0.45, 50); sSpot(t, 740, 980, 200, '#E0584A', 0.35); } });
    c.save(); c.clip(P2(AD.body));                        // small gold roundels on the silk
    for (let j = 0; j < 6; j++) for (let i = 0; i < 8; i++) { const x = 440 + i * 90 + (j % 2) * 45, y = 960 + j * 80; c.save(); c.translate(x, y); c.globalAlpha = 0.55; for (let k = 0; k < 6; k++) { c.rotate(TAU / 6); c.fillStyle = '#E8C57A'; c.beginPath(); c.ellipse(0, -7, 3, 6, 0, 0, TAU); c.fill(); } c.fillStyle = '#F6E2A8'; c.beginPath(); c.arc(0, 0, 3, 0, TAU); c.fill(); c.restore(); }
    c.restore();
    pigment(c, AD.chest, skin, { seed: 52, edgeW: 5, edgeCol: skinSh, mottle: 0.04, grain: 0.03, shade: (t, sc) => { sEdge(t, sc, AD.chest, skinSh, 18, 0.4); AD.clav.forEach(d => sLine(t, sc, d, '#D09A82', 8, 0.45, 5)); } });
    mlines(c, AD.clav, { w: 0.9, color: line, alpha: 0.35, seed: 57 });
    const band = `${AD.collarA} L862 800 C766 888 656 880 600 806 Z`;
    pigment(c, band, '#C99A45', { seed: 53, edge: 0.5, edgeW: 3, edgeCol: '#7E5A1C', mottle: 0.06, grain: 0.1 });
    for (let i = 0; i <= 22; i++) { const u = i / 22, x = lerp(606, 856, u), y = 800 + Math.sin(u * Math.PI) * 70; goldDot(c, x, y, 3.2); if (i % 2) { c.fillStyle = '#9A2A22'; c.beginPath(); c.arc(x, y + 7, 2.4, 0, TAU); c.fill(); } }
    mlines(c, [AD.collarA, AD.collarB], { w: 1.6, color: '#5A3A12', seed: 54 });
    // 璎珞
    const yl = u => [lerp(646, 818, u), 856 + Math.sin(u * Math.PI) * 66];
    for (let i = 0; i <= 26; i++) { const [x, y] = yl(i / 26); goldDot(c, x, y, i % 3 ? 3.2 : 4.6); }
    [0.25, 0.5, 0.75].forEach((u, k) => { const [x, y] = yl(u), L = k === 1 ? 46 : 30; for (let j = 1; j <= 4; j++) goldDot(c, x, y + j * L / 4, 2.8); c.fillStyle = k === 1 ? '#3F8A6C' : '#B5302A'; c.beginPath(); c.ellipse(x, y + L + 9, 6, 10, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(x - 2, y + L + 5, 2, 0, TAU); c.fill(); });
    mlines(c, [AD.armN, AD.armF], { w: 1.4, color: '#6E1715', seed: 55, alpha: 0.7 });
    mline(c, AD.body, { w: 2, color: '#4A1210', seed: 56, alpha: 0.9 });
  } else {
    pigment(c, AD.body, '#F1EBE0', { seed: 61, edge: 0.5, edgeW: 12, edgeCol: '#B8B2A8', mottle: 0.1, grain: 0.05,
      shade: (t, sc) => { sLine(t, sc, AD.armN, '#A8A6A6', 80, 0.45, 50); sLine(t, sc, AD.armF, '#A8A6A6', 80, 0.45, 50); AD.whiteFolds.forEach(d => sLine(t, sc, d, '#B9B6B4', 30, 0.4, 20)); sSpot(t, 740, 980, 180, '#FFFFFF', 0.35); } });
    pigment(c, AD.crossSkin, skin, { seed: 62, edgeW: 4, edgeCol: skinSh, mottle: 0.04, shade: (t, sc) => { sEdge(t, sc, AD.crossSkin, skinSh, 14, 0.4); AD.clav.forEach(d => sLine(t, sc, d, '#D09A82', 7, 0.4, 5)); } });
    pigment(c, AD.crossBand, '#C8D0D6', { seed: 63, edge: 0.4, edgeW: 3 }); pigment(c, AD.crossBand2, '#C8D0D6', { seed: 64, edge: 0.4, edgeW: 3 });
    mlines(c, [AD.crossBand, AD.crossBand2, AD.body, AD.armN, AD.armF].concat(AD.whiteFolds.slice(0, 2)), { w: 1.3, color: '#6A6460', seed: 65, alpha: 0.7 });
  }
  // 披帛: a sheer golden scarf over the shoulders (red dress only)
  if (dress === 'red') {
    for (const [d, sd] of [[AD.pibFar, 71], [AD.pibNear, 72]]) {
      pigment(c, d, '#E3C27A', { seed: sd, alpha: 0.72, edge: 0.6, edgeW: 6, edgeCol: '#A87E30', mottle: 0.15, grain: 0.05, shade: (t, sc) => { const b = bboxOf(d); const g = t.createLinearGradient(b[0], b[1], b[2], b[3]); g.addColorStop(0, 'rgba(255,240,200,0.55)'); g.addColorStop(1, 'rgba(160,110,40,0.35)'); t.fillStyle = g; t.fillRect(b[0], b[1], b[2] - b[0], b[3] - b[1]); } });
      mline(c, d, { w: 1.3, color: '#8A6420', seed: sd + 10, alpha: 0.8 });
    }
    mlines(c, AD.pibFolds, { w: 1.1, color: '#A87E30', seed: 73, alpha: 0.6 });
  }
  // hair over the shoulders (down)
  if (hair === 'down') {
    const lockD = 'M808 596 C846 660 858 760 846 860 C836 940 852 1020 880 1100 C898 1150 904 1220 892 1310 C888 1340 880 1370 872 1400 L832 1400 C846 1340 852 1280 848 1220 C844 1160 822 1110 808 1060 C790 1000 790 930 800 860 C810 780 802 690 786 640 Z';
    pigment(c, lockD, hairCol, { seed: 34, edge: 0.3, mottle: 0.05, grain: 0.05, shade: (t, sc) => sLine(t, sc, 'M812 640 C836 740 836 840 830 900', hairHi, 16, 0.5, 10) });
    for (let k = 0; k < 18; k++) { const o = (k / 17 - 0.5) * 36; mline(c, `M${800 + o * 0.3} ${616} C${840 + o} ${716} ${842 + o} ${836} ${832 + o} ${916} C${824 + o} ${996} ${850 + o} ${1076} ${874 + o * 0.6} ${1156 + R() * 80}`, { w: 0.9, color: R() < 0.45 ? '#6A6680' : '#0B0A0E', alpha: 0.5, seed: 300 + k, breaks: 0.15 }); }
    mline(c, lockD, { w: 1.2, color: '#050407', seed: 310, alpha: 0.9 });
  }
  // ── head (tilted about the neck) ──
  c.save(); c.translate(AXH[0], AXH[1]); c.rotate(tilt); c.translate(-AXH[0], -AXH[1]);
  // bun behind
  if (hair === 'up') {
    pigment(c, AF.bun2, hairCol, { seed: 35, edge: 0.3, mottle: 0.05, shade: (t, sc) => sSpot(t, 812, 312, 26, hairHi, 0.55) });
    pigment(c, AF.bun, hairCol, { seed: 36, edge: 0.3, mottle: 0.05, shade: (t, sc) => { sLine(t, sc, 'M646 300 C640 250 668 200 720 190', hairHi, 22, 0.5, 14); sSpot(t, 760, 230, 26, hairHi, 0.4); } });
    pigment(c, AF.knot, hairCol, { seed: 37, edge: 0.3, mottle: 0.05, shade: (t, sc) => sSpot(t, 740, 318, 60, hairHi, 0.4) });
    mlines(c, [AF.bun, AF.bun2, AF.knot], { w: 1.3, color: '#050407', seed: 38 });
    for (let k = 0; k < 12; k++) { const u = k / 11; mline(c, spl([[lerp(648, 700, u), lerp(340, 330, u)], [lerp(636, 690, u), lerp(280, 250, u)], [lerp(650, 720, u), lerp(214, 196, u)], [lerp(690, 760, u), lerp(186, 206, u)]]), { w: 0.75, color: '#6A6680', alpha: 0.35, seed: 400 + k }); }
  }
  // ear, face
  pigment(c, AF.ear, skin, { seed: 43, edgeW: 4, edgeCol: skinSh, shade: (t, sc) => sEdge(t, sc, AF.ear, skinSh, 12, 0.55) });
  mline(c, AF.ear, { w: 1.4, color: line, seed: 44 });
  pigment(c, AF.face, skin, { seed: 45, edgeW: 6, edgeCol: skinSh, mottle: 0.04, grain: 0.03,
    shade: (t, sc) => {
      sEdge(t, sc, AF.face, skinSh, 30, 0.42);
      sSpot(t, 730, face === 'smile' ? 584 : 596, 60, blush, face === 'smile' ? 0.46 : 0.32); sSpot(t, 608, face === 'smile' ? 580 : 590, 30, blush, face === 'smile' ? 0.38 : 0.26);
      sSpot(t, 666, 474, 44, '#FFF7EE', 0.5); sLine(t, sc, 'M656 552 C652 572 648 588 644 598', '#FFF7EE', 9, 0.55, 6); sSpot(t, 680, 682, 18, '#FFF7EE', 0.45);
      sLine(t, sc, 'M666 522 C692 508 730 506 758 516', '#C7866E', 14, 0.35, 10);                  // lid shadow
      sLine(t, sc, 'M628 528 C618 524 606 522 598 526', '#C7866E', 10, 0.3, 8);
      sSpot(t, 662, 600, 14, '#C98A74', 0.28);                                                         // beside the nose
      sLine(t, sc, 'M790 560 C794 600 786 636 766 660', '#C98A74', 26, 0.3, 18);                     // the near cheek turning away
      sLine(t, sc, AF.hairline, '#6A4A40', 12, 0.35, 8);                                              // soft shadow under the hairline
      sSpot(t, 752, 536, 32, '#E07A6A', 0.3); sSpot(t, 598, 544, 18, '#E07A6A', 0.24);                 // peach shadow at the outer corners
    } });
  // hair on the head
  pigment(c, AF.cap, hairCol, { seed: 46, edge: 0.3, mottle: 0.05, grain: 0.05, shade: (t, sc) => { sLine(t, sc, 'M626 420 C676 378 764 364 836 396', '#55526A', 26, 0.5, 16); sLine(t, sc, 'M806 470 C834 520 840 570 830 610', '#55526A', 16, 0.4, 10); } });
  pigment(c, AF.puff, hairCol, { seed: 49, edge: 0.3, mottle: 0.05, shade: (t, sc) => sSpot(t, 826, 530, 30, hairHi, 0.45) });
  pigment(c, AF.lock, hairCol, { seed: 47, edge: 0.2, mottle: 0.04 });
  const HL = new Poly(pl(AF.hairline)[0]);
  for (let i = 0; i < 34; i++) {                             // fine strands combed up from the hairline to the crown
    const u = (i + 0.5) / 34, [x0, y0] = HL.at(u * HL.L);
    const x1 = lerp(662, 846, u) + R() * 8, y1 = 352 + R() * 6;
    mline(c, `M${x0} ${y0 - 5} C${x0 + (x1 - x0) * 0.15} ${y0 - 40} ${x1 - 8} ${y1 + 34} ${x1} ${y1}`, { w: 0.75, color: R() < 0.5 ? '#77738E' : '#2A2834', alpha: 0.4, seed: 60 + i, breaks: 0.2 });
  }
  for (let i = 0; i < 6; i++) mline(c, `M${796 + i * 3} ${470 + i * 4} C${808 + i * 2} ${540} ${808 + i} ${600} ${794 + i} ${680 - i * 6}`, { w: 0.8, color: '#4A4658', alpha: 0.5, seed: 90 + i });
  mlines(c, [AF.cap, AF.puff, AF.lock], { w: 1.2, color: '#050407', seed: 48, alpha: 0.9 });
  // soft hairline: short fine hairs where hair meets skin, and two loose strands
  mline(c, 'M804 496 C814 550 808 610 794 660 C788 682 786 700 790 722', { w: 1.1, color: '#16131B', alpha: 0.8, seed: 520 });
  mline(c, 'M808 502 C820 558 816 616 802 670', { w: 0.9, color: '#16131B', alpha: 0.6, seed: 521 });
  mline(c, 'M598 474 C588 510 586 548 592 584', { w: 0.9, color: '#16131B', alpha: 0.55, seed: 522 });
  // ornaments (hair up): gold crown, flowers, a hanging buyao
  if (hair === 'up') {
    goldFill(c, AF.crown, { seed: 81 }); mline(c, AF.crown, { w: 1.2, color: '#6E4E16', seed: 82 });
    [[700, 336], [746, 330], [792, 334]].forEach(([x, y], k) => { c.fillStyle = k === 1 ? '#3F8A6C' : '#B5302A'; c.beginPath(); c.ellipse(x, y, 6, 8, 0, 0, TAU); c.fill(); goldDot(c, x, y - 12, 3); });
    const fl = flowerSprite(24, { seed: 4, col: '#C8342C' }), fw = flowerSprite(15, { seed: 9, col: '#F4EFE6', inner: '#C8342C' });
    drawSprite(c, fl, 852, 356, 1.1); drawSprite(c, fw, 872, 318, 1); drawSprite(c, fw, 632, 352, 0.9, { rot: 0.5 }); drawSprite(c, fl, 616, 318, 0.75, { rot: 1.1 });
    mline(c, 'M836 346 C872 338 900 346 918 366', { w: 2.4, color: '#8A6420', seed: 83 }); goldDot(c, 920, 368, 5);
    for (let k = 0; k < 3; k++) { const x = 910 + k * 10, L = [92, 110, 92][k]; c.strokeStyle = '#B08A3A'; c.lineWidth = 1; c.beginPath(); c.moveTo(918, 370); c.quadraticCurveTo(x, 370 + L * 0.5, x, 370 + L); c.stroke();
      for (let j = 1; j <= 6; j++) { const q = j / 6; goldDot(c, lerp(918, x, Math.sqrt(q)), 370 + L * q, 1.9); } c.fillStyle = k === 1 ? '#3F8A6C' : '#B5302A'; c.beginPath(); c.ellipse(x, 376 + L, 3.8, 6, 0, 0, TAU); c.fill(); }
    for (let k = 0; k < 6; k++) goldDot(c, 640 + k * 26, 330 - Math.sin(k / 5 * Math.PI) * 50 - k * 6, 3.2);
  } else {
    const fl = flowerSprite(20, { seed: 4, col: '#C8342C' }); drawSprite(c, fl, 820, 486, 1.05);   // one red flower behind the ear
  }
  // earring
  goldDot(c, 815, 612, 3.6); for (let j = 1; j <= 3; j++) goldDot(c, 816, 612 + j * 9, 2.2); c.fillStyle = '#F4EFE6'; c.beginPath(); c.arc(816, 648, 4.5, 0, TAU); c.fill();
  // contour, brows, eyes, nose, mouth
  mline(c, AF.contour, { w: 1.7, color: line, seed: 101 });
  mline(c, 'M660 704 C672 709 688 709 700 704', { w: 1, color: line, seed: 102, alpha: 0.25 });
  const browLift = face === 'tear' ? -3 : 0;
  c.save(); c.translate(0, browLift); mline(c, AF.browN, { w: 2.8, color: '#2A2226', seed: 103, taper: [0.3, 0.65] }); mline(c, AF.browF, { w: 2.3, color: '#2A2226', seed: 104, taper: [0.3, 0.65] }); c.restore();
  const mode = face === 'closed' ? 'closed' : face === 'smile' ? 'smile' : face === 'tear' ? 'down' : 'open';
  const look = face === 'cool' ? -0.55 : face === 'tear' ? -0.3 : face === 'smile' ? -0.12 : 0.1;
  axEye(c, 667, 543, 756, 531, face === 'cool' ? 12.5 : 14.5, { look, mode, lw: 3.6, near: true, tear: face === 'tear' });
  axEye(c, 627, 547, 591, 541, face === 'cool' ? 9.5 : 11, { look: -look, mode, lw: 3, near: false, tear: face === 'tear' });
  mline(c, AF.nose, { w: 1.4, color: line, seed: 105, alpha: 0.75 }); mline(c, AF.noseTip, { w: 1.5, color: line, seed: 106 }); mline(c, AF.nostril, { w: 1.2, color: line, seed: 107, alpha: 0.8 });
  const lipC = '#C8322E', lipC2 = '#D84A42';
  const sm = face === 'smile';
  pigment(c, sm ? AF.lipUs : AF.lipU, lipC, { seed: 108, edge: 0.3, edgeW: 2, mottle: 0.03, grain: 0.02 });
  pigment(c, sm ? AF.lipLs : AF.lipL, lipC2, { seed: 109, edge: 0.3, edgeW: 2, mottle: 0.03, grain: 0.02, shade: (t, sc) => sSpot(t, 657, 647, 6, '#FFE8DC', 0.6) });
  mline(c, sm ? AF.smileLine : AF.lipLine, { w: 1.3, color: '#6A1A14', seed: 110 });
  if (sm) mlines(c, AF.dimples, { w: 1, color: '#9C5444', seed: 112, alpha: 0.45, taper: [0.2, 0.8] });
  pigment(c, AF.huadian, '#C8342C', { seed: 111, edge: 0.2, edgeW: 2, mottle: 0.03 });
  if (face === 'tear') {                                    // one tear on the near cheek
    c.save(); c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(704, 562); c.bezierCurveTo(706, 584, 709, 602, 711, 616); c.stroke();
    const g = c.createRadialGradient(710, 620, 0, 711, 622, 5); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0.2)'); c.fillStyle = g; c.beginPath(); c.ellipse(711, 622, 3.2, 4.6, 0, 0, TAU); c.fill(); c.restore();
  }
  c.restore();
}
FIGFN.ax_red_cool = () => { const cv = mk(1400, 1400); paintAxiu(cv.getContext('2d'), { dress: 'red', hair: 'up', face: 'cool' }); return cv; };
FIGFN.ax_red_tear = () => { const cv = mk(1400, 1400); paintAxiu(cv.getContext('2d'), { dress: 'red', hair: 'up', face: 'tear' }); return cv; };
FIGFN.ax_white_closed = () => { const cv = mk(1400, 1400); paintAxiu(cv.getContext('2d'), { dress: 'white', hair: 'down', face: 'closed', tilt: 0.06 }); return cv; };
FIGFN.ax_white_smile = () => { const cv = mk(1400, 1400); paintAxiu(cv.getContext('2d'), { dress: 'white', hair: 'down', face: 'smile' }); return cv; };
FIGFN.ax_white_tear = () => { const cv = mk(1400, 1400); paintAxiu(cv.getContext('2d'), { dress: 'white', hair: 'down', face: 'tear', tilt: 0.05 }); return cv; };
