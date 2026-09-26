// ─────────────────────────────────────────────────────────────────────────────
//  The characters, painted once into offscreen canvases (FIG.*) with the mural
//  kit, in the Tang manner of the Mogao caves: full faces, long arched brows,
//  narrow eyes, small red mouths, iron-wire outlines in earth red and ink,
//  mineral colours, soft red shading at the edges of the flesh.
//  Each figure is written as SVG path data in its own coordinates.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const FIG = {};
const FIGFN = {};
// paint on first use (the lab boards and every scene only pay for what they draw)
const NO_GROUND = new Set(['kinUpDark', 'kinBodyDark', 'kinHeadDark']);
// busts end at the canvas foot: fade them out above it, so a tall 9:16 frame never shows a cut edge
const FADE_FOOT = new Set(['ax_red_cool', 'ax_red_tear', 'ax_white_closed', 'ax_white_smile', 'ax_white_tear', 'kin', 'kinBody', 'kinBodyDark', 'priest']);
function fadeFoot(cv, y0 = 1250, y1 = 1400) {
  const c = cv.getContext('2d'), g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.55, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  c.save(); c.globalCompositeOperation = 'destination-out'; c.fillStyle = g; c.fillRect(0, y0, cv.width, y1 - y0 + 4); c.restore();
}
function fig(name) { if (!FIG[name]) { FIG[name] = FIGFN[name](); if (!SKETCH && !NO_GROUND.has(name)) groundUnder(FIG[name]); if (FADE_FOOT.has(name)) fadeFoot(FIG[name]); } return FIG[name]; }

// ── feature helpers (face parts as path strings) ──
// eye: inner corner (x0,y0) → outer corner (x1,y1); open = lid height; smile lifts the lower lid; look shifts the iris (−1…1)
function eyeParts(x0, y0, x1, y1, open, o = {}) {
  const { smile = 0.5, look = 0, flick = 8, irisR = open * 0.95 } = o;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, w = x1 - x0;
  const up = `M${x0} ${y0} C${x0 + w * 0.22} ${my - open * 1.1} ${x0 + w * 0.7} ${my - open * 1.25} ${x1} ${y1} l${Math.sign(w) * flick} ${-flick * 0.55}`;
  const lo = `M${x0 + w * 0.08} ${y0 + 1} C${x0 + w * 0.35} ${my + open * (0.55 - smile * 0.35)} ${x0 + w * 0.75} ${my + open * (0.5 - smile * 0.5)} ${x1 - w * 0.04} ${y1 + 1}`;
  const white = `M${x0} ${y0} C${x0 + w * 0.22} ${my - open * 1.1} ${x0 + w * 0.7} ${my - open * 1.25} ${x1} ${y1} C${x0 + w * 0.75} ${my + open * (0.5 - smile * 0.5)} ${x0 + w * 0.35} ${my + open * (0.55 - smile * 0.35)} ${x0} ${y0} Z`;
  const ix = mx + look * Math.abs(w) * 0.22, iy = my - open * 0.1;
  return { up, lo, white, ix, iy, ir: irisR };
}
function paintEye(c, E, o = {}) {
  const { lw = 3, lineCol = C.ink, lowCol = C.lineRed } = o;
  pigment(c, E.white, '#F3EBDC', { edge: 0.2, edgeW: 3, mottle: 0.05, grain: 0.05, seed: 5 });
  c.save(); c.clip(P2(E.white));
  c.fillStyle = '#2A1D18'; c.beginPath(); c.arc(E.ix, E.iy, E.ir, 0, TAU); c.fill();
  c.fillStyle = '#0E0908'; c.beginPath(); c.arc(E.ix, E.iy, E.ir * 0.5, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,248,235,0.85)'; c.beginPath(); c.arc(E.ix - E.ir * 0.35, E.iy - E.ir * 0.35, E.ir * 0.18, 0, TAU); c.fill();
  c.restore();
  mline(c, E.up, { w: lw, color: lineCol, taper: [0.1, 0.25], seed: 21 });
  mline(c, E.lo, { w: lw * 0.45, color: lowCol, taper: [0.2, 0.3], seed: 22, alpha: 0.8 });
}

// ellipse as a path (rotation rad); rev draws it the other way round (a hole under the nonzero rule)
function ellD(cx, cy, rx, ry, rot = 0, rev = false, n = 48) {
  const pts = []; for (let i = 0; i < n; i++) { const a = (rev ? -1 : 1) * i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); }
  return polyD(pts);
}

