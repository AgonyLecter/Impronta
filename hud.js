/* impronta · hud
   Piccola libreria grafica scritta a mano (canvas 2D, nessuna dipendenza), nello stile dell'app:
   nero, bianco, grigi; rosso solo come interruzione; tutto fatto di punti.
   - cervello(): la rete neurale vera in 3D. Ogni punto è un neurone, messo vicino a quelli con cui
     collabora (posizioni calcolate dai suoi pesi); le linee sono le sinapsi più forti; gli strati sono
     in profondità; i neuroni nati da poco sono rossi. Rivive la tua ultima frase parola per parola:
     i neuroni si accendono e gli impulsi corrono lungo le sinapsi.
   - cuore(): le sue emozioni e i suoi gusti, un cuore di particelle che si forma man mano e batte.
   - galassia(): le parole nello spazio dei significati che la rete ha imparato da sola.
   - puntini(): grafico a matrice di punti.  - tile(), segmenti(): riquadri e barre a punti. */

const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DPR = () => Math.min(3, window.devicePixelRatio || 1);
const RM = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const INK = "#f2f2f2", MID = "#8a8a8e", DIM = "#3a3a3c", RED = "#e5161f";
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
export const EMO_IT = { gioia:"gioia", tristezza:"tristezza", rabbia:"rabbia", paura:"paura", affetto:"affetto", ironia:"ironia", stanchezza:"stanchezza", sorpresa:"sorpresa" };

