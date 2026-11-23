// LexCraft v8: l'intro della colonnina (nitida a ogni fotogramma), l'apertura coi cerchi e le funzioni in orbita (dalla v3),
// la colonnina di lettura, il cursore e il passaggio tra le sezioni.
// Con prefers-reduced-motion nulla di questo si muove: la pagina resta quella del kit, con i salti normali alle ancore.
// Una sola curva (la stessa di --ease in v6.css), nessuna animazione oltre 0,8 s tranne l'intro e l'entrata dell'apertura.
const html = document.documentElement;
const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const ease = 'cubic-bezier(.22, 1, .36, 1)';
const attendi = ms => new Promise(r => setTimeout(r, ms));
// la stessa curva in JavaScript, per quello che si disegna a mano (il viewBox dell'intro, le orbite)
const curva = (() => {
  const [x1, y1, x2, y2] = [.22, 1, .36, 1];
  const bz = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return p => { if (p <= 0) return 0; if (p >= 1) return 1; let lo = 0, hi = 1, t = p; for (let i = 0; i < 22; i++) { t = (lo + hi) / 2; bz(t, x1, x2) < p ? lo = t : hi = t; } return bz(t, y1, y2); };
})();

/* ================================================================ 1. l'intro (circa 5 s, saltabile)
   La colonnina non si sfoca mai (BRIEF-v6 § 1): lo zoom non è uno scale() CSS, che in Chrome con la GPU ingrandisce una bitmap,
   ma il viewBox dell'SVG, ridisegnato in vettoriale a ogni fotogramma. Alla fine il logo non vola nella barra: scivola nel titolo
   dell'apertura, che ha la sua stessa larghezza e sta nello stesso punto (v7: nessuno spostamento finale). */
const VB = { x: -11, y: -96.9, w: 716.3, h: 130.9 };
const COL = 260.83, LOGO = VB.x + VB.w / 2, MEZZO = VB.y + VB.h / 2;       // il centro della colonnina, quello del logo intero, la mezzeria
function intro(svela) {
  return new Promise(fatto => {
    const el = document.getElementById('intro');
    const hero = document.querySelector('.apertura');
    if (!el || !html.classList.contains('has-intro') || rm) { html.classList.remove('has-intro'); el?.remove(); return fatto(); }
    html.classList.add('intro-live');
    hero?.classList.add('logo-fermo', 'logo-in-volo');                     // v8: il logo dell'apertura aspetta che quello dell'intro ci arrivi sopra
    const box = el.querySelector('.intro__logo'), svg = box.querySelector('svg'), carta = el.querySelector('.intro__carta');
    // la colonnina alta circa metà dello schermo: il logo intero è 716 unità, la colonna 107
    const k = Math.min(6, Math.max(1.6, (innerHeight * .46) / (box.offsetWidth * 107 / VB.w)));
    const vista = (s, e) => {                                              // s: ingrandimento, e: 0 sulla colonnina, 1 sul logo intero
      const w = VB.w / s, h = VB.h / s, cx = COL + (LOGO - COL) * e;
      svg.setAttribute('viewBox', `${(cx - w / 2).toFixed(3)} ${(MEZZO - h / 2).toFixed(3)} ${w.toFixed(3)} ${h.toFixed(3)}`);
    };
    vista(k, 0);
    let chiusa = false, svelata = false, raf = 0; const timer = [];
    const apri = () => { if (!svelata) { svelata = true; svela?.(); } };
    const passo = (ms, f) => timer.push(setTimeout(f, ms));
    const chiudi = () => {
      if (chiusa) return; chiusa = true;
      timer.forEach(clearTimeout); cancelAnimationFrame(raf);
      apri();
      el.classList.add('is-fine');
      setTimeout(() => {
        hero?.classList.remove('logo-in-volo');
        html.classList.remove('has-intro', 'intro-live');
        el.remove();
        try { sessionStorage.setItem('lx-intro', '1'); } catch { /* niente */ }
        fatto();
      }, 300);
      removeEventListener('keydown', salta); removeEventListener('wheel', salta); removeEventListener('touchstart', salta);
    };
    const salta = () => chiudi();
    el.querySelector('.intro__salta').addEventListener('click', salta);
    el.addEventListener('pointerdown', salta);
    addEventListener('keydown', salta); addEventListener('wheel', salta, { passive: true }); addEventListener('touchstart', salta, { passive: true });

    el.classList.add('is-on');                                             // 0–1,5 s: plinto, toro, fusto, scanalature, echino, abaco
    passo(1500, () => el.classList.add('is-lit'));                         // 1,5–2,8 s: il marmo, il contorno netto, un riflesso che passa una volta
    passo(2800, () => {                                                    // 2,8–4 s: la colonnina va al suo posto, escono LEX e CRAFT
      el.classList.add('is-scritta');
      const t0 = performance.now();
      const zoom = now => {
        const e = curva(Math.min(1, (now - t0) / 800));
        vista(Math.pow(k, 1 - e), e);                                      // in scala logaritmica: lo zoom ha la stessa velocità a ogni grandezza
        if (e < 1) raf = requestAnimationFrame(zoom);
      };
      raf = requestAnimationFrame(zoom);
    });
    passo(4000, () => {                                                    // 4–5 s: la carta si apre da un cerchio che contiene già tutta la scritta
      const r0 = box.offsetWidth / 2 + 36, r = Math.hypot(innerWidth, innerHeight) / 2 + 20;
      carta.animate([{ clipPath: `circle(${r0}px at 50% 50%)`, opacity: 0 }, { clipPath: `circle(${r0}px at 50% 50%)`, opacity: 1, offset: .3 }, { clipPath: `circle(${r}px at 50% 50%)`, opacity: 1 }], { duration: 760, easing: ease, fill: 'forwards' });
      el.classList.add('is-carta');
    });
    // v8: a carta aperta il logo vola, in un solo movimento morbido, dal centro dello schermo al suo posto nell'apertura (stessa larghezza,
    // solo una traslazione sulla GPU); intanto la carta si fa trasparente e sotto entrano i cerchi, il motto e le funzioni.
    // Quando arriva, il logo dell'apertura si accende sotto di lui nello stesso punto e l'intro sparisce: nessuno scatto.
    passo(4800, () => {
      apri();                                                              // prima l'apertura prende la sua forma (le funzioni in orbita o ferme), poi si misura
      const a = hero?.querySelector('.apertura__logo')?.getBoundingClientRect(), b = box.getBoundingClientRect();
      const dx = a ? a.left - b.left : 0, dy = a ? a.top - b.top : 0;
      el.style.background = 'transparent'; el.querySelector('.intro__glow')?.remove();
      carta.getAnimations().forEach(x => x.commitStyles?.());
      carta.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, easing: ease, fill: 'forwards' });
      el.style.pointerEvents = 'none'; el.querySelector('.intro__salta')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' });
      apri();
      box.animate([{ transform: 'translate(-50%, -50%)' }, { transform: `translate(calc(-50% + ${dx.toFixed(2)}px), calc(-50% + ${dy.toFixed(2)}px))` }], { duration: 950, easing: ease, fill: 'forwards' })
        .finished.then(() => { hero?.classList.remove('logo-in-volo'); requestAnimationFrame(() => { el.remove(); html.classList.remove('has-intro', 'intro-live'); try { sessionStorage.setItem('lx-intro', '1'); } catch { /* niente */ } chiusa = true; removeEventListener('keydown', salta); removeEventListener('wheel', salta); removeEventListener('touchstart', salta); fatto(); }); }, () => {});
    });
  });
}