// ── 阿羞 · bust, three-quarter view turned to her right, looking back at us with a small smile (1400²) ──
const AX = {
  face: 'M588 440 C574 470 566 505 566 544 C566 584 578 620 600 650 C616 672 630 688 650 692 C686 696 736 686 766 656 C784 638 794 620 800 600 L800 520 C796 480 786 452 766 432 C736 412 700 404 664 406 C630 408 604 420 588 440 Z',
  faceLine: 'M588 442 C574 470 566 505 566 544 C566 584 578 620 600 650 C616 672 630 688 650 692 C686 696 736 686 766 656 C784 638 794 620 800 600',
  chinFold: 'M628 703 C646 711 672 711 692 703',
  neck: 'M628 660 C636 700 642 740 648 792 L806 788 C800 740 794 690 792 604 C780 636 756 662 728 676 C700 690 670 694 648 690 Z',
  neckL: 'M636 704 C640 736 644 764 646 792',
  neckR: 'M792 612 C796 680 800 740 806 788',
  neckRings: ['M658 736 C700 746 750 742 796 724', 'M662 762 C704 772 756 768 802 752'],
  ear: 'M800 516 C814 506 830 512 832 536 C834 562 824 586 810 596 C802 600 796 594 797 584 Z',
  earIn: 'M806 528 C816 526 822 536 820 550 C818 564 812 572 806 576',
  browN: 'M664 500 C690 485 728 481 764 494',
  browF: 'M634 503 C621 493 606 490 592 495',
  crease: 'M672 518 C692 509 718 507 740 511',
  nose: 'M664 500 C662 530 658 560 648 592',
  noseB: 'M638 603 C646 608 656 607 663 601 C667 597 666 591 661 589',
  lipU: 'M626 640 C636 633 643 633 648 637 C654 632 662 632 670 638 C660 643 654 645 648 644 C640 645 632 644 626 640 Z',
  lipL: 'M629 642 C636 655 660 657 668 640 C658 645 640 646 629 642 Z',
  lipLine: 'M620 633 C627 640 638 643 648 643 C658 643 667 640 676 631',
  huadian: 'M650 446 C644 454 644 462 650 468 C656 462 656 454 650 446 Z M637 458 C643 458 647 462 650 468 C644 468 640 464 637 458 Z M663 458 C657 458 653 462 650 468 C656 468 660 464 663 458 Z',
  cap: 'M588 442 C586 400 604 364 640 342 C690 314 760 318 806 348 C846 376 862 426 856 480 C852 530 836 566 812 596 L800 520 C796 480 786 452 766 432 C736 412 700 404 664 406 C630 408 604 420 588 442 Z',
  lock: 'M766 432 C786 456 798 488 802 524 C792 510 780 486 770 462 Z',
  knot: 'M632 350 C652 304 716 290 780 294 C826 298 852 318 858 346 C806 330 700 330 632 350 Z',
  bun: 'M626 346 C606 300 626 246 676 222 C722 200 792 204 830 236 C862 264 868 314 846 346 C800 330 700 330 626 346 Z',
  top: 'M700 226 C692 188 712 156 750 150 C788 146 812 170 810 200 C808 222 796 236 780 240 C752 232 724 230 700 226 Z',
  comb: 'M634 352 C664 318 724 306 782 316 L780 332 C730 324 674 332 648 362 Z',
  robe: 'M644 790 C596 798 540 812 500 836 C462 860 446 900 438 960 C430 1040 418 1200 400 1400 L1116 1400 C1096 1220 1082 1060 1070 980 C1060 912 1032 862 988 836 C940 808 870 792 814 786 Z',
  armN: 'M944 900 C956 1000 966 1160 980 1400', armF: 'M552 904 C540 1000 530 1160 516 1400',
  chest: 'M620 786 C680 796 760 796 830 782 L852 802 L736 916 L612 800 Z',
  bandU: 'M628 790 C658 830 690 872 724 918 L752 900 C718 858 688 820 662 782 Z',
  bandT: 'M820 780 L852 800 C800 852 740 912 676 974 L650 952 C712 894 772 836 820 780 Z',
  scarfF: 'M646 790 C598 792 544 806 508 832 C472 858 458 900 452 950 C446 1016 444 1080 452 1150 C462 1230 486 1300 520 1400 L588 1400 C552 1310 530 1230 522 1150 C514 1070 516 1010 528 960 C542 904 578 866 626 842 Z',
  scarfN: 'M812 786 C866 784 924 798 966 824 C1010 852 1036 904 1046 968 C1056 1036 1048 1110 1026 1190 C1004 1270 968 1340 950 1400 L884 1400 C906 1330 938 1260 956 1180 C972 1106 978 1040 970 984 C960 930 930 880 884 856 C862 846 838 838 814 834 Z',
  scarfFolds: ['M602 812 C556 830 520 870 500 930 C486 990 484 1080 494 1160 C504 1240 526 1310 552 1380', 'M860 806 C912 822 952 862 976 924 C996 990 996 1080 978 1160 C960 1240 932 1310 914 1380'],
  robeFolds: ['M600 980 C606 1100 606 1240 600 1400', 'M860 990 C868 1110 874 1250 880 1400', 'M720 1010 C724 1130 728 1270 730 1400', 'M790 1040 C794 1160 798 1290 800 1400'],
};
FIGFN.axiu = () => {
  const cv = mk(1400, 1400), c = cv.getContext('2d');
  const hair = '#17151C', hairHi = '#3A3A48';
  // robe, then the chest, the crossed collar bands, the scarves (the whole body sits a little higher than drawn)
  c.save(); c.translate(0, -48);
  pigment(c, AX.robe, C.red, { seed: 6, edge: 0.45, edgeW: 10, wear: 0.22,
    shade: (t, sc) => { AX.robeFolds.forEach(d => sLine(t, sc, d, C.redDeep, 30, 0.35, 20)); sLine(t, sc, AX.armN, C.redDeep, 70, 0.4, 40); sLine(t, sc, AX.armF, C.redDeep, 70, 0.4, 40); sLine(t, sc, 'M470 900 C560 860 640 850 736 930 C820 860 900 856 1010 900', C.redDeep, 50, 0.3, 36); } });
  c.save(); c.clip(P2(AX.robe));
  for (let j = 0; j < 5; j++) for (let i = 0; i < 7; i++) {
    const x = 440 + i * 110 + (j % 2) * 55, y = 1010 + j * 92;
    c.save(); c.translate(x, y); c.globalAlpha = 0.6;
    for (let k = 0; k < 4; k++) { c.rotate(TAU / 4); c.translate(0, -8); petalShape(c, 9, 16); c.fillStyle = k % 2 ? C.yellow : '#E9D9B8'; c.fill(); c.translate(0, 8); }
    c.fillStyle = C.mala; c.beginPath(); c.arc(0, 0, 3.5, 0, TAU); c.fill(); c.restore();
  }
  c.restore();
  pigment(c, AX.neck, C.skin, { seed: 3, edgeW: 5, edgeCol: C.skinShade, shade: (t, sc) => { sEdge(t, sc, AX.neck, C.skinShade, 20, 0.45); sLine(t, sc, 'M636 700 C700 716 760 700 800 640', '#B8664A', 44, 0.35, 28); } });
  pigment(c, AX.chest, C.skin, { seed: 4, edgeW: 5, edgeCol: C.skinShade, shade: (t, sc) => sEdge(t, sc, AX.chest, C.skinShade, 22, 0.45) });
  mlines(c, [AX.neckL, AX.neckR], { w: 2, color: C.lineRed, seed: 19 });
  mlines(c, AX.neckRings, { w: 1.1, color: C.lineRed, seed: 20, alpha: 0.35 });
  const band = (d, seed) => { pigment(c, d, C.mala, { seed, edge: 0.45, edgeW: 3 }); mline(c, d, { w: 1.8, color: C.ink, seed: seed + 1 }); };
  band(AX.bandU, 8);
  // necklace (璎珞): gold beads on a U with three pendants, under the top collar
  const neckU = u => [lerp(652, 806, u), 812 + Math.sin(u * Math.PI) * 64];
  for (let i = 0; i <= 18; i++) { const [x, y] = neckU(i / 18); goldDot(c, x, y, 4); }
  [[0.3, 20], [0.5, 32], [0.7, 20]].forEach(([u, l]) => { const [x, y] = neckU(u); for (let k = 1; k <= 3; k++) goldDot(c, x, y + k * l / 3, 3); c.fillStyle = C.red; c.beginPath(); c.ellipse(x, y + l + 8, 5, 8, 0, 0, TAU); c.fill(); });
  band(AX.bandT, 10);
  for (let i = 0; i <= 10; i++) { const u = i / 10; goldDot(c, lerp(834, 664, u), lerp(792, 962, u), 2.8); }
  pigment(c, AX.scarfF, C.mala, { seed: 12, edge: 0.5, edgeW: 8, wear: 0.18, shade: (t, sc) => sLine(t, sc, AX.scarfFolds[0], C.malaDk, 24, 0.5, 16) });
  pigment(c, AX.scarfN, C.mala, { seed: 13, edge: 0.5, edgeW: 8, wear: 0.18, shade: (t, sc) => sLine(t, sc, AX.scarfFolds[1], C.malaDk, 24, 0.5, 16) });
  mlines(c, [AX.scarfF, AX.scarfN], { w: 2.4, color: C.ink, seed: 14 });
  mlines(c, AX.scarfFolds, { w: 1.5, color: C.ink, seed: 15, alpha: 0.65 });
  mlines(c, AX.robeFolds, { w: 1.7, color: C.redDeep, seed: 16, alpha: 0.75 });
  mline(c, 'M500 836 C462 860 446 900 438 960 C430 1040 418 1200 400 1400', { w: 2.4, color: C.ink, seed: 17 });
  mline(c, 'M988 836 C1032 862 1060 912 1070 980 C1082 1060 1096 1220 1116 1400', { w: 2.4, color: C.ink, seed: 18 });
  mlines(c, [AX.armN, AX.armF], { w: 1.8, color: C.redDeep, seed: 24, alpha: 0.8 });
  c.restore();
  // ear
  pigment(c, AX.ear, C.skin, { seed: 21, edgeW: 4, edgeCol: C.skinShade, shade: (t, sc) => sEdge(t, sc, AX.ear, C.skinShade, 10, 0.6) });
  mline(c, AX.ear, { w: 1.8, color: C.lineRed, seed: 22 }); mline(c, AX.earIn, { w: 1.3, color: C.lineRed, seed: 23 });
  // face
  pigment(c, AX.face, C.skin, { seed: 24, edgeW: 6, edgeCol: C.skinShade, mottle: 0.1,
    shade: (t, sc) => { sEdge(t, sc, AX.face, C.skinShade, 28, 0.45); sSpot(t, 716, 596, 58, C.blush, 0.32); sSpot(t, 598, 590, 30, C.blush, 0.22);
      sLine(t, sc, 'M662 490 C692 480 730 478 762 490', '#C98A6A', 14, 0.3, 10); sLine(t, sc, 'M656 506 C656 540 652 566 648 588', '#FFF4E4', 9, 0.45, 7); sSpot(t, 652, 470, 24, '#FFF4E4', 0.3); sSpot(t, 648, 672, 20, '#FFF4E4', 0.3); } });
  // hair: loops, knot, cap, lock
  pigment(c, AX.top, hair, { seed: 29, edge: 0.3, mottle: 0.08, shade: (t, sc) => sSpot(t, 748, 178, 30, hairHi, 0.5) });
  pigment(c, AX.bun, hair, { seed: 30, edge: 0.3, mottle: 0.08, shade: (t, sc) => { sSpot(t, 700, 262, 60, hairHi, 0.45); sSpot(t, 800, 250, 40, hairHi, 0.3); } });
  pigment(c, AX.cap, hair, { seed: 32, edge: 0.3, mottle: 0.08, shade: (t, sc) => sSpot(t, 730, 360, 70, hairHi, 0.4) });
  pigment(c, AX.knot, hair, { seed: 31, edge: 0.3, mottle: 0.08 });
  pigment(c, AX.lock, hair, { seed: 33, edge: 0.2 });
  const R = rng(5);
  for (let i = 0; i < 22; i++) {                      // strands combed up from the hairline to the crown
    const u = i / 21, x0 = lerp(596, 794, u) + R() * 5, y0 = u < 0.4 ? lerp(438, 408, u / 0.4) : lerp(406, 470, (u - 0.4) / 0.6);
    const x1 = lerp(650, 830, u) + R() * 8, y1 = 342 + R() * 8;
    mline(c, `M${x0} ${y0 - 6} C${x0 + (x1 - x0) * 0.2} ${y0 - 30} ${x1 - 8} ${y1 + 26} ${x1} ${y1}`, { w: 0.9, color: '#6C6878', seed: 40 + i, alpha: 0.45, breaks: 0.3 });
  }
  mlines(c, [AX.cap, AX.bun, AX.top], { w: 2, color: C.ink, seed: 34 });
  for (let i = 0; i < 12; i++) { const a = -2.9 + i * 0.2; mline(c, `M${730 + Math.cos(a) * 30} ${282 + Math.sin(a) * 22} C${730 + Math.cos(a) * 80} ${282 + Math.sin(a) * 60} ${730 + Math.cos(a + 0.5) * 100} ${282 + Math.sin(a + 0.5) * 60} ${730 + Math.cos(a + 0.9) * 90} ${290 + Math.sin(a + 0.9) * 40}`, { w: 0.9, color: '#6C6878', seed: 70 + i, alpha: 0.35, breaks: 0.3 }); }
  goldFill(c, AX.comb, { seed: 35 }); mline(c, AX.comb, { w: 1.4, color: C.goldDeep, seed: 36 });
  for (let i = 0; i < 12; i++) { const u = i / 11; mline(c, `M${lerp(652, 780, u)} ${lerp(350, 318, u)} l${1 - u * 3} 12`, { w: 1.1, color: C.goldDeep, seed: 90 + i, alpha: 0.8 }); }
  const fl = flowerSprite(22, { seed: 4, col: C.red }), fl2 = flowerSprite(17, { seed: 7, col: C.white, inner: C.red });
  drawSprite(c, fl, 846, 300, 1.1); drawSprite(c, fl2, 866, 262, 1); drawSprite(c, fl2, 632, 318, 0.9, { rot: 0.5 }); drawSprite(c, fl, 790, 206, 0.8, { rot: 1 });
  mline(c, 'M842 330 C880 322 912 330 936 352', { w: 2.6, color: C.goldDeep, seed: 37 }); goldDot(c, 938, 354, 5);
  for (let k = 0; k < 3; k++) { for (let j = 1; j <= 4; j++) goldDot(c, 928 + k * 10, 360 + j * 11, 2.4); c.fillStyle = C.red; c.beginPath(); c.arc(928 + k * 10, 410, 3.6, 0, TAU); c.fill(); }
  // features
  mline(c, AX.faceLine, { w: 2.5, color: C.lineRed, seed: 50 });
  mline(c, AX.chinFold, { w: 1.3, color: C.lineRed, seed: 51, alpha: 0.55 });
  mline(c, AX.browN, { w: 2.5, color: '#2A2226', seed: 52, taper: [0.35, 0.5] });
  mline(c, AX.browF, { w: 2.1, color: '#2A2226', seed: 53, taper: [0.35, 0.5] });
  mline(c, AX.crease, { w: 1.1, color: C.lineRed, seed: 54, alpha: 0.55 });
  paintEye(c, eyeParts(668, 534, 742, 523, 10, { smile: 0.65, look: 0.2, flick: 9 }), { lw: 3.3 });
  paintEye(c, eyeParts(628, 536, 594, 530, 7.5, { smile: 0.65, look: -0.1, flick: 5 }), { lw: 2.7 });
  mline(c, AX.nose, { w: 1.9, color: C.lineRed, seed: 55 }); mline(c, AX.noseB, { w: 1.9, color: C.lineRed, seed: 56 });
  pigment(c, AX.lipU, '#B7322A', { seed: 57, edge: 0.3, edgeW: 2, mottle: 0.05, grain: 0.05 });
  pigment(c, AX.lipL, '#C8423A', { seed: 58, edge: 0.3, edgeW: 2, mottle: 0.05, grain: 0.05, shade: (t, sc) => sSpot(t, 650, 648, 7, '#FFE3D0', 0.5) });
  mline(c, AX.lipLine, { w: 1.5, color: '#5A1812', seed: 59 });
  pigment(c, AX.huadian, C.red, { seed: 60, edge: 0.2, edgeW: 2, mottle: 0.05 });
  goldDot(c, 812, 602, 4.5); for (let j = 1; j <= 3; j++) goldDot(c, 813, 602 + j * 10, 2.8); c.fillStyle = C.mala; c.beginPath(); c.ellipse(813, 644, 4.5, 8, 0, 0, TAU); c.fill();
  return cv;
};
// ── 紧那罗 · profile bust facing left, head tilted up (1400²).  The halo is drawn by the scenes. ──
// Head paths are in head space, rotated by KN_TILT about the neck pivot so the same head can look up.
const KN_PIV = [700, 720], KN_TILT = -0.2;
const KN = {
  head: 'M604 380 C592 402 580 430 574 458 C572 470 574 480 571 490 C566 512 554 540 542 562 C538 570 542 578 552 580 C558 582 562 584 564 588 C562 596 559 602 559 607 C562 611 566 613 568 615 C564 620 561 626 562 631 C566 637 572 640 572 646 C568 660 560 672 566 684 C578 704 612 712 650 712 C700 712 740 696 768 670 C800 640 830 610 850 560 C870 510 872 440 850 390 C820 330 740 306 680 318 C640 328 614 350 604 380 Z',
  profile: 'M604 380 C592 402 580 430 574 458 C572 470 574 480 571 490 C566 512 554 540 542 562 C538 570 542 578 552 580 C558 582 562 584 564 588 C562 596 559 602 559 607 C562 611 566 613 568 615 C564 620 561 626 562 631 C566 637 572 640 572 646 C568 660 560 672 566 684 C578 704 612 712 650 712 C700 712 740 696 768 670',
  skull: 'M768 670 C800 640 830 610 850 560 C870 510 872 440 850 390 C820 330 740 306 680 318 C640 328 614 350 604 380',
  scalp: 'M604 380 C600 390 596 400 592 412 C640 420 700 440 742 474 C780 500 820 530 850 560 C870 510 872 440 850 390 C820 330 740 306 680 318 C640 328 614 350 604 380 Z',
  ear: 'M742 492 C760 470 792 472 800 500 C806 530 800 560 790 590 C786 610 790 630 786 650 C782 668 766 674 754 664 C746 654 750 636 748 620 C744 596 738 560 738 530 C738 512 738 500 742 492 Z',
  earIn: 'M756 502 C774 496 786 508 784 528 C782 548 774 566 768 580',
  brow: 'M578 468 C596 460 626 458 656 468',
  crease: 'M590 492 C602 486 616 486 628 492',
  nostril: 'M556 572 C562 567 571 569 573 577',
  mouth: 'M568 616 C574 618 581 618 588 614',
  lipU: 'M564 589 C562 596 559 602 559 607 C562 611 566 613 568 615 C572 613 573 609 570 603 C568 598 566 593 564 589 Z',
  lipL: 'M568 615 C564 620 561 626 562 631 C566 634 572 634 573 629 C574 624 572 619 568 615 Z',
  cheekLine: 'M578 586 C584 598 586 608 584 616',
};
const KB = {    // body (canvas space): a kasaya worn over both shoulders (通肩), seen from the side
  neck: 'M640 650 C646 720 650 800 656 920 L860 920 C866 820 856 700 830 600 Z',
  throat: 'M648 716 C650 760 652 820 656 900', nape: 'M836 640 C846 700 852 780 856 880',
  robe: 'M650 800 C626 828 606 866 596 916 C584 990 576 1100 572 1400 L1000 1400 C996 1220 990 1060 978 960 C966 880 920 800 852 760 C806 736 744 754 704 774 C682 784 664 792 650 800 Z',
  collar: 'M650 800 C664 792 682 784 704 774 C744 754 806 736 852 760 L862 786 C816 766 756 780 716 800 C694 810 676 820 660 830 Z',
  inner: 'M650 800 L660 830 C652 846 640 860 628 870 C622 846 630 818 650 800 Z',
  shoulder: 'M716 800 C770 790 840 804 896 850',
  folds: ['M706 800 C690 856 650 896 604 918', 'M764 810 C748 900 700 960 620 990', 'M826 824 C810 940 752 1030 640 1070', 'M890 858 C872 990 812 1100 700 1150', 'M946 910 C938 1060 890 1190 800 1260', 'M980 1040 C980 1180 950 1300 900 1380'],
  hem: 'M572 1300 C700 1280 860 1290 1000 1320',
};
const KSTYLE = {
  white: { robe: '#EEE9DF', fold: '#8E939C', light: '#FFFFFF', deep: '#9EA3AC', patch: 'rgba(90,96,108,0.22)', inner: '#C9D6DC', collar: '#CFA24A', line: '#5E5A58', skin: '#EACBAE', eye: '#2A1D18' },
  black: { robe: '#17120F', fold: '#000000', light: '#4A3A34', deep: '#050303', patch: 'rgba(120,30,20,0.35)', inner: '#6A1410', collar: '#6E5420', line: '#000000', skin: '#E2CFC2', eye: '#C4180E' },
  red: { robe: '#8E3B24', fold: '#4A1A10', light: '#FFD8B0', deep: '#3A120A', patch: 'rgba(40,14,8,0.28)', inner: C.mala, collar: C.yellow, line: C.ink, skin: '#E8C29E', eye: '#2A1D18' },
};
function paintKin(c, o = {}) {
  const part = o.part || 'all', ST = KSTYLE[o.style || 'white'];
  const robeCol = o.robe || ST.robe, innerCol = o.inner || ST.inner, skin = o.skin || ST.skin, scalp = o.scalp || '#7F8C92';
  // body: kasaya over both shoulders with its patchwork, a green under-robe at the throat, a string of beads
  const neck = () => {
    pigment(c, KB.neck, skin, { seed: 75, edgeW: 5, edgeCol: C.skinShade, shade: (t, sc) => { sEdge(t, sc, KB.neck, C.skinShade, 22, 0.45); sLine(t, sc, 'M660 720 C720 740 790 700 830 610', '#A8604A', 50, 0.35, 30); } });
    mlines(c, [KB.throat, KB.nape], { w: 2.2, color: C.lineRed, seed: 77 });
  };
  if (part === 'all') { c.save(); c.translate(KN_PIV[0], KN_PIV[1]); c.rotate(o.tilt ?? KN_TILT); c.translate(-KN_PIV[0], -KN_PIV[1]); neck(); c.restore(); }
  if (part === 'head') neck();
  if (part !== 'head') {
  pigment(c, KB.robe, robeCol, { seed: 71, edge: 0.45, edgeW: 10, edgeCol: ST.deep, wear: o.style === 'red' ? 0.2 : 0, mottle: 0.12, grain: 0.06, shade: (t, sc) => { KB.folds.forEach(d => sLine(t, sc, d, ST.fold, 26, 0.36, 18)); sLine(t, sc, KB.shoulder, ST.light, 34, 0.3, 26); sLine(t, sc, 'M990 980 C996 1140 1000 1300 1002 1400', ST.deep, 90, 0.45, 60); } });
  c.save(); c.clip(P2(KB.robe)); c.strokeStyle = ST.patch; c.lineWidth = 2.4;     // 田相: the kasaya's patchwork, faint
  [[1010, 0.0], [1180, 0.05]].forEach(([y, k]) => { c.beginPath(); c.moveTo(560, y + 30); c.quadraticCurveTo(780, y - 40, 1010, y + 20); c.stroke(); });
  [700, 860].forEach(x => { c.beginPath(); c.moveTo(x, 960); c.quadraticCurveTo(x + 10, 1180, x + 6, 1400); c.stroke(); });
  c.restore();
  pigment(c, KB.inner, innerCol, { seed: 72, edge: 0.4, edgeW: 3 });
  pigment(c, KB.collar, ST.collar, { seed: 73, edge: 0.45, edgeW: 3 });
  mline(c, KB.collar, { w: 1.8, color: ST.line, seed: 74 });
  mline(c, KB.robe, { w: 2.2, color: ST.line, seed: 78 }); mlines(c, KB.folds, { w: 1.4, color: ST.fold, seed: 79, alpha: 0.6 });
  if (o.beads !== false) { for (let i = 0; i < 30; i++) { const u = i / 29, x = lerp(836, 660, u) - Math.sin(u * Math.PI) * 30, y = lerp(790, 1010, u) + Math.sin(u * Math.PI) * 30; c.fillStyle = '#3B2418'; c.beginPath(); c.arc(x, y, 7.5, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,230,200,0.35)'; c.beginPath(); c.arc(x - 2.2, y - 2.2, 2.2, 0, TAU); c.fill(); } }
  }
  if (part === 'body') return;
  // head, tilted up about the neck
  c.save(); c.translate(KN_PIV[0], KN_PIV[1]); c.rotate(part === 'head' ? 0 : (o.tilt ?? KN_TILT)); c.translate(-KN_PIV[0], -KN_PIV[1]);
  pigment(c, KN.head, skin, { seed: 81, edgeW: 6, edgeCol: C.skinShade, mottle: 0.1, shade: (t, sc) => { sEdge(t, sc, KN.head, C.skinShade, 30, 0.45); sSpot(t, 640, 590, 50, C.blush, 0.28); sSpot(t, 600, 430, 40, '#FFF4E4', 0.35); sLine(t, sc, 'M572 500 C566 520 556 544 546 562', '#FFF6E8', 9, 0.7, 5); sLine(t, sc, 'M580 470 C600 462 626 460 650 468', '#FFF6E8', 7, 0.5, 5); sSpot(t, 574, 664, 14, '#FFF6E8', 0.5); } });
  pigment(c, KN.head, scalp, { seed: 82, edge: 0, mottle: 0.3, alpha: 0.8, shade: (t, sc) => { t.globalCompositeOperation = 'destination-in'; t.filter = `blur(${14 * sc}px)`; t.fillStyle = '#000'; t.fill(P2(KN.scalp)); t.filter = 'none'; t.globalCompositeOperation = 'source-atop'; sSpot(t, 720, 360, 90, '#B8C4C4', 0.35); } });
  pigment(c, KN.ear, skin, { seed: 83, edgeW: 4, edgeCol: C.skinShade, shade: (t, sc) => sEdge(t, sc, KN.ear, C.skinShade, 12, 0.6) });
  mline(c, KN.ear, { w: 2, color: C.lineRed, seed: 84 }); mline(c, KN.earIn, { w: 1.5, color: C.lineRed, seed: 85 });
  pigment(c, KN.lipU, '#A8503E', { seed: 86, edge: 0.3, edgeW: 2, mottle: 0.05, grain: 0.05 });
  pigment(c, KN.lipL, '#B25C48', { seed: 87, edge: 0.3, edgeW: 2, mottle: 0.05, grain: 0.05 });
  mline(c, KN.profile, { w: 2.6, color: C.lineRed, seed: 88 }); mline(c, KN.skull, { w: 2.4, color: C.lineRed, seed: 89 });
  mline(c, KN.brow, { w: 2.8, color: '#2A2226', seed: 90, taper: [0.25, 0.45] });
  mline(c, KN.crease, { w: 1.2, color: C.lineRed, seed: 91, alpha: 0.6 });
  const eye = 'M586 502 C594 494 610 492 626 498 C616 506 600 510 588 508 Z';
  pigment(c, eye, '#F3EBDC', { edge: 0.2, edgeW: 2, mottle: 0.05, grain: 0.05, seed: 92 });
  c.save(); c.clip(P2(eye)); c.fillStyle = o.eyeCol || ST.eye; c.beginPath(); c.arc(o.eyeX || 596, 500, 7.5, 0, TAU); c.fill();
  if (o.style === 'black') { c.fillStyle = '#FFB8A0'; c.beginPath(); c.arc((o.eyeX || 596) - 2, 498, 2.2, 0, TAU); c.fill(); }
  c.restore();
  if (o.style === 'black') { c.save(); c.globalAlpha = 0.5; const g = c.createRadialGradient(604, 500, 4, 604, 500, 40); g.addColorStop(0, 'rgba(60,10,10,0.7)'); g.addColorStop(1, 'rgba(60,10,10,0)'); c.fillStyle = g; c.fillRect(560, 460, 90, 80); c.restore(); }
  mline(c, 'M584 500 C594 492 610 490 628 497', { w: 3, color: C.ink, seed: 93, taper: [0.1, 0.3] });
  mline(c, 'M588 508 C600 511 614 508 624 502', { w: 1.2, color: C.lineRed, seed: 94, alpha: 0.8 });
  mline(c, KN.nostril, { w: 1.8, color: C.lineRed, seed: 95 }); mline(c, KN.mouth, { w: 1.6, color: '#5A1812', seed: 96 });
  mline(c, KN.cheekLine, { w: 1.2, color: C.lineRed, seed: 97, alpha: 0.5 });
  c.restore();
}
FIGFN.kin = () => { const cv = mk(1400, 1400); paintKin(cv.getContext('2d'), {}); return cv; };
FIGFN.kinDark = () => oxidised(fig('kin'), 1);
// ── 世尊 · colossal seated figure, frontal and symmetric (1600 × 1900).  Halo and mandorla are drawn by the scenes. ──
const mirD = d => d.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (m, x, y) => `${(1600 - parseFloat(x)).toFixed(1)} ${y}`);
const BU = {
  face: 'M800 404 C744 404 704 440 698 500 C694 548 700 600 716 640 C734 684 764 712 800 714 C836 712 866 684 884 640 C900 600 906 548 902 500 C896 440 856 404 800 404 Z',
  earL: 'M704 506 C684 500 674 516 678 542 C682 580 688 630 694 676 C698 700 716 704 720 688 C720 660 714 610 712 560 Z',
  hair: 'M698 500 C694 430 734 376 800 372 C866 376 906 430 902 500 C890 470 860 450 800 448 C740 450 710 470 698 500 Z',
  ushnisha: 'M734 386 C730 330 760 296 800 294 C840 296 870 330 866 386 C840 372 760 372 734 386 Z',
  neck: 'M748 700 C750 730 750 750 748 772 L852 772 C850 750 850 730 852 700 Z',
  robe: 'M800 760 C720 760 640 770 590 800 C540 832 516 900 510 980 C504 1060 500 1160 496 1240 C470 1260 420 1290 400 1340 C386 1380 394 1430 440 1450 L1160 1450 C1206 1430 1214 1380 1200 1340 C1180 1290 1130 1260 1104 1240 C1100 1160 1096 1060 1090 980 C1084 900 1060 832 1010 800 C960 770 880 760 800 760 Z',
  hands: 'M700 1230 C720 1204 760 1196 800 1198 C840 1196 880 1204 900 1230 C906 1256 880 1276 800 1278 C720 1276 694 1256 700 1230 Z',
  lap: 'M496 1240 C560 1224 680 1250 800 1262 C920 1250 1040 1224 1104 1240',
  throne: 'M360 1450 C420 1440 1180 1440 1240 1450 C1290 1500 1290 1560 1240 1600 C1180 1640 420 1640 360 1600 C310 1560 310 1500 360 1450 Z',
  base: 'M420 1620 L1180 1620 L1230 1760 C1100 1800 500 1800 370 1760 Z',
};
BU.earR = mirD(BU.earL);
FIGFN.buddha = () => {
  const cv = mk(1600, 1900), c = cv.getContext('2d');
  const skin = '#EBC98C', skinSh = '#C8914E', robe = '#A83C2A';
  // throne: stacked lotus petals over a stepped base
  pigment(c, BU.base, C.azure, { seed: 101, edge: 0.5, edgeW: 8, wear: 0.25 }); mline(c, BU.base, { w: 3, color: C.ink, seed: 102 });
  for (let row = 0; row < 2; row++) for (let i = 0; i < 13; i++) {
    const x = 400 + i * 66.7, y = row ? 1590 : 1500, up = row === 0;
    const d = up ? `M${x - 40} ${y + 60} C${x - 44} ${y + 10} ${x - 16} ${y - 40} ${x} ${y - 56} C${x + 16} ${y - 40} ${x + 44} ${y + 10} ${x + 40} ${y + 60} Z`
                 : `M${x - 40} ${y - 30} C${x - 44} ${y + 10} ${x - 16} ${y + 50} ${x} ${y + 64} C${x + 16} ${y + 50} ${x + 44} ${y + 10} ${x + 40} ${y - 30} Z`;
    pigment(c, d, i % 2 ? C.red : C.mala, { seed: 110 + i + row * 20, edge: 0.6, edgeW: 5, edgeCol: i % 2 ? C.redDeep : C.malaDk, shade: (t, sc) => sSpot(t, x, up ? y - 10 : y + 10, 26, C.white, 0.55) });
    mline(c, d, { w: 2, color: C.ink, seed: 130 + i + row * 20 });
  }
  pigment(c, BU.neck, skin, { seed: 171, edgeCol: skinSh, edgeW: 5, shade: (t, sc) => sEdge(t, sc, BU.neck, skinSh, 18, 0.5) });
  mlines(c, ['M760 730 C790 740 810 740 840 730', 'M758 752 C790 762 810 762 842 752'], { w: 1.6, color: C.lineRed, seed: 172, alpha: 0.7 });
  // robe with U-folds over both shoulders, arms, the lap
  pigment(c, BU.robe, robe, { seed: 140, edge: 0.5, edgeW: 12, wear: 0.18, shade: (t, sc) => { sEdge(t, sc, BU.robe, C.redDeep, 60, 0.5); sSpot(t, 800, 980, 220, '#E86A4A', 0.25); } });
  c.save(); c.clip(P2(BU.robe));
  for (let k = 0; k < 7; k++) { const w = 80 + k * 40, y0 = 780 + k * 14, dep = 120 + k * 58; mline(c, `M${800 - w} ${y0} C${800 - w * 0.9} ${y0 + dep * 0.8} ${800 + w * 0.9} ${y0 + dep * 0.8} ${800 + w} ${y0}`, { w: 2.4, color: C.redDeep, seed: 150 + k, alpha: 0.85 }); }
  c.restore();
  mlines(c, ['M590 800 C560 900 556 1060 566 1210', 'M1010 800 C1040 900 1044 1060 1034 1210', 'M520 1300 C640 1330 740 1340 800 1342 C860 1340 960 1330 1080 1300', 'M450 1380 C600 1410 1000 1410 1150 1380'], { w: 2.4, color: C.redDeep, seed: 160, alpha: 0.85 });
  pigment(c, 'M760 770 C780 800 820 800 840 770 C820 830 780 830 760 770 Z', C.mala, { seed: 165, edge: 0.4, edgeW: 3 });
  mline(c, BU.robe, { w: 3, color: C.ink, seed: 166 }); mline(c, BU.lap, { w: 2.6, color: C.ink, seed: 167 });
  pigment(c, BU.hands, skin, { seed: 168, edgeCol: skinSh, edgeW: 6, shade: (t, sc) => sEdge(t, sc, BU.hands, skinSh, 20, 0.5) });
  mline(c, BU.hands, { w: 2.2, color: C.lineRed, seed: 169 });
  mlines(c, ['M730 1236 C760 1226 790 1226 800 1232', 'M870 1236 C840 1226 810 1226 800 1232', 'M760 1250 C780 1246 800 1248 800 1252'], { w: 1.6, color: C.lineRed, seed: 170, alpha: 0.8 });
  // ears, face, hair, ushnisha
  [BU.earL, BU.earR].forEach((d, k) => { pigment(c, d, skin, { seed: 173 + k, edgeCol: skinSh, edgeW: 5, shade: (t, sc) => sEdge(t, sc, d, skinSh, 14, 0.5) }); mline(c, d, { w: 2, color: C.lineRed, seed: 175 + k }); });
  pigment(c, BU.face, skin, { seed: 177, edgeCol: skinSh, edgeW: 6, shade: (t, sc) => { sEdge(t, sc, BU.face, skinSh, 34, 0.45); sSpot(t, 800, 560, 90, '#FFF2D6', 0.45); } });
  pigment(c, BU.ushnisha, C.azureDk, { seed: 178, edge: 0.4, edgeW: 5 });
  pigment(c, BU.hair, C.azureDk, { seed: 179, edge: 0.4, edgeW: 5 });
  c.save(); c.clip(P2(BU.hair + ' ' + BU.ushnisha));    // snail-shell curls
  for (let y = 300; y < 500; y += 20) for (let x = 690 + ((y / 20) % 2) * 10; x < 910; x += 20) { c.fillStyle = 'rgba(120,160,200,0.5)'; c.beginPath(); c.arc(x, y, 6.5, 0, TAU); c.fill(); c.fillStyle = 'rgba(20,34,60,0.6)'; c.beginPath(); c.arc(x + 1.5, y + 1.5, 2.2, 0, TAU); c.fill(); }
  c.restore();
  mlines(c, [BU.face, BU.hair, BU.ushnisha], { w: 2.4, color: C.lineRed, seed: 180 });
  // features: long brows, lowered lids, the urna, a small mouth, a light moustache
  mlines(c, ['M720 520 C740 500 770 496 792 506', 'M880 520 C860 500 830 496 808 506'], { w: 2.6, color: '#2A2226', seed: 181 });
  mlines(c, ['M730 548 C748 556 770 558 790 552', 'M870 548 C852 556 830 558 810 552'], { w: 2.8, color: C.ink, seed: 182 });
  mlines(c, ['M734 544 C752 536 772 536 788 544', 'M866 544 C848 536 828 536 812 544'], { w: 1.2, color: C.lineRed, seed: 183, alpha: 0.6 });
  mlines(c, ['M800 508 C798 560 792 600 786 620', 'M782 624 C792 632 808 632 818 624'], { w: 2, color: C.lineRed, seed: 184 });
  pigment(c, 'M776 656 C788 650 796 652 800 655 C804 652 812 650 824 656 C812 666 788 666 776 656 Z', '#B24A3A', { seed: 185, edge: 0.3, edgeW: 2, mottle: 0.05 });
  mline(c, 'M774 655 C790 660 810 660 826 655', { w: 1.6, color: '#5A1812', seed: 186 });
  mlines(c, ['M770 642 C780 636 790 636 798 640', 'M830 642 C820 636 810 636 802 640'], { w: 1.4, color: C.mala, seed: 187, alpha: 0.8 });
  c.fillStyle = C.white; c.beginPath(); c.arc(800, 484, 9, 0, TAU); c.fill(); goldDot(c, 800, 484, 5);
  return cv;
};

// ── small figures for the wide shots ──
// 紧那罗 kneeling beside her body before the throne (side view, facing left, 700 × 440)
FIGFN.kneel = () => {
  const cv = mk(700, 440), c = cv.getContext('2d');
  const her = 'M478 364 C452 346 412 342 382 348 C342 356 302 346 264 344 C222 342 172 352 132 360 C106 366 88 374 84 386 C122 398 202 402 302 402 C382 402 442 398 480 388 Z';
  const hHead = 'M478 372 C478 352 494 340 512 342 C530 344 540 360 536 378 C532 394 516 402 500 398 C486 394 478 384 478 372 Z';
  const hHair = 'M512 342 C540 338 560 356 562 382 C566 404 580 420 604 432 C570 436 546 424 534 404 C530 396 536 384 536 376 C536 360 528 348 512 342 Z';
  pigment(c, her, C.red, { seed: 191, edge: 0.5, edgeW: 5, shade: (t, sc) => sLine(t, sc, 'M130 392 C230 404 380 402 470 390', C.redDeep, 14, 0.5) });
  pigment(c, 'M420 350 C360 356 300 368 240 372 C200 374 170 370 150 366 L146 378 C180 386 230 388 280 384 C340 378 390 370 424 362 Z', C.mala, { seed: 192, edge: 0.4, edgeW: 3 });
  pigment(c, hHead, C.skin, { seed: 193, edgeCol: C.skinShade, edgeW: 4 });
  pigment(c, hHair, '#17151C', { seed: 194, edge: 0.3 });
  mlines(c, [her, hHead, hHair, 'M300 360 C320 380 330 396 334 402', 'M200 360 C214 378 220 392 222 402'], { w: 1.8, color: C.ink, seed: 195 });
  // him, kneeling behind her, head bowed over her
  const him = 'M300 154 C284 186 278 236 282 282 L278 338 C256 342 238 350 238 362 C240 372 258 374 280 374 L446 374 C458 356 456 306 438 270 C426 230 404 172 372 152 C352 142 318 142 300 154 Z';
  const kHead = 'M300 130 C292 102 308 76 338 72 C368 70 390 92 388 122 C386 146 366 162 342 162 C320 162 306 150 300 130 Z';
  pigment(c, him, '#8E3B24', { seed: 196, edge: 0.5, edgeW: 6, shade: (t, sc) => { sLine(t, sc, 'M330 170 C356 220 372 280 390 350', '#4A1A10', 14, 0.5); sLine(t, sc, 'M440 280 C450 320 452 350 446 374', '#3A120A', 20, 0.5); } });
  pigment(c, kHead, '#E8C29E', { seed: 197, edgeCol: C.skinShade, edgeW: 4 });
  pigment(c, 'M300 122 C296 96 312 76 338 72 C366 70 386 88 388 112 C366 102 330 100 300 122 Z', '#7F8C92', { seed: 198, edge: 0.2, alpha: 0.75 });
  mlines(c, [him, kHead, 'M296 190 C318 240 340 300 350 374', 'M372 176 C394 230 410 300 420 374'], { w: 1.8, color: C.ink, seed: 199 });
  mline(c, 'M300 140 C296 146 292 150 288 152', { w: 1.4, color: C.lineRed, seed: 201 });
  mline(c, 'M262 318 C276 316 290 318 300 322', { w: 3, color: '#C21E1E', seed: 200 });
  return cv;
};

// ── 大祭司 · the high priest, profile facing left, arm out and pointing (1400²; the scenes mirror him to face right) ──
const PR = {
  head: 'M600 420 C590 440 580 460 578 474 C576 484 578 490 574 500 C568 520 556 548 540 570 C536 578 540 586 548 588 C554 590 558 592 562 596 C590 600 640 606 700 600 C740 596 760 580 770 560 C790 520 792 470 780 430 C760 400 700 392 600 420 Z',
  profile: 'M600 420 C590 440 580 460 578 474 C576 484 578 490 574 500 C568 520 556 548 540 570 C536 578 540 586 548 588 C554 590 558 592 562 596',
  hat: 'M592 428 C586 380 590 300 612 250 C640 200 740 196 772 244 C794 280 800 360 790 432 C740 410 660 408 592 428 Z',
  band: 'M590 404 C660 386 740 388 792 408 L790 436 C740 414 660 414 592 432 Z',
  hair: 'M770 430 C800 470 820 540 822 620 C824 700 810 770 790 820 L740 820 C760 740 770 660 760 590 Z',
  beard: 'M556 592 C540 640 536 720 552 800 C564 858 590 900 616 930 C636 880 652 820 684 766 C716 712 744 660 752 600 C712 616 640 616 598 600 C584 596 570 594 556 592 Z',
  ear: 'M726 480 C742 468 764 476 766 500 C768 526 760 550 748 562 C738 570 728 560 730 548 Z',
  brow: 'M586 476 C600 466 624 468 648 482',
  robe: 'M640 760 C600 790 580 840 572 900 C560 1000 556 1200 560 1400 L1020 1400 C1016 1200 1010 1000 996 900 C984 830 950 780 890 760 C820 736 700 740 640 760 Z',
  border: 'M640 760 C700 740 820 736 890 760 L900 792 C830 770 710 772 650 792 Z',
  sleeve: 'M700 820 C640 820 560 830 480 830 C420 830 370 820 330 806 L318 850 C320 900 350 980 420 1030 C470 1064 540 1060 580 1030 C620 1000 660 960 700 930 Z',
  hand: 'M336 786 C312 780 290 780 268 782 C258 784 256 796 266 798 C280 800 296 800 306 800 C300 806 300 816 310 820 C326 826 346 822 356 812 C366 800 360 790 336 786 Z',
};
FIGFN.priest = () => {
  const cv = mk(1400, 1400), c = cv.getContext('2d'), skin = '#E2B990', white = '#EDE3CC';
  pigment(c, PR.hair, '#C9C3B6', { seed: 301, edge: 0.4, edgeW: 6, shade: (t, sc) => sLine(t, sc, 'M780 460 C800 560 800 680 770 800', '#8E887C', 20, 0.5) });
  pigment(c, PR.robe, white, { seed: 302, edge: 0.5, edgeW: 12, edgeCol: '#B5A98E', wear: 0.2, shade: (t, sc) => { sLine(t, sc, 'M620 900 C640 1100 650 1250 650 1400', '#A89C82', 50, 0.5, 30); sLine(t, sc, 'M960 880 C980 1100 990 1250 996 1400', '#A89C82', 60, 0.5, 40); } });
  pigment(c, 'M572 1100 L1004 1100 L1008 1160 L566 1160 Z', C.red, { seed: 303, edge: 0.4, edgeW: 4 });
  pigment(c, PR.border, C.red, { seed: 304, edge: 0.4, edgeW: 3 });
  mlines(c, [PR.robe, 'M572 1100 L1004 1100', 'M566 1160 L1008 1160', 'M700 1160 C706 1260 710 1340 712 1400', 'M860 1160 C866 1260 870 1340 872 1400'], { w: 2.2, color: C.ink, seed: 305 });
  pigment(c, PR.head, skin, { seed: 306, edgeCol: C.skinShade, edgeW: 6, shade: (t, sc) => { sEdge(t, sc, PR.head, '#A8664A', 30, 0.5); sLine(t, sc, 'M600 520 C640 540 680 540 720 530', '#9A5A40', 30, 0.35, 20); sLine(t, sc, 'M574 500 C566 520 554 546 544 566', '#FFF1DC', 8, 0.5, 6); } });
  pigment(c, PR.ear, skin, { seed: 307, edgeCol: C.skinShade, edgeW: 4 }); mline(c, PR.ear, { w: 1.8, color: C.lineRed, seed: 308 });
  pigment(c, PR.beard, '#E6E0D2', { seed: 309, edge: 0.4, edgeW: 6, edgeCol: '#A39C8C', shade: (t, sc) => sLine(t, sc, 'M600 640 C610 740 610 820 616 900', '#B8B0A0', 26, 0.5, 16) });
  const R = rng(12);
  for (let k = 0; k < 18; k++) { const x0 = 560 + R() * 170, y0 = 600 + R() * 30; mline(c, `M${x0} ${y0} C${x0 - 10} ${y0 + 80} ${x0 - 20 + R() * 20} ${y0 + 180} ${lerp(x0, 616, 0.6)} ${y0 + 240 + R() * 70}`, { w: 1.2, color: '#8E887C', seed: 310 + k, alpha: 0.6, breaks: 0.3 }); }
  pigment(c, PR.hat, white, { seed: 330, edge: 0.5, edgeW: 8, edgeCol: '#B5A98E', shade: (t, sc) => sSpot(t, 650, 300, 60, '#FFFFFF', 0.4) });
  goldFill(c, PR.band, { seed: 331 }); c.fillStyle = C.red; c.beginPath(); c.ellipse(610, 418, 12, 15, 0, 0, TAU); c.fill(); goldDot(c, 610, 400, 5);
  mlines(c, [PR.hat, PR.band, PR.beard, PR.hair], { w: 2.2, color: C.ink, seed: 332 });
  mline(c, PR.profile, { w: 2.6, color: C.lineRed, seed: 333 });
  mline(c, PR.brow, { w: 4, color: '#E6E0D2', seed: 334, taper: [0.2, 0.3] }); mline(c, PR.brow, { w: 1.4, color: C.ink, seed: 335 });
  const eye = 'M586 502 C596 496 610 496 622 502 C612 508 598 510 588 508 Z';
  pigment(c, eye, '#F1E8D6', { seed: 336, edge: 0.2, edgeW: 2, mottle: 0.05, grain: 0.05 });
  c.save(); c.clip(P2(eye)); c.fillStyle = '#1E1512'; c.beginPath(); c.arc(592, 503, 5.5, 0, TAU); c.fill(); c.restore();
  mline(c, 'M582 500 C594 492 612 492 626 499', { w: 3.2, color: C.ink, seed: 337 }); mline(c, 'M588 488 C604 480 620 482 634 490', { w: 1.2, color: C.lineRed, seed: 338, alpha: 0.7 });
  mline(c, 'M560 540 C566 548 572 552 580 552', { w: 1.3, color: C.lineRed, seed: 339, alpha: 0.6 });
  // the pointing arm: a wide white sleeve with a red cuff, the hand
  pigment(c, PR.sleeve, white, { seed: 340, edge: 0.5, edgeW: 10, edgeCol: '#B5A98E', shade: (t, sc) => sLine(t, sc, 'M680 900 C600 990 500 1030 420 1010', '#A89C82', 40, 0.5, 26) });
  pigment(c, 'M330 806 L350 800 C360 830 362 870 356 900 L334 896 C340 866 338 836 330 806 Z', C.red, { seed: 341, edge: 0.4, edgeW: 3 });
  mlines(c, [PR.sleeve, 'M660 860 C600 900 540 930 470 940', 'M620 960 C560 990 500 1000 440 996'], { w: 2.2, color: C.ink, seed: 342 });
  pigment(c, PR.hand, skin, { seed: 343, edgeCol: C.skinShade, edgeW: 4 }); mline(c, PR.hand, { w: 2, color: C.lineRed, seed: 344 });
  return cv;
};

// ── 紧那罗 carrying her up the road (side view facing left, 520 × 620) ──
FIGFN.carry = () => {
  const cv = mk(520, 620), c = cv.getContext('2d'), skin = '#E8C29E';
  // him: leaning into the climb, robe in a stride
  const robe = 'M266 150 C240 162 226 196 222 240 C216 310 212 400 196 480 C188 530 172 574 150 606 L236 606 C248 570 262 540 276 516 C288 544 296 578 300 606 L380 606 C366 556 356 496 352 436 C346 356 348 276 342 220 C338 180 318 156 290 148 Z';
  const head = 'M250 110 C244 82 262 58 290 56 C318 54 336 76 334 104 C332 128 314 144 292 144 C272 144 256 130 250 110 Z';
  pigment(c, robe, '#8E3B24', { seed: 401, edge: 0.5, edgeW: 6, shade: (t, sc) => { sLine(t, sc, 'M336 240 C344 360 350 480 366 600', '#4A1A10', 24, 0.5); sLine(t, sc, 'M236 240 C232 360 226 460 206 560', '#4A1A10', 14, 0.35); } });
  mlines(c, [robe, 'M276 516 C272 466 268 420 268 380', 'M306 300 C314 360 322 440 330 520'], { w: 1.8, color: C.ink, seed: 402 });
  pigment(c, head, skin, { seed: 403, edgeCol: C.skinShade, edgeW: 4 });
  pigment(c, 'M250 102 C246 78 264 58 290 56 C316 54 334 72 334 96 C314 86 276 84 250 102 Z', '#7F8C92', { seed: 404, edge: 0.2, alpha: 0.75 });
  mline(c, head, { w: 1.8, color: C.lineRed, seed: 405 });
  mline(c, 'M252 104 C258 108 262 112 262 116', { w: 1.4, color: C.ink, seed: 415 });
  // her, cradled: head fallen back on the left, hair hanging, knees over his arm, a green scarf trailing
  const hair = 'M104 286 C94 330 92 380 100 430 C104 460 118 482 112 506 C136 484 138 452 132 420 C126 380 128 336 136 296 Z';
  const her = 'M140 246 C196 230 262 246 324 268 C362 254 400 238 432 238 C448 252 452 304 456 384 L434 388 C430 334 424 296 404 284 C374 304 342 322 310 320 C258 316 196 294 146 280 Z';
  const hHead = 'M88 272 C86 250 102 234 122 236 C142 238 154 254 150 274 C146 292 130 300 114 298 C98 296 90 286 88 272 Z';
  pigment(c, hair, '#17151C', { seed: 406, edge: 0.3 });
  pigment(c, her, C.red, { seed: 407, edge: 0.5, edgeW: 5, shade: (t, sc) => { sLine(t, sc, 'M150 272 C230 296 300 312 400 282', C.redDeep, 14, 0.5); sLine(t, sc, 'M420 250 C436 290 440 330 444 380', C.redDeep, 10, 0.4); } });
  pigment(c, 'M216 262 C240 320 244 390 232 460 C226 500 232 536 246 566 L230 570 C214 536 208 500 212 460 C222 394 218 330 198 268 Z', C.mala, { seed: 408, edge: 0.4, edgeW: 3 });
  pigment(c, hHead, C.skin, { seed: 409, edgeCol: C.skinShade, edgeW: 4 });
  pigment(c, 'M122 236 C104 234 90 244 86 260 C104 254 124 254 144 260 C140 246 134 238 122 236 Z', '#17151C', { seed: 410, edge: 0.2 });
  mlines(c, [her, hHead, hair], { w: 1.6, color: C.ink, seed: 411 });
  // his arms under her back and knees
  pigment(c, 'M262 176 C238 206 214 244 196 284 C210 298 236 298 256 290 C268 262 280 232 294 208 Z', '#7A3220', { seed: 412, edge: 0.5, edgeW: 4 });
  pigment(c, 'M190 282 C206 292 226 294 244 290 C240 300 222 306 204 304 C194 300 188 292 190 282 Z', skin, { seed: 416, edgeCol: C.skinShade, edgeW: 3 });
  pigment(c, 'M330 200 C360 230 392 262 420 276 C430 286 426 298 414 298 C386 290 352 262 322 232 Z', '#7A3220', { seed: 417, edge: 0.5, edgeW: 4 });
  mlines(c, ['M262 176 C238 206 214 244 196 284', 'M330 200 C360 230 392 262 420 276'], { w: 1.6, color: C.ink, seed: 413 });
  mline(c, 'M208 290 C216 296 228 298 238 296', { w: 3.4, color: '#C21E1E', seed: 414 });
  return cv;
};

// ── 无天 from behind on the cliff, his right hand at his side with the red thread (320 × 620) ──
FIGFN.wutianBack = () => {
  const cv = mk(320, 620), c = cv.getContext('2d');
  const robe = 'M104 132 C66 146 44 184 40 240 C34 340 30 470 14 616 L306 616 C290 470 286 340 280 240 C276 184 254 146 216 132 C184 120 136 120 104 132 Z';
  pigment(c, robe, '#1B1412', { seed: 501, edge: 0.5, edgeW: 6, edgeCol: '#4A1510', shade: (t, sc) => { sLine(t, sc, 'M160 150 C160 300 160 450 160 616', '#3A1210', 30, 0.5); sLine(t, sc, 'M50 260 C42 380 32 480 20 616', '#5A1A12', 16, 0.4); } });
  pigment(c, 'M92 140 C150 200 210 280 262 380 L282 360 C236 270 176 190 118 132 Z', '#4A1510', { seed: 505, edge: 0.4, edgeW: 3 });
  const arm = 'M252 170 C276 200 290 250 292 310 C294 350 290 380 286 400 L262 400 C264 370 266 330 262 290 C258 240 246 200 232 176 Z';
  pigment(c, arm, '#221816', { seed: 506, edge: 0.5, edgeW: 4, edgeCol: '#4A1510' });
  pigment(c, 'M262 398 C262 414 268 430 278 432 C290 432 292 414 288 398 Z', '#3A3432', { seed: 507, edge: 0.3 });
  mlines(c, [robe, arm, 'M100 200 C96 320 90 450 80 616', 'M210 220 C214 340 220 470 232 616'], { w: 1.6, color: '#050303', seed: 502 });
  mline(c, 'M260 398 C268 402 280 402 290 398', { w: 3.6, color: '#D42A1E', seed: 508 });
  pigment(c, 'M122 94 C118 64 134 42 160 40 C186 42 202 64 198 94 C196 118 180 132 160 132 C140 132 124 118 122 94 Z', '#3A3432', { seed: 503, edge: 0.3, edgeW: 4, shade: (t, sc) => sSpot(t, 150, 74, 24, '#6A6260', 0.5) });
  pigment(c, 'M116 86 C108 84 104 92 106 102 C108 110 114 114 120 110 Z', '#3A3432', { seed: 509, edge: 0.3 });
  pigment(c, 'M204 86 C212 84 216 92 214 102 C212 110 206 114 200 110 Z', '#3A3432', { seed: 510, edge: 0.3 });
  mline(c, 'M122 94 C118 64 134 42 160 40 C186 42 202 64 198 94 C196 118 180 132 160 132 C140 132 124 118 122 94 Z', { w: 1.6, color: '#050303', seed: 504 });
  return cv;
};

// underdrawing only: every figure painted again with SKETCH set
function sketchOf(name) { const key = name + 'Sketch'; if (!FIG[key]) { SKETCH = true; try { FIG[key] = FIGFN[name](); } finally { SKETCH = false; } } return FIG[key]; }
FIGFN.kinUp = () => { const cv = mk(1400, 1400); paintKin(cv.getContext('2d'), { tilt: -0.36 }); return cv; };
FIGFN.kinUpDark = () => oxidised(fig('kinUp'), 1);
FIGFN.kinBody = () => { const cv = mk(1400, 1400); paintKin(cv.getContext('2d'), { part: 'body' }); return cv; };
FIGFN.kinHead = () => { const cv = mk(1400, 1400); paintKin(cv.getContext('2d'), { part: 'head' }); return cv; };
FIGFN.kinBodyDark = () => { const cv = mk(1400, 1400); paintKin(cv.getContext('2d'), { part: 'body', style: 'black' }); return cv; };
FIGFN.kinHeadDark = () => { const cv = mk(1400, 1400); paintKin(cv.getContext('2d'), { part: 'head', style: 'black' }); return cv; };
// draw 紧那罗 (or his dark self) with the head tilted by `tilt` about the neck
function drawKin(c, tilt, dark = 0, o = {}) {
  const pose = (x, body, head) => { x.save(); x.translate(KN_PIV[0], KN_PIV[1]); x.rotate(tilt); x.translate(-KN_PIV[0], -KN_PIV[1]); x.drawImage(head, 0, 0); x.restore(); x.drawImage(body, 0, 0); };
  if (o.mask) {                                            // white and dark cross-faded through a mask (figure coords): dark·m + white·(1−m)
    const T = kinTmp(0), t = T.getContext('2d'), T2 = kinTmp(1), t2 = T2.getContext('2d');
    t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, 1400, 1400); pose(t, fig('kinBodyDark'), fig('kinHeadDark'));
    t.globalCompositeOperation = 'destination-in'; t.drawImage(o.mask, 0, 0, 1400, 1400);
    t2.globalCompositeOperation = 'source-over'; t2.clearRect(0, 0, 1400, 1400); pose(t2, fig('kinBody'), fig('kinHead'));
    t2.globalCompositeOperation = 'destination-out'; t2.drawImage(o.mask, 0, 0, 1400, 1400);
    t.globalCompositeOperation = 'lighter'; t.drawImage(T2, 0, 0); t.globalCompositeOperation = 'source-over';
    c.drawImage(T, 0, 0); return;
  }
  if (dark < 1) pose(c, fig('kinBody'), fig('kinHead'));
  if (dark > 0) { c.save(); c.globalAlpha *= dark; pose(c, fig('kinBodyDark'), fig('kinHeadDark')); c.restore(); }
}
const KIN_T = []; const kinTmp = k => (KIN_T[k] = KIN_T[k] || mk(1400, 1400));
// the eye (figure coords) after the head tilt
function kinEye(tilt) { const [px, py] = KN_PIV, x = 598 - px, y = 502 - py; return [px + x * Math.cos(tilt) - y * Math.sin(tilt), py + x * Math.sin(tilt) + y * Math.cos(tilt)]; }
function PREPARE_FIGURES() {}