function fit(c, ratio = 1){
  const d = DPR(), r = c.getBoundingClientRect(), w = Math.max(10, r.width);
  c.width = Math.round(w*d); c.height = Math.round(w*ratio*d); c.style.height = (w*ratio) + "px";
  return { d, W: c.width, H: c.height };
}
/* griglia di punti di sfondo (come un display spento) */
function griglia(W, H, d, passo = 14){
  const o = document.createElement("canvas"); o.width = W; o.height = H; const g = o.getContext("2d");
  g.fillStyle = "#ffffff"; g.globalAlpha = .07; const s = passo*d;
  for (let y = s/2; y < H; y += s) for (let x = s/2; x < W; x += s){ g.beginPath(); g.arc(x, y, .9*d, 0, TAU); g.fill(); }
  return o;
}
/* spazia i punti: metà ordine (non si ammucchiano) + metà distanza vera (i gruppi restano) */
function spazia(P, k){
  const n = P.length, o = P.map((p, i) => [p[k], i]).sort((a, b) => a[0] - b[0]), r = new Array(n);
  o.forEach(([, i], q) => r[i] = n > 1 ? q/(n-1)*2 - 1 : 0);
  return P.map((p, i) => .62*r[i] + .38*p[k]);
}
function hash(i){ let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
function vivo(c){ return c.isConnected; }
function trascina(c, st){
  let x0 = 0, y0 = 0, on = false;
  c.addEventListener("pointerdown", e => { on = true; x0 = e.clientX; y0 = e.clientY; st.hold = performance.now(); c.setPointerCapture(e.pointerId); });
  c.addEventListener("pointermove", e => { if (!on) return; st.ry += (e.clientX - x0)*.008; st.rx = clamp(st.rx + (e.clientY - y0)*.006, -1.1, 1.1); x0 = e.clientX; y0 = e.clientY; st.hold = performance.now(); });
  const up = () => { on = false; }; c.addEventListener("pointerup", up); c.addEventListener("pointercancel", up);
  c.style.touchAction = "none";
}

/* ================= CERVELLO ================= */
/* Un ologramma: la sagoma di un cervello fatta di micro-punti (due emisferi con circonvoluzioni, cervelletto,
   tronco) e dentro la SUA rete vera: ogni neurone messo vicino a quelli con cui collabora (dai pesi), le sinapsi
   più forti come archi, gli strati in profondità, i neuroni nati da poco in rosso. Un piano di scansione lo
   attraversa; intorno un anello con le 8 emozioni, collegate ai neuroni che le decidono. Rivive l'ultima frase:
   per ogni parola si accendono i neuroni che cambiano di più e gli impulsi corrono lungo le sinapsi. */
function sagoma(n){
  // punti sulla superficie: emisferi (ellissoidi con solchi), cervelletto dietro e in basso, tronco
  const P = [];
  for (let i=0;i<n;i++){
    const h1 = hash(i*3 + 1), h2 = hash(i*3 + 2), h3 = hash(i*3 + 3);
    const u = h1*TAU, v = Math.acos(2*h2 - 1), sx = Math.sin(v)*Math.cos(u), sy = Math.cos(v), sz = Math.sin(v)*Math.sin(u);
    if (h3 < .86){
      const side = sx >= 0 ? 1 : -1;
      const gy = 1 + .055*Math.sin(u*9 + v*7) + .04*Math.sin(u*17 - v*5) + .025*Math.sin(v*23);   // circonvoluzioni
      let x = side*.06 + sx*.5*gy, y = sy*.62*gy, z = sz*.92*gy;
      if (y > .18) { y = .18 + (y - .18)*.55; }                       // base più piatta
      if (y > .05 && Math.abs(z) < .5) y += .1*(1 - Math.abs(z)/.5)*Math.max(0, Math.abs(sx) - .3);   // lobi temporali
      if (Math.abs(sx) < .12 && y < 0) continue;                       // la scissura tra gli emisferi
      P.push([x, y - .05, z, 1]);
    } else if (h3 < .96){
      const gy = 1 + .05*Math.sin(v*30);                               // cervelletto: lamelle fitte
      P.push([sx*.36*gy, .42 + sy*.16*gy, -.62 + sz*.22*gy, .8]);
    } else {
      const t = h1, a = h2*TAU;                                        // tronco
      P.push([Math.cos(a)*.08, .3 + t*.45, -.28 - t*.12 + Math.sin(a)*.08, .7]);
    }
  }
  return P;
}
export function cervello(canvas, { con, act = null, nati = null, onWord = null } = {}){
  if (!con || !con.layers || !con.layers.length) return () => {};
  const { d, W, H } = fit(canvas, 1.12), g = canvas.getContext("2d"), bg = griglia(W, H, d, 18);
  const L = con.L, Hn = con.H, nodes = [], at = (l, j) => nodes[l*Hn + j], slow = RM();
  const shell = sagoma(Math.min(4200, 2400 + Hn*8)).map(p => ({ x: p[0], y: p[1], z: p[2], k: p[3], sx: 0, sy: 0, zz: 0 }));
  // neuroni dentro il volume: posizione dai pesi, gli strati dal fondo verso la fronte
  con.layers.forEach((ly, l) => {
    const xs = spazia(ly.pos, 0), ys = spazia(ly.pos, 1);
    for (let j=0;j<Hn;j++){
      const h = hash(l*7919 + j), h2 = hash(l*104729 + j*31);
      let x = xs[j]*.5, y = ys[j]*.42 - .08, z = (L > 1 ? (l/(L-1) - .5)*.9 : 0) + (h - .5)*.7;
      x += Math.sign(x || (h2 - .5))*.07;
      const e = Math.hypot(x/.5, (y + .05)/.55, z/.88); if (e > .9){ x *= .9/e; y = (y + .05)*.9/e - .05; z *= .9/e; }
      nodes.push({ l, j, x, y, z, imp: ly.imp[j] || .3, a: 0, ta: 0, nuovo: nati && nati[l] != null && j >= nati[l], sx: 0, sy: 0, s: 1, zz: 0 });
    }
  });
  const edges = [];
  con.layers.forEach((ly, l) => ly.edges.forEach(([i, j, w]) => edges.push({ a: at(l, i), b: at(l, j), w })));
  (con.between || []).flat().forEach(([l, i, j, w]) => edges.push({ a: at(l-1, i), b: at(l, j), w, x: 1 }));
  const mw = Math.max(1e-6, ...edges.map(e => Math.abs(e.w)));
  edges.forEach((e, q) => { e.k = Math.abs(e.w)/mw; e.bow = .18 + hash(q*13)*.25; });
  const out = (con.emo || []).map(([k, j, w]) => ({ k, n: at(L-1, j), w }));
  const st = { rx: .22, ry: -1.25, hold: 0, t0: performance.now(), step: -1, stepAt: 0, pulses: [], emo: new Array(8).fill(0), word: "", run: true, scan: -1 };
  trascina(canvas, st);
  const words = act ? act.words : null, T = words ? words.length : 0;
  function avanza(now){
    if (!act){
      if (now - st.stepAt > 240){ st.stepAt = now; for (let q=0;q<Math.max(2, nodes.length*.01);q++){ const n = nodes[Math.floor(Math.random()*nodes.length)]; n.ta = .55 + Math.random()*.45; } nodes.forEach(n => n.ta *= .6); scintille(.3); }
      return;
    }
    const dur = st.step >= T-1 ? 2400 : 760;
    if (now - st.stepAt < dur) return;
    st.stepAt = now; st.step = (st.step + 1) % T;
    const val = (n, t) => act.acts[n.l] && act.acts[n.l][t] ? act.acts[n.l][t][n.j]/100 : 0;
    const vs = nodes.map((n, q) => Math.abs(val(n, st.step) - (st.step ? val(n, st.step - 1) : 0)) + hash(q + st.step*31)*1e-4);
    const ord = vs.map((v, q) => [v, q]).sort((a, b) => b[0] - a[0]), top = Math.max(3, Math.round(nodes.length*.13));
    nodes.forEach(n => { n.ta = 0; n.v = val(n, st.step); }); ord.slice(0, top).forEach(([v, q], r) => { nodes[q].ta = v > .02 ? 1 - r/top*.6 : 0; });
    st.word = st.step ? words[st.step] : "";
    if (onWord) onWord(st.step, st.word);
    const fin = st.step === T-1; st.emo = st.emo.map((v, k) => fin && act.a ? act.a[k] : v*.4);
    scintille(1);
  }
  function scintille(f){
    for (const e of edges){ if (st.pulses.length > 200) break; const p = e.a.ta*e.k; if (p > .2 && Math.random() < p*.6*f) st.pulses.push({ e, t: 0, v: .7 + .6*Math.random() }); }
  }
  let cy, sy, cx, sx, R, ox, oy;
  const proj = n => {
    const x1 = n.x*cy - n.z*sy, z1 = n.x*sy + n.z*cy, y1 = n.y*cx - z1*sx, z2 = n.y*sx + z1*cx, s = 3/(3 + z2);
    n.sx = ox + x1*R*s; n.sy = oy + y1*R*s; n.s = s; n.zz = z2;
  };
  // punto di controllo dell'arco: il punto medio spinto verso fuori dal centro (le sinapsi si curvano come fibre)
  const ctrl = e => { const mx = (e.a.sx + e.b.sx)/2, my = (e.a.sy + e.b.sy)/2, dx = mx - ox, dy = my - oy, l = Math.hypot(dx, dy) || 1, len = Math.hypot(e.b.sx - e.a.sx, e.b.sy - e.a.sy);
    return [mx + dx/l*len*e.bow, my + dy/l*len*e.bow]; };
  const EK = Object.values(EMO_IT);
  let last = performance.now();
  (function frame(now){
    if (!st.run || !vivo(canvas)) return;
    const dt = Math.min(64, now - last); last = now;
    if (now - st.hold > 2200) st.ry += dt*(slow ? .00004 : .00014);
    avanza(now);
    cy = Math.cos(st.ry); sy = Math.sin(st.ry); cx = Math.cos(st.rx); sx = Math.sin(st.rx); ox = W/2; oy = H*.49;
    const born = clamp((now - st.t0)/2000, 0, 1), eb = born*born*(3 - 2*born); R = W*.36*(.3 + .7*eb);
    for (const n of nodes){ proj(n); n.a += (n.ta - n.a)*Math.min(1, dt/140); }
    for (const p of shell) proj(p);
    st.scan = slow ? .1 : ((now - st.t0)/4200 % 1)*1.5 - .75;      // piano di scansione, dall'alto in basso
    g.clearRect(0, 0, W, H); g.drawImage(bg, 0, 0);
    const Rr = W*.35, rot = (now/24000)%1*TAU;
    // anello HUD: tacche, gradi, e i settori delle emozioni
    g.save(); g.translate(ox, oy);
    g.strokeStyle = INK; g.lineWidth = .6*d;
    for (let i=0;i<120;i++){ const a = rot + i/120*TAU, lg = i%10 === 0 ? 7 : i%5 === 0 ? 4 : 2; g.globalAlpha = (i%10 === 0 ? .45 : .16)*eb;
      g.beginPath(); g.moveTo(Math.cos(a)*(Rr + 2*d), Math.sin(a)*(Rr + 2*d)); g.lineTo(Math.cos(a)*(Rr + (2 + lg)*d), Math.sin(a)*(Rr + (2 + lg)*d)); g.stroke(); }
    g.globalAlpha = .12*eb; g.setLineDash([1*d, 5*d]); g.beginPath(); g.arc(0, 0, Rr - 6*d, 0, TAU); g.stroke(); g.setLineDash([]);
    g.globalAlpha = .22*eb; g.beginPath(); g.arc(0, 0, Rr + 16*d, -rot*1.7, -rot*1.7 + TAU*.18); g.stroke(); g.beginPath(); g.arc(0, 0, Rr + 16*d, -rot*1.7 + Math.PI, -rot*1.7 + Math.PI + TAU*.08); g.stroke();
    const ea = k => -Math.PI/2 + (k + .5)/8*TAU, Re = Rr + 20*d;
    for (let k=0;k<8;k++){ const v = st.emo[k], a0 = ea(k) - TAU/16 + .06, a1 = ea(k) + TAU/16 - .06, nd = 9, on = Math.round(v*nd);
      for (let q=0;q<nd;q++){ const a = a0 + (a1 - a0)*q/(nd - 1); g.globalAlpha = (q < on ? 1 : .4)*eb; g.fillStyle = q < on ? (v > .5 ? RED : INK) : MID; g.beginPath(); g.arc(Math.cos(a)*Re, Math.sin(a)*Re, (q < on ? 1.8 : 1.2)*d, 0, TAU); g.fill(); }
      const lx = Math.cos(ea(k))*(Re + 12*d), ly = Math.sin(ea(k))*(Re + 12*d);
      g.globalAlpha = (v > .3 ? 1 : .55)*eb; g.fillStyle = v > .5 ? INK : MID; g.font = `${8*d}px "Geist Mono", monospace`; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(EK[k].slice(0, 5).toUpperCase(), lx, ly); }
    g.restore();
    // la sagoma: micro-punti, più chiari davanti e lungo il piano di scansione
    g.fillStyle = INK;
    for (const p of shell){ const dep = clamp((1.3 - p.zz)/2.2, .08, 1), sc = Math.max(0, 1 - Math.abs(p.y - st.scan)*14);
      g.globalAlpha = (.1 + .38*dep*dep + sc*.5)*p.k*eb; const r = (.6 + sc*.6)*p.s*d; g.fillRect(p.sx - r, p.sy - r, r*2, r*2); }
    // il piano di scansione: un'ellisse di punti alla sua altezza
    if (!slow){ g.globalAlpha = .5*eb; g.fillStyle = RED;
      for (let i=0;i<64;i++){ const a = i/64*TAU, q = { x: Math.cos(a)*.6, y: st.scan, z: Math.sin(a)*1.0 }; if (Math.abs(st.scan) > .62) break; proj(q); g.globalAlpha = (.18 + .3*clamp((1.2 - q.zz)/2, 0, 1))*eb; g.fillRect(q.sx - .7*d, q.sy - .7*d, 1.4*d, 1.4*d); } }
    // sinapsi: archi, in luce additiva
    g.globalCompositeOperation = "lighter";
    for (const [lo, hi, al] of [[0, .4, .035], [.4, .75, .07], [.75, 1.01, .14]]){
      g.beginPath();
      for (const e of edges){ if (e.k < lo || e.k >= hi) continue; const [qx, qy] = ctrl(e); g.moveTo(e.a.sx, e.a.sy); g.quadraticCurveTo(qx, qy, e.b.sx, e.b.sy); }
      g.strokeStyle = INK; g.globalAlpha = al*eb; g.lineWidth = .6*d; g.stroke();
    }
    g.lineWidth = 1*d;
    for (const e of edges){ const v = Math.max(e.a.a, e.b.a)*e.k; if (v < .28) continue; const [qx, qy] = ctrl(e); g.globalAlpha = Math.min(.6, (v - .28)*1.1); g.strokeStyle = e.a.nuovo || e.b.nuovo ? RED : INK; g.beginPath(); g.moveTo(e.a.sx, e.a.sy); g.quadraticCurveTo(qx, qy, e.b.sx, e.b.sy); g.stroke(); }
    // impulsi con la scia, lungo l'arco
    st.pulses = st.pulses.filter(p => (p.t += dt/(620/p.v)) < 1);
    for (const p of st.pulses){ const { a, b } = p.e, [qx, qy] = ctrl(p.e);
      for (let s=0;s<5;s++){ const t = Math.max(0, p.t - s*.035), u = 1 - t, x = u*u*a.sx + 2*u*t*qx + t*t*b.sx, y = u*u*a.sy + 2*u*t*qy + t*t*b.sy, al = Math.sin(p.t*Math.PI)*(1 - s/5);
        g.globalAlpha = al*(s ? .35 : .9); g.fillStyle = INK; g.beginPath(); g.arc(x, y, (s ? 1 : 1.5)*d, 0, TAU); g.fill();
        if (!s){ g.globalAlpha = al*.18; g.beginPath(); g.arc(x, y, 4.5*d, 0, TAU); g.fill(); } } }
    // dai neuroni alle emozioni, a fine frase
    for (const o of out){ const v = st.emo[o.k]*Math.max(.2, o.n.a); if (v < .1) continue; const a = ea(o.k), tx = ox + Math.cos(a)*(Re - 6*d), ty = oy + Math.sin(a)*(Re - 6*d);
      g.globalAlpha = Math.min(.55, v*.8); g.strokeStyle = o.w > 0 && st.emo[o.k] > .5 ? RED : INK; g.lineWidth = .8*d; g.beginPath(); g.moveTo(o.n.sx, o.n.sy); g.quadraticCurveTo((o.n.sx + tx)/2 + (oy - ty)*.15, (o.n.sy + ty)/2 + (tx - ox)*.15, tx, ty); g.stroke(); }
    g.globalCompositeOperation = "source-over";
    // neuroni
    const ord = nodes.slice().sort((p, q) => q.zz - p.zz);
    for (const n of ord){
      const depth = clamp((1.4 - n.zz)/2, .2, 1), r = (.8 + n.imp*1.2)*n.s*d*(1 + n.a*.9), sc = Math.max(0, 1 - Math.abs(n.y - st.scan)*10);
      if (n.a > .4 || sc > .5){ g.globalAlpha = Math.max((n.a - .4)*.45, sc*.15)*eb; g.fillStyle = n.nuovo ? RED : INK; g.beginPath(); g.arc(n.sx, n.sy, r*3, 0, TAU); g.fill(); }
      g.globalAlpha = Math.min(1, depth*(.45 + n.a*.7 + sc*.4))*eb; g.fillStyle = n.nuovo ? RED : n.a > .5 ? INK : "#c9c9ce";
      g.beginPath(); g.arc(n.sx, n.sy, r, 0, TAU); g.fill();
      if (n.a > .7){ g.globalAlpha = (n.a - .7)*2*eb; g.strokeStyle = n.nuovo ? RED : INK; g.lineWidth = .7*d; g.beginPath(); g.arc(n.sx, n.sy, r + 3*d, 0, TAU); g.stroke(); }
    }
    // etichette sui neuroni più attivi, con la linea di richiamo
    if (act && st.step > 0){
      const top = nodes.filter(n => n.a > .6).sort((p, q) => q.a - p.a).slice(0, 3);
      g.font = `${8*d}px "Geist Mono", monospace`; g.textBaseline = "middle";
      const usate = [];
      top.forEach((n, i) => { const txt = `N·${String(n.j).padStart(3, "0")}${n.l ? " L" + (n.l + 1) : ""} ${(n.v >= 0 ? "+" : "−") + Math.min(1, Math.abs(n.v || 0)).toFixed(2)}`, tw = g.measureText(txt).width;
        let dx = n.sx < ox ? -1 : 1; if (n.sx + dx*(44*d + tw) < 12*d || n.sx + dx*(44*d + tw) > W - 12*d) dx = -dx;
        const ex = n.sx + dx*22*d; let eyy = n.sy - 18*d; while (usate.some(y => Math.abs(y - eyy) < 12*d)) eyy -= 12*d; usate.push(eyy);
        g.globalAlpha = .7*eb; g.strokeStyle = INK; g.lineWidth = .6*d; g.beginPath(); g.moveTo(n.sx, n.sy); g.lineTo(ex, eyy); g.lineTo(ex + dx*18*d, eyy); g.stroke();
        g.fillStyle = INK; g.textAlign = dx > 0 ? "left" : "right"; g.fillText(txt, ex + dx*21*d, eyy); });
    }
    // cornice HUD
    g.globalAlpha = .55; g.strokeStyle = INK; g.lineWidth = 1*d; const m = 6*d, c = 12*d;
    for (const [x, y, sx2, sy2] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]){ g.beginPath(); g.moveTo(x, y + sy2*c); g.lineTo(x, y); g.lineTo(x + sx2*c, y); g.stroke(); }
    g.globalAlpha = 1; g.textBaseline = "alphabetic"; g.font = `${8.5*d}px "Geist Mono", monospace`; g.textAlign = "left"; g.fillStyle = MID;
    g.fillText(`RETE GRU · ${Hn}×${L} · ${edges.length} SINAPSI`, 14*d, 22*d);
    g.fillText(`ROT ${String(Math.round(((st.ry % TAU) + TAU) % TAU/TAU*360)).padStart(3, "0")}° · SCAN ${st.scan >= 0 ? "+" : "−"}${Math.abs(st.scan).toFixed(2)}`, 14*d, H - 14*d);
    g.textAlign = "right"; g.fillText(`${nodes.filter(n => n.a > .5).length} ATTIVI`, W - 14*d, H - 14*d);
    g.fillStyle = act ? INK : MID; const lab = act ? (st.step >= 0 ? `${st.step}/${T-1}` : "") : "SOGNA"; g.fillText(lab, W - 14*d, 22*d);
    g.fillStyle = RED; g.globalAlpha = .6 + .4*Math.sin(now/260); g.beginPath(); g.arc(W - 14*d - g.measureText(lab).width - 8*d, 19*d, 2.4*d, 0, TAU); g.fill(); g.globalAlpha = 1;
    if (st.word){ g.font = `900 ${26*d}px Doto, monospace`; g.textAlign = "center"; g.fillStyle = INK; g.globalAlpha = .95; g.fillText(st.word, ox, oy - Rr - 34*d < 30*d ? 46*d : oy - Rr - 30*d); }
    g.globalAlpha = 1;
    requestAnimationFrame(frame);
  })(performance.now());
  return () => { st.run = false; };
}

