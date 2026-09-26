// ─────────────────────────────────────────────────────────────────────────────
//  The two leads, painted once into offscreen canvases (FIG.*) with the ink kit.
//  Everything is written as SVG path data in each figure's own coordinates.
//  Moving parts (ribbon tails, loose hair, dissolving edges) are drawn per frame
//  by the scenes on top of these cached paintings.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const FIG = {};

// ── 她 · close-up, looking back over her shoulder (profile facing left), 1400×1400 ──
// Head paths are in head space and placed with HER_HEAD (scale about a pivot); body paths are in canvas space.
const HER_HEAD = { px: 700, py: 540, s: 1.28, dx: 20, dy: -10 };
const HER = {
  profile: 'M648 392 C636 414 626 440 623 463 C621 477 624 487 627 494 C614 522 596 548 582 566 C575 575 579 584 590 586 C598 587 604 588 607 591 C603 597 599 602 598 607 C602 611 607 614 612 616 C607 619 602 624 602 629 C604 635 610 639 614 642 C610 651 606 661 608 671 C612 683 623 691 639 693',
  jaw: 'M639 693 C672 691 703 677 728 652',
  neckF: 'M652 699 C656 728 661 754 668 790',
  face: 'M648 392 C636 414 626 440 623 463 C621 477 624 487 627 494 C614 522 596 548 582 566 C575 575 579 584 590 586 C598 587 604 588 607 591 C603 597 599 602 598 607 C602 611 607 614 612 616 C607 619 602 624 602 629 C604 635 610 639 614 642 C610 651 606 661 608 671 C612 683 623 691 639 693 C672 691 703 677 728 652 L792 600 L782 470 L700 380 Z',
  neck: 'M652 699 C656 728 661 754 668 790 L784 800 C792 760 800 722 812 690 L728 652 C703 677 672 691 639 693 Z',
  lidUp: 'M639 506 C647 500 658 497 670 497 C676 497 681 498 686 496',
  lidLo: 'M640 508 C648 512 657 514 667 513',
  crease: 'M646 498 C656 492 668 491 681 493',
  iris: 'M646 499 C652 498 657 501 657 506 C657 510 653 513 648 512 C645 509 644 503 646 499 Z',
  brow: 'M630 472 C646 465 668 462 696 466',
  nostril: 'M594 577 C598 573 603 575 605 580',
  lipUp: 'M598 606 C603 602 612 603 625 610 C616 614 606 615 601 611 Z',
  lipLo: 'M602 617 C607 616 616 615 625 611 C619 622 610 630 603 628 C601 625 601 621 602 617 Z',
  stomion: 'M601 615 C608 614 617 613 625 611',
  mark: 'M637 427 C633 433 633 439 636 445 C640 439 640 433 637 427 Z',
  cap: 'M648 392 C662 356 700 326 752 316 C810 306 866 324 900 364 C932 404 946 470 936 540 C928 604 910 664 890 740 L826 740 C818 700 806 664 788 632 C770 600 754 572 742 540 C734 516 728 494 718 474 C706 448 686 420 648 392 Z',
  bun: 'M792 318 C774 272 800 222 850 212 C900 204 936 238 930 284 C926 322 896 344 856 346 C826 348 802 340 792 318 Z',
  band: 'M794 322 C820 342 880 344 924 318',
  strand: 'M704 452 C694 492 700 530 712 566 C722 598 718 634 728 676 C734 700 746 720 742 748',
  wisp: 'M690 440 C700 470 716 500 722 540 C726 566 738 590 752 612',
};
// body, canvas space
const HER_B = {
  robe: 'M652 802 C600 816 540 846 486 896 C440 940 410 1010 392 1100 C378 1180 372 1290 370 1400 L1330 1400 C1320 1260 1290 1120 1230 1010 C1170 910 1060 850 950 818 C900 804 860 796 830 792 Z',
  shoulderL: 'M652 802 C600 816 540 846 486 896 C440 940 410 1010 392 1100 C378 1180 372 1290 370 1400',
  shoulderR: 'M830 792 C900 804 1060 850 1170 910 C1250 960 1300 1080 1330 1240',
  collarBack: 'M640 806 C700 780 780 772 840 788 C880 798 912 818 930 842',
  collarTeal: 'M650 800 C710 776 784 768 842 784',
  collarCross: 'M646 810 C640 870 610 930 560 990 C520 1040 470 1080 420 1110',
  folds: ['M560 990 C590 1080 612 1190 620 1320', 'M700 900 C736 990 760 1100 772 1250', 'M1000 880 C1040 980 1070 1110 1086 1270', 'M1120 940 C1160 1030 1190 1150 1204 1300', 'M860 850 C880 940 896 1050 900 1180'],
  locks: [
    'M880 600 C930 700 930 800 900 900 C870 1000 900 1110 960 1220 C990 1280 1000 1340 996 1400',
    'M910 580 C980 690 990 810 960 930 C940 1020 960 1120 1020 1210 C1050 1260 1070 1330 1072 1400',
    'M850 620 C880 720 870 820 840 920 C820 1000 840 1100 880 1200 C900 1260 908 1330 904 1400',
  ],
};
function hsp(c, fn) { const h = HER_HEAD; c.save(); c.translate(h.px + h.dx, h.py + h.dy); c.scale(h.s, h.s); c.translate(-h.px, -h.py); fn(); c.restore(); }
function paperize(c, size, amt = 0.16) {                // let the paper grain show through every fill (inside the figure only)
  const w = c.canvas.width, h = c.canvas.height, t = mk(w, h), tc = t.getContext('2d');
  tc.drawImage(TEX.paper, 0, 0, size, size); tc.globalCompositeOperation = 'destination-in'; tc.drawImage(c.canvas, 0, 0);
  c.save(); c.globalCompositeOperation = 'source-atop'; c.globalAlpha = amt; c.drawImage(TEX.paper, 0, 0, size, size);
  c.globalCompositeOperation = 'multiply'; c.globalAlpha = amt * 0.8; c.drawImage(t, 0, 0); c.restore();
}
// light caught on the edges of a shape that face `dir` (a unit vector towards the light)
function rimLight(c, d, dir, o = {}) {
  const { color = 'rgba(240,215,160,1)', w = 7, alpha = 0.8, blur = 2, bbox = [0, 0, c.canvas.width, c.canvas.height] } = o;
  const [x0, y0, x1, y1] = bbox, t = mk(c.canvas.width, c.canvas.height), tc = t.getContext('2d'), P = new Path2D(d);
  tc.filter = `blur(${blur}px)`; tc.strokeStyle = color; tc.lineWidth = w * 2; tc.stroke(P); tc.filter = 'none';
  tc.globalCompositeOperation = 'destination-in'; tc.fill(P);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = Math.hypot(x1 - x0, y1 - y0) / 2;
  const g = tc.createLinearGradient(cx - dir[0] * r, cy - dir[1] * r, cx + dir[0] * r, cy + dir[1] * r);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.55, 'rgba(0,0,0,0.15)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  tc.fillStyle = g; tc.fillRect(0, 0, t.width, t.height);
  c.save(); c.globalAlpha *= alpha; c.drawImage(t, 0, 0); c.restore();
}
function paintHer(size = 1400) {
  const cv = mk(size, size), c = cv.getContext('2d'), R = rng(77);
  // ── neck + face (head space)
  hsp(c, () => {
    wash(c, HER.neck, { color: '#DDBFA3', alpha: 1, mottle: 0.08, edge: 0.7, edgeColor: '#B89276', edgeBlur: 10, edgeW: 7 });
    wash(c, HER.face, { color: C.skin, alpha: 1, mottle: 0.06, edge: 0.5, edgeColor: '#D9B99C', edgeBlur: 10, edgeW: 6 });
    c.save(); c.clip(new Path2D(HER.face));
    let g = c.createRadialGradient(664, 574, 4, 664, 574, 64); g.addColorStop(0, 'rgba(214,112,86,0.30)'); g.addColorStop(1, 'rgba(214,112,86,0)'); c.fillStyle = g; c.fillRect(560, 480, 220, 220);
    g = c.createRadialGradient(662, 494, 3, 662, 494, 30); g.addColorStop(0, 'rgba(206,96,70,0.38)'); g.addColorStop(1, 'rgba(206,96,70,0)'); c.fillStyle = g; c.fillRect(610, 450, 110, 100);
    g = c.createLinearGradient(690, 0, 790, 0); g.addColorStop(0, 'rgba(150,112,88,0)'); g.addColorStop(1, 'rgba(150,112,88,0.35)'); c.fillStyle = g; c.fillRect(680, 380, 120, 330);
    c.restore();
  });
  // ── robe: white silk, grey shading in the folds, fading into the paper below
  wash(c, HER_B.robe, { color: '#F4F1EA', alpha: 1, mottle: 0.1, edge: 0.9, edgeColor: '#C9C3B6', edgeBlur: 16, edgeW: 12 });
  HER_B.folds.forEach((d, i) => {
    const P = pl(d)[0]; c.save(); c.globalAlpha = 0.16; c.strokeStyle = '#A7A092'; c.lineWidth = 34; c.filter = 'blur(14px)';
    c.beginPath(); P.forEach(([x, y], k) => k ? c.lineTo(x + 16, y) : c.moveTo(x + 16, y)); c.stroke(); c.restore();
    brushPath(c, d, { w: 2.6, color: '#4F4943', alpha: 0.8, taper: [0.08, 0.55], dry: 0.4, seed: 40 + i, bristles: 3, press: 0.5 });
  });
  brushPath(c, HER_B.shoulderL, { w: 5, color: '#2F2A26', alpha: 0.95, taper: [0.05, 0.6], dry: 0.35, seed: 31, press: 0.6 });
  brushPath(c, HER_B.shoulderR, { w: 4.5, color: '#2F2A26', alpha: 0.9, taper: [0.05, 0.6], dry: 0.45, seed: 32, press: 0.6 });
  brushPath(c, HER_B.collarCross, { w: 4, color: '#3A3530', alpha: 0.9, taper: [0.05, 0.5], dry: 0.3, seed: 33, press: 0.5 });
  // ── collar over the neck
  wash(c, 'M632 812 C700 774 790 764 850 786 C890 800 920 822 936 848 L930 870 C900 846 870 826 836 812 C780 794 700 800 646 830 Z', { color: '#F6F3EC', alpha: 1, mottle: 0.05, edge: 0.8, edgeColor: '#BDB6A8', edgeBlur: 6, edgeW: 4 });
  brushPath(c, HER_B.collarTeal, { w: 9, color: C.teal, taper: [0.05, 0.1], dry: 0.2, seed: 7, press: 0.3 });
  brushPath(c, HER_B.collarBack, { w: 3.2, color: '#3A3530', alpha: 0.85, taper: [0.05, 0.4], dry: 0.3, seed: 8 });
  // ── long hair down the back: three locks, wet at the root, dry at the tips
  HER_B.locks.forEach((d, i) => {
    const P = pl(d)[0];
    for (let k = 0; k < 26; k++) {
      const off = (k / 25 - 0.5) * (70 - i * 14), wob = R() * 6;
      const pts = P.map(([x, y], j) => [x + off * (0.6 + 0.6 * j / P.length) + Math.sin(j * 0.2 + k) * wob, y]);
      brush(c, pts, { w: 3 + R() * 5, color: R() < 0.15 ? '#3E3934' : '#0C0B0B', alpha: 0.55 + R() * 0.4, taper: [0.02, 0.5 + R() * 0.3], dry: 0.45 + R() * 0.3, seed: 500 + i * 40 + k, bristles: 2, press: 0.5 });
    }
  });
  // ── hair on the head, the bun, strands, sheen, flecks (head space)
  hsp(c, () => {
    wash(c, HER.cap, { color: '#121010', alpha: 1, mottle: 0, edge: 0 });
    c.save(); c.clip(new Path2D(HER.cap)); c.globalAlpha = 0.22; c.globalCompositeOperation = 'screen';
    const pat = c.createPattern(TEX.cloud, 'repeat'); c.fillStyle = pat; c.fillRect(600, 280, 400, 520); c.restore();
    for (let i = 0; i < 34; i++) {                     // strands combed back over the skull into the bun
      const k = i / 33, a = lerp(-2.2, -0.2, k);          // start around the hairline and temple
      const x0 = 780 + Math.cos(a) * 150 + R() * 10, y0 = 470 + Math.sin(a) * 150 + R() * 10;
      const x3 = 812 + k * 96 + R() * 10, y3 = 336 + R() * 8;
      const d = `M${x0} ${y0} C${x0 + 20} ${y0 - 60} ${lerp(x0, x3, 0.6)} ${Math.min(y0, y3) - 30} ${x3} ${y3}`;
      brushPath(c, d, { w: 1 + R() * 1.4, color: R() < 0.45 ? '#6A625B' : '#050404', alpha: 0.35 + R() * 0.35, taper: [0.2, 0.4], dry: 0.55, seed: 100 + i, bristles: 2 });
    }
    for (let i = 0; i < 40; i++) {                     // dry-brush feathering along the back of the head
      const k = i / 39, a = lerp(-1.3, 1.25, k);
      const x0 = 800 + Math.cos(a) * 128, y0 = 500 + Math.sin(a) * 200;
      const d = `M${x0} ${y0} q${14 + R() * 10} ${20 + R() * 20} ${6 + R() * 16} ${50 + R() * 50}`;
      brushPath(c, d, { w: 1.5 + R() * 2.5, color: '#0B0A0A', alpha: 0.6, taper: [0.1, 0.8], dry: 0.5, seed: 150 + i, bristles: 2 });
    }
    wash(c, 'M804 318 C790 280 810 236 852 228 C896 220 926 250 920 288 C916 318 892 336 858 338 C832 340 812 334 804 318 Z', { color: '#121010', alpha: 1, mottle: 0.12, edge: 0 });
    for (let k = 0; k < 4; k++) {                      // the coil itself: thick strokes wound round
      const r0 = 58 - k * 12, a0 = k * 1.7, pts = [];
      for (let j = 0; j <= 40; j++) { const a = a0 + j / 40 * TAU * 0.92; pts.push([862 + Math.cos(a) * r0 * 1.02, 280 + Math.sin(a) * r0 * 0.86]); }
      brush(c, pts, { w: 16 - k * 2.5, color: k % 2 ? '#1E1B1A' : '#0A0909', alpha: 0.95, taper: [0.15, 0.35], dry: 0.35, seed: 260 + k, press: 0.5 });
    }
    for (let i = 0; i < 30; i++) {                     // coils of the bun
      const a0 = R() * TAU, r0 = 22 + R() * 44;
      const d = `M${860 + Math.cos(a0) * r0} ${278 + Math.sin(a0) * r0 * 0.9} Q${860 + Math.cos(a0 + 1.1) * (r0 + 12)} ${278 + Math.sin(a0 + 1.1) * (r0 + 12) * 0.9} ${860 + Math.cos(a0 + 2.2) * r0} ${278 + Math.sin(a0 + 2.2) * r0 * 0.9}`;
      brushPath(c, d, { w: 1.4 + R() * 1.6, color: R() < 0.35 ? '#5E5751' : '#050404', alpha: 0.7, taper: [0.3, 0.3], dry: 0.45, seed: 200 + i, bristles: 2 });
    }
    brushPath(c, HER.band, { w: 10, color: C.verm, taper: [0.06, 0.06], dry: 0.15, seed: 12, press: 0.3 });
    brushPath(c, HER.strand, { w: 2, color: '#0E0D0D', alpha: 0.85, taper: [0.1, 0.7], dry: 0.35, seed: 9 });
    brushPath(c, HER.wisp, { w: 1.2, color: '#1A1716', alpha: 0.7, taper: [0.1, 0.7], dry: 0.4, seed: 10, bristles: 1 });
    c.save(); c.clip(new Path2D(HER.cap));
    for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(232,228,218,${0.05 + R() * 0.14})`; c.beginPath(); c.arc(660 + R() * 290, 310 + R() * 440, 0.5 + R() * 1.1, 0, TAU); c.fill(); }
    c.restore();
  });
  // gold cuff on the middle lock
  c.save(); c.translate(952, 930); c.rotate(-0.22);
  c.fillStyle = C.goldDeep; c.fillRect(-30, -34, 60, 66);
  for (let i = 0; i < 22; i++) goldLeaf(c, -24 + R() * 48, -28 + R() * 56, 8 + R() * 8, R() * TAU, R() * TAU, 300 + i);
  c.restore();
  // ── features: fine gongbi lines (head space)
  hsp(c, () => {
    wash(c, HER.iris, { color: '#1B1513', alpha: 0.92, mottle: 0, edge: 0 });
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.arc(650, 503, 1.1, 0, TAU); c.fill();
    brushPath(c, HER.crease, { w: 1, color: '#7A5646', alpha: 0.6, taper: [0.2, 0.4], dry: 0.1, seed: 13, bristles: 1 });
    brushPath(c, HER.lidUp, { w: 2.8, color: '#191311', taper: [0.1, 0.35], dry: 0.05, seed: 14, bristles: 2, press: 0.4 });
    brushPath(c, HER.lidLo, { w: 1, color: '#7A5646', alpha: 0.6, taper: [0.2, 0.5], dry: 0.1, seed: 15, bristles: 1 });
    brushPath(c, HER.brow, { w: 3, color: '#2A2320', alpha: 0.85, taper: [0.3, 0.6], dry: 0.4, seed: 16, bristles: 3 });
    brushPath(c, HER.nostril, { w: 1.2, color: '#8A5E4A', alpha: 0.65, taper: [0.3, 0.3], dry: 0.1, seed: 17, bristles: 1 });
    wash(c, HER.lipUp, { color: '#B2352B', alpha: 0.95, mottle: 0.15, edge: 0.4, edgeColor: '#8D2520', edgeBlur: 2, edgeW: 1.5 });
    wash(c, HER.lipLo, { color: '#C4463B', alpha: 0.95, mottle: 0.15, edge: 0.4, edgeColor: '#8D2520', edgeBlur: 2, edgeW: 1.5 });
    brushPath(c, HER.stomion, { w: 1.2, color: '#5A1C17', alpha: 0.85, taper: [0.2, 0.3], dry: 0, seed: 18, bristles: 1 });
    wash(c, HER.mark, { color: C.verm, alpha: 0.95, mottle: 0.1, edge: 0 });
    brushPath(c, HER.profile, { w: 1.6, color: '#5A4238', alpha: 0.8, taper: [0.05, 0.1], dry: 0.18, seed: 19, bristles: 2 });
    brushPath(c, HER.jaw, { w: 1.2, color: '#8A6A58', alpha: 0.45, taper: [0.1, 0.6], dry: 0.3, seed: 20, bristles: 1 });
    brushPath(c, HER.neckF, { w: 1.4, color: '#7A5A4A', alpha: 0.65, taper: [0.1, 0.4], dry: 0.25, seed: 21, bristles: 1 });
  });
  paperize(c, size, 0.14);
  // fade the bottom of the robe into the paper
  c.save(); c.globalCompositeOperation = 'destination-out';
  const g = c.createLinearGradient(0, 1060, 0, 1400); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  c.fillStyle = g; c.fillRect(0, 1000, size, 400);
  const g2 = c.createLinearGradient(1120, 0, 1360, 0); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)');
  c.fillStyle = g2; c.fillRect(1100, 700, 300, 700);
  c.restore();
  return cv;
}

// ── 他 · from behind, raising the rake (S5/S6), 1200×1600.  HIM_BACK.hand is where the shaft passes. ──
const HIM_BACK = {
  hand: [858, 168],
  head: 'M482 440 C482 380 520 342 560 342 C600 342 638 380 638 440 C638 500 610 540 560 546 C510 540 482 500 482 440 Z',
  neck: 'M528 516 L592 516 L602 604 L518 604 Z',
  bun: 'M526 318 C520 280 540 256 562 254 C590 254 602 282 596 312 C590 330 540 336 526 318 Z',
  crown: 'M524 300 C540 292 584 292 600 300 L596 326 C580 320 544 320 528 326 Z',
  collar: 'M494 608 C530 586 590 586 628 608 L634 636 C594 618 530 618 488 636 Z',
  torso: 'M500 606 C460 604 420 612 388 640 C370 700 372 780 380 860 L398 956 C450 972 650 972 722 956 L740 860 C748 780 752 700 738 620 C712 600 662 598 622 604 Z',
  armUp: 'M690 646 C720 562 760 462 792 380 L852 402 C832 482 804 572 764 654 Z',
  forearm: 'M802 398 C812 322 824 254 836 196 L878 202 C870 262 858 330 848 404 Z',
  fist: 'M830 204 C822 176 832 146 858 138 C884 132 900 156 896 182 C892 204 872 214 850 212 Z',
  sleeveUp: 'M786 382 C880 420 936 520 946 640 C952 724 916 786 862 806 C884 722 866 622 824 566 C806 520 794 452 786 382 Z',
  cuffUp: 'M788 388 C810 396 836 402 856 404',
  sleeveL: 'M414 640 C362 682 302 742 252 802 C212 852 180 904 168 968 C196 1006 262 1016 304 984 C334 924 364 864 404 804 C424 764 434 702 434 662 Z',
  cuffL: 'M170 966 C200 1000 262 1012 302 982',
  padL: 'M378 632 C398 600 450 590 492 606 C482 642 452 672 402 692 C386 678 376 656 378 632 Z',
  padR: 'M638 604 C680 588 722 588 752 612 C750 648 732 674 700 688 C680 664 654 636 638 604 Z',
  belt: 'M392 922 C500 936 620 936 728 922 L732 954 C620 968 500 968 390 954 Z',
  skirt: 'M392 950 C360 1050 318 1150 258 1262 C218 1334 178 1410 158 1510 L904 1560 C862 1452 824 1352 792 1252 C762 1152 742 1052 730 950 Z',
  folds: ['M470 640 C482 740 472 840 462 930', 'M620 640 C632 740 642 840 652 930', 'M452 984 C420 1104 380 1224 330 1354', 'M562 984 C562 1104 562 1244 560 1404', 'M664 984 C692 1104 722 1244 762 1384',
    'M300 820 C280 870 250 920 214 956', 'M870 560 C900 620 912 690 900 760'],
  tail: 'M540 300 C470 300 420 340 404 420 C388 500 340 560 284 600',
};
function paintHimBack() {
  const cv = mk(1200, 1600), c = cv.getContext('2d'), R = rng(91), H = HIM_BACK;
  const robe = '#2C2A27', robeHi = '#4A4640';
  // pony tail behind everything
  const tail = pl(H.tail)[0];
  for (let k = 0; k < 44; k++) { const off = (k / 43 - 0.5) * 46; brush(c, tail.map(([x, y], j) => [x + off * (1 - j / tail.length * 0.6) + Math.sin(j * 0.15 + k) * 3, y + off * 0.5]), { w: 3 + R() * 6, color: R() < 0.2 ? '#4A4540' : '#0B0A0A', alpha: 0.75, taper: [0.05, 0.6 + R() * 0.3], dry: 0.5, seed: 700 + k, bristles: 2 }); }
  // left sleeve and skirt (behind the torso)
  wash(c, H.skirt, { color: robe, alpha: 1, mottle: 0.25, edge: 0.8, edgeColor: '#141312', edgeBlur: 12, edgeW: 10 });
  wash(c, H.sleeveL, { color: robe, alpha: 1, mottle: 0.25, edge: 0.8, edgeColor: '#151413', edgeBlur: 10, edgeW: 8 });
  brushPath(c, H.cuffL, { w: 9, color: '#E9E4D8', alpha: 0.9, taper: [0.1, 0.2], dry: 0.3, seed: 3 });
  wash(c, H.neck, { color: '#B9937A', alpha: 1, mottle: 0.1, edge: 0.6, edgeColor: '#7E5E4C', edgeBlur: 6, edgeW: 6 });
  wash(c, H.torso, { color: robe, alpha: 1, mottle: 0.22, edge: 0.8, edgeColor: '#141312', edgeBlur: 12, edgeW: 10 });
  // raised arm: sleeve fallen to the shoulder, bare forearm, fist round the shaft
  wash(c, H.sleeveUp, { color: robe, alpha: 1, mottle: 0.25, edge: 0.8, edgeColor: '#151413', edgeBlur: 10, edgeW: 8 });
  wash(c, H.armUp, { color: '#34312D', alpha: 1, mottle: 0.2, edge: 0.6, edgeColor: '#151413', edgeBlur: 8, edgeW: 6 });
  brushPath(c, H.cuffUp, { w: 10, color: '#E9E4D8', alpha: 0.9, taper: [0.1, 0.2], dry: 0.25, seed: 4 });
  wash(c, H.forearm, { color: '#C49C7F', alpha: 1, mottle: 0.1, edge: 0.7, edgeColor: '#8B6650', edgeBlur: 6, edgeW: 6 });
  // folds and outlines
  H.folds.forEach((d, i) => brushPath(c, d, { w: 3.2, color: robeHi, alpha: 0.8, taper: [0.1, 0.6], dry: 0.45, seed: 60 + i, press: 0.5 }));
  [H.torso, H.sleeveL, H.sleeveUp, H.skirt].forEach((d, i) => brushPath(c, d, { w: 7, color: '#0A0909', alpha: 0.9, taper: [0.02, 0.02], dry: 0.5, seed: 80 + i, press: 0.8 }));
  for (let i = 0; i < 500; i++) { c.fillStyle = `rgba(225,220,210,${0.04 + R() * 0.1})`; c.beginPath(); c.arc(180 + R() * 800, 560 + R() * 900, 0.5 + R() * 1.4, 0, TAU); c.fill(); }
  [H.torso, H.sleeveUp, H.armUp, H.skirt, H.sleeveL].forEach(d => rimLight(c, d, [0.55, -0.83], { w: 6, alpha: 0.75 }));
  rimLight(c, H.forearm, [0.55, -0.83], { w: 5, alpha: 0.6, color: 'rgba(255,225,190,1)' });
  // gold shoulder plates and belt
  [H.padL, H.padR].forEach((d, i) => {
    wash(c, d, { color: C.goldDeep, alpha: 1, mottle: 0.2, edge: 0.6, edgeColor: '#4A3514', edgeBlur: 4, edgeW: 4 });
    c.save(); c.clip(new Path2D(d)); for (let k = 0; k < 40; k++) goldLeaf(c, (i ? 640 : 380) + R() * 120, 590 + R() * 100, 8 + R() * 10, R() * TAU, R() * TAU, 900 + i * 50 + k); c.restore();
    for (let k = 0; k < 3; k++) brushPath(c, i ? `M${650 + k * 12} ${612 + k * 22} C${690} ${600 + k * 22} ${720} ${604 + k * 22} ${748} ${618 + k * 20}` : `M${384 + k * 8} ${640 + k * 18} C${420} ${618 + k * 18} ${456} ${612 + k * 18} ${488} ${614 + k * 18}`,
      { w: 2, color: '#3B2A10', alpha: 0.8, taper: [0.1, 0.1], dry: 0.2, seed: 950 + k + i * 5, bristles: 1 });
  });
  wash(c, H.belt, { color: '#191816', alpha: 1, mottle: 0.1, edge: 0 });
  brushPath(c, 'M392 924 C500 938 620 938 728 924', { w: 3, color: C.gold, taper: [0.05, 0.05], dry: 0.2, seed: 5 });
  brushPath(c, 'M390 952 C500 966 620 966 732 952', { w: 3, color: C.gold, taper: [0.05, 0.05], dry: 0.2, seed: 6 });
  // collar, head, bun and crown
  wash(c, H.collar, { color: '#E8E3D6', alpha: 1, mottle: 0.1, edge: 0.6, edgeColor: '#9C968A', edgeBlur: 4, edgeW: 4 });
  wash(c, H.head, { color: '#100E0E', alpha: 1, mottle: 0, edge: 0 });
  for (let i = 0; i < 40; i++) { const x0 = 490 + R() * 140, y0 = 520 + R() * 20; brushPath(c, `M${x0} ${y0} C${x0 + (560 - x0) * 0.2} ${440} ${x0 + (560 - x0) * 0.7} ${370} ${556 + R() * 10} ${330}`, { w: 1 + R() * 1.4, color: R() < 0.4 ? '#5A544E' : '#050404', alpha: 0.5, taper: [0.2, 0.4], dry: 0.5, seed: 1000 + i, bristles: 2 }); }
  wash(c, H.bun, { color: '#0E0D0D', alpha: 1, mottle: 0, edge: 0 });
  wash(c, H.crown, { color: C.gold, alpha: 1, mottle: 0.2, edge: 0.5, edgeColor: C.goldDeep, edgeBlur: 3, edgeW: 3 });
  for (let k = 0; k < 10; k++) goldLeaf(c, 530 + R() * 64, 298 + R() * 24, 5 + R() * 5, R() * TAU, R() * TAU, 1100 + k);
  brushPath(c, 'M528 330 C548 336 578 336 598 330', { w: 7, color: C.verm, taper: [0.1, 0.1], dry: 0.15, seed: 7 });
  // fist last, over the shaft slot
  wash(c, H.fist, { color: '#C49C7F', alpha: 1, mottle: 0.1, edge: 0.7, edgeColor: '#7F5B45', edgeBlur: 4, edgeW: 4 });
  for (let k = 0; k < 3; k++) brushPath(c, `M${840 + k * 4} ${160 + k * 14} C${856 + k * 3} ${156 + k * 14} ${874} ${160 + k * 14} ${888} ${168 + k * 12}`, { w: 1.6, color: '#6E4A38', alpha: 0.8, taper: [0.2, 0.2], dry: 0.1, seed: 1200 + k, bristles: 1 });
  paperize(c, 1600, 0.08);
  c.save(); c.globalCompositeOperation = 'destination-out';                 // the robe dissolves into mist below
  const g = c.createLinearGradient(0, 1150, 0, 1560); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); c.fillStyle = g; c.fillRect(0, 1100, 1200, 500);
  c.restore();
  return cv;
}

// ── the nine-toothed rake: shaft from (x0,y0) to the head at (x1,y1); tines hang like a comb ──
function drawRake(c, x0, y0, x1, y1, o = {}) {
  const { head = 300, tine = 170, alpha = 1, glow = 0, stars = 1, seed = 3 } = o;
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
  c.save(); c.globalAlpha *= alpha;
  // shaft: dark lacquered wood with a pale highlight
  brush(c, [[x0, y0], [x1 - ux * 10, y1 - uy * 10]], { w: 20, color: '#1E1B19', taper: [0.01, 0.01], dry: 0.15, seed, press: 0.1, rough: 0.04 });
  brush(c, [[x0 + nx * 4, y0 + ny * 4], [x1 + nx * 4, y1 + ny * 4]], { w: 3.5, color: '#9A9286', alpha: 0.6, taper: [0.1, 0.1], dry: 0.5, seed: seed + 1, bristles: 1 });
  for (let k = 0; k < 4; k++) { const f = 0.25 + k * 0.08; brush(c, [[x0 + dx * f - nx * 11, y0 + dy * f - ny * 11], [x0 + dx * f + nx * 11, y0 + dy * f + ny * 11]], { w: 5, color: C.gold, alpha: 0.85, taper: [0, 0], dry: 0.2, seed: seed + 40 + k, bristles: 2 }); }
  // gold collar where the head meets the shaft
  brush(c, [[x1 - ux * 46, y1 - uy * 46], [x1, y1]], { w: 34, color: C.gold, taper: [0, 0], dry: 0.1, seed: seed + 2, press: 0.1 });
  brush(c, [[x1 - ux * 46 + nx * 8, y1 - uy * 46 + ny * 8], [x1 + nx * 8, y1 + ny * 8]], { w: 5, color: C.goldHi, alpha: 0.8, taper: [0, 0], dry: 0.3, seed: seed + 5, bristles: 1 });
  // cross bar
  const hx0 = x1 - nx * head / 2, hy0 = y1 - ny * head / 2, hx1 = x1 + nx * head / 2, hy1 = y1 + ny * head / 2;
  brush(c, [[hx0, hy0], [x1 + ux * 14, y1 + uy * 14], [hx1, hy1]], { w: 40, color: '#2E2B28', taper: [0.03, 0.03], dry: 0.12, seed: seed + 3, press: 0.08, rough: 0.03 });
  brush(c, [[hx0 + ux * 12, hy0 + uy * 12], [x1 + ux * 24, y1 + uy * 24], [hx1 + ux * 12, hy1 + uy * 12]], { w: 5, color: C.gold, alpha: 0.95, taper: [0.02, 0.02], dry: 0.15, seed: seed + 4, bristles: 2 });
  brush(c, [[hx0 - ux * 8, hy0 - uy * 8], [hx1 - ux * 8, hy1 - uy * 8]], { w: 3, color: '#8E877B', alpha: 0.6, taper: [0.02, 0.02], dry: 0.4, seed: seed + 6, bristles: 1 });
  // nine tines: forged iron, straight with a slight curl, sharp points
  for (let k = 0; k < 9; k++) {
    const f = (k - 4) / 4, bx = x1 + nx * f * head * 0.45 - ux * 10, by = y1 + ny * f * head * 0.45 - uy * 10;
    const ex = bx - ux * tine + nx * f * 6, ey = by - uy * tine + ny * f * 6;
    const mx = (bx + ex) / 2 + ux * 6, my = (by + ey) / 2 + uy * 6;
    brush(c, [[bx, by], [mx, my], [ex, ey]], { w: 16, color: '#141211', taper: [0.01, 0.95], dry: 0.05, seed: seed + 10 + k, press: 0.05, rough: 0.03 });
    brush(c, [[bx, by], [mx, my], [ex, ey]], { w: 11, color: '#4F4A44', taper: [0.01, 0.95], dry: 0.15, seed: seed + 20 + k, press: 0.05, rough: 0.03 });
    brush(c, [[bx + nx * 2.5, by + ny * 2.5], [mx + nx * 2.5, my + ny * 2.5], [ex, ey]], { w: 2.4, color: '#D8D1C4', alpha: 0.7, taper: [0.05, 0.9], dry: 0.3, seed: seed + 30 + k, bristles: 1 });
  }
  // 六曜五星: eleven gold studs along the bar and the collar
  if (stars > 0) {
    for (let k = 0; k < 11; k++) {
      const onBar = k < 6, f = onBar ? (k - 2.5) / 2.5 : (k - 8) / 2;
      const px = onBar ? x1 + nx * f * head * 0.4 + ux * 4 : x1 - ux * (48 + (k - 6) * 22), py = onBar ? y1 + ny * f * head * 0.4 + uy * 4 : y1 - uy * (48 + (k - 6) * 22);
      const on = clamp(stars * 11 - k);
      if (on <= 0) continue;
      c.save(); c.globalAlpha *= on; c.fillStyle = onBar ? C.goldHi : '#FFE9B0'; c.beginPath(); c.arc(px, py, onBar ? 5 : 4, 0, TAU); c.fill(); c.restore();
      if (glow > 0 && o.e) { o.e.save(); o.e.globalAlpha = on * glow; const g = o.e.createRadialGradient(px, py, 1, px, py, 26); g.addColorStop(0, 'rgba(255,220,140,0.9)'); g.addColorStop(1, 'rgba(255,220,140,0)'); o.e.fillStyle = g; o.e.fillRect(px - 26, py - 26, 52, 52); o.e.restore(); }
    }
  }
  c.restore();
}

// ── silhouette heads (local space, head centre ≈ 0,0) ──
const HEAD_M = {   // him, profile facing right
  sil: 'M40 -120 C58 -100 70 -70 72 -44 C74 -34 72 -26 68 -22 C80 -2 94 22 104 40 C108 48 104 56 94 56 C88 56 84 58 82 62 C86 68 88 72 88 76 C84 80 80 82 78 84 C82 88 84 92 82 96 C78 100 74 102 74 106 C78 116 80 126 74 134 C66 142 50 144 36 140 C22 170 22 204 30 250 L-70 262 C-76 206 -84 150 -94 104 C-114 62 -122 0 -112 -60 C-102 -112 -62 -150 -10 -152 C12 -152 30 -140 40 -120 Z',
  bun: 'M-58 -168 C-60 -196 -38 -212 -16 -206 C6 -200 12 -176 0 -160 C-14 -146 -50 -148 -58 -168 Z',
  forehead: [72, -44],
};
const HEAD_F = {   // her, profile facing left
  sil: 'M-36 -110 C-50 -92 -58 -68 -60 -46 C-61 -38 -59 -32 -56 -28 C-66 -10 -78 10 -86 24 C-90 30 -86 36 -78 36 C-73 36 -70 38 -68 41 C-71 46 -73 50 -73 54 C-70 57 -66 59 -63 60 C-66 63 -69 66 -68 70 C-65 73 -61 74 -60 77 C-63 85 -64 94 -58 100 C-50 108 -36 110 -26 106 C-20 140 -14 180 -10 226 L70 234 C66 190 62 140 72 96 C92 60 102 10 96 -50 C88 -104 50 -140 4 -144 C-14 -144 -28 -128 -36 -110 Z',
  bun: 'M20 -150 C16 -186 44 -204 70 -196 C96 -186 98 -156 82 -140 C64 -124 28 -128 20 -150 Z',
  forehead: [-60, -46],
};
function place(c, x, y, rot, s, fn) { c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); fn(); c.restore(); }
function localToWorld(x, y, rot, s, px, py) { return [x + (px * Math.cos(rot) - py * Math.sin(rot)) * s, y + (px * Math.sin(rot) + py * Math.cos(rot)) * s]; }

// ── 月下相拥 · the embrace against the moon, 1400×1400: him ink-dark, her a pale spirit ──
const EMB = { mx: 520, my: 560, mr: 0.42, fs: 1.18 };
function embracePose() {
  const hs = EMB.fs, [fx, fy] = localToWorld(EMB.mx, EMB.my, EMB.mr, hs, ...HEAD_M.forehead);
  const fr = -0.36, [lx, ly] = localToWorld(0, 0, fr, hs * 0.93, ...HEAD_F.forehead);
  return { hx: fx - lx + 3, hy: fy - ly + 2, fr };
}
function paintEmbrace(size = 1400) {
  const cv = mk(size, size), c = cv.getContext('2d'), R = rng(505);
  const P = embracePose(), ink = '#121110';
  // his body: shoulder with the armour plate, back, robe flowing left in the wind
  const hisBody = 'M430 760 C360 780 300 800 262 850 C238 900 240 960 250 1030 C270 1140 250 1260 190 1400 L760 1400 C740 1260 730 1130 740 1000 C748 920 744 860 720 800 C680 770 600 760 560 766 Z';
  const pad = 'M262 846 C282 800 340 776 400 784 C396 830 360 870 300 894 C282 884 266 868 262 846 Z';
  const sleeveBack = 'M250 960 C210 1030 150 1100 80 1150 C130 1160 190 1150 240 1120 C260 1080 270 1030 270 990 Z';
  wash(c, hisBody, { color: ink, alpha: 1, mottle: 0.15, edge: 0 });
  wash(c, pad, { color: '#2A2418', alpha: 1, mottle: 0.2, edge: 0 });
  // pony tail streaming left
  const [bx, by] = localToWorld(EMB.mx, EMB.my, EMB.mr, EMB.fs, -30, -180);
  for (let k = 0; k < 26; k++) { const sp = (k / 25 - 0.5); const pts = []; for (let j = 0; j <= 36; j++) { const u = j / 36; pts.push([bx - u * 330, by + u * 120 + sp * 90 * u + Math.sin(u * 6 + k * 0.7) * 16 * u]); }
    brush(c, pts, { w: 2 + R() * 4, color: ink, alpha: 0.8, taper: [0.02, 0.5 + R() * 0.4], dry: 0.5, seed: 520 + k, bristles: 2 }); }
  place(c, EMB.mx, EMB.my, EMB.mr, EMB.fs, () => { wash(c, HEAD_M.sil, { color: ink, alpha: 1, mottle: 0, edge: 0 }); wash(c, HEAD_M.bun, { color: ink, alpha: 1, mottle: 0, edge: 0 });
    wash(c, 'M-62 -176 C-50 -186 -8 -184 6 -172 L4 -156 C-10 -166 -48 -168 -60 -158 Z', { color: C.gold, alpha: 1, mottle: 0.2, edge: 0 }); });
  // her: pale silk and skin, long hair, dissolving below
  const herBody = 'M800 770 C860 764 930 780 980 820 C1030 870 1040 950 1030 1030 C1020 1120 1060 1250 1120 1400 L700 1400 C690 1300 700 1180 720 1080 C736 990 740 900 760 830 Z';
  wash(c, herBody, { color: '#EDE9E0', alpha: 0.92, mottle: 0.25, edge: 0.8, edgeColor: '#FFFFFF', edgeBlur: 10, edgeW: 8 });
  const [nx0, ny0] = localToWorld(P.hx, P.hy, P.fr, EMB.fs * 0.93, 80, 40);
  for (let k = 0; k < 34; k++) { const off = (k / 33 - 0.5) * 120; const pts = []; for (let j = 0; j <= 30; j++) { const u = j / 30; pts.push([nx0 + 30 + off * (0.3 + u * 0.9) + u * 150 + Math.sin(u * 5 + k * 0.6) * 26 * u, ny0 + 10 + u * 520 + off * 0.2]); }
    brush(c, pts, { w: 2 + R() * 3.5, color: '#1A1817', alpha: 0.35 + R() * 0.4, taper: [0.05, 0.7], dry: 0.55, seed: 600 + k, bristles: 2 }); }
  place(c, P.hx, P.hy, P.fr, EMB.fs * 0.93, () => {
    wash(c, HEAD_F.sil, { color: '#F1EDE4', alpha: 0.96, mottle: 0.15, edge: 0.6, edgeColor: '#FFFFFF', edgeBlur: 6, edgeW: 5 });
    wash(c, 'M-36 -110 C-20 -132 20 -146 60 -134 C92 -122 104 -60 98 -20 C92 40 80 80 72 96 L60 60 C70 20 72 -30 60 -70 C40 -100 0 -104 -36 -110 Z', { color: '#141212', alpha: 1, mottle: 0, edge: 0 });
    wash(c, HEAD_F.bun, { color: '#141212', alpha: 1, mottle: 0, edge: 0 });
    brushPath(c, 'M22 -144 C40 -130 72 -130 88 -146', { w: 9, color: C.verm, taper: [0.05, 0.05], dry: 0.1, seed: 5 });
    wash(c, 'M-44 -84 C-47 -80 -47 -76 -45 -72 C-42 -76 -42 -80 -44 -84 Z', { color: C.verm, alpha: 0.9, mottle: 0, edge: 0 });
    brushPath(c, 'M-60 -30 C-54 -34 -46 -34 -40 -31', { w: 2.2, color: '#2A2321', alpha: 0.85, taper: [0.1, 0.3], dry: 0.1, seed: 6, bristles: 1 });
    wash(c, 'M-73 54 C-70 51 -66 51 -63 58 C-66 60 -70 60 -73 56 Z M-68 62 C-66 61 -64 61 -63 60 C-64 66 -66 69 -68 68 Z', { color: '#B8392E', alpha: 0.9, mottle: 0, edge: 0 });
  });
  // his hand at the small of her back
  wash(c, 'M1010 980 C1040 960 1070 966 1076 990 C1080 1014 1060 1030 1034 1026 C1016 1022 1004 1000 1010 980 Z', { color: ink, alpha: 1, mottle: 0.1, edge: 0 });
  wash(c, 'M700 880 C790 930 880 972 980 986 C1004 988 1024 996 1034 1014 C1010 1034 980 1036 950 1030 C860 1014 770 980 690 944 Z', { color: ink, alpha: 1, mottle: 0.15, edge: 0 });
  // the spirit dissolves from the hem up
  c.save(); c.globalCompositeOperation = 'destination-out';
  const g = c.createLinearGradient(0, 1080, 0, 1400); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); c.fillStyle = g; c.fillRect(0, 1060, size, 340);
  c.restore();
  const rim = mk(size, size), rc = rim.getContext('2d');
  rc.drawImage(cv, 0, 0); rc.globalCompositeOperation = 'source-in'; rc.fillStyle = '#FFFFFF'; rc.fillRect(0, 0, size, size);
  const inner = mk(size, size), ic = inner.getContext('2d'); ic.filter = 'blur(5px)'; ic.drawImage(cv, 0, 0);
  rc.globalCompositeOperation = 'destination-out'; rc.drawImage(inner, 3, 5);       // keep only a thin lit rim on the upper edges
  c.save(); c.globalAlpha = 0.85; c.drawImage(rim, 0, 0); c.restore();
  paperize(c, size, 0.06);
  return cv;
}

// ── her portrait as a spirit: ink lines turn to light (opening, 魄散魂飞) ──
function makeGhost(src) {
  const w = src.width, h = src.height, cv = mk(w, h), c = cv.getContext('2d');
  c.drawImage(src, 0, 0);
  const img = c.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255; if (!a) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2], lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255, sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    if (sat > 0.35 && r > g * 1.4) { d[i] = 230; d[i + 1] = 70; d[i + 2] = 55; d[i + 3] = 255 * a; continue; }   // keep vermilion
    const v = 0.32 + 0.68 * lum;
    d[i] = 238 * v; d[i + 1] = 242 * v; d[i + 2] = 250 * v; d[i + 3] = 255 * a * 0.82;
  }
  c.putImageData(img, 0, 0);
  return cv;
}

function PREPARE_FIGURES() {
  FIG.her = paintHer();
  FIG.himBack = paintHimBack();
  FIG.embrace = paintEmbrace();
  FIG.herGhost = makeGhost(FIG.her);
}
