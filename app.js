(function () {
  // Petals → full-screen overlay
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

  // ===== Reusable modal =====
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
    // focus first interactive thing
    const first = overlay.querySelector("input,button,textarea,select,[tabindex]");
    if (first) first.focus();
    return overlay;
  }

  const CONFIG = window.CONFIG || {};

  function startMain(){
    document.getElementById("gameScreen").classList.add("hidden");
    const main = document.getElementById("mainScreen");
    main.classList.remove("hidden");
    main.classList.add("lovey");
    startPetals();
    main.animate([{ opacity:0, transform:"translateY(8px)" }, { opacity:1, transform:"translateY(0)" }], { duration: 380, easing: "ease-out" });
    buildMain();
  }

  // Start the game then reveal
  startMiniGolf("#golf").then(startMain);

  // Skip code with modal input
  const skip = document.getElementById("skipLink");
  if (skip) {
    skip.addEventListener("click", () => {
      const overlay = openModal({
        title: "Enter your code",
        html: `<input id="codeInput" class="input" placeholder="K+D" aria-label="Enter code" />`,
        actions: [
          { label: "Cancel", variant: "secondary", onClick: closeModal },
          { label: "Submit", onClick: () => {
              const v = (document.getElementById("codeInput").value || "").trim().toUpperCase();
              if (v === "K+D" || v === "K + D" || v === "KD") { closeModal(); startMain(); }
              else openModal({ title:"Oops", html:`<p>That code didn’t work.</p>`, actions:[{label:"OK", onClick:closeModal}] });
            }}
        ]
      });
      const input = overlay.querySelector("#codeInput");
      input.addEventListener("keydown", e=>{ if(e.key==="Enter"){ overlay.querySelector(".modalActions button:last-child").click(); } });
    });
  }

  function buildMain(){
    // tabs
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

    // Envelope (click to open)
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
    function openEnv(){
      if (opened) return; opened = true;
      envelope.classList.add("open");
      if (openBtn) openBtn.style.display = "none";
    }
    function onKey(e){ if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEnv(); } }

    envelope.addEventListener("click", openEnv);
    envelope.addEventListener("keydown", onKey);
    openBtn.addEventListener("click", openEnv);

    // Reasons
    const ul = document.getElementById("reasonsList");
    (CONFIG.reasons || []).forEach(r=>{ const li=document.createElement("li"); li.textContent="🌼 " + r; ul.appendChild(li); });

    // Vouchers → pretty modal on redeem
    const wrap = document.getElementById("vouchersWrap");
    (CONFIG.vouchers || []).forEach(v=>{
      const div = document.createElement("div");
      div.className = "voucher";
      div.innerHTML = `<strong>🎟️ ${v.title}</strong><div class="muted">${v.note}</div><button class="secondary">Redeem</button>`;
      div.querySelector("button").addEventListener("click", ()=>{
        openModal({
          title: "Voucher redeemed 🎟️",
          html: `<p><strong>${v.title}</strong></p><p>${v.note}</p><p class="muted">Text me a 🎟️ to claim it.</p>`,
          actions: [{ label:"Cute!", onClick: closeModal }]
        });
      });
      wrap.appendChild(div);
    });
  }
})();