/* ================================================================ 2. l'apertura: i cerchi si disegnano, le funzioni girano in prospettiva
   v8: due anelli inclinati attorno al testo, come quelli di una sfera armillare visti di tre quarti; le funzioni girano sul primo.
   Ogni pillola ha una profondità: davanti (in basso) è più grande, nitida e con l'ombra, e passa sopra il resto; dietro (in alto)
   è più piccola e più chiara. Nessuna pillola copre mai il testo (se l'anello la porterebbe sopra, viene spinta in fuori).
   Sotto i 1200×760 le funzioni stanno ferme sopra il logo. */
function apertura() {
  const hero = document.querySelector('.apertura'); if (!hero) return;
  const corpo = hero.querySelector('.apertura__corpo'), testo = hero.querySelector('.apertura__testo'), logo = hero.querySelector('.apertura__logo');
  const ul = hero.querySelector('.funzioni'), voci = [...ul.querySelectorAll('li')], pausa = hero.querySelector('.orbite__pausa');
  const largo = matchMedia('(min-width: 1200px) and (min-height: 760px)');
  let ferma = false, sopra = false, visibile = true, geo = null;

  new IntersectionObserver(([e]) => html.classList.toggle('logo-in-apertura', e.isIntersecting)).observe(logo);
  let disegna = () => {};                                                 // i cerchi partono insieme alle funzioni (più sotto)

  // i due anelli: il primo con sette funzioni, il secondo con sei, inclinati in versi opposti
  // tutte su un anello solo, a distanza costante (mai sovrapposte); il secondo anello, inclinato al contrario, è solo disegnato
  const anelli = [{ voci, tilt: -7, verso: 1 }];
  const misura = () => {
    const cb = corpo.getBoundingClientRect(), hb = hero.getBoundingClientRect();
    const nav = parseFloat(getComputedStyle(html).getPropertyValue('--nav')) || 72;
    const pill = new Map(voci.map(li => [li, { w: li.firstElementChild.offsetWidth / 2, h: li.firstElementChild.offsetHeight / 2 }]));
    const mw = Math.max(...[...pill.values()].map(p => p.w)) * 1.08, mh = Math.max(...[...pill.values()].map(p => p.h)) * 1.08;
    // le righe del testo, come rettangoli rispetto al centro: le pillole non ci passano sopra
    const righe = [...testo.querySelectorAll('h1 > *, .apertura__sotto, .btn-row, .hero__proof')].map(el => el.getBoundingClientRect()).filter(r => r.width);
    const tb = { l: Math.min(...righe.map(r => r.left)), r: Math.max(...righe.map(r => r.right)), t: Math.min(...righe.map(r => r.top)), b: Math.max(...righe.map(r => r.bottom)) };
    const cx = (tb.l + tb.r) / 2 - cb.left, cy = (tb.t + tb.b) / 2 - cb.top;
    const box = righe.map(r => ({ l: r.left - cb.left - cx, r: r.right - cb.left - cx, t: r.top - cb.top - cy, b: r.bottom - cb.top - cy }));
    const lim = { l: hb.left + 18 - cb.left, r: hb.right - 18 - cb.left, t: hb.top + nav + 12 - cb.top, b: hb.bottom - 12 - cb.top };
    const ryMax = Math.min(cy - lim.t, lim.b - cy) - mh, rxMax = Math.min(cx - lim.l, lim.r - cx) - mw;
    const tw = (tb.r - tb.l) / 2;
    geo = { cx, cy, box, lim, pill, ok: rxMax >= tw + mw + 24 && ryMax > 120,
      anelli: [{ rx: Math.min(rxMax, tw + mw + 160), ry: ryMax * .96, tilt: -7 }, { rx: rxMax, ry: ryMax * .8, tilt: 10 }] };
    if (geo.anelli[1].rx < tw + mw + 20) geo.anelli[1].rx = geo.anelli[0].rx;
  };
  // la pillola non entra in nessuna riga del testo: se ci finirebbe, la spingo in fuori lungo il raggio quanto basta
  const libera = (x, y, p) => {
    let f = 1;
    for (const r of geo.box) {
      const l = r.l - p.w - 14, rr = r.r + p.w + 14, t = r.t - p.h - 10, b = r.b + p.h + 10;
      if (x * f > l && x * f < rr && y * f > t && y * f < b) {
        const fx = x > 0 ? rr / x : x < 0 ? l / x : Infinity, fy = y > 0 ? b / y : y < 0 ? t / y : Infinity;
        f = Math.max(f, Math.min(fx, fy));
      }
    }
    return f;
  };
  const posa = (giro, R) => {
    if (!geo?.ok) return;
    anelli.forEach((an, k) => {
      const g = geo.anelli[k], c = Math.cos(g.tilt * Math.PI / 180), sn = Math.sin(g.tilt * Math.PI / 180);
      an.voci.forEach((li, i) => {
        const p = geo.pill.get(li), a = (giro * an.verso + 90 + i * 360 / an.voci.length + k * 25) * Math.PI / 180;
        const e = entrata ? entrata(i) : 1;                                  // l'entrata (opacità, grandezza, gli ultimi pixel verso l'anello) la fa questo stesso calcolo
        const Rp = R * (1 + .07 * (1 - e));
        const ex = Math.cos(a) * g.rx * Rp, ey = Math.sin(a) * g.ry * Rp;
        let x = ex * c - ey * sn, y = ex * sn + ey * c;
        const z = (Math.sin(a) + 1) / 2;                                    // 0 dietro (in alto), 1 davanti (in basso)
        const f = libera(x, y, p); x *= f; y *= f;
        x = Math.min(geo.lim.r - p.w, Math.max(geo.lim.l + p.w, geo.cx + x)); y = Math.min(geo.lim.b - p.h, Math.max(geo.lim.t + p.h, geo.cy + y));
        li.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        li.style.zIndex = z > .5 ? '3' : '0';
        const s = li.firstElementChild.style;
        s.setProperty('--k', ((.8 + .26 * z) * (.88 + .12 * e)).toFixed(3)); s.setProperty('--o', ((.74 + .26 * z) * e).toFixed(3)); s.setProperty('--z', z.toFixed(3));
      });
    });
  };
  const orbita = () => {
    voci.forEach(li => { li.style.transform = ''; li.style.zIndex = ''; });
    html.classList.remove('orbita-viva'); geo = null;
    if (largo.matches) { html.classList.add('orbita-viva'); misura(); if (!geo.ok) { html.classList.remove('orbita-viva'); geo = null; } else posa(giro, 1); }
    disegna();
  };

  let giro = 0, vel = 1, t0 = 0, ultimo = 0, raf = 0, entrata = null;
  // v8.1 (taste-skill, motion.md): ogni funzione compare quando la linea dell'anello che si disegna la raggiunge.
  // L'anello davanti si traccia da destra a sinistra passando in basso in 1,1 s (vedi cerchi()), quello dietro, tratteggiato, si accende piano:
  // le funzioni davanti arrivano col tratto, quelle dietro dopo, più tenui. Solo opacità, grandezza (da .88) e 7% di raggio, 520 ms, senza rimbalzo.
  const inversa = y => { let lo = 0, hi = 1; for (let k = 0; k < 22; k++) { const m = (lo + hi) / 2; curva(m) < y ? lo = m : hi = m; } return lo; };
  const ritardi = voci.map((li, i) => {
    const th = ((90 + i * 360 / voci.length) % 360) / 180;               // l'angolo di partenza, in mezzi giri: 0–1 davanti, 1–2 dietro
    return th < 1 ? 300 + 1100 * inversa(Math.max(.03, th)) - 120 : 300 + 1100 * (.25 + .55 * (th - 1));
  });
  const durataEntrata = Math.max(...ritardi) + 560;
  const vivo = () => html.classList.contains('orbita-viva');
  const frame = now => {
    raf = 0;
    const dt = Math.min(64, now - ultimo); ultimo = now;
    const meta = (ferma || sopra) ? 0 : 1; vel += (meta - vel) * Math.min(1, dt / 240);
    giro += dt * vel * .0042;                                              // un giro in circa un minuto e mezzo
    posa(giro, 1);
    if (visibile && vivo() && (vel > .002 || now - t0 < durataEntrata + 100)) avvia();
  };
  const avvia = () => { if (!raf && !rm && vivo()) { ultimo = performance.now(); raf = requestAnimationFrame(frame); } };

  // v8.1: si misura e si parte solo a caratteri caricati (prima, l'arrivo dei caratteri rimisurava tutto a orbita già partita: lo scatto)
  const parti = () => {
    disegna = cerchi(hero, () => ferma || rm, () => logo, () => geo);
    orbita();
    voci.forEach((li, i) => li.firstElementChild.style.setProperty('--d', `${260 + i * 40}ms`));   // le funzioni ferme (telefono): in fila, 40 ms l'una dall'altra
    requestAnimationFrame(now => {
      t0 = now;
      if (!rm) entrata = i => curva(Math.max(0, Math.min(1, (performance.now() - t0 - ritardi[i]) / 520)));
      hero.classList.add('is-aperta');
      avvia();
      setTimeout(() => { entrata = null; hero.classList.add('is-assestata'); if (!raf && vivo()) posa(giro, 1); assestata(); }, durataEntrata);
    });
  };
  if (!document.fonts || document.fonts.status === 'loaded') parti();
  else Promise.race([document.fonts.ready, attendi(900)]).then(() => { parti(); if (document.fonts.status !== 'loaded') document.fonts.ready.then(orbita); });
  if (rm) { pausa?.remove(); }
  pausa?.addEventListener('click', () => {
    ferma = !ferma; pausa.setAttribute('aria-pressed', String(ferma));
    pausa.textContent = ferma ? 'Fai girare le orbite' : 'Ferma le orbite';
    avvia(); disegna(true);
  });
  ul.addEventListener('pointerover', () => { sopra = true; });
  ul.addEventListener('pointerout', e => { if (!e.relatedTarget?.closest?.('.funzioni li')) { sopra = false; avvia(); } });
  new IntersectionObserver(([e]) => { visibile = e.isIntersecting; if (visibile) avvia(); }).observe(hero);
  largo.addEventListener('change', orbita);
  addEventListener('resize', () => { if (vivo() || largo.matches) orbita(); });
}

