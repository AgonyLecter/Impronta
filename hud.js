/* impronta · hud
   Piccola libreria grafica scritta a mano (canvas 2D, nessuna dipendenza), nello stile dell'app:
   nero, bianco, grigi; rosso solo come interruzione; tutto fatto di punti.
   - cervello(): la rete neurale vera in 3D. Ogni punto è un neurone, messo vicino a quelli con cui
     collabora (posizioni calcolate dai suoi pesi); le linee sono le sinapsi più forti; gli strati sono
     in profondità; i neuroni nati da poco sono rossi. Rivive la tua ultima frase parola per parola:
     i neuroni si accendono e gli impulsi corrono lungo le sinapsi.
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
export function cervello(canvas, { con, act = null, nati = null, onWord = null } = {}){
  if (!con || !con.layers || !con.layers.length) return () => {};
  const { d, W, H } = fit(canvas, 1.05), g = canvas.getContext("2d"), bg = griglia(W, H, d);
  const L = con.L, Hn = con.H, nodes = [], at = (l, j) => nodes[l*Hn + j];
  // neuroni: posizione dai pesi, poi modellati come due emisferi; gli strati vanno in profondità
  con.layers.forEach((ly, l) => {
    const xs = spazia(ly.pos, 0), ys = spazia(ly.pos, 1);
    for (let j=0;j<Hn;j++){
      const h = hash(l*7919 + j), th = Math.atan2(ys[j], xs[j]), rho = Math.min(1, Math.pow(Math.hypot(xs[j], ys[j])/1.42, .7));
      const rim = 1 + .045*Math.sin(th*11 + l) + .03*Math.sin(th*5);         // circonvoluzioni
      let x = Math.cos(th)*rho*rim*1.08, y = Math.sin(th)*rho*rim*.74;
      x += Math.sign(x || 1)*.06;                                             // il solco tra gli emisferi
      if (y > .3) x *= 1 - (y - .3)*.4;                                       // più stretto in basso
      const rr = rho;
      const z = (L > 1 ? (l/(L-1) - .5)*.8 : 0) + (h - .5)*.5*Math.sqrt(Math.max(0, 1 - rr*rr));
      nodes.push({ l, j, x, y, z, imp: ly.imp[j] || .3, a: 0, ta: 0, nuovo: nati && nati[l] != null && j >= nati[l], sx: 0, sy: 0, s: 1 });
    }
  });
  const edges = [];
  con.layers.forEach((ly, l) => ly.edges.forEach(([i, j, w]) => edges.push({ a: at(l, i), b: at(l, j), w })));
  (con.between || []).flat().forEach(([l, i, j, w]) => edges.push({ a: at(l-1, i), b: at(l, j), w, x: 1 }));
  const mw = Math.max(1e-6, ...edges.map(e => Math.abs(e.w)));
  edges.forEach(e => e.k = Math.abs(e.w)/mw);
  const out = (con.emo || []).map(([k, j, w]) => ({ k, n: at(L-1, j), w }));
  const st = { rx: .28, ry: -.5, hold: 0, t0: performance.now(), step: -1, stepAt: 0, pulses: [], emo: new Array(8).fill(0), word: "", run: true };
  trascina(canvas, st);
  const words = act ? act.words : null, T = words ? words.length : 0, slow = RM();
  function avanza(now){
    if (!act){ // a riposo: scintille sparse, come un cervello che sogna
      if (now - st.stepAt > 260){ st.stepAt = now; for (let q=0;q<Math.max(2, nodes.length*.008);q++){ const n = nodes[Math.floor(Math.random()*nodes.length)]; n.ta = .55 + Math.random()*.45; } nodes.forEach(n => n.ta *= .6); scintille(.25); }
      return;
    }
    const dur = st.step >= T-1 ? 2200 : 720;
    if (now - st.stepAt < dur) return;
    st.stepAt = now; st.step = (st.step + 1) % T;
    // si accendono i neuroni che cambiano di più con questa parola (la risposta della rete alla parola)
    const val = (n, t) => act.acts[n.l] && act.acts[n.l][t] ? act.acts[n.l][t][n.j]/100 : 0;
    const vs = nodes.map((n, q) => Math.abs(val(n, st.step) - (st.step ? val(n, st.step - 1) : 0)) + hash(q + st.step*31)*1e-4);
    const ord = vs.map((v, q) => [v, q]).sort((a, b) => b[0] - a[0]), top = Math.max(3, Math.round(nodes.length*.13));
    nodes.forEach(n => n.ta = 0); ord.slice(0, top).forEach(([v, q], r) => nodes[q].ta = v > .02 ? 1 - r/top*.6 : 0);
    st.word = st.step ? words[st.step] : "";
    if (onWord) onWord(st.step, st.word);
    const fin = st.step === T-1; st.emo = st.emo.map((v, k) => fin && act.a ? act.a[k] : v*.4);
    scintille(1);
  }
  function scintille(f){
    for (const e of edges){ if (st.pulses.length > 160) break; const p = e.a.ta*e.k; if (p > .2 && Math.random() < p*.6*f) st.pulses.push({ e, t: 0, v: .7 + .6*Math.random() }); }
  }
  const proj = (n, cy, sy, cx, sx, R, ox, oy) => {
    const x1 = n.x*cy - n.z*sy, z1 = n.x*sy + n.z*cy, y1 = n.y*cx - z1*sx, z2 = n.y*sx + z1*cx, s = 2.8/(2.8 + z2);
    n.sx = ox + x1*R*s; n.sy = oy + y1*R*s; n.s = s; n.zz = z2;
  };
  let last = performance.now();
  (function frame(now){
    if (!st.run || !vivo(canvas)) return;
    const dt = Math.min(64, now - last); last = now;
    if (now - st.hold > 2200) st.ry += dt*(slow ? .00004 : .00016);
    avanza(now);
    const cy = Math.cos(st.ry), sy = Math.sin(st.ry), cx = Math.cos(st.rx), sx = Math.sin(st.rx), R = W*.41, ox = W/2, oy = H*.47;
    const born = clamp((now - st.t0)/1800, 0, 1), eb = born*born*(3 - 2*born);
    for (const n of nodes){ proj(n, cy, sy, cx, sx, R*(.25 + .75*eb), ox, oy); n.a += (n.ta - n.a)*Math.min(1, dt/140); }
    g.clearRect(0, 0, W, H); g.drawImage(bg, 0, 0);
    // sinapsi: tre intensità, un solo tracciato per intensità
    for (const [lo, hi, al] of [[0, .35, .05], [.35, .7, .1], [.7, 1.01, .18]]){
      g.beginPath();
      for (const e of edges){ if (e.k < lo || e.k >= hi) continue; g.moveTo(e.a.sx, e.a.sy); g.lineTo(e.b.sx, e.b.sy); }
      g.strokeStyle = INK; g.globalAlpha = al*eb; g.lineWidth = .55*d; g.stroke();
    }
    // sinapsi accese dall'attività
    g.lineWidth = .9*d;
    for (const e of edges){ const v = Math.max(e.a.a, e.b.a)*e.k; if (v < .3) continue; g.globalAlpha = Math.min(.55, (v - .3)*.9); g.strokeStyle = INK; g.beginPath(); g.moveTo(e.a.sx, e.a.sy); g.lineTo(e.b.sx, e.b.sy); g.stroke(); }
    // impulsi
    st.pulses = st.pulses.filter(p => (p.t += dt/(560/p.v)) < 1);
    g.fillStyle = INK;
    for (const p of st.pulses){ const { a, b } = p.e, x = a.sx + (b.sx - a.sx)*p.t, y = a.sy + (b.sy - a.sy)*p.t, al = Math.sin(p.t*Math.PI);
      g.globalAlpha = al*.25; g.beginPath(); g.arc(x, y, 3.2*d, 0, TAU); g.fill(); g.globalAlpha = al; g.beginPath(); g.arc(x, y, 1.2*d, 0, TAU); g.fill(); }
    // uscite verso le emozioni (solo le più forti, quando la frase finisce)
    const ex = (k) => W*(.08 + .84*k/7), ey = H*.955;
    for (const o of out){ const v = st.emo[o.k]*o.n.a; if (v < .08) continue; g.globalAlpha = Math.min(.7, v); g.strokeStyle = o.w > 0 ? RED : MID; g.lineWidth = .9*d; g.beginPath(); g.moveTo(o.n.sx, o.n.sy); g.quadraticCurveTo(o.n.sx, ey - 30*d, ex(o.k), ey - 10*d); g.stroke(); }
    // neuroni, dal più lontano al più vicino
    const ord = nodes.slice().sort((p, q) => q.zz - p.zz);
    for (const n of ord){
      const depth = clamp((1.4 - n.zz)/2, .22, 1), r = (.9 + n.imp*1.3)*n.s*d*(1 + n.a*.8);
      if (n.a > .45){ g.globalAlpha = (n.a - .45)*.4; g.fillStyle = n.nuovo ? RED : INK; g.beginPath(); g.arc(n.sx, n.sy, r*2.6, 0, TAU); g.fill(); }
      g.globalAlpha = Math.min(1, depth*(.42 + n.a*.7))*eb; g.fillStyle = n.nuovo ? RED : n.a > .5 ? INK : "#cfcfd4"; g.beginPath(); g.arc(n.sx, n.sy, r, 0, TAU); g.fill();
    }
    // HUD: emozioni a punti e parola corrente
    g.globalAlpha = 1; g.textAlign = "center"; g.font = `${8.5*d}px "Geist Mono", monospace`;
    for (let k=0;k<8;k++){
      const x = ex(k), v = st.emo[k], on = Math.round(v*6);
      for (let q=0;q<6;q++){ g.fillStyle = q < on ? (v > .5 ? RED : INK) : DIM; g.beginPath(); g.arc(x, ey - 14*d - q*4.2*d, 1.4*d, 0, TAU); g.fill(); }
      g.fillStyle = v > .5 ? INK : MID; g.fillText(Object.values(EMO_IT)[k].slice(0, 5), x, ey);
    }
    if (st.word){ g.font = `900 ${24*d}px Doto, monospace`; g.fillStyle = INK; g.globalAlpha = .95; g.fillText(st.word, W/2, H*.13); }
    g.globalAlpha = 1; g.font = `${9*d}px "Geist Mono", monospace`; g.textAlign = "left"; g.fillStyle = MID;
    g.fillText(`${nodes.length} neuroni · ${L} ${L > 1 ? "strati" : "strato"} · ${edges.length} sinapsi`, 12*d, 18*d);
    g.textAlign = "right"; g.fillStyle = act ? INK : MID; g.fillText(act ? (st.step >= 0 ? `${st.step}/${T-1}` : "") : "sogna", W - 12*d, 18*d);
    if (act){ g.fillStyle = RED; g.globalAlpha = .6 + .4*Math.sin(now/260); g.beginPath(); g.arc(W - 12*d - g.measureText(`${Math.max(0, st.step)}/${T-1}`).width - 9*d, 15*d, 2.6*d, 0, TAU); g.fill(); g.globalAlpha = 1; }
    requestAnimationFrame(frame);
  })(performance.now());
  return () => { st.run = false; };
}

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
