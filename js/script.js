/* ============ Helper ============ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ============ Tema gelap / terang ============ */
const root = document.documentElement;
const savedTheme = localStorage.getItem("theme");
if (savedTheme) root.setAttribute("data-theme", savedTheme);

$("#themeToggle").addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
  root.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
});

/* ============ Menu mobile ============ */
const burger = $("#burger");
const menu = $("#navMenu");

burger.addEventListener("click", () => {
  const open = menu.classList.toggle("is-open");
  burger.setAttribute("aria-expanded", open);
});
$$("#navMenu a").forEach((a) =>
  a.addEventListener("click", () => {
    menu.classList.remove("is-open");
    burger.setAttribute("aria-expanded", false);
  })
);

/* ============ Highlight menu sesuai section ============ */
const sections = $$("main section[id]");
const links = $$("#navMenu a");

const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        links.forEach((l) =>
          l.classList.toggle("is-active", l.getAttribute("href") === `#${e.target.id}`)
        );
      }
    });
  },
  { rootMargin: "-45% 0px -50% 0px" }
);
sections.forEach((s) => navObserver.observe(s));

/* ============ Animasi muncul saat scroll ============ */
const revealObserver = new IntersectionObserver(
  (entries, obs) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("is-visible");
        obs.unobserve(e.target);
      }
    });
  },
  { threshold: 0.12 }
);
$$(".reveal").forEach((el) => revealObserver.observe(el));

