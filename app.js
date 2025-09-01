(function () {
  // Petals → render inside the #petalLayer overlay so they cover the whole screen
  const petalLayer = document.getElementById("petalLayer");
  function spawnPetal() {
    const el = document.createElement("div");
    el.className = "petal";
    const choices = ["💙","🌼","💠","💎","🤍","🩵","🌸"];
    el.textContent = choices[(Math.random()*choices.length)|0];
    // random horizontal position across the viewport
    el.style.left = Math.round(Math.random() * (petalLayer.clientWidth - 20)) + "px";
    const dur = 6000 + Math.random()*5000;
    el.style.animationDuration = dur + "ms";
    petalLayer.appendChild(el);
    setTimeout(()=> el.remove(), dur + 250);
  }
  let petalsTimer = null;
  function startPetals(){ if(!petalsTimer) petalsTimer = setInterval(()=>{ for(let i=0;i<1+(Math.random()*2|0); i++) spawnPetal(); }, 500); }
  function stopPetals(){ if(petalsTimer){ clearInterval(petalsTimer); petalsTimer=null; } }

  const CONFIG = window.CONFIG || {};

  // Reveal main screen
  function startMain(){
    document.getElementById("gameScreen").classList.add("hidden");
    const main = document.getElementById("mainScreen");
    main.classList.remove("hidden");
    main.classList.add("lovey");
    startPetals();
    main.animate([{ opacity:0, transform:"translateY(8px)" }, { opacity:1, transform:"translateY(0)" }], { duration: 380, easing: "ease-out" });
    buildMain();
  }

  // Start the game, show main after win
  startMiniGolf("#golf").then(startMain);

  // Skip code: K+D (also accepts K + D and KD)
  const skip = document.getElementById("skipLink");
  if (skip) {
    skip.addEventListener("click", () => {
      const code = (prompt("Enter code:") || "").trim().toUpperCase();
      if (code === "K+D" || code === "K + D" || code === "KD") startMain();
      else if (code) alert("That code didn’t work.");
    });
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
      if (opened) return;
      opened = true;
      envelope.classList.add("open");
      if (openBtn) openBtn.style.display = "none";
    }
    function onKey(e){ if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEnv(); } }

    envelope.addEventListener("click", openEnv);
    envelope.addEventListener("keydown", onKey);
    openBtn.addEventListener("click", openEnv);

    // Fill “10 things” and vouchers
    const ul = document.getElementById("reasonsList");
    (CONFIG.reasons || []).forEach(r=>{ const li=document.createElement("li"); li.textContent="🌼 " + r; ul.appendChild(li); });

    const wrap = document.getElementById("vouchersWrap");
    (CONFIG.vouchers || []).forEach(v=>{
      const div = document.createElement("div");
      div.className = "voucher";
      div.innerHTML = `<strong>🎟️ ${v.title}</strong><div class="muted">${v.note}</div><button class="secondary">Redeem</button>`;
      div.querySelector("button").addEventListener("click", ()=> alert(`Voucher redeemed: ${v.title}\n\nText Danny a 🎟️ to claim!`));
      wrap.appendChild(div);
    });
  }
})();