/* ================= CUORE ================= */
/* Il cuore delle sue emozioni e dei suoi gusti. È fatto di particelle che arrivano dalla polvere man mano che
   vive: più notti di gusti e più cose amate, più il cuore è formato (formato = quante particelle sono al loro posto).
   Batte: il ritmo viene dalle emozioni sentite di recente (agitazione → più veloce). Intorno gli orbitano le cose
   che ama, legate da filamenti (più gli piacciono, più sono vicine; il preferito è rosso); a ogni battito un impulso
   corre verso il cuore. L'anello fuori: cosa gli piace provare (dal suo carattere); dentro: cosa ha sentito. */
export function cuore(canvas, { gusti = [], gradite = [], sentite = [], formato = .2, notti = 0 } = {}){
  const { d, W, H } = fit(canvas, 1.08), g = canvas.getContext("2d"), bg = griglia(W, H, d, 18), slow = RM();
  const N = 2300, parti = [];
  for (let i=0;i<N;i++){
    const t = hash(i*7 + 1)*TAU, h2 = hash(i*7 + 2), s = i % 5 === 0 ? 1 : Math.pow(h2, .35), side = hash(i*7 + 3) < .5 ? -1 : 1;
    const hx = 16*Math.pow(Math.sin(t), 3)/17, hy = -(13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t))/17;
    const x = hx*s, y = hy*s + .12, z = side*.42*Math.sqrt(Math.max(0, 1 - s*s))*(.75 + .25*Math.cos(t/2));
    // la polvere da cui arriva: una nube larga intorno
    const a = hash(i*7 + 4)*TAU, b = Math.acos(2*hash(i*7 + 5) - 1), r = 1.25 + hash(i*7 + 6)*.9;
    parti.push({ x, y, z, px: Math.cos(a)*Math.sin(b)*r, py: Math.cos(b)*r*.8, pz: Math.sin(a)*Math.sin(b)*r, s, ok: hash(i*7 + 9) < formato, ph: hash(i*7 + 8)*TAU, sx: 0, sy: 0, zz: 0, sc: 1 });
  }
  const viva = sentite.length ? sentite : AFF0, ag = clamp((viva[2] || 0) + (viva[3] || 0) + (viva[0] || 0)*.5 + (viva[7] || 0)*.5, 0, 1.5);
  const bpm = Math.round(58 + 34*ag/1.5), rossi = clamp(.06 + (viva[4] || 0)*.5 + (viva[0] || 0)*.2, .04, .4);
  parti.forEach((p, i) => p.rosso = hash(i*11 + 5) < rossi && p.s < .7);
  const top = gusti.slice(0, 9).map((o, i) => ({ ...o, a: i/Math.max(1, Math.min(9, gusti.length))*TAU + .4, r: 1.05 + (1 - clamp(o.p, 0, 1))*.5, y: (hash(i*5) - .5)*.25, sx: 0, sy: 0, zz: 0 }));
  const st = { rx: .12, ry: 0, hold: 0, t0: performance.now(), run: true, imp: [] };
  trascina(canvas, st);
  let cy, sy, cx, sx, R, ox, oy;
  const proj = (n, x, y, z) => { const x1 = x*cy - z*sy, z1 = x*sy + z*cy, y1 = y*cx - z1*sx, z2 = y*sx + z1*cx, s = 3/(3 + z2); n.sx = ox + x1*R*s; n.sy = oy + y1*R*s; n.sc = s; n.zz = z2; };
  const battito = t => { const f = (t % 1); return Math.exp(-Math.pow((f - .08)/.035, 2)) + .55*Math.exp(-Math.pow((f - .27)/.04, 2)); };
  const ER = Object.values(EMO_IT);
  let last = performance.now(), ultimo = -1;
  (function frame(now){
    if (!st.run || !vivo(canvas)) return;
    const dt = Math.min(64, now - last); last = now;
    if (now - st.hold > 2200) st.ry += dt*(slow ? .00005 : .00022);
    cy = Math.cos(st.ry); sy = Math.sin(st.ry); cx = Math.cos(st.rx); sx = Math.sin(st.rx); ox = W/2; oy = H*.5;
    const el = now - st.t0, born = clamp(el/2600, 0, 1), eb = born*born*(3 - 2*born), tb = el/1000*bpm/60, b = slow ? 0 : battito(tb);
    R = W*.25*(1 + .05*b);
    const n = Math.floor(tb); if (n !== ultimo && !slow){ ultimo = n; for (const o of top) st.imp.push({ o, t: 0 }); }
    g.clearRect(0, 0, W, H); g.drawImage(bg, 0, 0);
    // anelli: fuori cosa gli piace provare, dentro cosa ha sentito
    const Rr = W*.4, rot = (now/30000)%1*TAU, ea = k => -Math.PI/2 + (k + .5)/8*TAU;
    g.save(); g.translate(ox, oy);
    g.strokeStyle = INK; g.lineWidth = .6*d;
    for (let i=0;i<96;i++){ const a = -rot + i/96*TAU, lg = i%8 === 0 ? 6 : 2; g.globalAlpha = (i%8 === 0 ? .4 : .14)*eb; g.beginPath(); g.moveTo(Math.cos(a)*(Rr - 14*d), Math.sin(a)*(Rr - 14*d)); g.lineTo(Math.cos(a)*(Rr - (14 + lg)*d), Math.sin(a)*(Rr - (14 + lg)*d)); g.stroke(); }
    for (let k=0;k<8;k++){
      const w = clamp(gradite[k] || 0, -1, 1), v = clamp(viva[k] || 0, 0, 1), a0 = ea(k) - TAU/16 + .07, a1 = ea(k) + TAU/16 - .07;
      for (let q=0;q<8;q++){ const a = a0 + (a1 - a0)*q/7, on = q < Math.round(Math.max(0, w)*8);
        g.globalAlpha = (on ? .95 : .3)*eb; g.fillStyle = on ? (w > .45 ? RED : INK) : MID; g.beginPath(); g.arc(Math.cos(a)*Rr, Math.sin(a)*Rr, (on ? 1.8 : 1.1)*d, 0, TAU); g.fill();
        const on2 = q < Math.round(v*8); if (on2){ g.globalAlpha = .7*eb; g.fillStyle = INK; g.fillRect(Math.cos(a)*(Rr - 8*d) - .9*d, Math.sin(a)*(Rr - 8*d) - .9*d, 1.8*d, 1.8*d); } }
      g.globalAlpha = (w > .3 ? 1 : .5)*eb; g.fillStyle = w > .45 ? INK : MID; g.font = `${8*d}px "Geist Mono", monospace`; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(ER[k].slice(0, 5).toUpperCase(), Math.cos(ea(k))*(Rr + 12*d), Math.sin(ea(k))*(Rr + 12*d));
    }
    g.restore();
    // particelle: quelle "arrivate" formano il cuore, le altre restano polvere che gira piano
    for (const p of parti){
      const k = p.ok ? clamp((el - 300 - p.ph*120)/1800, 0, 1) : 0, e = k*k*(3 - 2*k), wob = Math.sin(now/1300 + p.ph)*.015;
      const dustA = now/9000 + p.ph, dx = p.px*Math.cos(dustA*.3) - p.pz*Math.sin(dustA*.3), dz = p.px*Math.sin(dustA*.3) + p.pz*Math.cos(dustA*.3);
      const pulse = 1 + b*.06*(1 - p.s*.5);
      proj(p, (dx + (p.x*pulse - dx)*e) + wob, (p.py + (p.y*pulse - p.py)*e) + wob, dz + (p.z*pulse - dz)*e);
      p.e = e;
    }
    // filamenti verso le cose amate
    g.globalCompositeOperation = "lighter";
    for (const o of top){ const ang = o.a + now/16000; proj(o, Math.cos(ang)*o.r, o.y + Math.sin(ang)*o.r*.5, Math.sin(ang)*o.r*.85); }   // orbita inclinata
    for (const o of top){ const ex = ox + (o.sx - ox)*.32, ey = oy + (o.sy - oy)*.32, mx = (ex + o.sx)/2 + (o.sy - oy)*.12, my = (ey + o.sy)/2 - (o.sx - ox)*.12;
      o.c = [ex, ey, mx, my]; g.globalAlpha = (.12 + .35*clamp(o.p, 0, 1))*eb; g.strokeStyle = o.fav ? RED : INK; g.lineWidth = (.6 + o.p)*d;
      g.beginPath(); g.moveTo(ex, ey); g.quadraticCurveTo(mx, my, o.sx, o.sy); g.stroke(); }
    st.imp = st.imp.filter(q => (q.t += dt/900) < 1);
    for (const q of st.imp){ const [ex, ey, mx, my] = q.o.c || [ox, oy, ox, oy], t = 1 - q.t, u = 1 - t, x = u*u*ex + 2*u*t*mx + t*t*q.o.sx, y = u*u*ey + 2*u*t*my + t*t*q.o.sy;
      g.globalAlpha = Math.sin(q.t*Math.PI)*.9*eb; g.fillStyle = q.o.fav ? RED : INK; g.beginPath(); g.arc(x, y, 1.4*d, 0, TAU); g.fill(); g.globalAlpha *= .25; g.beginPath(); g.arc(x, y, 4*d, 0, TAU); g.fill(); }
    // il nucleo che pulsa
    const gr = g.createRadialGradient(ox, oy + R*.05, 0, ox, oy + R*.05, R*1.1); gr.addColorStop(0, `rgba(229,22,31,${(.16 + .22*b)*eb})`); gr.addColorStop(1, "rgba(229,22,31,0)");
    g.globalAlpha = 1; g.fillStyle = gr; g.beginPath(); g.arc(ox, oy + R*.05, R*1.1, 0, TAU); g.fill();
    g.globalCompositeOperation = "source-over";
    for (const p of parti.slice().sort((a, b2) => b2.zz - a.zz)){
      const dep = clamp((1.3 - p.zz)/2.2, .15, 1), r = (p.s > .97 ? .95 : .7)*p.sc*d*(1 + b*.3*p.e);
      if (p.e < .5){ g.globalAlpha = (.06 + .1*dep)*eb; g.fillStyle = INK; g.fillRect(p.sx - .5*d, p.sy - .5*d, 1*d, 1*d); continue; }   // polvere
      g.globalAlpha = (.25 + .65*dep)*(p.s > .97 ? 1 : .75)*eb; g.fillStyle = p.rosso ? RED : INK;
      g.fillRect(p.sx - r, p.sy - r, r*2, r*2);
    }
    // le cose amate
    g.textBaseline = "middle"; g.font = `${8.5*d}px "Geist Mono", monospace`;
    const usate = [];
    for (const o of top.slice().sort((a, b2) => a.zz - b2.zz)){
      const r = (2 + 3.5*clamp(o.p, 0, 1))*o.sc*d, dep = clamp((1.4 - o.zz)/2, .35, 1);
      g.globalAlpha = dep*eb; g.fillStyle = o.fav ? RED : INK; g.beginPath(); g.arc(o.sx, o.sy, r, 0, TAU); g.fill();
      g.strokeStyle = o.fav ? RED : INK; g.lineWidth = .6*d; g.globalAlpha = dep*.5*eb; g.beginPath(); g.arc(o.sx, o.sy, r + 3*d + b*2*d, 0, TAU); g.stroke();
      const right = o.sx >= ox, txt = (o.nome.length > 18 ? o.nome.slice(0, 17) + "…" : o.nome), sub = `${o.tipo} ${o.p.toFixed(2)}`; g.font = `${7*d}px "Geist Mono", monospace`; const tw2 = g.measureText(sub).width; g.font = `${8.5*d}px "Geist Mono", monospace`; const tw = Math.max(g.measureText(txt).width, tw2);
      let lx = o.sx + (right ? 1 : -1)*(r + 6*d); lx = right ? Math.min(lx, W - 10*d - tw) : Math.max(lx, 10*d + tw);
      const box = right ? [lx, lx + tw] : [lx - tw, lx]; let ly = o.sy;
      for (let k=0;k<6 && usate.some(u => u[0] < box[1] && u[1] > box[0] && Math.abs(u[2] - ly) < 22*d);k++) ly += (ly < oy ? -1 : 1)*22*d;
      usate.push([box[0], box[1], ly]);
      if (Math.abs(ly - o.sy) > 2*d){ g.globalAlpha = .3*dep*eb; g.strokeStyle = INK; g.lineWidth = .5*d; g.beginPath(); g.moveTo(o.sx, o.sy); g.lineTo(lx, ly); g.stroke(); }
      g.globalAlpha = dep*eb; g.fillStyle = o.fav ? INK : "#bdbdc2"; g.textAlign = right ? "left" : "right"; g.fillText(txt, lx, ly - 1*d);
      g.fillStyle = MID; g.font = `${7*d}px "Geist Mono", monospace`; g.fillText(sub, lx, ly + 9*d); g.font = `${8.5*d}px "Geist Mono", monospace`;
    }
    // cornice HUD
    g.globalAlpha = .55; g.strokeStyle = INK; g.lineWidth = 1*d; const m = 6*d, c = 12*d;
    for (const [x, y, a2, b2] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]){ g.beginPath(); g.moveTo(x, y + b2*c); g.lineTo(x, y); g.lineTo(x + a2*c, y); g.stroke(); }
    g.globalAlpha = 1; g.textBaseline = "alphabetic"; g.font = `${8.5*d}px "Geist Mono", monospace`; g.fillStyle = MID; g.textAlign = "left";
    g.fillText(`CUORE · ${bpm} BPM`, 14*d, 22*d); g.fillText(`FORMATO ${Math.round(formato*100)}% · ${notti} ${notti === 1 ? "NOTTE" : "NOTTI"}`, 14*d, H - 14*d);
    g.textAlign = "right"; g.fillText(`${gusti.length} ${gusti.length === 1 ? "COSA AMATA" : "COSE AMATE"}`, W - 14*d, H - 14*d);
    // elettrocardiogramma in alto a destra
    g.strokeStyle = RED; g.lineWidth = 1*d; g.globalAlpha = .9; g.beginPath();
    for (let i=0;i<60;i++){ const x = W - 84*d + i*1.2*d, v = slow ? 0 : battito(tb - (60 - i)/90); if (i) g.lineTo(x, 19*d - v*9*d); else g.moveTo(x, 19*d - v*9*d); } g.stroke();
    g.globalAlpha = 1;
    requestAnimationFrame(frame);
  })(performance.now());
  return () => { st.run = false; };
}
const AFF0 = [0, 0, 0, 0, 0, 0, 0, 0];

