(function () {
  /* ================== Petals (full-screen) ================== */
  const petalLayer = document.getElementById("petalLayer");
  function spawnPetal() {
    const el = document.createElement("div");
    el.className = "petal";
    const choices = ["💙","🌼","💠","💎","🤍","🩵","🌸"];
    el.textContent = choices[(Math.random()*choices.length)|0];
    el.style.left = Math.round(Math.random() * (petalLayer.clientWidth - 20)) + "px";
    const dur = 6000 + Math.random()*5000;
    el.style.animationDuration = dur + "ms";
    petalLayer.appendChild(el);
    setTimeout(()=> el.remove(), dur + 250);
  }
  let petalsTimer = null;
  function startPetals(){ if(!petalsTimer) petalsTimer = setInterval(()=>{ for(let i=0;i<1+(Math.random()*2|0); i++) spawnPetal(); }, 500); }
  function stopPetals(){ if(petalsTimer){ clearInterval(petalsTimer); petalsTimer=null; } }

  /* ================== Reusable Modal ================== */
  const modalRoot = document.getElementById("modalRoot");
  function closeModal() {
    const m = modalRoot.querySelector(".modalOverlay");
    if (m) m.remove();
    document.removeEventListener("keydown", escClose);
  }
  function escClose(e){ if(e.key==="Escape") closeModal(); }
  function openModal({ title, html, actions=[] }) {
    closeModal();
    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modalHeader">
          <div class="modalTitle">${title || ""}</div>
          <button class="secondary" data-close>Close</button>
        </div>
        <div class="modalBody">${html || ""}</div>
        <div class="modalActions"></div>
      </div>`;
    const actionsEl = overlay.querySelector(".modalActions");
    actions.forEach(a=>{
      const b = document.createElement("button");
      b.className = a.variant === "secondary" ? "secondary" : "";
      b.textContent = a.label;
      b.addEventListener("click", a.onClick || closeModal);
      actionsEl.appendChild(b);
    });
    overlay.addEventListener("click", (e)=>{ if(e.target === overlay) closeModal(); });
    overlay.querySelector("[data-close]").addEventListener("click", closeModal);
    modalRoot.appendChild(overlay);
    document.addEventListener("keydown", escClose);
    const first = overlay.querySelector("input,button,textarea,select,[tabindex]");
    if (first) first.focus();
    return overlay;
  }

  /* ================== SAFE Supabase Setup (shared passcode) ================== */
  const SUPA_CFG = window.SUPABASE || {};
  const supabaseLib = (window.supabase && typeof window.supabase.createClient === "function") ? window.supabase : null;
  const supa = (supabaseLib && SUPA_CFG.url && SUPA_CFG.anonKey)
    ? supabaseLib.createClient(SUPA_CFG.url, SUPA_CFG.anonKey)
    : null; /* falls back gracefully if missing */

  const CODE_KEY = "kd_shared_code_v1";
  function getCode(){ try { return localStorage.getItem(CODE_KEY) || ""; } catch { return ""; } }
  function setCode(v){ try { localStorage.setItem(CODE_KEY, v); } catch {} }

  async function ensureCode(){
    let code = getCode();
    if (code) return code;
    const overlay = openModal({
      title: "Enter your code",
      html: `<input id="sharedCode" class="input" placeholder="${window.CODE_HINT || 'Enter code'}" aria-label="Shared code" />`,
      actions: [
        { label:"Cancel", variant:"secondary", onClick: closeModal },
        { label:"Continue", onClick: ()=>{
            const v = (document.getElementById("sharedCode").value||"").trim();
            if (!v) return; setCode(v); closeModal();
          }
        }
      ]
    });
    const input = overlay.querySelector("#sharedCode");
    input.addEventListener("keydown", e=>{ if(e.key==="Enter") overlay.querySelector(".modalActions button:last-child").click(); });
    await new Promise(r=> {
      const obs = new MutationObserver(()=>{ if(!document.body.contains(overlay)){ obs.disconnect(); r(); } });
      obs.observe(document.body, { childList:true, subtree:true });
    });
    return getCode();
  }

  function voucherSlug(v){
    return (v.id || v.title || "").toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  }

  /* ================== Boot: wire "Have a code?" first, then start game ================== */
  document.addEventListener("DOMContentLoaded", () => {
    wireSkip();            // “Have a code?” works even if golf crashes
    safeStartMiniGolf();   // unlocks main after a successful putt

    // Build main UI now (envelope, reasons, vouchers)
    buildMain();
  });

  function wireSkip(){
    const skip = document.getElementById("skipLink");
    if (!skip) return;
    skip.addEventListener("click", (e) => {
      e.preventDefault();
      const overlay = openModal({
        title: "Enter your code",
        html: `<input id="codeInput" class="input" placeholder="K+D" aria-label="Enter code" />`,
        actions: [
          { label: "Cancel", variant: "secondary", onClick: closeModal },
          {
            label: "Submit",
            onClick: () => {
              const v = (document.getElementById("codeInput").value || "").trim().toUpperCase();
              if (v === "K+D" || v === "K + D" || v === "KD") {
                closeModal(); startMain();
              } else {
                openModal({ title:"Oops", html:`<p>That code didn’t work.</p>`, actions:[{label:"OK", onClick: closeModal}] });
              }
            },
          },
        ],
      });
      const input = overlay.querySelector("#codeInput");
      input.addEventListener("keydown", e=>{ if(e.key==="Enter"){ overlay.querySelector(".modalActions button:last-child").click(); } });
    }, { passive:false });
  }

  function safeStartMiniGolf(){
    try {
      if (typeof window.startMiniGolf === "function") {
        window.startMiniGolf("#golf").then(startMain).catch((err)=>{
          console.warn("Mini-golf failed to start:", err);
        });
      } else {
        console.error("startMiniGolf not found. Ensure game.js is loaded before app.js.");
      }
    } catch (e) { console.warn("Mini-golf init error:", e); }
  }

  /* ================== Screens & content ================== */
  const CONFIG = window.CONFIG || {};

  function startMain(){
    document.getElementById("gameScreen")?.classList.add("hidden");
    const main = document.getElementById("mainScreen");
    main?.classList.remove("hidden");
    main?.scrollIntoView({ behavior:"smooth", block:"start" });
    startPetals();
  }

  function buildMain(){
    // Tabs
    const tabs = document.querySelectorAll(".tab");
    const views = {
      note: document.getElementById("view-note"),
      reasons: document.getElementById("view-reasons"),
      vouchers: document.getElementById("view-vouchers"),
    };
    tabs.forEach(t=>{
      t.addEventListener("click", ()=>{
        tabs.forEach(b=>b.setAttribute("aria-selected","false"));
        t.setAttribute("aria-selected","true");
        const key = t.dataset.target;
        Object.values(views).forEach(v=>v.classList.add("hidden"));
        views[key].classList.remove("hidden");
        if (key === "note") startPetals(); else stopPetals();
      });
    });

    // Envelope
    const envelope = document.getElementById("envelope");
    const openBtn  = document.getElementById("openCard");
    const letterText = document.getElementById("letterText");
    const txt = (CONFIG.note || "")
      .replaceAll("{HER}", CONFIG.herName || "you")
      .replaceAll("{ME}",  CONFIG.fromName || "me");
    letterText.innerText = txt;

    envelope.setAttribute("role", "button");
    envelope.setAttribute("tabindex", "0");
    let opened = false;
    function openEnv(){ if (opened) return; opened = true; envelope.classList.add("open"); if (openBtn) openBtn.style.display = "none"; }
    function onKey(e){ if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEnv(); } }
    envelope.addEventListener("click", openEnv);
    envelope.addEventListener("keydown", onKey);
    openBtn.addEventListener("click", openEnv);

    // Reasons
    const ul = document.getElementById("reasonsList");
    (CONFIG.reasons || []).forEach(r=>{ const li=document.createElement("li"); li.textContent="🌼 " + r; ul.appendChild(li); });

    // Vouchers (shared passcode + Supabase RPCs; safe if Supabase is absent)
    const wrap = document.getElementById("vouchersWrap");
    wrap.className = "vouchersGrid";
    wrap.innerHTML = "";

    const voucherNodes = []; // [{slug, div, btn}]

    (CONFIG.vouchers || []).forEach(v=>{
      const slug = voucherSlug(v);
      const div = document.createElement("div");
      div.className = "ticket";
      div.innerHTML = `
        <div class="redeemedMark" aria-hidden="true">Redeemed!</div>
        <div class="ticketHead">
          <div class="ticketTitle">🎟️ ${v.title}</div>
          <div class="ticketStamp">K+D</div>
        </div>
        <div class="ticketBody">${v.note}</div>
        <div class="ticketActions"><button class="secondary">Redeem</button></div>
      `;
      const btn = div.querySelector("button");

      btn.addEventListener("click", async ()=>{
        const code = await ensureCode();
        if (!code) return;
        openModal({
          title: "Voucher redeemed 🎟️",
          html: `<p><strong>${v.title}</strong></p><p>${v.note}</p><p class="muted">Text me a 🎟️ to claim it.</p>`,
          actions: [{
            label:"Redeem!",
            onClick: async () => {
              closeModal();
              // optimistic UI
              div.classList.add("redeemed"); btn.disabled = true;

              if (supa) {
                try {
                  const { error } = await supa.rpc("redeem_by_code", { slug_in: slug, code_in: code });
                  if (error) console.warn("redeem_by_code error:", error);
                } catch (e) {
                  console.warn("Supabase network error:", e);
                }
              } else {
                console.warn("Supabase not configured; skipping server save.");
              }
            }
          }]
        });
      });

      wrap.appendChild(div);
      voucherNodes.push({ slug, div, btn });
    });

    // “Change code” helper
    // const change = document.createElement("button");
    // change.className = "linklike";
    // change.textContent = "Change code";
    // change.style.marginTop = "6px";
    // change.onclick = () => { localStorage.removeItem("kd_shared_code_v1"); location.reload(); };
    // wrap.parentElement.appendChild(change);

    // On load, pre-stamp redeemed vouchers (if code present and Supabase reachable)
    (async ()=>{
      //const code = getCode();
      const code = 'K+D-2025-9/6'
      if (!code || !supa) return;
      try {
        const { data, error } = await supa.rpc("get_redeemed_by_code", { code_in: code });
        if (error) { console.warn("get_redeemed_by_code error:", error); return; }
        const redeemed = new Set((data || []).map(r => r.slug));
        voucherNodes.forEach(({slug, div, btn})=>{
          if (redeemed.has(slug)) { div.classList.add("redeemed"); btn.disabled = true; }
        });
      } catch (e) {
        console.warn("Supabase fetch failed:", e);
      }
    })();
  }
})();