/* i cerchi concentrici (v3), più leggeri, e sopra i due anelli dell'orbita in prospettiva: la metà dietro tratteggiata e chiara,
   la metà davanti piena. Si disegnano dal centro verso fuori; poi girano solo i cerchi a tacche. */
function cerchi(hero, fermo, centro, anelli) {
  const cv = hero.querySelector('.cerchi'); if (!cv) return () => {};
  const ctx = cv.getContext('2d');
  const raggi = [150, 230, 320, 410, 500, 600, 700, 790], tacche = new Set([1, 3, 5]);
  const t0 = performance.now(); let raf = 0, visibile = true, m = null;
  // v8.1: le misure (tela, centro, colore) si leggono una volta e si rileggono solo quando cambiano: leggerle a ogni fotogramma,
  // subito dopo che le funzioni si erano spostate, costringeva il browser a ricalcolare la pagina 60 volte al secondo
  const misura = () => {
    const hb = cv.getBoundingClientRect(), c = centro().getBoundingClientRect(), cb = hero.querySelector('.apertura__corpo').getBoundingClientRect();
    m = { w: cv.clientWidth, h: cv.clientHeight, cx: c.left + c.width / 2 - hb.left, cy: c.top + c.height / 2 - hb.top, ox: cb.left - hb.left, oy: cb.top - hb.top,
      tinta: getComputedStyle(html).getPropertyValue('--c-grigio').trim() || '#8a8478' };
  };
  function frame(now) {
    raf = 0;
    if (!m) misura();
    const dpr = Math.min(2, devicePixelRatio || 1), { w, h, cx, cy, tinta } = m;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const k = w >= 1200 ? 1 : Math.max(.5, w / 1100);
    const t = rm ? 1e9 : now - t0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#8a8478'; ctx.lineWidth = 1;
    let vivo = false;
    raggi.forEach((r0, i) => {
      const r = r0 * k, p = Math.max(0, Math.min(1, (t - i * 70) / 800));
      if (p < 1) vivo = true;
      if (tacche.has(i)) {
        ctx.globalAlpha = .32 * Math.max(0, Math.min(1, (t - 250 - i * 70) / 700));
        ctx.setLineDash([1, 7]); ctx.lineDashOffset = fermo() ? 0 : -(t / 1000) * (i % 2 ? 2.2 : -1.6);
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.globalAlpha = .2; ctx.setLineDash([]);
        const a = -Math.PI / 2;
        ctx.beginPath(); ctx.arc(cx, cy, r, a, a + Math.PI * 2 * curva(p)); ctx.stroke();
      }
    });
    // gli anelli dell'orbita (dopo i cerchi): dietro tratteggiati, davanti pieni
    const g = anelli?.();
    if (g?.ok) {
      const { ox, oy } = m;
      const p = curva(Math.max(0, Math.min(1, (t - 300) / 1100)));
      g.anelli.forEach(an => {
        const tl = an.tilt * Math.PI / 180;
        ctx.strokeStyle = tinta; ctx.lineWidth = 1;
        ctx.globalAlpha = .35 * p; ctx.setLineDash([2, 6]);
        ctx.beginPath(); ctx.ellipse(ox + g.cx, oy + g.cy, an.rx, an.ry, tl, Math.PI, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = .55 * p; ctx.setLineDash([]); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(ox + g.cx, oy + g.cy, an.rx, an.ry, tl, 0, Math.PI * p); ctx.stroke();
      });
      if (p < 1) vivo = true;
    }
    ctx.globalAlpha = 1;
    if (!rm && visibile && (vivo || !fermo())) raf = requestAnimationFrame(frame);
  }
  const avvia = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const rimisura = () => { m = null; avvia(); };
  new IntersectionObserver(([e]) => { visibile = e.isIntersecting; if (visibile) avvia(); }).observe(hero);
  addEventListener('resize', rimisura);
  new MutationObserver(rimisura).observe(html, { attributes: true, attributeFilter: ['data-theme'] });
  avvia();
  return solo => solo ? avvia() : rimisura();
}

/* ================================================================ la colonnina che scende con la lettura (da 1280 px) */
function lettura() {
  const el = document.querySelector('.lettura'); if (!el || rm) return;
  const col = el.querySelector('.lettura__colonna'), piede = document.querySelector('footer.closing');
  let meta = 0, y = 0, raf = 0;
  const muovi = () => {
    raf = 0; y += (meta - y) * .18;
    if (Math.abs(meta - y) < .3) y = meta;
    col.style.setProperty('--ly', `${y.toFixed(1)}px`);
    if (y !== meta) raf = requestAnimationFrame(muovi);
  };
  const scorri = () => {
    if (!el.offsetHeight) return;
    const max = Math.max(1, html.scrollHeight - innerHeight);
    meta = Math.min(1, scrollY / max) * (el.clientHeight - 38);
    el.classList.toggle('is-scura', !!piede && piede.getBoundingClientRect().top < innerHeight / 2);
    if (!raf) raf = requestAnimationFrame(muovi);
  };
  addEventListener('scroll', scorri, { passive: true });
  addEventListener('resize', scorri);
  scorri();
}

/* ================================================================ la colonnina come cursore */
function cursore() {
  if (rm || !fine) return;
  const c = document.querySelector('.cursore'); if (!c) return;
  html.classList.add('col-cursore');
  let x = -100, y = -100, raf = 0, bersaglio = null;
  const scrivi = () => {
    raf = 0; c.style.setProperty('--cx', `${x}px`); c.style.setProperty('--cy', `${y}px`);
    const t = bersaglio; if (!t) return;
    c.classList.toggle('is-link', !!t.closest('a, button, [role="tab"], summary, label'));
    c.classList.toggle('is-campo', !!t.closest('input, textarea, select'));
    c.classList.toggle('is-scuro', !!t.closest('.ground-inverse, .flusso__ia, .intro:not(.is-carta)'));
  };
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY; bersaglio = e.target instanceof Element ? e.target : null;
    html.classList.remove('cursore-fuori');
    if (!raf) raf = requestAnimationFrame(scrivi);
  }, { passive: true });
  addEventListener('pointerdown', () => c.classList.add('is-giu'));
  addEventListener('pointerup', () => c.classList.remove('is-giu'));
  html.addEventListener('mouseleave', () => html.classList.add('cursore-fuori'));
}