// ── ink rising through a white robe (白衣化为黑袍): a mask in figure space, 1 below the front ──
let INKM = null;
function inkMask(level, seed = 3, soft = 14) {
  const S = 700; if (!INKM) INKM = mk(S, S);
  const m = INKM.getContext('2d'); m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, S, S);
  if (level <= 0) return INKM;
  const yf = lerp(1480, 180, clamp(level)) / 2;
  m.filter = `blur(${soft / 2}px)`; m.fillStyle = '#000'; m.beginPath(); m.moveTo(-20, S + 20);
  for (let x = -20; x <= S + 20; x += 6) {
    const n = (fbm2(x / 60, seed, 4, 11) - 0.5) * 90 + (vnoise(x / 14, seed + 2, 17) - 0.5) * 22;
    m.lineTo(x, yf + n);
  }
  m.lineTo(S + 20, S + 20); m.closePath(); m.fill();
  // capillary tendrils climbing ahead of the front
  m.filter = `blur(${soft / 5}px)`; m.strokeStyle = 'rgba(0,0,0,0.85)'; m.lineCap = 'round';
  const R = rng(seed * 7 + 1);
  for (let i = 0; i < 26; i++) {
    const x = R() * S, len = 30 + R() * 90, y0 = yf + (fbm2(x / 60, seed, 4, 11) - 0.5) * 90;
    m.lineWidth = 1 + R() * 3; m.beginPath(); m.moveTo(x, y0 + 6);
    let px = x, py = y0 + 6; for (let k = 0; k < 8; k++) { px += (R() - 0.5) * 8; py -= len / 8; m.lineTo(px, py); } m.stroke();
  }
  m.filter = 'none';
  return INKM;
}

