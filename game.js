// Mini-golf: light-green turf, fun obstacles + windmill + cars/plates, mobile-aware scaling.
(function () {
  function startMiniGolf(sel) {
    const canvas = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!canvas) throw new Error("Mini-golf: canvas not found");
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });

    let DPR = 1, W = 0, H = 0;

    const course = { pad: 18, tee: null, hole: null, windmill: null, obstacles: [], compact:false };

    // physics
    const FRICTION = 0.991, STOP = 0.045, BOUNCE = 0.85, MAX_SPEED = 10;

    const ball = { x: 0, y: 0, vx: 0, vy: 0, r: 7, rolling: false };
    let strokes = 0, aiming = false, aimStart = null, aimEnd = null, sunk = false;
    let lastPos = { x: 0, y: 0 }, lastMoveTime = performance.now();

    const scoreEl = document.getElementById("scorePill");
    function updateScore(){ if(scoreEl) scoreEl.textContent = `Strokes: ${strokes}`; }
    function resetBall(soft=false){ ball.x=course.tee.x; ball.y=course.tee.y; ball.vx=ball.vy=0; ball.rolling=false; if(!soft){strokes=0; updateScore();} }

    function buildCourse(){
      const p = course.pad;
      course.compact = W < 430;                 // phone breakpoint
      const scale = course.compact ? 0.95 : 1;

      course.tee  = { x: p + 52*scale, y: H - p - 48*scale, r: 7*scale };
      course.hole = { x: W - p - 84*scale, y: p + 68*scale, r: (course.compact ? 18 : 16)*scale };

      if (course.compact) {
        course.obstacles = [];                  // remove walls/wings on phones
        course.windmill = null;                 // windmill off on small screens
      } else {
        course.windmill = { cx: course.hole.x, cy: course.hole.y, len: 50, thick: 8, speed: 0.9 };
        course.obstacles = [
          { x: W*0.42, y: H*0.30, w: 18, h: H*0.48 },
          { x: course.hole.x - 120, y: course.hole.y - 70, w: 12, h:110, angle: 22, type:"wing" },
          { x: course.hole.x - 58,  y: course.hole.y + 18, w: 12, h:100, angle:-28, type:"wing" }
        ];
      }

      ball.r = 7*scale;
      resetBall(true);
    }

    function size(){
      const r = canvas.getBoundingClientRect();
      if(r.width===0 || r.height===0){ requestAnimationFrame(size); return; }
      DPR = Math.max(1, Math.min(2, window.devicePixelRatio||1));
      W = Math.round(r.width); H = Math.round(r.height);
      canvas.width = Math.round(W*DPR); canvas.height = Math.round(H*DPR);
      ctx.setTransform(DPR,0,0,DPR,0,0);
      buildCourse();
    }
    size(); addEventListener("resize", size);

    function pt(e){ const r = canvas.getBoundingClientRect(); const x=(e.touches?e.touches[0].clientX:e.clientX)-r.left; const y=(e.touches?e.touches[0].clientY:e.clientY)-r.top; return {x,y}; }
    canvas.addEventListener("pointerdown", (e)=>{
      e.preventDefault();
      if (sunk || ball.rolling) return;
      const p = pt(e), dx=p.x-ball.x, dy=p.y-ball.y;
      const hitR = ball.r + (course.compact ? 28 : 16);     // bigger tap target on phones
      if (Math.hypot(dx,dy) <= hitR) {
        aiming = true;
        aimStart = p; aimEnd = p;
        if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
      }
    }, { passive:false });

    canvas.addEventListener("pointermove", (e)=>{
      if (!aiming) return;
      e.preventDefault();
      aimEnd = pt(e);
    }, { passive:false });

    canvas.addEventListener("pointerup", (e)=>{
      if (!aiming) return;
      e.preventDefault();
      const drag = {x: aimStart.x-aimEnd.x, y: aimStart.y-aimEnd.y};
      const divisor = course.compact ? 120 : 160;           // more power per drag on phones
      const power = Math.min(1, Math.hypot(drag.x,drag.y)/divisor);
      const ang = Math.atan2(drag.y, drag.x);
      ball.vx = Math.cos(ang)*power*MAX_SPEED;
      ball.vy = Math.sin(ang)*power*MAX_SPEED;
      ball.rolling=true; strokes++; updateScore();
      aiming=false; aimStart=aimEnd=null;
      try { canvas.releasePointerCapture?.(e.pointerId); } catch {}
    }, { passive:false });
    canvas.addEventListener("pointercancel", (e)=>{ try { canvas.releasePointerCapture?.(e.pointerId); } catch {} }, { passive:false });
    document.addEventListener('touchmove', e => { if (aiming) e.preventDefault(); }, { passive:false });

    function circleRectCollide(cx,cy,r, rx,ry,rw,rh){
      const nx = Math.max(rx, Math.min(cx, rx+rw));
      const ny = Math.max(ry, Math.min(cy, ry+rh));
      const dx = cx-nx, dy=cy-ny;
      return { hit: dx*dx+dy*dy <= r*r, nx, ny };
    }
    function reflectFromRect(cx,cy,vx,vy, rx,ry,rw,rh){
      const left = Math.abs((cx - rx));
      const right = Math.abs((rx+rw - cx));
      const top = Math.abs((cy - ry));
      const bottom = Math.abs((ry+rh - cy));
      const m = Math.min(left,right,top,bottom);
      if(m===left || m===right){ vx *= -BOUNCE; } else { vy *= -BOUNCE; }
      return {vx,vy};
    }
    function rotatePoint(px, py, cx, cy, angRad){ const s=Math.sin(angRad), c=Math.cos(angRad); const x=px-cx, y=py-cy; return { x: x*c - y*s + cx, y: x*s + y*c + cy }; }
    function circleOrientedRectHit(bx,by,br, rect){
      const ang = (rect.angle||0) * Math.PI/180;
      const cx = rect.x + rect.w/2, cy = rect.y + rect.h/2;
      const p = rotatePoint(bx,by, cx,cy, -ang);
      const rx = rect.x, ry = rect.y, rw = rect.w, rh = rect.h;
      const nx = Math.max(rx, Math.min(p.x, rx+rw));
      const ny = Math.max(ry, Math.min(p.y, ry+rh));
      const dx = p.x - nx, dy = p.y - ny;
      const dist = Math.hypot(dx,dy);
      if (dist > br) return null;
      const pen = br - dist;
      const ln = dist ? { x: dx/dist, y: dy/dist } : { x: 1, y: 0 };
      const nWorld = rotatePoint(ln.x, ln.y, 0, 0, ang);
      return { nx: nWorld.x, ny: nWorld.y, pen };
    }

    function burstConfetti(){}

    function step(){
      if(ball.rolling){
        ball.x += ball.vx; ball.y += ball.vy;
        ball.vx *= FRICTION; ball.vy *= FRICTION;
        if(Math.hypot(ball.vx,ball.vy) < STOP){ ball.vx=ball.vy=0; ball.rolling=false; }
      }

      if (Math.hypot(ball.x - lastPos.x, ball.y - lastPos.y) > 0.6) {
        lastMoveTime = performance.now(); lastPos.x = ball.x; lastPos.y = ball.y;
      }

      const p=course.pad;
      if(ball.x-ball.r < p){ ball.x=p+ball.r; ball.vx *= -BOUNCE; }
      if(ball.x+ball.r > W-p){ ball.x=W-p-ball.r; ball.vx *= -BOUNCE; }
      if(ball.y-ball.r < p){ ball.y=p+ball.r; ball.vy *= -BOUNCE; }
      if(ball.y+ball.r > H-p){ ball.y=H-p-ball.r; ball.vy *= -BOUNCE; }

      for(const ob of course.obstacles){
        if(ob.type === "wing"){
          const h = circleOrientedRectHit(ball.x,ball.y,ball.r, ob);
          if(h){
            ball.x += h.nx * (h.pen + 0.8);
            ball.y += h.ny * (h.pen + 0.8);
            const dot = ball.vx*h.nx + ball.vy*h.ny;
            ball.vx = (ball.vx - 2*dot*h.nx) * BOUNCE;
            ball.vy = (ball.vy - 2*dot*h.ny) * BOUNCE;
            ball.vx += (course.hole.x - ball.x) * 0.002;
            ball.vy += (course.hole.y - ball.y) * 0.002;
          }
        } else {
          const hit = circleRectCollide(ball.x,ball.y,ball.r, ob.x,ob.y,ob.w,ob.h);
          if(hit.hit){
            const vel = reflectFromRect(ball.x,ball.y,ball.vx,ball.vy, ob.x,ob.y,ob.w,ob.h);
            ball.vx=vel.vx; ball.vy=vel.vy;
            if(ball.x < ob.x) ball.x = ob.x - ball.r - 0.5;
            if(ball.x > ob.x+ob.w) ball.x = ob.x+ob.w + ball.r + 0.5;
            if(ball.y < ob.y) ball.y = ob.y - ball.r - 0.5;
            if(ball.y > ob.y+ob.h) ball.y = ob.y+ob.h + ball.r + 0.5;
          }
        }
      }

      // windmill (guarded on mobile)
      const wm = course.windmill;
      if (wm) {
        const angle = (performance.now()/1000) * wm.speed;
        const x1 = wm.cx + Math.cos(angle)*wm.len, y1 = wm.cy + Math.sin(angle)*wm.len;
        const x2 = wm.cx - Math.cos(angle)*wm.len, y2 = wm.cy - Math.sin(angle)*wm.len;
        const ABx=x2-x1, ABy=y2-y1, APx=ball.x-x1, APy=ball.y-y1;
        const t = Math.max(0, Math.min(1, (APx*ABx+APy*ABy)/(ABx*ABx+ABy*ABy)));
        const Cx = x1 + ABx*t, Cy = y1 + ABy*t;
        const dist = Math.hypot(ball.x-Cx, ball.y-Cy);
        if(dist <= ball.r + wm.thick){
          const nx = (ball.x-Cx)/(dist||1), ny = (ball.y-Cy)/(dist||1);
          const dot = ball.vx*nx + ball.vy*ny;
          ball.vx = (ball.vx - 2*dot*nx) * BOUNCE;
          ball.vy = (ball.vy - 2*dot*ny) * BOUNCE;
          ball.x += nx*(ball.r+wm.thick - dist + 0.5);
          ball.y += ny*(ball.r+wm.thick - dist + 0.5);
        }
      }

      // cup capture
      const hx=course.hole.x, hy=course.hole.y, hr=course.hole.r;
      const d = Math.hypot(ball.x-hx, ball.y-hy);

      // stronger magnet on phones
      const pull = course.compact ? 0.75 : 0.55;
      if (!sunk && d < 44) {
        ball.vx += (hx-ball.x) * pull * 0.018;
        ball.vy += (hy-ball.y) * pull * 0.018;
      }

      // allow higher capture speed on mobile
      const speedCap = course.compact ? 1.4 : 0.95;
      if (!sunk && d < hr*0.95 && Math.hypot(ball.vx,ball.vy) < speedCap) {
        sunk = true; ball.rolling=false; ball.vx=ball.vy=0; ball.x=hx; ball.y=hy; onSunk();
      }
    }

    function draw(){
      ctx.clearRect(0,0,W,H);
      const p=course.pad;
      // softer stripes on mobile
      const stripeAlpha = course.compact ? 0.08 : 0.12;
      const stripeGap = course.compact ? 26 : 22;

      ctx.fillStyle = "#bff0a8"; ctx.fillRect(p,p,W-2*p,H-2*p);
      ctx.fillStyle = `rgba(255,255,255,${stripeAlpha})`;
      for(let y=p+20; y<H-p; y+=stripeGap){ ctx.fillRect(p+10, y, W-2*p-20, 10); }
      ctx.strokeStyle = "#34b3a0"; ctx.lineWidth = course.compact ? 2 : 3; ctx.strokeRect(p,p,W-2*p,H-2*p);

      // center wall
      ctx.fillStyle = "#93c5fd";
      for(const ob of course.obstacles){ if(!ob.type) ctx.fillRect(ob.x,ob.y,ob.w,ob.h); }

      // wings
      for(const ob of course.obstacles){
        if(ob.type === "wing"){
          ctx.save(); ctx.translate(ob.x + ob.w/2, ob.y + ob.h/2); ctx.rotate((ob.angle||0)*Math.PI/180);
          ctx.fillStyle = "rgba(52,179,160,0.45)"; ctx.fillRect(-ob.w/2, -ob.h/2, ob.w, ob.h);
          ctx.restore();
        }
      }

      // retro decor (always on, even mobile)
      const showDecor = true;
      function drawCar(x, y, scale=1, body="#0ea5e9"){
        if(!showDecor) return;
        ctx.save(); ctx.translate(x,y); ctx.scale(scale,scale);
        ctx.fillStyle = body; ctx.fillRect(-32,-12,64,24);
        ctx.fillStyle = "#374151"; ctx.fillRect(-16,-18,32,10);
        ctx.fillStyle = "#111827"; ctx.beginPath(); ctx.arc(-20,12,6,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(20,12,6,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = "#d1d5db"; ctx.fillRect(-36,-8,6,16); ctx.fillRect(30,-8,6,16);
        ctx.restore();
      }
      function drawPlate(x, y, text="UNC", rot=0){
        if(!showDecor) return;
        ctx.save(); ctx.translate(x,y); ctx.rotate(rot*Math.PI/180);
        ctx.fillStyle = "#e5e7eb"; ctx.fillRect(-26,-8,52,16);
        ctx.strokeStyle = "#9ca3af"; ctx.strokeRect(-26,-8,52,16);
        ctx.fillStyle = "#111827"; ctx.font = "10px Nunito";
        ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(text, 0, 0);
        ctx.restore();
      }
      const p0 = course.pad;
      drawCar(p0+90, H-p0-50, 1, "#0ea5e9");
      drawCar(W/2,  p0+60, 0.9, "#ef4444");
      drawPlate(p0 + 60, p0 + 60, "UNC", -12);
      drawPlate(W - p0 - 80, H/2, "MITZI", 8);
      drawPlate(W/2 + 60, H - p0 - 40, "TUNDRA", -6);

      // windmill (drawn only when present)
      const wm = course.windmill;
      if (wm) {
        const t = performance.now() / 1000 * wm.speed;
        ctx.save();
        ctx.translate(wm.cx, wm.cy);
        ctx.rotate(t);
        ctx.fillStyle = '#723d11ff';
        ctx.fillRect(-wm.len, -wm.thick, wm.len * 2, wm.thick * 2);
        ctx.restore();

        ctx.fillStyle = '#723d11ff';
        ctx.beginPath();
        ctx.arc(wm.cx, wm.cy, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      // hole
      const hx=course.hole.x, hy=course.hole.y, hr=course.hole.r;
      ctx.lineWidth=course.compact?2:3; ctx.strokeStyle="#60a5fa"; ctx.beginPath(); ctx.arc(hx, hy, hr+3, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle="#0b1020"; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI*2); ctx.fill();
      const px=hx+hr+8, py=hy; ctx.lineWidth=2; ctx.strokeStyle="#e5e7eb";
      ctx.beginPath(); ctx.moveTo(px,py+12); ctx.lineTo(px,py-24); ctx.stroke();
      ctx.fillStyle="#f43f5e"; ctx.beginPath(); ctx.moveTo(px,py-24); ctx.lineTo(px+18,py-20); ctx.lineTo(px,py-12); ctx.closePath(); ctx.fill();

      if(aiming && aimStart && aimEnd){
        const dx=aimStart.x-aimEnd.x, dy=aimStart.y-aimEnd.y;
        ctx.strokeStyle='#0f172a'; ctx.setLineDash([6,6]); ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(ball.x,ball.y); ctx.lineTo(ball.x+dx,ball.y+dy); ctx.stroke(); ctx.setLineDash([]);
      }

      ctx.fillStyle = sunk ? '#d1d5db' : '#fff'; ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,.15)'; ctx.stroke();
      ctx.fillStyle='rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(ball.x+2,ball.y+3,ball.r*1.1,ball.r*.7,0,0,Math.PI*2); ctx.fill();
    }

    let resolveWin; const winPromise = new Promise(r=>resolveWin=r);
    function onSunk(){ burstConfetti(); setTimeout(()=>resolveWin(),700); }
    function loop(){ step(); draw(); requestAnimationFrame(loop); }
    loop();
    return winPromise;
  }

  window.startMiniGolf = startMiniGolf;
})();