/* ================================================================ 3. i link interni: v8.1, niente più passaggio a tutto schermo.
   Si arriva alla sezione con un movimento minimo: un salto fin quasi al punto giusto, poi gli ultimi 140 px in morbido (circa 0,3 s).
   Con prefers-reduced-motion, il salto e basta. */
function passaggio() {
  const navH = () => document.querySelector('header.nav')?.getBoundingClientRect().height || 72;
  function bersaglio(id) {
    if (!id || id === 'top') return { y: 0, titolo: document.querySelector('.apertura h1') };
    const el = document.getElementById(id); if (!el) return null;
    const intera = el.matches('main > section, footer');
    const y = el.getBoundingClientRect().top + scrollY - (intera ? 0 : navH() + 24);
    return { y: Math.max(0, y), titolo: intera ? el.querySelector('h2, h1') : (el.querySelector('h2, h3') || el) };
  }
  function vai(b, id) {
    const d = b.y - scrollY;
    if (!rm && Math.abs(d) > 140) scrollTo({ top: b.y - Math.sign(d) * 140, behavior: 'instant' });
    scrollTo({ top: b.y, behavior: rm ? 'instant' : 'smooth' });
    history.pushState(null, '', id ? `#${id}` : location.pathname + location.search);
    const t = b.titolo; if (t) { if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
    document.activeElement?.closest?.('.nav__item')?.querySelector('.nav__link')?.blur();
  }
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href^="#"]'); if (!a || a.classList.contains('skip-link')) return;
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    const b = bersaglio(id); if (!b) return;
    e.preventDefault();
    vai(b, id === 'top' ? '' : id);
  });
}

