(() => {
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  /* ----------------- Modal helpers ----------------- */
  const modalRoot = $("#modalRoot");
  function openModal({ title, html, actions=[] }){
    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-label="${title||'Dialog'}">
        <div class="modalHeader">
          <div class="modalTitle">${title||''}</div>
          <button class="linklike" data-close aria-label="Close">Close</button>
        </div>
        <div class="modalBody">${html||''}</div>
        <div class="modalActions">
          ${(actions||[]).map((a,i)=>`<button class="${a.variant==='secondary'?'secondary':''}" data-idx="${i}">${a.label||'OK'}</button>`).join('')}
        </div>
      </div>`;
    overlay.addEventListener("click", (e)=>{
      if(e.target.dataset.close || e.target===overlay) closeModal(overlay);
    });
    const btns = $$(".modalActions button", overlay);
    btns.forEach((b)=>{
      b.addEventListener("click", ()=>{
        const idx = Number(b.dataset.idx);
        const act = actions[idx];
        if (act && typeof act.onClick === 'function') act.onClick();
        else closeModal(overlay);
      });
    });
    modalRoot.appendChild(overlay);
    return overlay;
  }
  function closeModal(overlay){
    (overlay || $(".modalOverlay:last-child", modalRoot))?.remove();
  }

  /* ----------------- Tabs ----------------- */
  function initTabs(){
    const tabs = $$(".tab");
    tabs.forEach(btn=>{
      btn.addEventListener("click", ()=>{
        tabs.forEach(b => b.setAttribute("aria-selected", b===btn ? "true" : "false"));
        const target = btn.dataset.target;
        $$(".view").forEach(v => v.classList.toggle("hidden", v.id !== `view-${target}`));
      });
    });
  }

  /* ----------------- Envelope ----------------- */
  function wireEnvelope(){
    const envelope = $("#envelope");
    const openBtn = $("#openCard");
    let opened = false;

    function openEnv(){
      if (opened) return;
      opened = true;
      envelope.classList.add("open");
    }

    envelope.addEventListener("click", openEnv);
    openBtn.addEventListener("click", openEnv);
    envelope.addEventListener("keydown", e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); openEnv(); }});
  }

  /* ----------------- Vouchers ----------------- */
  function buildVouchers(){
    const wrap = $("#vouchersWrap");
    const grid = document.createElement("div");
    grid.className = "vouchersGrid";
    (window.CONFIG?.vouchers || []).forEach(v => {
      const card = document.createElement("div");
      card.className = "ticket";
      card.innerHTML = `
        <div class="ticketHead">
          <div class="ticketTitle">${v.title}</div>
          <div class="ticketStamp">Valid anytime</div>
        </div>
        <div class="ticketBody">${v.note||''}</div>
        <div class="ticketActions">
          <button class="secondary redeemBtn">Redeem</button>
        </div>
        <div class="redeemedMark">Redeemed!</div>
      `;
      $(".redeemBtn", card).addEventListener("click", ()=>{
        card.classList.add("redeemed");
        $(".redeemBtn", card).setAttribute("disabled","true");
      });
      grid.appendChild(card);
    });
    wrap.replaceChildren(grid);
  }

  /* ----------------- Letter text ----------------- */
  function fillLetter(){
    const t = $("#letterText");
    const cfg = window.CONFIG || {};
    const repl = (s) => (s||"")
      .replaceAll("{HER}", cfg.herName || "")
      .replaceAll("{NICK}", cfg.nickname || "")
      .replaceAll("{ME}", cfg.fromName || "");
    t.textContent = repl(cfg.note || "");
  }

  /* ----------------- Reasons list ----------------- */
  function fillReasons(){
    const ul = $("#reasonsList");
    ul.innerHTML = "";
    (window.CONFIG?.reasons || []).forEach((r,i)=>{
      const li = document.createElement("li");
      li.textContent = `${i+1}. ${r}`;
      ul.appendChild(li);
    });
  }

  /* ----------------- Game boot + "Have a code?" ----------------- */
  document.addEventListener("DOMContentLoaded", () => {
    // Wire "Have a code?" immediately so it works even if the game fails
    wireHaveCode();
    // Static UI pieces
    initTabs();
    fillLetter();
    wireEnvelope();
    fillReasons();
    buildVouchers();
    // Start the game and unlock after a win
    safeStartMiniGolf();
  });

  function wireHaveCode(){
    const btn = $("#skipLink");
    if(!btn) return;
    btn.addEventListener("click", (e)=>{
      e.preventDefault();
      const overlay = openModal({
        title: "Enter your code",
        html: `<input id="codeInput" class="input" placeholder="K+D" aria-label="Enter code" />`,
        actions: [
          { label: "Cancel", variant: "secondary", onClick: () => closeModal(overlay) },
          { label: "Submit", onClick: () => {
              const v = ($("#codeInput").value || "").trim().toUpperCase();
              if (["K+D","K + D","KD"].includes(v)) {
                closeModal(overlay);
                startMain();
              } else {
                closeModal(overlay);
                openModal({ title:"Oops", html:`<p>That code didn’t work.</p>`, actions:[{label:"OK"}] });
              }
            } }
        ]
      });
      const input = $("#codeInput");
      input?.addEventListener("keydown", (ev) => { if(ev.key==="Enter"){ overlay.querySelector(".modalActions button:last-child").click(); }});
      input?.focus();
    }, { passive:false });
  }

  function safeStartMiniGolf(){
    try{
      if (typeof window.startMiniGolf === "function") {
        window.startMiniGolf("#golf").then(startMain).catch((err)=>{
          console.warn("Mini-golf failed to start:", err);
        });
      } else {
        console.error("startMiniGolf not found. Ensure game.js is loaded before app.js.");
      }
    } catch(e){
      console.warn("Mini-golf init error:", e);
    }
  }

  function startMain(){
    $("#gameScreen")?.classList.add("hidden");
    const main = $("#mainScreen");
    main?.classList.remove("hidden");
    main?.scrollIntoView({ behavior:"smooth", block:"start" });
  }
})();