/* ================= GALASSIA DELLE PAROLE ================= */
export function galassia(canvas, { pts, peso = () => 1, tua = () => true, onTap = null } = {}){
  if (!pts || pts.length < 3) return { stop(){}, scegli(){} };
  const { d, W, H } = fit(canvas, 1), g = canvas.getContext("2d"), bg = griglia(W, H, d, 16);
  const mxp = Math.max(1e-9, ...pts.map(p => Math.abs(p.x))), myp = Math.max(1e-9, ...pts.map(p => Math.abs(p.y)));
  const nP = pts.map(p => [p.x/mxp, p.y/myp]), xs = spazia(nP, 0), ys = spazia(nP, 1);
  const P = pts.map((p, i) => ({ w: p.w, X: W*(.5 + .4*xs[i]), Y: H*(.52 + .4*ys[i]), k: peso(p.w), tua: tua(p.w), ph: hash(i)*TAU, sx: 0, sy: 0 }));
  const mk = Math.max(...P.map(p => p.k)) || 1, lab = new Set(P.filter(p => p.tua).sort((a, b) => b.k - a.k).slice(0, 34).map(p => p.w));
  const st = { run: true, sel: null, near: [], t0: performance.now() };
  canvas.addEventListener("click", e => {
    const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left)*d, y = (e.clientY - r.top)*d;
    let best = null, bd = 30*d; for (const p of P){ const dd = Math.hypot(p.sx - x, p.sy - y); if (dd < bd){ bd = dd; best = p; } }
    if (best && onTap) onTap(best.w);
  });
  (function frame(now){
    if (!st.run || !vivo(canvas)) return;
    const k = clamp((now - st.t0)/1500, 0, 1), e = k*k*(3 - 2*k);
    g.clearRect(0, 0, W, H); g.drawImage(bg, 0, 0);
    for (const p of P){ p.sx = W/2 + (p.X - W/2)*e + Math.sin(now/1700 + p.ph)*2*d; p.sy = H/2 + (p.Y - H/2)*e + Math.cos(now/1900 + p.ph)*2*d; }
    if (st.sel){ const s = P.find(p => p.w === st.sel);
      if (s) for (const n of st.near){ const q = P.find(p => p.w === n[0]); if (!q) continue; g.globalAlpha = .25 + .6*Math.max(0, n[1]); g.strokeStyle = INK; g.lineWidth = 1*d; g.setLineDash([2*d, 3*d]); g.beginPath(); g.moveTo(s.sx, s.sy); g.lineTo(q.sx, q.sy); g.stroke(); g.setLineDash([]); } }
    g.textAlign = "center"; g.font = `${10.5*d}px "Geist Mono", monospace`;
    const boxes = [], libero = (x, y, w) => { const b = [x - w, y - 9*d, x + w, y + 2*d]; if (boxes.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])) return false; boxes.push(b); return true; };
    for (const p of P.slice().sort((a, b) => (b.w === st.sel) - (a.w === st.sel) || st.near.some(n => n[0] === b.w) - st.near.some(n => n[0] === a.w) || b.k - a.k)){
      const sel = p.w === st.sel, nn = st.near.some(n => n[0] === p.w), r = (1.6 + 2.6*Math.sqrt(p.k/mk))*d, tw = .75 + .25*Math.sin(now/900 + p.ph*3);
      g.globalAlpha = (sel || nn ? 1 : p.tua ? .85 : .55)*tw*e;
      if (p.tua){ g.fillStyle = sel ? RED : INK; g.beginPath(); g.arc(p.sx, p.sy, r, 0, TAU); g.fill(); }
      else { g.strokeStyle = sel ? RED : MID; g.lineWidth = 1*d; g.beginPath(); g.arc(p.sx, p.sy, r, 0, TAU); g.stroke(); }
      if (sel){ g.strokeStyle = RED; g.globalAlpha = .6; g.beginPath(); g.arc(p.sx, p.sy, r + 5*d + Math.sin(now/300)*1.5*d, 0, TAU); g.stroke(); }
      if (lab.has(p.w) || sel || nn){ g.globalAlpha = (sel || nn ? 1 : .7)*e; g.fillStyle = sel ? INK : p.tua ? "#bdbdc2" : MID;
        const tw2 = g.measureText(p.w).width/2 + 4*d, lx = clamp(p.sx, tw2, W - tw2), ly = p.sy - r - 5*d;
        if (sel || nn || libero(lx, ly, tw2)) g.fillText(p.w, lx, ly); }
    }
    g.globalAlpha = 1; requestAnimationFrame(frame);
  })(performance.now());
  return { stop(){ st.run = false; }, scegli(w, near = []){ st.sel = w; st.near = near; } };
}

