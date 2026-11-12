/* Motor compartido de los briefs de Loreto Consultora.
 * Se carga primero; cada página arma su configuración con los helpers H y llama a startBrief(config).
 * config = { key, tipo, titulo, blank, steps, sections, noSkip, onChange }
 */
let S, B;
  /* ---------- helpers de preguntas ---------- */
  var esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  var H = {
    esc,
    swatch: (cols, cls = "") => `<div class="sw ${cls}">${cols.map((c) => `<i style="background:${c}"></i>`).join("")}</div>`,
    /** Tarjeta de pregunta. Toda pregunta con id lleva la casilla para saltarla. */
    q(title, hint, body, req, id, cls = "") {
      const sk = id && S._skip[id];
      return `<div class="q ${cls} ${sk ? "skipped" : ""}" ${id ? `id="${id}"` : ""}><h3>${title}${req ? ' <span class="req">*</span>' : ""}</h3>${hint ? `<p class="hint">${hint}</p>` : ""}${body}${id && !B.noSkip?.includes(id) ? `<label class="skip"><input type="checkbox" data-skip="${id}" ${sk ? "checked" : ""}> Ya compartí esta información con Loreto</label>` : ""}<div class="err"></div></div>`;
    },
    multi(key, items, { max = 0, cols = "g2", render, avoid = false } = {}) {
      return `<div class="grid ${cols}" data-multi="${key}" data-max="${max}">${items.map((it, i) => { const v = Array.isArray(it) ? it[0] : it; return `<button type="button" class="opt ${avoid ? "avoid" : ""}" data-v="${esc(v)}" aria-pressed="${S[key].includes(v)}">${render ? render(it, i) : `<span class="lbl">${esc(v)}</span>`}</button>`; }).join("")}</div>${max ? `<div class="counter" data-count="${key}"></div>` : ""}`;
    },
    chips(key, items, single, max = 0) {
      return `<div class="chips" data-${single ? "single" : "multi"}="${key}" data-max="${max}">${items.map((v) => `<button type="button" class="chip" data-v="${esc(v)}" aria-pressed="${single ? S[key] === v : S[key].includes(v)}">${esc(v)}</button>`).join("")}</div>${max ? `<div class="counter" data-count="${key}"></div>` : ""}`;
    },
    single(key, items, { cols = "g2", render } = {}) {
      return `<div class="grid ${cols}" data-single="${key}">${items.map((it) => { const v = Array.isArray(it) ? it[0] : it; return `<button type="button" class="opt" data-v="${esc(v)}" aria-pressed="${S[key] === v}">${render ? render(it) : `<span class="lbl">${esc(v)}</span>`}</button>`; }).join("")}</div>`;
    },
    /** Escalas 1 a 5: group es la clave del objeto en S, scales = [[clave, izquierda, derecha]] */
    scales(group, scales) {
      return scales.map((s) => `<div class="scale" data-scale="${group}:${s[0]}"><div class="ends"><span>${s[1]}</span><span style="text-align:right">${s[2]}</span></div><div class="dots">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="dot" data-n="${n}" aria-pressed="${S[group][s[0]] == n}" aria-label="${s[1]} a ${s[2]}: ${n}">${n}</button>`).join("")}</div></div>`).join("");
    },
    input: (key, ph = "", attrs = "") => `<input class="field" data-text="${key}" value="${esc(S[key])}" placeholder="${esc(ph)}" ${attrs}>`,
    area: (key, ph = "Escribe aquí...", attrs = "") => `<textarea class="field" data-text="${key}" placeholder="${esc(ph)}" ${attrs}>${esc(S[key])}</textarea>`,
    /** Valida una pregunta obligatoria; si está marcada como ya compartida, pasa. */
    req(id, ok, msg) {
      const box = document.getElementById(id);
      const e = box && box.querySelector(".err");
      if (!ok && !S._skip[id]) {
        if (e) { e.textContent = msg; e.classList.add("show"); }
        box && box.scrollIntoView({ behavior: "smooth", block: "center" });
        return false;
      }
      if (e) e.classList.remove("show");
      return true;
    },
  };
  window.H = H;
const ID_KEY = "loreto-brief-identidad";
function startBrief(config) {
  B = window.BRIEF = config;

  /* ---------- estado ---------- */
  const base = Object.assign({ nombre: "", marca: "", correo: "", _skip: {}, _id: "", _enviado: "" }, B.blank);
  function load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(B.key)); } catch (e) {}
    const s = Object.assign(structuredClone(base), d || {});
    try {
      const id = JSON.parse(localStorage.getItem(ID_KEY)) || {};
      for (const k of ["nombre", "marca", "correo"]) if (!s[k] && id[k]) s[k] = id[k];
    } catch (e) {}
    if (!s._id) s._id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
    return s;
  }
  S = window.S = load();
  const qp = new URLSearchParams(location.search);
  if (qp.get("marca") && !S.marca) S.marca = qp.get("marca");

  let saveT;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try {
        localStorage.setItem(B.key, JSON.stringify(S));
        localStorage.setItem(ID_KEY, JSON.stringify({ nombre: S.nombre, marca: S.marca, correo: S.correo }));
        flash("Guardado");
      } catch (e) {}
    }, 250);
  }
  function flash(t) {
    const el = document.getElementById("saved");
    el.textContent = t;
    clearTimeout(el._t);
    el._t = setTimeout(() => (el.textContent = ""), 1400);
  }


  /* ---------- resumen ---------- */
  const EMPTY = '<span class="sum-v" style="color:#a1a1a6">—</span>';
  const SKIPPED = '<span class="tag">Ya compartida con Loreto</span>';
  /** Valor legible de una pregunta para el resumen y para el envío. */
  function valueOf(item) {
    let v = typeof item.v === "function" ? item.v() : item.v;
    const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && !v.filter(Boolean).length);
    if (item.skip && S._skip[item.skip] && empty) return { html: SKIPPED, text: "Ya compartida con Loreto" };
    if (Array.isArray(v)) {
      v = v.filter(Boolean);
      return v.length ? { html: v.map((x) => `<span class="tag ${item.cls || ""}">${esc(x)}</span>`).join(""), text: v.join(", ") } : { html: EMPTY, text: "" };
    }
    if (v === undefined || v === null || v === "") return { html: EMPTY, text: "" };
    return { html: item.raw ? String(v) : esc(v).replace(/\n/g, "<br>"), text: item.text !== undefined ? (typeof item.text === "function" ? item.text() : item.text) : String(v) };
  }
  function summaryData() {
    return B.sections().map((sec) => ({ seccion: sec.h, filas: sec.rows.filter((r) => !r.hide).map((r) => ({ pregunta: r.k, respuesta: valueOf(r).text })) }));
  }
  function summaryHTML() {
    const fecha = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
    const cfg = window.LORETO_DB && window.LORETO_DB.url && window.LORETO_DB.key;
    return `
    <img class="print-only" src="../assets/logo-loreto-color.png" alt="Loreto Consultora" style="height:30px;width:auto;margin-bottom:6px">
    <div class="kicker">${esc(B.titulo)} · Resumen</div>
    <h1>${esc(S.marca || "Tu marca")}</h1>
    <p class="lead" style="margin-top:-4px">${esc(S.nombre)}${S.correo ? " · " + esc(S.correo) : ""} · ${fecha}</p>
    <div class="done-box no-print"><b>¡Gracias! Ya casi terminamos.</b><br>${cfg ? "Revisa tus respuestas y toca <b>“Enviar a Loreto”</b>. También puedes descargarlas en PDF para conservarlas." : "Descarga tus respuestas en PDF y envíaselas a Loreto Consultora. En tu celular, elige <b>“Guardar como PDF”</b> en la ventana que se abrirá."}</div>
    <div class="sumcard">${B.sections().map((sec) => `<div class="sum-sec"><h4>${esc(sec.h)}</h4>${sec.pre ? sec.pre() : ""}${sec.rows.filter((r) => !r.hide).map((r) => `<div class="sum-row"><span class="sum-k">${esc(r.k)}</span><span class="sum-v">${valueOf(r).html}</span></div>`).join("")}</div>`).join("")}</div>
    <p class="print-only" style="font-size:11px;color:#6E6E73;margin-top:18px">${esc(B.titulo)} · Loreto Consultora · loretoconsultora.lat</p>
    <div class="no-print" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:18px">
      ${cfg ? `<button type="button" class="btn accent" id="send">${S._enviado ? "Enviar de nuevo" : "Enviar a Loreto"}</button>` : ""}
      <button type="button" class="btn ${cfg ? "ghost" : "accent"}" id="pdf">Descargar mis respuestas (PDF)</button>
      <button type="button" class="btn ghost" id="edit">Editar respuestas</button>
      <a class="btn ghost" href="../" style="text-decoration:none">Volver al inicio</a>
    </div>
    <div class="sendbox no-print ${S._enviado ? "ok" : ""}" id="sendmsg">${S._enviado ? `Enviado a Loreto el ${new Date(S._enviado).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" })}.` : ""}</div>`;
  }

  async function send() {
    const btn = document.getElementById("send");
    const msg = document.getElementById("sendmsg");
    const { url, key } = window.LORETO_DB;
    btn.disabled = true;
    msg.className = "sendbox no-print";
    msg.textContent = "Enviando...";
    const answers = Object.fromEntries(Object.entries(S).filter(([k]) => !k.startsWith("_")));
    try {
      const r = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/brief_responses`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ submission_id: S._id, tipo: B.tipo, marca: S.marca, nombre: S.nombre, correo: S.correo || null, respuestas: answers, resumen: summaryData(), saltadas: Object.keys(S._skip).filter((k) => S._skip[k]) }),
      });
      if (!r.ok) throw new Error(await r.text());
      S._enviado = new Date().toISOString();
      save();
      msg.className = "sendbox no-print ok";
      msg.textContent = "¡Listo! Tus respuestas llegaron a Loreto Consultora.";
      btn.textContent = "Enviar de nuevo";
    } catch (e) {
      msg.className = "sendbox no-print bad";
      msg.textContent = "No se pudo enviar. Revisa tu conexión e inténtalo de nuevo, o descarga el PDF y envíanoslo.";
    }
    btn.disabled = false;
  }

  /* ---------- render ---------- */
  const STEPS = [...B.steps, { id: "summary", label: "Resumen", html: summaryHTML }];
  let cur = 0;
  const visible = () => STEPS.filter((s) => !s.when || s.when());
  const form = document.getElementById("form");
  function render() {
    const vs = visible();
    if (cur >= vs.length) cur = vs.length - 1;
    form.innerHTML = vs.map((s, i) => `<section class="step ${i === cur ? "active" : ""}" id="step-${s.id}">${i === cur ? s.html() : ""}</section>`).join("");
    const total = vs.length - 1;
    document.getElementById("bar").style.width = (cur / total) * 100 + "%";
    document.getElementById("steplabel").textContent = cur > 0 && cur < total ? `Paso ${cur} de ${total - 1} · ${vs[cur].label}` : "";
    document.getElementById("prev").style.visibility = cur > 0 ? "visible" : "hidden";
    const next = document.getElementById("next");
    next.style.display = cur === total ? "none" : "";
    next.textContent = cur === 0 ? "Comenzar" : cur === total - 1 ? "Ver resumen" : "Siguiente";
    updateCounters();
    if (B.afterRender) B.afterRender();
    if (cur === total) {
      document.getElementById("pdf").onclick = () => { document.title = `${B.titulo} - ${S.marca || "marca"} - ${S.nombre}`; window.print(); };
      document.getElementById("edit").onclick = () => { cur = 1; render(); window.scrollTo(0, 0); };
      const sb = document.getElementById("send");
      if (sb) sb.onclick = send;
    }
  }
  window.rerender = render;
  function updateCounters() {
    form.querySelectorAll("[data-count]").forEach((el) => {
      const k = el.dataset.count;
      const max = +form.querySelector(`[data-multi="${k}"]`).dataset.max;
      el.textContent = `${S[k].length} de ${max} seleccionadas`;
    });
  }
  form.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const m = b.closest("[data-multi]"), s = b.closest("[data-single]"), sc = b.closest("[data-scale]");
    if (sc) {
      const [g, k] = sc.dataset.scale.split(":");
      S[g][k] = +b.dataset.n;
      sc.querySelectorAll(".dot").forEach((d) => d.setAttribute("aria-pressed", d === b));
      save();
      return;
    }
    if (m) {
      const k = m.dataset.multi, max = +m.dataset.max, v = b.dataset.v, arr = S[k], i = arr.indexOf(v);
      if (i > -1) arr.splice(i, 1);
      else { if (max && arr.length >= max) { flash(`Máximo ${max}`); return; } arr.push(v); }
      b.setAttribute("aria-pressed", i === -1);
      updateCounters();
      save();
      if (B.onChange) B.onChange(k);
      return;
    }
    if (s) {
      const k = s.dataset.single, v = b.dataset.v;
      S[k] = S[k] === v ? "" : v;
      s.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", S[k] === x.dataset.v));
      save();
      if (B.onChange) B.onChange(k);
    }
  });
  form.addEventListener("input", (e) => {
    const k = e.target.dataset.text;
    if (k) { S[k] = e.target.value; save(); }
  });
  form.addEventListener("change", (e) => {
    const id = e.target.dataset.skip;
    if (!id) return;
    S._skip[id] = e.target.checked;
    const box = document.getElementById(id);
    box.classList.toggle("skipped", e.target.checked);
    if (e.target.checked) box.querySelector(".err")?.classList.remove("show");
    save();
  });
  document.getElementById("next").onclick = () => {
    const st = visible()[cur];
    if (st.validate && !st.validate()) return;
    cur++;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  document.getElementById("prev").onclick = () => { if (cur > 0) { cur--; render(); window.scrollTo({ top: 0 }); } };
  if (qp.get("paso") === "resumen") cur = visible().length - 1;
  render();
}