// ── 紧那罗 walking down the road, small, in white (300 × 620) ──
FIGFN.walker = () => {
  const cv = mk(300, 620), c = cv.getContext('2d'), skin = '#EACBAE';
  const robe = 'M118 136 C92 150 78 190 74 240 C68 330 60 440 44 560 C40 590 38 604 36 616 L130 616 C136 590 142 566 150 548 C158 568 164 592 168 616 L262 616 C252 560 244 470 236 380 C230 300 226 230 218 190 C212 160 196 140 176 134 Z';
  pigment(c, robe, '#EEE9DF', { seed: 601, edge: 0.5, edgeW: 6, edgeCol: '#9EA3AC', mottle: 0.1, shade: (t, sc) => { sLine(t, sc, 'M212 200 C224 320 232 460 244 600', '#9EA3AC', 26, 0.5); sLine(t, sc, 'M88 220 C84 340 76 460 62 580', '#B8BCC4', 14, 0.4); } });
  pigment(c, 'M120 138 C140 170 160 200 176 240 L190 234 C176 194 156 164 138 136 Z', '#CFA24A', { seed: 602, edge: 0.4, edgeW: 2 });
  mlines(c, [robe, 'M150 548 C146 480 142 420 142 360', 'M184 280 C194 360 202 440 208 540'], { w: 1.6, color: '#5E5A58', seed: 603 });
  // staff with rings (锡杖)
  mline(c, 'M232 60 L220 616', { w: 4, color: '#7A5A2E', seed: 604 });
  c.strokeStyle = '#C9A45E'; c.lineWidth = 3; c.beginPath(); c.ellipse(233, 50, 16, 26, 0.05, 0, TAU); c.stroke(); for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(222 + k * 8, 62 + (k % 2) * 8, 6, 0, TAU); c.stroke(); }
  pigment(c, 'M212 250 C226 244 238 252 238 266 C236 280 222 286 210 280 Z', skin, { seed: 605, edgeCol: '#C49E80', edgeW: 3 });
  const head = 'M112 96 C106 66 124 42 150 40 C176 40 194 62 190 92 C188 116 170 132 150 132 C130 132 116 118 112 96 Z';
  pigment(c, head, skin, { seed: 606, edgeCol: '#C49E80', edgeW: 4, shade: (t, sc) => sSpot(t, 132, 70, 20, '#FFF4E4', 0.4) });
  pigment(c, 'M114 86 C110 62 126 42 150 40 C174 40 190 58 190 82 C172 72 136 70 114 86 Z', '#7F8C92', { seed: 607, edge: 0.2, alpha: 0.7 });
  mline(c, head, { w: 1.6, color: '#9A4A38', seed: 608 });
  mline(c, 'M118 92 C122 96 126 98 132 98', { w: 1.2, color: '#2A1D18', seed: 609 });
  return cv;
};