/* ================================================================ la tua IA: legge la pratica, deposita l'atto (una volta, poi resta accesa) */
function flusso() {
  const f = document.querySelector('.flusso'); if (!f) return;
  const svg = f.querySelector('.flusso__fili'), va = svg.querySelector('#filo-va'), torna = svg.querySelector('#filo-torna');
  const pr = f.querySelector('.flusso__pratica'), ia = f.querySelector('.flusso__ia'), at = f.querySelector('.flusso__atti');
  const dot = document.createElement('span'); dot.className = 'flusso__impulso'; f.append(dot);
  // il tratto che l'impulso ha già percorso resta acceso con l'evidenziatore, sotto l'inchiostro
  const luce = p => { const l = p.cloneNode(); l.removeAttribute('id'); l.setAttribute('class', 'filo filo--luce'); svg.insertBefore(l, svg.firstChild); return l; };
  const luceVa = luce(va), luceTorna = luce(torna);
  function fili() {
    const b = f.getBoundingClientRect(); if (!b.width) return;
    svg.setAttribute('viewBox', `0 0 ${b.width} ${b.height}`);
    const r = el => { const q = el.getBoundingClientRect(); return { l: q.left - b.left, r: q.right - b.left, m: q.top - b.top + q.height / 2 }; };
    const p = r(pr), i = r(ia), a = r(at), mx1 = (p.r + i.l) / 2, mx2 = (i.r + a.l) / 2;
    va.setAttribute('d', `M${p.r} ${p.m} C ${mx1} ${p.m}, ${mx1} ${i.m}, ${i.l} ${i.m}`);
    torna.setAttribute('d', `M${i.r} ${i.m} C ${mx2} ${i.m}, ${mx2} ${a.m}, ${a.l} ${a.m}`);
    luceVa.setAttribute('d', va.getAttribute('d')); luceTorna.setAttribute('d', torna.getAttribute('d'));
  }
  new ResizeObserver(fili).observe(f); fili();
  const fatto = () => { f.classList.add('is-scrive', 'is-nuovo'); [luceVa, luceTorna].forEach(l => { l.style.opacity = 1; }); };
  if (rm) return fatto();
  const corri = (path, ms, doc) => new Promise(res => {
    if (getComputedStyle(svg).display === 'none') return res();
    const L = path.getTotalLength(); dot.classList.toggle('is-doc', doc);
    const lu = path === va ? luceVa : luceTorna;
    lu.style.transition = 'none'; lu.style.strokeDasharray = `${L} ${L}`; lu.style.strokeDashoffset = L; lu.style.opacity = 1;
    const t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3), q = path.getPointAtLength(L * e);
      dot.style.transform = `translate(${q.x}px, ${q.y}px)`; dot.style.opacity = p < .08 ? p / .08 : p > .92 ? (1 - p) / .08 : 1;
      lu.style.strokeDashoffset = L * (1 - e);
      p < 1 ? requestAnimationFrame(step) : res();
    };
    requestAnimationFrame(step);
  });
  let gira = false;
  async function ciclo() {
    if (gira) return; gira = true;
    [luceVa, luceTorna].forEach(l => { l.style.opacity = 0; });
    f.classList.remove('is-scrive');
    await corri(va, 700, false);
    f.classList.add('is-scrive'); await attendi(400);
    await corri(torna, 700, true);
    f.classList.add('is-nuovo');
    gira = false;
  }
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); ciclo(); } }, { threshold: .45 }).observe(f);
  f.addEventListener('pointerenter', () => { if (f.classList.contains('is-nuovo')) ciclo(); });
}

/* ================================================================ Pseudonimizza: i nomi si barrano e arrivano i segnaposti, una volta */
function segnaposti() {
  const s = document.querySelector('.segnaposti'); if (!s) return;
  if (rm) return s.classList.add('is-fatto');
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); setTimeout(() => s.classList.add('is-fatto'), 200); } }, { threshold: .6 }).observe(s);
}

/* ================================================================ il motto: una parola accesa resta accesa, anche tornando su */
function motto() {
  const m = document.getElementById('motto'); if (!m) return;
  new MutationObserver(rs => rs.forEach(r => { const w = r.target; if (w.classList?.contains('mo-w') && w.classList.contains('is-on') && !w.classList.contains('is-letta')) w.classList.add('is-letta'); }))
    .observe(m, { subtree: true, attributes: true, attributeFilter: ['class'] });
}

/* ================================================================ il pulsante fisso del telefono: mai sopra l'anteprima né sopra la chiusura */
function barra() {
  const zone = [document.getElementById('anteprima'), document.querySelector('footer.closing')].filter(Boolean);
  const dentro = new Set();
  const io = new IntersectionObserver(es => {
    es.forEach(e => e.isIntersecting ? dentro.add(e.target) : dentro.delete(e.target));
    html.classList.toggle('senza-barra', dentro.size > 0);
  });
  zone.forEach(z => io.observe(z));
}