/* ============ Hitung angka statistik ============ */
function animateCount(el) {
  const target = +el.dataset.count;
  const duration = 1200;
  const start = performance.now();

  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = Math.floor(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
$$("[data-count]").forEach(animateCount);

/* ============ Filter proyek ============ */
$("#filters").addEventListener("click", (e) => {
  const btn = e.target.closest(".filter");
  if (!btn) return;

  $$(".filter").forEach((b) => b.classList.remove("is-active"));
  btn.classList.add("is-active");

  const cat = btn.dataset.filter;
  $$(".project").forEach((card) => {
    const show = cat === "all" || card.dataset.category === cat;
    card.classList.toggle("is-hidden", !show);
  });
});

/* ============ HOLOGRAPHIC RETRO ARCADE MINIGAME ============ */
(function initHoloGame() {
  const stage = document.getElementById("gameStage");
  const canvas = document.getElementById("gameCanvas");
  const frame = document.getElementById("gameFrame");
  if (!stage || !canvas) return;

  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("gameScore");
  const highScoreEl = document.getElementById("gameHighScore");
  const shieldBars = document.getElementById("shieldBars");
  const waveEl = document.getElementById("gameWave");
  const overlay = document.getElementById("gameOverlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayDesc = document.getElementById("overlayDesc");
  const btnPlay = document.getElementById("btnPlayGame");
  const btnEmp = document.getElementById("btnEmpBlast");
  const btnRestart = document.getElementById("btnRestartGame");
  const btnSound = document.getElementById("btnGameSound");
  const soundIcon = document.getElementById("soundIcon");

  // Game State
  let isPlaying = false;
  let score = 0;
  let highScore = parseInt(localStorage.getItem("holoDefenderHighScore") || "0", 10);
  let shields = 3;
  let wave = 1;
  let invulnerableTimer = 0;
  let tripleLaserTimer = 0;
  let empCooldown = 0; // ready at start
  let soundEnabled = false;
  let audioCtx = null;

  highScoreEl.textContent = highScore.toLocaleString();

  // Resize canvas
  function resizeCanvas() {
    canvas.width = stage.offsetWidth;
    canvas.height = stage.offsetHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Sound Synthesizer (Web Audio API)
  function playSynth(type) {
    if (!soundEnabled) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const now = audioCtx.currentTime;

      if (type === "laser") {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === "boom") {
        const dur = 0.35;
        const buf = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * dur), audioCtx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.08));
        const noise = audioCtx.createBufferSource();
        noise.buffer = buf;
        const filter = audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(450, now);
        filter.frequency.exponentialRampToValueAtTime(50, now + dur);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + dur);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start(now);
        noise.stop(now + dur);
      } else if (type === "emp") {
        const dur = 0.6;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + dur);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + dur);
      } else if (type === "powerup") {
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.2, now + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.12);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.12);
        });
      }
    } catch (e) {}
  }

  // Entities
  const player = {
    x: canvas.width / 2,
    y: canvas.height * 0.82,
    targetX: canvas.width / 2,
    targetY: canvas.height * 0.82,
    width: 32,
    height: 30,
    speed: 0.18,
    shootTimer: 0
  };

  const bullets = [];
  const enemyBullets = [];
  const enemies = [];
  const particles = [];
  const powerups = [];
  const shockwaves = [];

  // Background stars
  const stars = [];
  for (let i = 0; i < 40; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.8 + 0.6,
      speed: Math.random() * 0.002 + 0.001,
      alpha: Math.random() * 0.6 + 0.2
    });
  }

  // Update Shield Bar HUD
  function updateShieldHUD() {
    if (!shieldBars) return;
    const bars = shieldBars.querySelectorAll(".bar");
    bars.forEach((bar, index) => {
      bar.classList.toggle("is-active", index < shields);
    });
  }

  // Screen Shake
  function shakeScreen() {
    stage.classList.remove("is-shaking");
    void stage.offsetWidth;
    stage.classList.add("is-shaking");
    setTimeout(() => stage.classList.remove("is-shaking"), 360);
  }

  // Particle Explosions
  function addExplosion(x, y, color = "#00e5ff", count = 20) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1.5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 1.2,
        life: 1,
        decay: Math.random() * 0.03 + 0.02,
        color
      });
    }
  }

  // Spawn Enemies
  let spawnTimer = 0;
  function spawnEnemy() {
    const w = canvas.width;
    const rand = Math.random();
    const x = Math.random() * (w - 60) + 30;

    if (rand < 0.5) {
      // Type 1: Fast Cyber Drone (Red/Orange)
      enemies.push({
        type: "drone",
        x,
        y: -20,
        vx: (Math.random() - 0.5) * 1.5,
        vy: Math.random() * 1.2 + 1.8 + wave * 0.2,
        size: 16,
        hp: 1,
        color: "#ff3b30",
        phase: Math.random() * Math.PI * 2
      });
    } else if (rand < 0.85) {
      // Type 2: Cyber Asteroid (Purple/Cyan)
      enemies.push({
        type: "asteroid",
        x,
        y: -30,
        vx: (Math.random() - 0.5) * 0.8,
        vy: Math.random() * 1.0 + 1.2 + wave * 0.15,
        size: 24,
        hp: 2,
        color: "#c044fe",
        angle: 0,
        rotSpeed: (Math.random() - 0.5) * 0.05
      });
    } else {
      // Type 3: Heavy Cruiser (Yellow)
      enemies.push({
        type: "cruiser",
        x,
        y: -35,
        vx: (Math.random() - 0.5) * 1.0,
        vy: 1.0 + wave * 0.1,
        size: 30,
        hp: 4,
        color: "#ffe600",
        shootTimer: 0
      });
    }
  }

  // Trigger EMP Shockwave
  function triggerEmp() {
    if (empCooldown > 0) return;
    empCooldown = 600; // ~10s
    btnEmp.style.opacity = "0.5";

    playSynth("emp");
    shakeScreen();

    // Shockwave entity
    shockwaves.push({
      x: player.x,
      y: player.y,
      radius: 10,
      maxRadius: Math.hypot(canvas.width, canvas.height),
      life: 1
    });

    // Destroy all enemies
    enemies.forEach((e) => {
      addExplosion(e.x, e.y, e.color, 15);
      score += 150;
    });
    enemies.length = 0;
    enemyBullets.length = 0;

    scoreEl.textContent = score.toLocaleString();
    if (score > highScore) {
      highScore = score;
      highScoreEl.textContent = highScore.toLocaleString();
      localStorage.setItem("holoDefenderHighScore", highScore);
    }
  }

  // Start / Restart Game
  function startGame() {
    isPlaying = true;
    score = 0;
    shields = 3;
    wave = 1;
    invulnerableTimer = 0;
    tripleLaserTimer = 0;
    empCooldown = 0;
    btnEmp.style.opacity = "1";

    bullets.length = 0;
    enemyBullets.length = 0;
    enemies.length = 0;
    particles.length = 0;
    powerups.length = 0;
    shockwaves.length = 0;

    player.x = canvas.width / 2;
    player.y = canvas.height * 0.82;
    player.targetX = player.x;
    player.targetY = player.y;

    scoreEl.textContent = "0";
    waveEl.textContent = "WAVE 1";
    updateShieldHUD();

    overlay.classList.add("is-hidden");
  }

  function gameOver() {
    isPlaying = false;
    playSynth("boom");
    shakeScreen();
    addExplosion(player.x, player.y, "#00e5ff", 40);

    overlayTitle.textContent = "💀 MISSION FAILED 💀";
    overlayTitle.style.color = "#ff3b30";
    overlayDesc.innerHTML = `Skor Akhir: <strong>${score.toLocaleString()}</strong><br>Rekor Tertinggi: <strong>${highScore.toLocaleString()}</strong>`;
    btnPlay.textContent = "🔄 MAIN LAGI";
    overlay.classList.remove("is-hidden");
  }

  // Event Listeners
  btnPlay.addEventListener("click", startGame);
  btnRestart.addEventListener("click", startGame);
  btnEmp.addEventListener("click", triggerEmp);

  btnSound.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundIcon.textContent = soundEnabled ? "🔊" : "🔇";
    btnSound.title = soundEnabled ? "Suara Aktif" : "Suara Senyap";
    if (soundEnabled) playSynth("powerup");
  });

  // Controls: Pointer / Mouse
  function handlePointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    player.targetX = Math.max(20, Math.min(canvas.width - 20, x));
    player.targetY = Math.max(canvas.height * 0.55, Math.min(canvas.height - 25, y));

    // 3D Tilt
    const tiltX = (x - rect.width / 2) / (rect.width / 2);
    const tiltY = (y - rect.height / 2) / (rect.height / 2);
    frame.style.transform = `perspective(900px) rotateY(${tiltX * 5}deg) rotateX(${-tiltY * 5}deg)`;
  }

  stage.addEventListener("mousemove", (e) => handlePointer(e.clientX, e.clientY));
  stage.addEventListener("touchmove", (e) => {
    if (e.touches[0]) handlePointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  stage.addEventListener("mouseleave", () => {
    frame.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg)";
  });

  // Keyboard controls
  window.addEventListener("keydown", (e) => {
    if (!isPlaying) return;
    const step = 25;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") player.targetX = Math.max(20, player.targetX - step);
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") player.targetX = Math.min(canvas.width - 20, player.targetX + step);
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") player.targetY = Math.max(canvas.height * 0.55, player.targetY - step);
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") player.targetY = Math.min(canvas.height - 25, player.targetY + step);
    if (e.key === " " || e.key === "e" || e.key === "E") triggerEmp();
  });

  // Main Game Loop
  let frameCount = 0;
  function animate() {
    frameCount++;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw Starfield Background
    ctx.save();
    stars.forEach((s) => {
      s.y += s.speed * (isPlaying ? 1.5 : 0.8);
      if (s.y > 1) s.y = 0;
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 229, 255, ${s.alpha})`;
      ctx.fill();
    });
    ctx.restore();

    // 2. Shockwaves (EMP)
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const sw = shockwaves[i];
      sw.radius += 18;
      sw.life -= 0.025;

      ctx.save();
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 229, 255, ${sw.life})`;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#00e5ff";
      ctx.stroke();
      ctx.restore();

      if (sw.life <= 0) shockwaves.splice(i, 1);
    }

    if (isPlaying) {
      // Cooldowns
      if (empCooldown > 0) {
        empCooldown--;
        if (empCooldown === 0) btnEmp.style.opacity = "1";
      }
      if (invulnerableTimer > 0) invulnerableTimer--;
      if (tripleLaserTimer > 0) tripleLaserTimer--;

      // Update Wave
      const newWave = Math.floor(score / 1500) + 1;
      if (newWave !== wave) {
        wave = newWave;
        waveEl.textContent = `WAVE ${wave}`;
        addExplosion(w / 2, 80, "#3ddc97", 25);
      }

      // Smooth Player Movement
      player.x += (player.targetX - player.x) * player.speed;
      player.y += (player.targetY - player.y) * player.speed;

      // Player Auto-Shooting
      player.shootTimer++;
      if (player.shootTimer >= 9) {
        player.shootTimer = 0;
        playSynth("laser");

        if (tripleLaserTimer > 0) {
          // Triple Spread
          bullets.push({ x: player.x, y: player.y - 14, vx: 0, vy: -9, color: "#ffe600" });
          bullets.push({ x: player.x - 10, y: player.y - 10, vx: -2.2, vy: -8.5, color: "#ffe600" });
          bullets.push({ x: player.x + 10, y: player.y - 10, vx: 2.2, vy: -8.5, color: "#ffe600" });
        } else {
          // Dual Blasters
          bullets.push({ x: player.x - 8, y: player.y - 12, vx: 0, vy: -9, color: "#00e5ff" });
          bullets.push({ x: player.x + 8, y: player.y - 12, vx: 0, vy: -9, color: "#00e5ff" });
        }
      }

      // Spawning Enemies
      spawnTimer++;
      const spawnRate = Math.max(30, 65 - wave * 4);
      if (spawnTimer >= spawnRate) {
        spawnTimer = 0;
        spawnEnemy();
      }
    } else {
      // Idle / Demo Mode: Player drifts gently
      player.x = w / 2 + Math.sin(frameCount * 0.03) * 60;
      player.y = h * 0.82;
    }

    // 3. Update & Draw Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx;
      b.y += b.vy;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 1.5, b.y - b.vy * 1.5);
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 8;
      ctx.shadowColor = b.color;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();

      if (b.y < -20 || b.x < -20 || b.x > w + 20) {
        bullets.splice(i, 1);
      }
    }

    // 4. Update & Draw Enemy Bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const eb = enemyBullets[i];
      eb.x += eb.vx;
      eb.y += eb.vy;

      ctx.save();
      ctx.beginPath();
      ctx.arc(eb.x, eb.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ff3b30";
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#ff3b30";
      ctx.fill();
      ctx.restore();

      // Check collision with player
      if (isPlaying && invulnerableTimer === 0) {
        if (Math.hypot(eb.x - player.x, eb.y - player.y) < player.width * 0.6) {
          enemyBullets.splice(i, 1);
          shields--;
          updateShieldHUD();
          invulnerableTimer = 55;
          shakeScreen();
          playSynth("boom");
          addExplosion(player.x, player.y, "#ff3b30", 15);
          if (shields <= 0) gameOver();
          continue;
        }
      }

      if (eb.y > h + 20) enemyBullets.splice(i, 1);
    }

    // 5. Update & Draw Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.y += e.vy;
      e.x += e.vx;

      if (e.type === "drone") {
        e.x += Math.sin(frameCount * 0.08 + e.phase) * 1.8;
      } else if (e.type === "asteroid") {
        e.angle += e.rotSpeed;
      } else if (e.type === "cruiser" && isPlaying) {
        e.shootTimer++;
        if (e.shootTimer > 80) {
          e.shootTimer = 0;
          enemyBullets.push({ x: e.x, y: e.y + e.size, vx: 0, vy: 3.5 });
        }
      }

      // Draw Enemy
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = e.color;

      if (e.type === "drone") {
        // Delta drone wireframe
        ctx.beginPath();
        ctx.moveTo(0, e.size);
        ctx.lineTo(-e.size, -e.size);
        ctx.lineTo(0, -e.size * 0.4);
        ctx.lineTo(e.size, -e.size);
        ctx.closePath();
        ctx.fillStyle = "rgba(255, 59, 48, 0.15)";
        ctx.fill();
        ctx.stroke();
      } else if (e.type === "asteroid") {
        // Tumbling polygon
        ctx.rotate(e.angle);
        ctx.beginPath();
        for (let a = 0; a < 6; a++) {
          const ang = (a / 6) * Math.PI * 2;
          const r = e.size * (a % 2 === 0 ? 1 : 0.7);
          const px = Math.cos(ang) * r;
          const py = Math.sin(ang) * r;
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = "rgba(192, 68, 254, 0.12)";
        ctx.fill();
        ctx.stroke();
      } else if (e.type === "cruiser") {
        // Hex Heavy Cruiser
        ctx.beginPath();
        ctx.moveTo(0, e.size * 1.1);
        ctx.lineTo(-e.size * 0.9, e.size * 0.2);
        ctx.lineTo(-e.size * 0.7, -e.size * 0.8);
        ctx.lineTo(e.size * 0.7, -e.size * 0.8);
        ctx.lineTo(e.size * 0.9, e.size * 0.2);
        ctx.closePath();
        ctx.fillStyle = "rgba(255, 230, 0, 0.15)";
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      // Bullet Collisions
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (Math.hypot(b.x - e.x, b.y - e.y) < e.size + 6) {
          bullets.splice(j, 1);
          e.hp--;
          addExplosion(b.x, b.y, e.color, 6);

          if (e.hp <= 0) {
            playSynth("boom");
            addExplosion(e.x, e.y, e.color, 20);

            // Chance to drop powerup
            if (Math.random() < 0.22) {
              const types = ["triple", "shield", "emp"];
              const ptype = types[Math.floor(Math.random() * types.length)];
              powerups.push({ x: e.x, y: e.y, type: ptype, vy: 1.4 });
            }

            score += e.type === "cruiser" ? 300 : (e.type === "asteroid" ? 150 : 100);
            scoreEl.textContent = score.toLocaleString();
            if (score > highScore) {
              highScore = score;
              highScoreEl.textContent = highScore.toLocaleString();
              localStorage.setItem("holoDefenderHighScore", highScore);
            }

            enemies.splice(i, 1);
            break;
          }
        }
      }

      // Collision with player
      if (isPlaying && invulnerableTimer === 0 && enemies[i]) {
        if (Math.hypot(e.x - player.x, e.y - player.y) < e.size + player.width * 0.5) {
          addExplosion(e.x, e.y, e.color, 18);
          enemies.splice(i, 1);
          shields--;
          updateShieldHUD();
          invulnerableTimer = 55;
          shakeScreen();
          playSynth("boom");
          if (shields <= 0) gameOver();
          continue;
        }
      }

      // Screen boundary removal
      if (e && e.y > h + 50) enemies.splice(i, 1);
    }

    // 6. Update & Draw Power-ups
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.y += p.vy;

      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
      ctx.strokeStyle = p.type === "triple" ? "#ffe600" : (p.type === "shield" ? "#00e5ff" : "#c044fe");
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.stroke();

      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(p.type === "triple" ? "⚡" : (p.type === "shield" ? "🛡️" : "💥"), p.x, p.y + 1);
      ctx.restore();

      // Collect powerup
      if (isPlaying && Math.hypot(p.x - player.x, p.y - player.y) < 24) {
        powerups.splice(i, 1);
        playSynth("powerup");

        if (p.type === "triple") {
          tripleLaserTimer = 480; // ~8s
        } else if (p.type === "shield") {
          shields = Math.min(3, shields + 1);
          updateShieldHUD();
        } else if (p.type === "emp") {
          triggerEmp();
        }
        continue;
      }

      if (p.y > h + 30) powerups.splice(i, 1);
    }

    // 7. Update & Draw Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life -= pt.decay;

      if (pt.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * pt.life, 0, Math.PI * 2);
      ctx.fillStyle = pt.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = pt.color;
      ctx.globalAlpha = pt.life;
      ctx.fill();
      ctx.restore();
    }

    // 8. Draw Player Fighter Ship
    const isFlashing = invulnerableTimer > 0 && Math.floor(invulnerableTimer / 4) % 2 === 0;
    if (!isFlashing) {
      ctx.save();
      ctx.translate(player.x, player.y);

      // Jet Thruster Particles
      const thrusterY = player.height * 0.45;
      for (let t = -6; t <= 6; t += 12) {
        ctx.beginPath();
        ctx.moveTo(t - 2, thrusterY);
        ctx.lineTo(t, thrusterY + Math.random() * 12 + 6);
        ctx.lineTo(t + 2, thrusterY);
        ctx.fillStyle = Math.random() < 0.5 ? "#00e5ff" : "#ffe600";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#00e5ff";
        ctx.fill();
      }

      // Ship Vector Hull
      ctx.beginPath();
      ctx.moveTo(0, -player.height * 0.65); // Nose
      ctx.lineTo(player.width * 0.5, player.height * 0.45); // Right wing
      ctx.lineTo(player.width * 0.25, player.height * 0.25);
      ctx.lineTo(0, player.height * 0.4); // Core
      ctx.lineTo(-player.width * 0.25, player.height * 0.25);
      ctx.lineTo(-player.width * 0.5, player.height * 0.45); // Left wing
      ctx.closePath();

      ctx.fillStyle = "rgba(0, 229, 255, 0.22)";
      ctx.fill();
      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 2;
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#00e5ff";
      ctx.stroke();

      // Cockpit Glow
      ctx.beginPath();
      ctx.ellipse(0, -player.height * 0.1, 4, 8, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#3ddc97";
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#3ddc97";
      ctx.fill();

      // Shield Dome when Triple or Invulnerable
      if (tripleLaserTimer > 0 || invulnerableTimer > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, player.width * 0.75, 0, Math.PI * 2);
        ctx.strokeStyle = tripleLaserTimer > 0 ? "rgba(255, 230, 0, 0.6)" : "rgba(0, 229, 255, 0.6)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
      }

      ctx.restore();
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();


/* ============ Tombol kembali ke atas ============ */
const toTop = $("#toTop");
window.addEventListener("scroll", () => {
  toTop.classList.toggle("is-show", window.scrollY > 500);
});
toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

/* ============ Tahun footer ============ */
$("#year").textContent = new Date().getFullYear();

/* ============ Chatbot Asisten Portofolio ============ */
const chatbot = $("#chatbot");
const chatbotToggle = $("#chatbotToggle");
const chatbotClose = $("#chatbotClose");
const chatbotWindow = $("#chatbotWindow");
const chatbotMessages = $("#chatbotMessages");
const chatbotForm = $("#chatbotForm");
const chatbotInput = $("#chatbotInput");
const chatbotQuick = $("#chatbotQuick");

let chatInitialized = false;

function addChatMessage(html, sender = "bot") {
  const msg = document.createElement("div");
  msg.className = `chat-msg chat-msg--${sender}`;
  msg.innerHTML = html;
  chatbotMessages.appendChild(msg);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function getBotReply(input) {
  const q = input.toLowerCase();

  if (q.includes("siapa") || q.includes("tentang") || q.includes("about") || q.includes("hamzah") || q.includes("profil")) {
    return "Halo! Saya asisten virtual <strong>Muhammad Burhannudin Hamzah</strong>. Ia adalah seorang <strong>Web &amp; App Developer</strong> yang berfokus pada pengembangan frontend dan desain aplikasi yang modern, responsif, dan ramah pengguna.";
  }

  if (q.includes("skill") || q.includes("bahasa") || q.includes("teknologi") || q.includes("framework") || q.includes("tool") || q.includes("bisa apa") || q.includes("flutter")) {
    return "<strong>Skill &amp; Teknologi yang dikuasai:</strong><br>• <strong>Bahasa:</strong> HTML, CSS, JavaScript, Dart<br>• <strong>Framework:</strong> Flutter<br>• <strong>Tools:</strong> GitHub, Figma, Android Studio, VS Code, Postman, Notion";
  }

  if (q.includes("proyek") || q.includes("project") || q.includes("portofolio") || q.includes("karya") || q.includes("buat")) {
    const titles = $$(".project h3").map((el) => `• ${el.textContent}`).join("<br>");
    return `Berikut beberapa proyek pilihan yang pernah dikerjakan:<br>${titles}<br><br>Lihat detailnya di bagian <a href="#projects">Proyek Pilihan</a>!`;
  }

  if (q.includes("pengalaman") || q.includes("pendidikan") || q.includes("sekolah") || q.includes("smk") || q.includes("magang") || q.includes("kerja")) {
    return 'Burhanudin menempuh pendidikan di <strong>SMK Rekayasa Perangkat Lunak</strong> dan berpengalaman sebagai <strong>Freelance &amp; Mobile Developer</strong>. Cek selengkapnya di bagian <a href="#experience">Pengalaman &amp; Pendidikan</a>.';
  }

  if (q.includes("kontak") || q.includes("hubungi") || q.includes("wa") || q.includes("whatsapp") || q.includes("email") || q.includes("nomer") || q.includes("nomor") || q.includes("hire")) {
    return 'Anda bisa menghubungi Burhanudin langsung melalui:<br>• 📞 WhatsApp: <a href="https://wa.me/6282331859477" target="_blank" rel="noopener">+62 82331859477</a><br>• ✉️ Email: <a href="mailto:muhhammzahh@gmail.com">muhhammzahh@gmail.com</a>';
  }

  if (q.includes("halo") || q.includes("hai") || q.includes("hi") || q.includes("hello") || q.includes("pagi") || q.includes("siang") || q.includes("malam")) {
    return "Halo! 👋 Ada yang ingin Anda tanyakan tentang profil, skill, proyek, atau kontak Muhammad Burhannudin Hamzah?";
  }

  if (q.includes("terima kasih") || q.includes("makasih") || q.includes("thanks")) {
    return "Sama-sama! 😊 Jangan ragu untuk menghubungi via <a href=\"https://wa.me/6282331859477\" target=\"_blank\" rel=\"noopener\">WhatsApp</a> jika ingin berdiskusi lebih lanjut.";
  }

  return 'Terima kasih atas pertanyaannya! Anda bisa menanyakan seputar <strong>Tentang Saya</strong>, <strong>Skill</strong>, <strong>Proyek</strong>, atau langsung chat via <a href="https://wa.me/6282331859477" target="_blank" rel="noopener">WhatsApp (+62 82331859477)</a>.';
}

function handleUserQuestion(text) {
  addChatMessage(text, "user");
  setTimeout(() => {
    addChatMessage(getBotReply(text), "bot");
  }, 350);
}

function toggleChatbot(forceState) {
  const isOpen = typeof forceState === "boolean" ? forceState : !chatbot.classList.contains("is-open");
  chatbot.classList.toggle("is-open", isOpen);
  chatbotToggle.setAttribute("aria-expanded", isOpen);
  chatbotWindow.setAttribute("aria-hidden", !isOpen);

  if (isOpen && !chatInitialized) {
    chatInitialized = true;
    addChatMessage(
      "Halo! 👋 Selamat datang di portofolio <strong>Muhammad Burhannudin Hamzah</strong>. Pilih topik di bawah atau ketik pertanyaanmu!",
      "bot"
    );
  }
  if (isOpen) setTimeout(() => chatbotInput.focus(), 150);
}

chatbotToggle.addEventListener("click", () => toggleChatbot());
chatbotClose.addEventListener("click", () => toggleChatbot(false));

chatbotQuick.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-q]");
  if (!btn) return;
  handleUserQuestion(btn.dataset.q);
});

chatbotForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatbotInput.value.trim();
  if (!text) return;
  chatbotInput.value = "";
  handleUserQuestion(text);
});


/* ============ Lanyard ID Card (Fisika Organik, Ayunan Hidup, & Tali Sangat Lentur) ============ */
(function initLanyard() {
  const wrapper = $("#lanyardWrapper");
  const card = $("#lanyardCard");
  const mount = $("#lanyardMount");
  const ring = $("#lanyardRing");
  const sheen = $("#lanyardSheen");
  const strapBody = $("#lanyardStrapBody");
  const strapBorderL = $("#lanyardStrapBorderL");
  const strapBorderR = $("#lanyardStrapBorderR");
  const strapCenter = $("#lanyardStrapCenter");

  if (!wrapper || !card || !ring || !strapBody) return;

  let hasDropped = false;
  let isDropping = false;
  let isPhysicsActive = false;
  let isDragging = false;
  let isHeroHovered = false;

  // Koordinat & dinamika fisika kartu
  let cardX = 0, cardY = -320;
  let vx = 0, vy = 0;
  let angleZ = -25, vAngleZ = 0;
  let angleX = 0, angleY = 0;

  // Gelombang sekunder inersia tali lanyard (efek kain pita lentur)
  let strapBellyX = 0, vStrapBellyX = 0;

  let lastPointerX = 0, lastPointerY = 0;
  let startPointerX = 0, startPointerY = 0;

  let targetHoverCardX = 0, targetHoverCardY = 0;
  let targetHoverZ = 0, targetHoverX = 0, targetHoverY = 0;

  let idleTime = Math.random() * 10;
  let animFrameId = null;

  /* Posisikan mounting bracket tepat menempel pada garis horizontal */
  function updateMountPosition() {
    if (!mount || !wrapper) return;
    mount.style.top = "0px";
    mount.style.transform = "translate(-50%, -50%)";
  }

  /* Aplikasikan transformasi 3D pada kartu dan kilau sheen */
  function applyTransform() {
    card.style.transform = `translate3d(${cardX.toFixed(2)}px, ${cardY.toFixed(2)}px, 0) rotateZ(${angleZ.toFixed(2)}deg) rotateX(${angleX.toFixed(2)}deg) rotateY(${angleY.toFixed(2)}deg)`;

    if (sheen) {
      const sheenAngle = 135 + angleZ * 1.5;
      const sheenOpacity = Math.min(0.95, 0.35 + Math.abs(angleZ) * 0.03 + Math.abs(angleY) * 0.025);
      sheen.style.background = `linear-gradient(${sheenAngle}deg, rgba(255,255,255,0.25) 0%, rgba(61,220,151,0.15) 40%, transparent 70%)`;
      sheen.style.opacity = sheenOpacity.toFixed(2);
    }
  }

  /* Render tali lanyard fleksibel menggunakan kurva Bezier SVG real-time */
  function renderStrap() {
    const wrapRect = wrapper.getBoundingClientRect();
    if (!wrapRect.width || !wrapRect.height) return;

    const ringRect = ring.getBoundingClientRect();
    const mountRect = mount ? mount.getBoundingClientRect() : null;

    // Titik mounting bracket atas
    const anchorX = mountRect
      ? mountRect.left + mountRect.width / 2 - wrapRect.left
      : wrapRect.width / 2;
    const anchorY = mountRect
      ? mountRect.bottom - wrapRect.top
      : 0;

    // Titik pengait cincin pada kartu
    const attachX = ringRect.left + ringRect.width / 2 - wrapRect.left;
    const attachY = ringRect.top + ringRect.height / 2 - wrapRect.top;

    // Lebar tali (atas 22px, bawah 14px)
    const strapTopW = 22;
    const strapBotW = 14;

    const rad = (angleZ * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);

    const tlX = anchorX - strapTopW / 2;
    const tlY = anchorY;
    const trX = anchorX + strapTopW / 2;
    const trY = anchorY;

    const blX = attachX - (strapBotW / 2) * cosA;
    const blY = attachY - (strapBotW / 2) * sinA;
    const brX = attachX + (strapBotW / 2) * cosA;
    const brY = attachY + (strapBotW / 2) * sinA;

    const dx = attachX - anchorX;
    const dy = attachY - anchorY;
    const dist = Math.hypot(dx, dy);

    // Dynamic S-curve / C-curve cloth ribbon curvature with inertial belly wave
    const cpDist1 = Math.max(35, dist * 0.44);
    const cpDist2 = Math.max(35, dist * 0.46);

    // Natural organic sag / cloth wave
    const organicSag = Math.sin(idleTime * 1.6) * 3.5;

    // Control point 1: drops down from anchor, bowing with strap belly inertia
    const cp1X = anchorX + strapBellyX * 0.55 + dx * 0.12 + organicSag;
    const cp1Y = anchorY + cpDist1;

    // Control point 2: enters ring aligned with card's tilt angle
    const cp2X = attachX - sinA * (cpDist2 * 0.6) + strapBellyX * 0.35;
    const cp2Y = attachY - cosA * (cpDist2 * 0.65);

    // Left and right control points
    const cp1lX = tlX + (cp1X - anchorX);
    const cp1lY = cp1Y;
    const cp2lX = cp2X - (strapBotW / 2) * cosA;
    const cp2lY = cp2Y - (strapBotW / 2) * sinA;

    const cp1rX = trX + (cp1X - anchorX);
    const cp1rY = cp1Y;
    const cp2rX = cp2X + (strapBotW / 2) * cosA;
    const cp2rY = cp2Y + (strapBotW / 2) * sinA;

    const dBody = `M ${tlX.toFixed(1)},${tlY.toFixed(1)} ` +
      `C ${cp1lX.toFixed(1)},${cp1lY.toFixed(1)} ${cp2lX.toFixed(1)},${cp2lY.toFixed(1)} ${blX.toFixed(1)},${blY.toFixed(1)} ` +
      `L ${brX.toFixed(1)},${brY.toFixed(1)} ` +
      `C ${cp2rX.toFixed(1)},${cp2rY.toFixed(1)} ${cp1rX.toFixed(1)},${cp1rY.toFixed(1)} ${trX.toFixed(1)},${trY.toFixed(1)} Z`;

    const dBorderL = `M ${tlX.toFixed(1)},${tlY.toFixed(1)} C ${cp1lX.toFixed(1)},${cp1lY.toFixed(1)} ${cp2lX.toFixed(1)},${cp2lY.toFixed(1)} ${blX.toFixed(1)},${blY.toFixed(1)}`;
    const dBorderR = `M ${trX.toFixed(1)},${trY.toFixed(1)} C ${cp1rX.toFixed(1)},${cp1rY.toFixed(1)} ${cp2rX.toFixed(1)},${cp2rY.toFixed(1)} ${brX.toFixed(1)},${brY.toFixed(1)}`;
    const dCenter = `M ${anchorX.toFixed(1)},${anchorY.toFixed(1)} C ${cp1X.toFixed(1)},${cp1Y.toFixed(1)} ${cp2X.toFixed(1)},${cp2Y.toFixed(1)} ${attachX.toFixed(1)},${attachY.toFixed(1)}`;

    strapBody.setAttribute("d", dBody);
    if (strapBorderL) strapBorderL.setAttribute("d", dBorderL);
    if (strapBorderR) strapBorderR.setAttribute("d", dBorderR);
    if (strapCenter) strapCenter.setAttribute("d", dCenter);
  }

  /* Animasi kartu jatuh dan berayun elastis saat dimuat */
  function startDropAnimation() {
    isDropping = true;
    card.style.opacity = "1";
    updateMountPosition();

    cardY = -280;
    cardX = 40;
    angleZ = -28;
    vy = 3.0;
    vx = -1.2;
    vAngleZ = 2.4;

    function dropStep() {
      const springY = 0.045;
      const dampY = 0.88;
      const ay = -springY * cardY;
      vy = (vy + ay) * dampY;
      cardY += vy;

      const springX = 0.04;
      const dampX = 0.88;
      const ax = -springX * cardX;
      vx = (vx + ax) * dampX;
      cardX += vx;

      const springZ = 0.035;
      const dampZ = 0.90;
      const az = -springZ * angleZ + vx * 0.12;
      vAngleZ = (vAngleZ + az) * dampZ;
      angleZ += vAngleZ;

      const targetBelly = (cardX * 0.5) - (angleZ * 0.6);
      vStrapBellyX += (targetBelly - strapBellyX) * 0.08;
      vStrapBellyX *= 0.86;
      strapBellyX += vStrapBellyX;

      applyTransform();
      renderStrap();

      if (
        Math.abs(cardY) < 1.0 &&
        Math.abs(vy) < 0.3 &&
        Math.abs(cardX) < 1.0 &&
        Math.abs(angleZ) < 1.5 &&
        Math.abs(vAngleZ) < 0.3
      ) {
        isDropping = false;
        isPhysicsActive = true;
        startPhysicsLoop();
        return;
      }

      requestAnimationFrame(dropStep);
    }

    requestAnimationFrame(dropStep);
  }

  /* Loop fisika interaktif untuk kursor drag, hover, dan ayunan gantung alami yang lentur */
  function updatePhysics() {
    if (!isPhysicsActive || isDropping) return;

    idleTime += 0.024;

    // Gelombang inersia tali sekunder
    const targetBelly = (cardX * 0.48) - (angleZ * 0.55);
    vStrapBellyX += (targetBelly - strapBellyX) * 0.09;
    vStrapBellyX *= 0.86;
    strapBellyX += vStrapBellyX;

    if (isDragging) {
      applyTransform();
      renderStrap();
    } else {
      // Ayunan mengambang alami (ambient organic pendulum sway)
      const ambientAngleZ = Math.sin(idleTime * 1.1) * 5.2 + Math.sin(idleTime * 0.47) * 2.4;
      const ambientX = Math.sin(idleTime * 1.1) * 16.0 + Math.sin(idleTime * 0.68) * 6.0;
      const ambientY = Math.abs(Math.sin(idleTime * 1.5)) * 3.5;
      const ambientAngleY = Math.sin(idleTime * 0.85) * 5.0;
      const ambientAngleX = Math.cos(idleTime * 0.65) * 3.2;

      let targetX, targetY, targetAngleZ, targetAngleX, targetAngleY;

      if (isHeroHovered) {
        targetX = targetHoverCardX + ambientX * 0.4;
        targetY = targetHoverCardY + ambientY * 0.4;
        targetAngleZ = targetHoverZ + ambientAngleZ * 0.4;
        targetAngleX = targetHoverX + ambientAngleX * 0.4;
        targetAngleY = targetHoverY + ambientAngleY * 0.4;
      } else {
        targetX = ambientX;
        targetY = ambientY;
        targetAngleZ = ambientAngleZ;
        targetAngleX = ambientAngleX;
        targetAngleY = ambientAngleY;
      }

      // Fisika pegas elastis
      const springPos = 0.042;
      const dampPos = 0.92;
      const ax = (targetX - cardX) * springPos;
      vx = (vx + ax) * dampPos;
      cardX += vx;

      const ay = (targetY - cardY) * springPos;
      vy = (vy + ay) * dampPos;
      cardY += vy;

      // Bandul berputar coupled dengan kecepatan linear
      const springAngle = 0.038;
      const dampAngle = 0.91;
      const aAngle = (targetAngleZ - angleZ) * springAngle + vx * 0.08;
      vAngleZ = (vAngleZ + aAngle) * dampAngle;
      angleZ += vAngleZ;

      // Tilt 3D halus
      angleX += (targetAngleX - angleX) * 0.08;
      angleY += (targetAngleY - angleY) * 0.08;

      applyTransform();
      renderStrap();
    }

    animFrameId = requestAnimationFrame(updatePhysics);
  }

  function startPhysicsLoop() {
    if (!animFrameId) {
      animFrameId = requestAnimationFrame(updatePhysics);
    }
  }

  /* Interaktivitas kursor di seluruh Hero section */
  const heroSection = document.getElementById("home");
  if (heroSection) {
    heroSection.addEventListener("pointermove", (e) => {
      if (isDragging || isDropping || !isPhysicsActive) return;

      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;

      const relX = Math.max(-1, Math.min(1, dx / 380));
      const relY = Math.max(-1, Math.min(1, dy / 300));

      targetHoverCardX = relX * 24;
      targetHoverCardY = Math.max(-12, Math.min(18, relY * 16));
      targetHoverZ = relX * 10;
      targetHoverY = relX * 16;
      targetHoverX = -relY * 14;
      isHeroHovered = true;
      startPhysicsLoop();
    });

    heroSection.addEventListener("pointerleave", () => {
      isHeroHovered = false;
      targetHoverCardX = 0;
      targetHoverCardY = 0;
      targetHoverZ = 0;
      targetHoverY = 0;
      targetHoverX = 0;
      startPhysicsLoop();
    });
  }

  /* Efek Drag & Toss: Tarik kartu dan lempar dengan pantulan elastis */
  card.addEventListener("pointerdown", (e) => {
    if (!isPhysicsActive || isDropping) return;
    e.preventDefault();
    isDragging = true;
    startPointerX = e.clientX - cardX;
    startPointerY = e.clientY - cardY;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    vx = 0;
    vy = 0;
    vAngleZ = 0;

    try {
      card.setPointerCapture(e.pointerId);
    } catch (_) {}
    startPhysicsLoop();
  });

  card.addEventListener("pointermove", (e) => {
    if (!isDragging || !isPhysicsActive) return;

    const rawX = e.clientX - startPointerX;
    const rawY = e.clientY - startPointerY;

    const dragDist = Math.hypot(rawX, rawY);
    let pullFactor = 1;
    if (dragDist > 140) {
      pullFactor = (140 + (dragDist - 140) * 0.6) / dragDist;
    }

    cardX = rawX * pullFactor;
    cardY = Math.max(-90, rawY * pullFactor);

    angleZ = Math.max(-45, Math.min(45, cardX * 0.28));
    angleX = Math.max(-18, Math.min(18, -cardY * 0.09));
    angleY = Math.max(-22, Math.min(22, cardX * 0.16));

    vx = (e.clientX - lastPointerX) * 0.75;
    vy = (e.clientY - lastPointerY) * 0.75;
    vAngleZ = vx * 0.32;

    lastPointerX = e.clientX;
    lastPointerY = e.clientY;

    applyTransform();
    renderStrap();
  });

  function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    try {
      card.releasePointerCapture(e.pointerId);
    } catch (_) {}
    startPhysicsLoop();
  }

  card.addEventListener("pointerup", endDrag);
  card.addEventListener("pointercancel", endDrag);

  // Setup posisi awal
  card.style.opacity = "0";
  updateMountPosition();
  applyTransform();

  setTimeout(() => {
    if (!hasDropped) {
      hasDropped = true;
      startDropAnimation();
    }
  }, 220);

  window.addEventListener("resize", () => {
    updateMountPosition();
    renderStrap();
  });

  requestAnimationFrame(() => {
    updateMountPosition();
    renderStrap();
  });
})();