// ── 阿溜 and 阿刀, busts for the three trials (400 × 400) ──
function bustBase(c, o) {
  const { skin = '#E4BE98', robe = '#6A7A58', robe2 = '#3A4A30' } = o;
  const body = 'M60 400 C66 330 100 290 150 276 C176 270 224 270 250 276 C300 290 334 330 340 400 Z';
  pigment(c, body, robe, { seed: o.seed, edge: 0.5, edgeW: 6, edgeCol: robe2, shade: (t, sc) => sLine(t, sc, 'M120 300 C150 330 250 330 280 300', robe2, 30, 0.5) });
  mline(c, body, { w: 1.8, color: C.ink, seed: o.seed + 1 });
  const neck = 'M168 230 L168 286 C190 296 212 296 232 286 L232 230 Z';
  pigment(c, neck, skin, { seed: o.seed + 2, edgeCol: '#B98A68', edgeW: 4 });
  const face = 'M142 150 C140 120 164 96 200 96 C236 96 262 120 260 152 C260 190 250 222 230 240 C216 252 184 252 170 240 C150 222 142 190 142 150 Z';
  pigment(c, face, skin, { seed: o.seed + 3, edgeCol: '#B98A68', edgeW: 6, shade: (t, sc) => { sEdge(t, sc, face, '#B98A68', 18, 0.45); sSpot(t, 180, 150, 30, '#FFF0DC', 0.35); } });
  mline(c, face, { w: 1.6, color: C.lineRed, seed: o.seed + 4 });
  return face;
}
FIGFN.aliu = () => {                                            // the thief: thin, sly, a headband, a purse held up
  const cv = mk(400, 400), c = cv.getContext('2d');
  bustBase(c, { seed: 620, robe: '#7A6A4A', robe2: '#4A3A22' });
  pigment(c, 'M140 146 C140 110 164 84 202 84 C240 84 264 110 262 146 C240 128 170 126 140 146 Z', '#221C1A', { seed: 625, edge: 0.3 });
  pigment(c, 'M138 140 C170 124 236 124 264 140 L262 156 C236 142 168 142 140 158 Z', '#B5302A', { seed: 626, edge: 0.4, edgeW: 2 });
  mline(c, 'M262 150 C282 160 292 176 288 196', { w: 5, color: '#B5302A', seed: 627 });
  mlines(c, ['M166 172 C174 166 186 166 192 172', 'M214 172 C220 166 232 166 238 172'], { w: 2.4, color: C.ink, seed: 628 });
  c.fillStyle = '#1C1210'; [[180, 176], [226, 176]].forEach(([x, y]) => { c.beginPath(); c.arc(x + 4, y, 3.5, 0, TAU); c.fill(); });
  mline(c, 'M200 184 C198 198 196 206 202 210', { w: 1.6, color: C.lineRed, seed: 629 });
  mline(c, 'M180 222 C196 230 214 228 228 216', { w: 2, color: '#6A1A14', seed: 630 });   // a sly grin
  pigment(c, 'M296 300 C286 280 296 262 316 262 C338 262 346 282 336 300 C330 312 304 312 296 300 Z', '#B08650', { seed: 631, edge: 0.5, edgeW: 3 });
  mline(c, 'M304 266 C312 252 324 252 330 266', { w: 2, color: '#5A3A12', seed: 632 }); goldDot(c, 318, 290, 5);
  return cv;
};
FIGFN.adao = () => {                                            // the brawler: broad, bearded, a blade on the shoulder
  const cv = mk(400, 400), c = cv.getContext('2d');
  pigment(c, 'M250 60 L300 40 L318 60 L286 300 L262 300 Z', '#AEB6BC', { seed: 640, edge: 0.6, edgeW: 3, edgeCol: '#5A626A', shade: (t, sc) => sLine(t, sc, 'M290 50 L276 290', '#FFFFFF', 6, 0.6) });
  mline(c, 'M250 60 L300 40 L318 60 L286 300 L262 300 Z', { w: 1.6, color: C.ink, seed: 641 });
  bustBase(c, { seed: 650, robe: '#5A3A5A', robe2: '#2A1A2A', skin: '#D8A880' });
  pigment(c, 'M146 150 C146 108 168 86 202 86 C238 86 258 108 258 150 C240 132 164 132 146 150 Z', '#1A1614', { seed: 655, edge: 0.3 });
  pigment(c, 'M150 190 C150 230 172 262 200 266 C228 262 250 230 250 190 C236 214 222 222 200 222 C178 222 164 214 150 190 Z', '#2A2220', { seed: 656, edge: 0.3 });
  mlines(c, ['M160 164 C174 154 188 156 194 166', 'M210 166 C216 156 230 154 244 164'], { w: 4, color: C.ink, seed: 657 });
  c.fillStyle = '#1C1210'; [[180, 176], [226, 176]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 3.8, 0, TAU); c.fill(); });
  mline(c, 'M200 182 C196 196 196 204 204 206', { w: 1.8, color: C.lineRed, seed: 658 });
  mline(c, 'M184 214 C196 208 210 208 220 214', { w: 2.2, color: '#6A1A14', seed: 659 });
  mline(c, 'M300 40 L318 60', { w: 3, color: '#FFFFFF', seed: 660, alpha: 0.7 });
  return cv;
};