/* ================================================================ il modulo di prova: non invia niente finché manca un indirizzo vero */
function prova() {
  document.querySelectorAll('form[data-prova]').forEach(f => f.addEventListener('submit', e => {
    if (e.defaultPrevented) return;                     // il kit ha già fermato un modulo con errori
    e.preventDefault();
    const s = f.querySelector('[data-form-status]');
    if (s) s.textContent = 'Modulo di prova: la richiesta non è stata inviata.';
  }));
}

/* ================================================================ la chiusura: l'animazione dell'intro a tutta larghezza, una volta */
function chiusura() {
  // v8: niente attesa con la sola colonnina: la colonnina si monta in un attimo e LEX e CRAFT escono insieme a lei
  const m = document.querySelector('.closing__marchio'), cta = document.querySelector('.closing__cta'); if (!m || rm) return;
  m.classList.add('anima'); cta.classList.add('attesa');
  new IntersectionObserver(async ([e], o) => {
    if (!e.isIntersecting) return; o.disconnect();
    m.classList.add('is-on');
    await attendi(700); cta.classList.remove('attesa');
  }, { threshold: .3 }).observe(m);
}

/* ================================================================ il tema chiaro o scuro: il pulsante nella barra, ricordato da questo browser */
function tema() {
  const b = document.querySelector('.tema'); if (!b) return;
  const meta = document.querySelector('meta[name="theme-color"]');
  const scrivi = () => {
    const scuro = html.dataset.theme === 'dark';
    b.setAttribute('aria-pressed', String(scuro)); b.setAttribute('aria-label', scuro ? 'Tema chiaro' : 'Tema scuro');
    if (meta) meta.content = scuro ? '#1f1e1c' : '#f1eee8';
  };
  b.addEventListener('click', () => {
    html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('lx-tema', html.dataset.theme === 'dark' ? 'scuro' : 'chiaro'); } catch { /* niente */ }
    scrivi(); dispatchEvent(new Event('resize'));
  });
  scrivi();
}

/* ================================================================ il grafo delle pratiche (in arrivo): una costellazione alla Obsidian
   Le pratiche dell'account dimostrativo, le norme e la sentenza che contengono, le note; le norme legate al loro codice.
   Quando la sezione arriva sullo schermo la costellazione si avvicina e compaiono i nomi delle pratiche; passandoci sopra
   (o toccando) si legge il nome di ogni punto e si accendono i suoi collegamenti. I punti respirano piano, come in Obsidian. */
