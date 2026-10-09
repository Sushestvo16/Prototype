/* Vitrine Masters — prototype homepage
   Maatlijnen worden getekend op de echte layout: 1 apparaatpixel dik,
   opnieuw berekend bij elke resize. */
(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const rustig = window.matchMedia("(prefers-reduced-motion: reduce)");
  const dpr = () => window.devicePixelRatio || 1;
  const snap = (v) => (Math.round(v * dpr()) + 0.5) / dpr();

  function maak(tag, attrs, ouder) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (ouder) ouder.appendChild(n);
    return n;
  }

  function lijn(svg, d, cls, vertraging) {
    const p = maak("path", { d, class: cls, pathLength: 1 }, svg);
    if (vertraging) p.style.transitionDelay = vertraging + "ms";
    return p;
  }

  /* Eén maatlijn: hulplijnen vanaf twee ankerpunten, de maatlijn zelf,
     schuine maatstreepjes en een label met uitsparing. */
  function maatlijn(svg, o) {
    const { richting, a, b, pos, tekst, uitsparing = "ml-uitsparing", vertraging = 0 } = o;
    const g = maak("g", {}, svg);
    if (richting === "v") {
      const x = snap(pos);
      const ya = snap(a.y), yb = snap(b.y);
      const zA = pos < a.x ? -1 : 1, zB = pos < b.x ? -1 : 1;
      lijn(g, `M${snap(a.x + zA * 6)} ${ya}H${snap(pos + zA * 8)}`, "ml-hulp", vertraging);
      lijn(g, `M${snap(b.x + zB * 6)} ${yb}H${snap(pos + zB * 8)}`, "ml-hulp", vertraging);
      lijn(g, `M${x} ${ya}V${yb}`, "ml-lijn", vertraging + 120);
      lijn(g, `M${x - 4} ${ya + 4}L${x + 4} ${ya - 4}M${x - 4} ${yb + 4}L${x + 4} ${yb - 4}`, "ml-lijn", vertraging + 240);
      label(g, x, (ya + yb) / 2, tekst, -90, uitsparing);
    } else {
      const y = snap(pos);
      const xa = snap(a.x), xb = snap(b.x);
      const zA = pos < a.y ? -1 : 1, zB = pos < b.y ? -1 : 1;
      lijn(g, `M${xa} ${snap(a.y + zA * 6)}V${snap(pos + zA * 8)}`, "ml-hulp", vertraging);
      lijn(g, `M${xb} ${snap(b.y + zB * 6)}V${snap(pos + zB * 8)}`, "ml-hulp", vertraging);
      lijn(g, `M${xa} ${y}H${xb}`, "ml-lijn", vertraging + 120);
      lijn(g, `M${xa - 4} ${y + 4}L${xa + 4} ${y - 4}M${xb - 4} ${y + 4}L${xb + 4} ${y - 4}`, "ml-lijn", vertraging + 240);
      label(g, (xa + xb) / 2, y, tekst, 0, uitsparing);
    }
    return g;
  }

  function label(g, x, y, tekst, hoek, uitsparing) {
    const groep = maak("g", { transform: `translate(${x} ${y}) rotate(${hoek})` }, g);
    const r = maak("rect", { class: uitsparing }, groep);
    const t = maak("text", { class: "ml-tekst", x: 0, y: 0 }, groep);
    t.textContent = tekst;
    const bb = t.getBBox();
    r.setAttribute("x", bb.x - 6);
    r.setAttribute("y", bb.y - 3);
    r.setAttribute("width", bb.width + 12);
    r.setAttribute("height", bb.height + 6);
  }

  /* Leeg een laag en teken opnieuw; animeer alleen de eerste keer. */
  function teken(svg, bouw, animeer) {
    svg.replaceChildren();
    svg.style.strokeWidth = 1 / dpr() + "px";
    const doeAnimatie = animeer && !rustig.matches;
    svg.classList.toggle("tekent", doeAnimatie);
    svg.classList.remove("getekend");
    bouw(svg);
    if (doeAnimatie) {
      requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add("getekend")));
    }
  }

  const fractie = (s) => s.split(",").map(Number);
  const relatief = (el, tov) => {
    const r = el.getBoundingClientRect(), o = tov.getBoundingClientRect();
    return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
  };

  /* ---------- het blad: maattekening van de echte vitrine ---------- */

  const heroVak = document.getElementById("hero-tekening");
  const heroSvg = document.getElementById("hero-maat");
  let heroGetekend = false;

  function tekenHero() {
    if (!heroVak) return;
    const fig = heroVak.querySelector(".blad__foto");
    const img = fig.querySelector("img");
    const f = relatief(img, heroVak);
    if (!f.w) return;
    const [lbx, lby] = fractie(fig.dataset.ankerLb);
    const [lox, loy] = fractie(fig.dataset.ankerLo);
    const [rbx, rby] = fractie(fig.dataset.ankerRb);
    const H = +fig.dataset.h, B = +fig.dataset.b;
    const pt = (fx, fy) => ({ x: f.x + fx * f.w, y: f.y + fy * f.h });
    const lb = pt(lbx, lby), lo = pt(lox, loy), rb = pt(rbx, rby);
    const ruimteLinks = f.x;
    const ruimteBoven = f.y;

    teken(heroSvg, (svg) => {
      maatlijn(svg, { richting: "v", a: lb, b: lo, pos: f.x - Math.min(36, ruimteLinks - 14), tekst: `H ${H}` });
      maatlijn(svg, { richting: "h", a: lb, b: rb, pos: f.y - Math.min(32, ruimteBoven - 16), tekst: `B ${B}`, vertraging: 160 });

    }, !heroGetekend);
    heroGetekend = true;
  }

  /* ---------- producten: maatlijst op één schaal ---------- */
  /* B staat altijd getekend; H komt erbij bij hover of focus. */

  function tekenProduct(beeld, metH, animeer) {
    const svg = beeld.querySelector(".maatlaag");
    const img = beeld.querySelector("img");
    const r = relatief(img, beeld);
    if (!r.w) return;
    const [x1, y1, x2, y2] = fractie(beeld.dataset.kader);
    const p = (fx, fy) => ({ x: r.x + fx * r.w, y: r.y + fy * r.h });
    const lb = p(x1, y1), lo = p(x1, y2), ro = p(x2, y2);
    teken(svg, (s) => {
      maatlijn(s, { richting: "h", a: lo, b: ro, pos: lo.y + 26, tekst: `B ${beeld.dataset.b}`, uitsparing: "ml-uitsparing--wit" });
      if (metH) maatlijn(s, { richting: "v", a: lb, b: lo, pos: lb.x - 16, tekst: `H ${beeld.dataset.h}`, uitsparing: "ml-uitsparing--wit", vertraging: 80 });
    }, animeer);
  }
  const productBeelden = [...document.querySelectorAll(".product__beeld")];
  const tekenProducten = () => productBeelden.forEach((b) => tekenProduct(b, false, false));

  document.querySelectorAll(".product").forEach((kaart) => {
    const beeld = kaart.querySelector(".product__beeld");
    if (!beeld) return;
    kaart.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") tekenProduct(beeld, true, true); });
    kaart.addEventListener("pointerleave", () => tekenProduct(beeld, false, false));
    kaart.addEventListener("focusin", () => tekenProduct(beeld, true, true));
    kaart.addEventListener("focusout", (e) => { if (!kaart.contains(e.relatedTarget)) tekenProduct(beeld, false, false); });
  });

  /* ---------- carrousel hardlopers: pijlen, geen autoplay ---------- */

  const carrousel = document.getElementById("schema");
  const carrPijlen = [...document.querySelectorAll(".carrousel__pijl")];
  function zetCarrousel() {
    if (!carrousel) return;
    const max = carrousel.scrollWidth - carrousel.clientWidth - 2;
    carrPijlen.forEach((k) => {
      k.disabled = +k.dataset.richting < 0 ? carrousel.scrollLeft <= 2 : carrousel.scrollLeft >= max;
    });
  }
  if (carrousel) {
    carrPijlen.forEach((k) => k.addEventListener("click", () => {
      const kaart = carrousel.querySelector(".product");
      const stap = Math.max(kaart.offsetWidth, Math.round(carrousel.clientWidth / kaart.offsetWidth) * kaart.offsetWidth);
      carrousel.scrollBy({ left: +k.dataset.richting * stap });
    }));
    carrousel.addEventListener("scroll", zetCarrousel, { passive: true });
    /* slepen met de muis; aanraken en trackpad scrollen al vanzelf */
    let sleep = null;
    carrousel.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      sleep = { x: e.clientX, links: carrousel.scrollLeft, bewogen: false };
    });
    window.addEventListener("pointermove", (e) => {
      if (!sleep) return;
      const dx = e.clientX - sleep.x;
      if (!sleep.bewogen && Math.abs(dx) > 6) {
        sleep.bewogen = true;
        carrousel.classList.add("sleept");
      }
      if (sleep.bewogen) carrousel.scrollLeft = sleep.links - dx;
    });
    window.addEventListener("pointerup", () => {
      if (!sleep) return;
      const bewogen = sleep.bewogen;
      sleep = null;
      if (!bewogen) return;
      carrousel.classList.remove("sleept");
      // een sleep is geen klik op een kaart
      const slik = (e) => { e.preventDefault(); e.stopPropagation(); };
      carrousel.addEventListener("click", slik, { capture: true, once: true });
      setTimeout(() => carrousel.removeEventListener("click", slik, { capture: true }), 0);
      const kaart = carrousel.querySelector(".product").offsetWidth;
      carrousel.scrollTo({ left: Math.round(carrousel.scrollLeft / kaart) * kaart });
    });
    carrousel.addEventListener("dragstart", (e) => e.preventDefault());
    carrousel.addEventListener("keydown", (e) => {
      const stap = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!stap) return;
      e.preventDefault();
      carrousel.scrollBy({ left: stap * carrousel.querySelector(".product").offsetWidth });
    });
  }

  /* ---------- projecten: harmonica ---------- */

  const lappen = [...document.querySelectorAll("#lappen .lap")];
  const breed = window.matchMedia("(min-width: 901px)");
  function openLap(lap) { lappen.forEach((l) => l.classList.toggle("is-open", l === lap)); }
  lappen.forEach((lap) => {
    const link = lap.querySelector("a");
    lap.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && breed.matches) openLap(lap); });
    link.addEventListener("focus", () => { if (breed.matches) openLap(lap); });
    // aanraken: eerste tik opent de strook, tweede tik volgt de link
    link.addEventListener("click", (e) => {
      if (breed.matches && !lap.classList.contains("is-open")) { e.preventDefault(); openLap(lap); }
    });
  });

  /* ---------- maatstaf: liniaal 0–300 cm ---------- */

  const rij = document.getElementById("maatstaf-rij");
  const liniaal = document.getElementById("liniaal");

  function tekenLiniaal(wijzer) {
    if (!rij || !liniaal || rij.offsetParent === null) return;
    const scroller = liniaal.parentElement;
    const s = parseFloat(getComputedStyle(rij).getPropertyValue("--s")) || 0.5;
    const plek = rij.querySelector(".maatstaf__plek");
    const r = relatief(plek, scroller);
    const vloer = snap(r.y + r.h + scroller.scrollTop);
    const breedte = rij.scrollWidth;
    liniaal.setAttribute("width", breedte);
    liniaal.style.width = breedte + "px";
    liniaal.style.height = scroller.scrollHeight + "px";
    const as = snap(40);
    liniaal.replaceChildren();
    liniaal.style.strokeWidth = 1 / dpr() + "px";
    maak("path", { d: `M${as} ${vloer}V${snap(vloer - 300 * s)}`, class: "lin-as" }, liniaal);
    let d = "";
    for (let cm = 0; cm <= 300; cm += 10) {
      const y = snap(vloer - cm * s);
      const len = cm % 100 === 0 ? 9 : cm % 50 === 0 ? 6 : 3;
      d += `M${as - len} ${y}H${as}`;
    }
    maak("path", { d, class: "lin-streep" }, liniaal);
    maak("path", { d: `M${as + 6} ${snap(vloer - 100 * s)}H${breedte}M${as + 6} ${snap(vloer - 200 * s)}H${breedte}`, class: "lin-hulp" }, liniaal);
    maak("path", { d: `M${as} ${vloer}H${breedte}`, class: "lin-vloer" }, liniaal);
    [100, 200, 300].forEach((cm) => {
      const t = maak("text", { class: "lin-tekst", x: as - 13, y: vloer - cm * s }, liniaal);
      t.textContent = cm;
    });
    const eenheid = maak("text", { class: "lin-tekst", x: as - 13, y: vloer + 1 }, liniaal);
    eenheid.textContent = "cm";
    if (wijzer) {
      const top = +wijzer.dataset.top;
      const sil = relatief(wijzer.querySelector(".sil"), scroller);
      const y = snap(vloer - top * s);
      maak("path", { d: `M${as} ${y}H${snap(sil.x + scroller.scrollLeft + sil.w / 2)}`, class: "lin-wijzer" }, liniaal);
    }
  }

  const veld = document.querySelector(".maatstaf__veld");
  const scroller = liniaal && liniaal.parentElement;
  function zetPijlen() {
    if (!scroller) return;
    const terug = scroller.scrollLeft > 4;
    const meer = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 4;
    veld.dataset.terug = terug ? 1 : 0;
    veld.dataset.meer = meer ? 1 : 0;
    veld.querySelector('[data-richting="-1"]').hidden = !terug;
    veld.querySelector('[data-richting="1"]').hidden = !meer;
  }
  if (scroller) {
    scroller.addEventListener("scroll", zetPijlen, { passive: true });
    veld.querySelectorAll(".maatstaf__pijl").forEach((k) => k.addEventListener("click", () => {
      scroller.scrollBy({ left: +k.dataset.richting * scroller.clientWidth * 0.7, behavior: rustig.matches ? "auto" : "smooth" });
    }));
  }

  if (rij) {
    rij.querySelectorAll("a").forEach((a) => {
      a.addEventListener("pointerenter", () => tekenLiniaal(a));
      a.addEventListener("focus", () => tekenLiniaal(a));
      a.addEventListener("pointerleave", () => tekenLiniaal(null));
      a.addEventListener("blur", () => tekenLiniaal(null));
    });
  }

  /* ---------- maatwerk: schets die meet ---------- */

  const schetsSvg = document.getElementById("schets-svg");
  const schetsForm = document.getElementById("schets-form");
  const schetsUit = document.getElementById("schets-uit");
  const staat = { b: 150, u: "glas", led: true };
  let schetsB = 150, schetsGetekend = false, tween = 0;

  function tekenSchets(animeer) {
    if (!schetsSvg) return;
    const vak = schetsSvg.getBoundingClientRect();
    if (!vak.width) return;
    const W = vak.width, Hh = vak.height;
    const s = Math.min((W - 196) / 280, (Hh - 120) / 200);
    const w = schetsB * s, h = 200 * s;
    const groep = w + 48 + 40 * s;
    const x = (W - groep) / 2 + 18, y = (Hh - h) / 2 - 12;
    const c = (cm) => cm * s;

    teken(schetsSvg, (svg) => {
      const xL = snap(x), xR = snap(x + w), yT = snap(y), yB = snap(y + h);
      const kap = snap(y + c(5)), plint = snap(y + h - c(8));
      let glasOnder = plint;
      if (staat.u === "onderkast") glasOnder = snap(y + c(115));
      if (staat.u === "lades") glasOnder = snap(y + c(140));

      if (staat.led) {
        maak("rect", { x: xL, y: kap, width: xR - xL, height: glasOnder - kap, class: "ml-ledwas" }, svg);
      }
      if (staat.u !== "glas") {
        maak("rect", { x: xL, y: glasOnder, width: xR - xL, height: plint - glasOnder, class: "ml-dicht" }, svg);
      }
      lijn(svg, `M${xL} ${yT}H${xR}V${yB}H${xL}Z`, "ml-vorm");
      lijn(svg, `M${xL} ${kap}H${xR}M${xL} ${plint}H${xR}`, "ml-vorm", 80);

      const deuren = schetsB <= 150 ? 2 : schetsB <= 200 ? 3 : 4;
      let d = "";
      for (let i = 1; i < deuren; i++) d += `M${snap(x + (w * i) / deuren)} ${kap}V${glasOnder}`;
      if (staat.u !== "glas") d += `M${xL} ${glasOnder}H${xR}`;
      if (staat.u === "onderkast") d += `M${snap(x + w / 2)} ${glasOnder}V${plint}`;
      if (staat.u === "lades") {
        const mid = snap(glasOnder + (plint - glasOnder) / 2);
        d += `M${xL} ${mid}H${xR}`;
        const hx = x + w / 2;
        [glasOnder, mid].forEach((top) => {
          const hy = snap(top + (plint - glasOnder) / 4);
          d += `M${snap(hx - c(8))} ${hy}H${snap(hx + c(8))}`;
        });
      }
      lijn(svg, d, "ml-vorm", 160);

      const glasH = glasOnder - kap;
      let pl = "";
      [0.26, 0.5, 0.74].forEach((f) => { pl += `M${xL + 3} ${snap(kap + glasH * f)}H${xR - 3}`; });
      lijn(svg, pl, "ml-vorm-zacht", 220);

      if (staat.led) {
        lijn(svg, `M${snap(x + c(5))} ${kap + 4}V${glasOnder - 4}M${snap(x + w - c(5))} ${kap + 4}V${glasOnder - 4}`, "ml-led", 260);
      }

      maatlijn(svg, { richting: "v", a: { x, y }, b: { x, y: y + h }, pos: x - 30, tekst: "H 200", uitsparing: "ml-uitsparing--alu", vertraging: 200 });
      maatlijn(svg, { richting: "h", a: { x, y: y + h }, b: { x: x + w, y: y + h }, pos: y + h + 28, tekst: `B ${Math.round(schetsB)}`, uitsparing: "ml-uitsparing--alu", vertraging: 320 });
      // zijaanzicht, dezelfde schaal
      const zx = x + w + 48, zw = 40 * s;
      const zL = snap(zx), zR = snap(zx + zw);
      lijn(svg, `M${snap(x + w + 8)} ${yT}H${zL - 6}M${snap(x + w + 8)} ${yB}H${zL - 6}`, "ml-proj", 200);
      lijn(svg, `M${zL} ${yT}H${zR}V${yB}H${zL}Z`, "ml-vorm", 200);
      lijn(svg, `M${zL} ${kap}H${zR}M${zL} ${plint}H${zR}` + (staat.u !== "glas" ? `M${zL} ${glasOnder}H${zR}` : ""), "ml-vorm-zacht", 260);
      maatlijn(svg, { richting: "h", a: { x: zx, y: y + h }, b: { x: zx + zw, y: y + h }, pos: y + h + 28, tekst: "D 40", uitsparing: "ml-uitsparing--alu", vertraging: 380 });
    }, animeer);
  }

  function schetsTekst() {
    const u = { glas: "alleen glas", onderkast: "met onderkast", lades: "met lades" }[staat.u];
    schetsUit.replaceChildren();
    const m = document.createElement("span");
    m.className = "maat";
    m.textContent = `H 200 × B ${staat.b} × D 40 cm`;
    schetsUit.append(m, ` · ${u} · ${staat.led ? "met LED" : "zonder LED"}`);
  }

  if (schetsForm) {
    schetsForm.addEventListener("change", () => {
      const fd = new FormData(schetsForm);
      const doel = +fd.get("b");
      staat.u = fd.get("u");
      staat.led = fd.get("led") === "1";
      staat.b = doel;
      schetsTekst();
      cancelAnimationFrame(tween);
      const van = schetsB;
      if (rustig.matches || van === doel) { schetsB = doel; tekenSchets(false); return; }
      const start = performance.now(), duur = 520;
      const stap = (nu) => {
        const t = Math.min(1, (nu - start) / duur);
        const e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        schetsB = van + (doel - van) * e;
        tekenSchets(false);
        if (t < 1) tween = requestAnimationFrame(stap);
      };
      tween = requestAnimationFrame(stap);
    });
  }

  /* ---------- LED: kleurtemperatuur (simulatie) ---------- */

  const kelvin = document.getElementById("kelvin");
  const tint = document.getElementById("led-tint");
  const kelvinUit = document.getElementById("kelvin-uit");
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  function zetKelvin() {
    const k = +kelvin.value;
    const t = (k - 2700) / 3300;
    const warm = [255, 150, 60], neutraal = [255, 236, 214], koel = [185, 212, 255];
    let kleur, dekking;
    if (t < 0.55) { const u = t / 0.55; kleur = mix(warm, neutraal, u); dekking = 0.34 - 0.3 * u; }
    else { const u = (t - 0.55) / 0.45; kleur = mix(neutraal, koel, u); dekking = 0.04 + 0.3 * u; }
    tint.style.setProperty("--tint", `rgb(${kleur.join(",")})`);
    tint.style.setProperty("--tint-o", dekking.toFixed(3));
    kelvinUit.textContent = `${k} K`;
  }
  if (kelvin) { kelvin.addEventListener("input", zetKelvin); zetKelvin(); }

  /* ---------- video: YouTube pas na klik ---------- */

  document.querySelectorAll(".video__start").forEach((knop) => {
    knop.addEventListener("click", () => {
      const speler = knop.parentElement;
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${knop.dataset.video}?autoplay=1&rel=0`;
      iframe.title = knop.dataset.titel;
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;
      speler.replaceChildren(iframe);
      iframe.focus();
    });
  });

  /* ---------- kop: vaste balk, lade, taal, aandacht ---------- */

  const kop = document.getElementById("kop");
  const vast = document.getElementById("kop-vast");
  const lade = document.getElementById("lade");
  const burgers = [...document.querySelectorAll(".burger")];

  /* lade (uitschuifmenu) met alle categorieën */
  function openLade() {
    lade.classList.remove("sluit-af");
    lade.showModal();
    burgers.forEach((b) => b.setAttribute("aria-expanded", true));
    lade.querySelector(".lade__sluit").focus();
  }
  function sluitLade() {
    if (!lade.open || lade.classList.contains("sluit-af")) return;
    if (rustig.matches) { lade.close(); return; }
    lade.classList.add("sluit-af");
    setTimeout(() => { lade.close(); lade.classList.remove("sluit-af"); }, 220);
  }
  burgers.forEach((b) => b.addEventListener("click", openLade));
  lade.querySelector(".lade__sluit").addEventListener("click", sluitLade);
  lade.addEventListener("cancel", (e) => { e.preventDefault(); sluitLade(); });
  lade.addEventListener("click", (e) => { if (e.target === lade) sluitLade(); });
  lade.addEventListener("close", () => burgers.forEach((b) => b.setAttribute("aria-expanded", false)));

  /* taalkeuze (in de volledige kop en in de vaste balk) */
  const taalKeuzes = [...document.querySelectorAll(".taalkeuze")].map((k) => ({
    knop: k.querySelector(".taal"),
    menu: k.querySelector(".taalmenu"),
  }));
  function zetTaal(t, open) {
    t.knop.setAttribute("aria-expanded", open);
    t.menu.hidden = !open;
  }
  taalKeuzes.forEach((t) => {
    t.knop.addEventListener("click", () => {
      const open = t.menu.hidden;
      taalKeuzes.forEach((x) => zetTaal(x, false));
      zetTaal(t, open);
      if (open) t.menu.querySelector("a").focus();
    });
    t.menu.addEventListener("keydown", (e) => {
      const links = [...t.menu.querySelectorAll("a")];
      const i = links.indexOf(document.activeElement);
      const stap = { ArrowDown: 1, ArrowUp: -1 }[e.key];
      if (!stap) return;
      e.preventDefault();
      links[(i + stap + links.length) % links.length].focus();
    });
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".taalkeuze")) taalKeuzes.forEach((t) => zetTaal(t, false));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    taalKeuzes.forEach((t) => { if (!t.menu.hidden) { zetTaal(t, false); t.knop.focus(); } });
  });

  /* actiestrip: een korte meetgolf trekt de aandacht, drie keer, en stopt
     zodra de bezoeker iets doet. */
  const strip = document.querySelector(".kop .actiestrip");
  const stripVast = vast.querySelector(".actiestrip");
  let golven = 0, golfTimer = 0;
  let laatsteGolf = 0;
  function speelGolf(el = strip) {
    if (!el || rustig.matches) return;
    el.classList.remove("attentie");
    void el.offsetWidth;
    el.classList.add("attentie");
    laatsteGolf = performance.now();
  }
  function golf() {
    speelGolf();
    golven += 1;
    if (golven < 3) golfTimer = setTimeout(golf, 9000);
  }
  /* terug bovenaan na een stuk scrollen: nog één golf, hooguit eens per 10 s */
  let wasDiep = false;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    if (y > 400) wasDiep = true;
    else if (y < 40 && wasDiep) {
      wasDiep = false;
      if (performance.now() - laatsteGolf > 10000) speelGolf();
    }
  }, { passive: true });
  const stopGolf = () => { clearTimeout(golfTimer); golven = 3; };
  ["pointerdown", "keydown", "wheel", "touchstart"].forEach((t) => window.addEventListener(t, stopGolf, { once: true, passive: true }));

  /* vaste balk: verschijnt zodra de volledige kop uit beeld is */
  function zetVast(zichtbaar) {
    if (vast.classList.contains("is-zichtbaar") === zichtbaar) return;
    vast.classList.toggle("is-zichtbaar", zichtbaar);
    vast.inert = !zichtbaar;
    if (!zichtbaar) taalKeuzes.forEach((t) => zetTaal(t, false));
    else if (performance.now() - laatsteGolf > 10000) setTimeout(() => speelGolf(stripVast), 280);
  }
  new IntersectionObserver(([item]) => {
    zetVast(!item.isIntersecting && item.boundingClientRect.top < 0);
  }).observe(kop);

  /* ---------- start ---------- */

  function alles() {
    tekenHero();
    tekenLiniaal(null);
    zetPijlen();
    zetCarrousel();
    tekenProducten();
    if (schetsGetekend) tekenSchets(false);
  }

  const klaar = document.fonts ? document.fonts.ready : Promise.resolve();
  klaar.then(() => {
    const heroImg = heroVak && heroVak.querySelector("img");
    if (heroImg && !heroImg.complete) heroImg.addEventListener("load", tekenHero, { once: true });
    productBeelden.forEach((b) => { const i = b.querySelector("img"); if (!i.complete) i.addEventListener("load", () => tekenProduct(b, false, false), { once: true }); });
    alles();
    golfTimer = setTimeout(golf, 500);

    if (schetsSvg) {
      const io = new IntersectionObserver((items) => {
        if (items.some((i) => i.isIntersecting)) {
          schetsGetekend = true;
          tekenSchets(true);
          io.disconnect();
        }
      }, { threshold: 0.35 });
      io.observe(schetsSvg);
    }

    let wacht = 0, laatsteBreedte = window.innerWidth;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(wacht);
      wacht = requestAnimationFrame(() => {
        if (window.innerWidth === laatsteBreedte && heroGetekend) { tekenLiniaal(null); zetPijlen(); return; }
        laatsteBreedte = window.innerWidth;
        alles();
      });
    });
    ro.observe(document.body);
    window.matchMedia(`(resolution: ${dpr()}dppx)`).addEventListener("change", () => alles());
  });
})();