// ── 阿羞 from behind, in white, carrying the lamp (small, 320 × 640) ──
FIGFN.axBack = () => {
  const cv = mk(320, 640), c = cv.getContext('2d');
  const robe = 'M112 150 C84 170 70 220 66 290 C60 400 48 520 30 636 L290 636 C272 520 260 400 254 290 C250 220 236 170 208 150 Z';
  pigment(c, robe, '#F0EBE2', { seed: 701, edge: 0.5, edgeW: 6, edgeCol: '#A8ACB4', mottle: 0.1, shade: (t, sc) => { sLine(t, sc, 'M160 170 C160 320 160 470 160 636', '#C4C8CE', 30, 0.45); sLine(t, sc, 'M80 300 C72 420 60 530 44 636', '#B8BCC4', 18, 0.45); sLine(t, sc, 'M244 300 C252 420 264 530 278 636', '#B8BCC4', 18, 0.45); } });
  mlines(c, [robe, 'M114 260 C108 400 98 520 86 636', 'M206 260 C212 400 222 520 234 636'], { w: 1.4, color: '#6A6460', seed: 702, alpha: 0.8 });
  const hair = 'M122 70 C114 40 136 16 160 14 C186 16 206 40 198 70 C214 120 214 200 204 300 C198 380 190 440 176 500 L144 500 C130 440 122 380 116 300 C106 200 106 120 122 70 Z';
  pigment(c, hair, '#16131B', { seed: 703, edge: 0.3, mottle: 0.05, shade: (t, sc) => sLine(t, sc, 'M150 40 C150 160 152 300 158 480', '#4A4660', 10, 0.5) });
  for (let k = 0; k < 10; k++) mline(c, `M${130 + k * 6} 60 C${128 + k * 6} 200 ${136 + k * 5} 360 ${146 + k * 3} 492`, { w: 0.8, color: '#5E5A6E', alpha: 0.4, seed: 704 + k });
  drawSprite(c, flowerSprite(12, { seed: 4, col: '#C8342C' }), 196, 64, 1);
  // the lamp held out in front (right hand), so only the arm and glow show from behind
  pigment(c, 'M204 200 C236 214 260 236 276 262 L262 272 C248 250 228 232 204 222 Z', '#F0EBE2', { seed: 705, edge: 0.4, edgeW: 3, edgeCol: '#A8ACB4' });
  return cv;
};
// ── the high priest's door: tall, dark wood, bronze studs (900 × 1400) ──
FIGFN.door = () => {
  const cv = mk(900, 1400), c = cv.getContext('2d');
  pigment(c, 'M0 0 H900 V1400 H0 Z', '#3A2A22', { seed: 721, edge: 0.3, mottle: 0.2, bbox: [0, 0, 900, 1400] });
  pigment(c, 'M60 80 H840 V1400 H60 Z', '#5A2A1C', { seed: 722, edge: 0.6, edgeW: 12, edgeCol: '#1E0E08', mottle: 0.2, bbox: [60, 80, 840, 1400] });
  pigment(c, 'M40 40 C200 0 700 0 860 40 L860 90 L40 90 Z', '#2E221C', { seed: 723, edge: 0.4 });
  for (const x0 of [60, 450]) {
    for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) { const x = x0 + 60 + i * 70, y = 180 + j * 170; c.fillStyle = '#2A160C'; c.beginPath(); c.arc(x + 2, y + 3, 11, 0, TAU); c.fill(); goldDot(c, x, y, 10); }
  }
  mline(c, 'M450 90 L450 1400', { w: 5, color: '#1A0C06', seed: 724 });
  for (const x of [400, 500]) { c.strokeStyle = '#C9A45E'; c.lineWidth = 8; c.beginPath(); c.arc(x, 760, 34, 0.2, Math.PI - 0.2); c.stroke(); goldDot(c, x, 730, 16); }
  return cv;
};

// ── white versions of the small carrying and kneeling figures (the song) ──
function recolor(cv, map) {                                 // swap the v1 red robe / red dress for white
  return mapPixels(cv, (d, i) => {
    if (!d[i + 3]) return;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    for (const [from, to, tol] of map) {
      const dr = r - from[0], dg = g - from[1], db = b - from[2];
      if (dr * dr + dg * dg + db * db < tol * tol) { const k = (r + g + b) / (from[0] + from[1] + from[2]); d[i] = Math.min(255, to[0] * k); d[i + 1] = Math.min(255, to[1] * k); d[i + 2] = Math.min(255, to[2] * k); return; }
    }
  });
}
const WHITE_MAP = [[[142, 59, 36], [236, 232, 224], 70], [[122, 50, 32], [214, 212, 208], 60], [[168, 60, 42], [240, 236, 228], 80], [[74, 26, 16], [150, 154, 162], 50]];
FIGFN.carryW = () => recolor(FIGFN.carry(), WHITE_MAP);
FIGFN.kneelW = () => recolor(FIGFN.kneel(), WHITE_MAP);