function grafo() {
  const fig = document.querySelector('.grafo'); if (!fig) return;
  const svg = fig.querySelector('.grafo__svg'), eti = fig.querySelector('.grafo__eti'), NS = 'http://www.w3.org/2000/svg';
  const P = [
    ['p1', 'Condominio Via dei Mille – infiltrazioni dal lastrico', 'Pratica di lavoro'],
    ['p2', 'Rossi – vendita di auto usata con difetti', 'Pratica di lavoro'],
    ['p3', 'Martini c. Clinica San Luca – danno da intervento', 'Pratica di lavoro'],
    ['p4', 'Beta Forniture s.p.a. – recupero crediti verso Gamma Edilizia s.r.l.', 'Pratica di lavoro'],
    ['p5', 'Ferretti c. Alfa Logistica s.r.l. – licenziamento disciplinare', 'Pratica di lavoro'],
    ['p6', 'Studio dentistico Sorriso – furto del portatile con i dati dei pazienti', 'Pratica di lavoro'],
    ['p7', 'Il licenziamento disciplinare', 'Pratica di studio'],
    ['p8', 'Responsabilità per cose in custodia', 'Pratica di studio'],
  ];
  const BREVE = { p4: 'Beta Forniture', p5: 'Ferretti c. Alfa Logistica', p8: 'Cose in custodia' };
  const H = [['cc', 'Codice civile'], ['cpc', 'Codice di procedura civile'], ['sl', 'Statuto dei lavoratori (L. 300/1970)'], ['gdpr', 'GDPR (Reg. UE 2016/679)'], ['cons', 'Codice del consumo'], ['l24', 'L. 24/2017'], ['d231', 'D.lgs. 231/2002']];
  // norma: [nome, codice, pratiche]
  const N = [
    ['art. 2043 c.c.', 'cc', 'p1 p3 p8'], ['art. 2051 c.c.', 'cc', 'p1 p8'], ['art. 1126 c.c.', 'cc', 'p1'], ['art. 1117 c.c.', 'cc', 'p1'], ['art. 1130 c.c.', 'cc', 'p1'], ['art. 1135 c.c.', 'cc', 'p1'],
    ['art. 1490 c.c.', 'cc', 'p2'], ['art. 1492 c.c.', 'cc', 'p2'], ['art. 1495 c.c.', 'cc', 'p2'], ['art. 128 Codice del consumo', 'cons', 'p2'], ['art. 130 Codice del consumo', 'cons', 'p2'],
    ['art. 1218 c.c.', 'cc', 'p3 p4'], ['art. 2236 c.c.', 'cc', 'p3'], ['art. 7 L. 24/2017', 'l24', 'p3'],
    ['art. 1224 c.c.', 'cc', 'p4'], ['art. 633 c.p.c.', 'cpc', 'p4'], ['art. 642 c.p.c.', 'cpc', 'p4'], ['art. 5 d.lgs. 231/2002', 'd231', 'p4'],
    ['art. 2106 c.c.', 'cc', 'p5 p7'], ['art. 2119 c.c.', 'cc', 'p5 p7'], ['art. 7 Statuto dei lavoratori', 'sl', 'p5 p7'], ['art. 18 Statuto dei lavoratori', 'sl', 'p5 p7'], ['art. 414 c.p.c.', 'cpc', 'p5'],
    ['art. 32 GDPR', 'gdpr', 'p6'], ['art. 33 GDPR', 'gdpr', 'p6'], ['art. 34 GDPR', 'gdpr', 'p6'], ['art. 82 GDPR', 'gdpr', 'p6'],
  ];
  const S = [['Cass. civ., sez. II, n. 11585/2026', 'p1 p8']];
  const NOTE = { p1: 3, p2: 2, p3: 2, p4: 2, p5: 2, p6: 3, p7: 1, p8: 2 };
  const nodi = [], archi = [], per = new Map();
  const nodo = (id, nome, tipo, sotto, r) => { const n = { id, nome, tipo, sotto, r, x: 0, y: 0, vx: 0, vy: 0, vicini: new Set() }; nodi.push(n); per.set(id, n); return n; };
  const arco = (a, b, l) => { const A = per.get(a), B = per.get(b); archi.push({ a: A, b: B, l }); A.vicini.add(B); B.vicini.add(A); };
  P.forEach(([id, nome, sotto]) => nodo(id, nome, 'pratica', sotto, 7.5));
  H.forEach(([id, nome]) => nodo(id, nome, 'codice', 'Codice o legge', 6.5));
  N.forEach(([nome, cod, pr], i) => { const id = 'n' + i; const ps = pr.split(' '); nodo(id, nome, 'norma', ps.length > 1 ? `Norma · in ${ps.length} pratiche` : 'Norma', 3 + ps.length * 1.2); arco(id, cod, 46); ps.forEach(p => arco(id, p, 70)); });
  S.forEach(([nome, pr], i) => { const id = 's' + i; const ps = pr.split(' '); nodo(id, nome, 'sentenza', 'Sentenza', 5); ps.forEach(p => arco(id, p, 64)); });
  Object.entries(NOTE).forEach(([p, k]) => { for (let i = 0; i < k; i++) { const id = `${p}-nota${i}`; nodo(id, 'Nota', 'nota', `in «${per.get(p).nome.split(' – ')[0]}»`, 2.6); arco(id, p, 30); } });
  per.get('p1-nota0').nome = 'Nota: due possibili convenuti';

  // posizioni di partenza su una spirale (sempre le stesse: niente caso), poi la simulazione si assesta
  nodi.forEach((n, i) => { const a = i * 2.39996, r = 14 * Math.sqrt(i + 1); n.x = Math.cos(a) * r; n.y = Math.sin(a) * r; });
  const passo = (alfa, rumore = 0, t = 0) => {
    for (let i = 0; i < nodi.length; i++) for (let j = i + 1; j < nodi.length; j++) {
      const a = nodi[i], b = nodi[j]; let dx = b.x - a.x, dy = b.y - a.y; const d2 = Math.max(30, dx * dx + dy * dy), f = (a.tipo === 'pratica' && b.tipo === 'pratica' ? 3600 : 900) * alfa / d2;
      const d = Math.sqrt(d2); dx /= d; dy /= d; a.vx -= dx * f; a.vy -= dy * f; b.vx += dx * f; b.vy += dy * f;
    }
    archi.forEach(({ a, b, l }) => { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - l) * .045 * alfa; a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f; });
    nodi.forEach((n, i) => {
      n.vx -= n.x * .006 * alfa; n.vy -= n.y * .009 * alfa;
      if (rumore) { n.vx += Math.sin(t / 1300 + i * 1.7) * rumore; n.vy += Math.cos(t / 1700 + i * 2.3) * rumore; }
      n.vx *= .6; n.vy *= .6; n.x += n.vx; n.y += n.vy;
    });
  };
  for (let k = 0; k < 420; k++) passo(1);
  // la vista: tutta la costellazione dentro il riquadro, con un margine (ricalcolata mentre i punti respirano, senza scatti)
  let bb = null, u = 1;
  const contorno = () => {
    const xs = nodi.map(n => n.x), ys = nodi.map(n => n.y);
    const m = 40 + 70 * (u || 1);                                         // margine per i nomi delle pratiche ai bordi
    const nb = { x: Math.min(...xs) - m, y: Math.min(...ys) - 70, w: Math.max(...xs) - Math.min(...xs) + 2 * m, h: Math.max(...ys) - Math.min(...ys) + 100 };
    if (!bb) bb = nb; else for (const k in nb) bb[k] += (nb[k] - bb[k]) * .05;
  };
  contorno();

  const el = (tag, at, padre) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); padre.append(e); return e; };
  const gl = el('g', {}, svg), gn = el('g', {}, svg), gt = el('g', {}, svg);
  archi.forEach(a => { a.el = el('line', { class: 'l' }, gl); });
  nodi.forEach(n => {
    n.el = el('circle', { class: `n is-${n.tipo}`, r: n.r }, gn); n.el.__n = n;
    if (n.tipo === 'pratica') n.t = el('text', { class: 't is-pratica', 'text-anchor': 'middle' }, gt), n.t.textContent = BREVE[n.id] || n.nome.split(' – ')[0];
    else n.t = el('text', { class: 't', 'text-anchor': 'middle' }, gt), n.t.textContent = n.nome;
  });
  const disegna = () => {
    archi.forEach(({ a, b, el: e }) => { e.setAttribute('x1', a.x.toFixed(1)); e.setAttribute('y1', a.y.toFixed(1)); e.setAttribute('x2', b.x.toFixed(1)); e.setAttribute('y2', b.y.toFixed(1)); });
    nodi.forEach(n => { n.el.setAttribute('r', (n.r * u).toFixed(2)); n.el.setAttribute('cx', n.x.toFixed(1)); n.el.setAttribute('cy', n.y.toFixed(1)); n.t.setAttribute('x', n.x.toFixed(1)); n.t.setAttribute('y', (n.y - n.r * u - 6 * u).toFixed(1)); });
  };
  // il riquadro ha un suo rapporto (16:11, al telefono 4:5): la vista si adatta tenendo il centro
  let zoom = 0;                                                            // 0 lontano (una costellazione), 1 vicino; u (sopra): unità del grafo per pixel
  const vista = () => {
    const W = svg.clientWidth || 800, Hh = svg.clientHeight || 550, r = W / Hh;
    let w = bb.w, h = bb.h; if (w / h < r) w = h * r; else h = w / r;
    const s = 1.9 - .9 * zoom;                                              // da lontano la costellazione occupa metà del riquadro
    const cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2 - 8;
    svg.setAttribute('viewBox', `${(cx - w * s / 2).toFixed(1)} ${(cy - h * s / 2).toFixed(1)} ${(w * s).toFixed(1)} ${(h * s).toFixed(1)}`);
    u = Math.max(1, w * s / W * .75); svg.style.setProperty('--u', (w * s / W).toFixed(3));                 // i nomi restano a 11–14 px a ogni larghezza
  };
  vista(); disegna();
  new ResizeObserver(() => { vista(); disegna(); }).observe(svg);

  // passandoci sopra: il nome, e i collegamenti di quel punto accesi
  let attivo = null;
  const accendi = n => {
    if (attivo === n) return; attivo = n;
    fig.classList.toggle('is-acceso', !!n);
    archi.forEach(a => a.el.classList.toggle('is-on', !!n && (a.a === n || a.b === n)));
    nodi.forEach(m => { const on = !!n && (m === n || n.vicini.has(m)); m.el.classList.toggle('is-on', on); m.t.classList.toggle('is-on', on && (m === n || m.tipo === 'pratica')); });
    if (!n) { eti.classList.remove('is-on'); return; }
    eti.innerHTML = ''; eti.append(n.nome); const sm = document.createElement('small'); sm.textContent = n.sotto; eti.append(sm);
    posaEti();
    eti.classList.add('is-on');
  };
  const posaEti = () => {
    if (!attivo) return;
    const m = svg.getScreenCTM(), fb = fig.getBoundingClientRect(); if (!m) return;
    const x = m.a * attivo.x + m.e - fb.left, y = m.d * (attivo.y - attivo.r) + m.f - fb.top;
    eti.style.left = `${Math.min(fb.width - 150, Math.max(150, x)).toFixed(0)}px`; eti.style.top = `${Math.max(64, y).toFixed(0)}px`;
  };
  const vicino = e => {
    const m = svg.getScreenCTM(); if (!m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    let best = null, bd = Infinity; const soglia = 14 / m.a;
    nodi.forEach(n => { const d = Math.hypot(n.x - p.x, n.y - p.y) - n.r; if (d < bd) { bd = d; best = n; } });
    return bd < soglia ? best : null;
  };
  svg.addEventListener('pointermove', e => accendi(vicino(e)));
  svg.addEventListener('pointerdown', e => accendi(vicino(e)));
  svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') accendi(null); });

  if (rm) { zoom = 1; vista(); fig.classList.add('is-vicino'); return; }
  // all'arrivo sullo schermo: dalla costellazione lontana ci si avvicina (1,8 s); poi i punti respirano finché il grafo si vede
  let visibile = false, t0 = 0, raf = 0, arrivato = false;
  const vivo = now => {
    raf = 0;
    if (arrivato && t0) { const p = Math.min(1, (now - t0) / 1800); zoom = curva(p); vista(); if (p >= .55) fig.classList.add('is-vicino'); }
    passo(.06, .05, now); contorno(); vista(); disegna(); posaEti();
    if (visibile) raf = requestAnimationFrame(vivo);
  };
  new IntersectionObserver(([e]) => {
    visibile = e.isIntersecting;
    if (visibile && !arrivato && e.intersectionRatio >= .45) { arrivato = true; t0 = performance.now(); }
    if (visibile && !raf) raf = requestAnimationFrame(vivo);
  }, { threshold: [0, .45] }).observe(fig);
}