/* ================= GRAFICO A PUNTI ================= */
export function puntini(canvas, vals, { righe = 7, segni = [], max = 1, colonne = null } = {}){
  colonne = colonne || clamp(vals.length, 14, 42);
  const { d, W, H } = fit(canvas, .2), g = canvas.getContext("2d");
  const n = Math.min(colonne, Math.max(1, vals.length)), step = W/colonne, dy = H/(righe + 1), r = Math.min(step, dy)*.26;
  const at = c => vals.length ? vals[Math.min(vals.length - 1, Math.floor(c*(vals.length)/n))] : 0;
  g.clearRect(0, 0, W, H);
  for (let c=0;c<colonne;c++){
    const has = c < n, v = has ? clamp(at(c)/max, 0, 1) : 0, on = Math.round(v*righe), mark = has && segni.some(s => Math.floor(s*n/Math.max(1, vals.length)) === c);
    for (let q=0;q<righe;q++){ g.fillStyle = q < on ? (mark ? RED : c === n-1 ? INK : "#c8c8cc") : DIM; g.globalAlpha = q < on ? 1 : .5; g.beginPath(); g.arc(step*(c + .5), H - dy*(q + 1), r, 0, TAU); g.fill(); }
  }
  g.globalAlpha = 1;
}

/* ================= RIQUADRI ================= */
export function segmenti(frac, n = 16, rosso = false){
  const on = Math.round(clamp(frac, 0, 1)*n);
  return `<span class="seg${rosso ? " red" : ""}">${Array.from({ length: n }, (_, i) => `<i class="${i < on ? "on" : ""}"></i>`).join("")}</span>`;
}
export function tile(label, value, { sub = "", frac = null, rosso = false, largo = false } = {}){
  return `<div class="tile${largo ? " wide" : ""}"><small>${esc(label)}</small><b>${value}</b>${frac != null ? segmenti(frac, 16, rosso) : ""}${sub ? `<em>${sub}</em>` : ""}</div>`;
}
export function titolo(t, destra = ""){ return `<h3 class="hh"><i></i>${esc(t)}${destra ? `<span>${destra}</span>` : ""}</h3>`; }