/* ================================================================ v8.1: la comparsa leggerissima delle sezioni, chiesta da Luca dopo la taste-skill
   (che di base non la vorrebbe): testo e immagine di ogni sezione salgono di 14 px mentre compaiono, una volta sola, l'immagine 90 ms dopo
   il testo. Restano ferme le parti che hanno già un loro movimento: l'apertura, le Pratiche, il motto, la chiusura e la costellazione del grafo.
   Si nasconde solo quello che all'avvio è sotto lo schermo: niente lampi, e senza script o con prefers-reduced-motion la pagina è intera. */
function rivela() {
  if (rm || html.dataset.motion === 'off' || !('IntersectionObserver' in window)) return;
  const sezioni = ['attivita', 'ricerca', 'ia', 'analizza', 'pseudonimizza', 'grafo', 'learn', 'forum', 'domande', 'anteprima'];
  const io = new IntersectionObserver(voci => voci.forEach(v => {
    if (!v.isIntersecting) return;
    v.target.classList.add('rv-in'); io.unobserve(v.target);
  }), { rootMargin: '0px 0px -8% 0px', threshold: .12 });
  html.classList.add('rivela');
  sezioni.forEach(id => {
    const sez = document.getElementById(id); if (!sez) return;
    [...sez.querySelectorAll(':scope > .wrap > *')].filter(el => !el.matches('figure.grafo')).forEach((el, i) => {
      if (el.getBoundingClientRect().top < innerHeight) return;
      el.classList.add('rv'); el.style.setProperty('--rd', `${i * 90}ms`); io.observe(el);
    });
  });
}

// v8.1: all'avvio solo quello che serve al primo schermo; le parti più in basso (il grafo, il flusso, la chiusura…) si preparano
// quando l'apertura si è posata, o al primo scorrimento, o subito se si arriva a un'ancora: così non rubano fotogrammi alle funzioni che entrano
let preparato = false;
function assestata() {
  if (preparato) return; preparato = true;
  removeEventListener('scroll', assestata);
  const resto = [passaggio, flusso, segnaposti, motto, prova, chiusura, grafo];
  if (location.hash || scrollY > 0 || !window.requestIdleCallback) return resto.forEach(f => f());
  const uno = () => { resto.shift()?.(); if (resto.length) requestIdleCallback(uno, { timeout: 400 }); };   // uno per volta, nei momenti liberi
  addEventListener('scroll', () => { while (resto.length) resto.shift()(); }, { passive: true, once: true });
  requestIdleCallback(uno, { timeout: 400 });
}
tema(); barra(); lettura(); cursore(); rivela();
if (location.hash || !document.querySelector('.apertura')) assestata();
else { addEventListener('scroll', assestata, { passive: true }); setTimeout(assestata, 9000); }
// l'apertura entra mentre il logo dell'intro vola al suo posto (o subito, se l'intro non c'è)
let aperta = false; const apri = () => { if (!aperta) { aperta = true; apertura(); } };
intro(apri).then(apri);
