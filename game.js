(() => {
  const FINAL_MESSAGE = `You found the treasure! 💖

Thank you for being my favorite person in the whole world.
Every memory with you is precious to me.

I love you more than words can say.
Here's to another year of adventures together!

— Your baby 🥹💞`;

  const STORAGE_KEY = "girrja_bday_v3";

  // Helpers
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => performance.now();
  const normalize = (s) =>
    (s || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const rectsOverlap = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  // Canvas
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");

  function resize() {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // UI Elements
  const heartsEl = document.getElementById("hearts");
  const hintBubble = document.getElementById("hintBubble");
  const overlay = document.getElementById("overlay");
  const itemTitle = document.getElementById("itemTitle");
  const cardSub = document.getElementById("cardSub");
  const questionEl = document.getElementById("question");
  const answerInput = document.getElementById("answerInput");
  const submitBtn = document.getElementById("submitBtn");
  const feedback = document.getElementById("feedback");
  const closeX = document.getElementById("closeX");
  const splash = document.getElementById("splash");
  const startBtn = document.getElementById("startBtn");
  const final = document.getElementById("final");
  const finalMsg = document.getElementById("finalMsg");
  const replayBtn = document.getElementById("replayBtn");
  const resetBtn = document.getElementById("resetBtn");

  finalMsg.textContent = FINAL_MESSAGE;

  // ========== MAP DESIGN ==========
  const world = { w: 900, h: 750 };
  const W = 16; // wall thickness
  const walls = [];
  const addWall = (x, y, w, h) => walls.push({ x, y, w, h });

  // Outer walls
  addWall(0, 0, world.w, W);
  addWall(0, world.h - W, world.w, W);
  addWall(0, 0, W, world.h);
  addWall(world.w - W, 0, W, world.h);

  // Central hallway (horizontal, y: 300-400)
  addWall(W, 300, 150, W);
  addWall(W, 400, 150, W);
  addWall(650, 300, 234, W);
  addWall(650, 400, 234, W);

  // Room 1 (top-left)
  addWall(W, W, 200, W);
  addWall(200, W, W, 200);
  addWall(W, 200, 120, W);

  // Room 2 (top-right)
  addWall(350, W, 200, W);
  addWall(350, W, W, 200);
  addWall(430, 200, 120, W);

  // Room 3 (right side)
  addWall(650, W, 234, W);
  addWall(650, W, W, 220);
  addWall(650, 280, W, 20);

  // Room 4 (bottom-left)
  addWall(W, 500, 200, W);
  addWall(200, 500, W, 234);
  addWall(W, 500, W, 234);
  addWall(120, 400, 80, W);

  // Room 5 (bottom-center)
  addWall(300, 500, W, 234);
  addWall(300, 500, 150, W);
  addWall(500, 500, W, 234);
  addWall(450, 500, 50, W);
  addWall(350, 400, 50, W);
  addWall(450, 400, 50, W);

  // Treasure Room (bottom-right)
  addWall(600, 500, W, 234);
  addWall(600, 500, 284, W);

  // Player
  const player = {
    x: 400,
    y: 340,
    w: 24,
    h: 32,
    speed: 150,
    dir: 1,
    walking: false,
  };
  const cam = { x: 0, y: 0 };

  // The locked door (gate)
  const gate = { x: 600, y: 400, w: W, h: 100, need: 5 };

  // Items (5 hearts in 5 rooms)
  const items = [
    {
      id: "movie",
      x: 110,
      y: 110,
      name: "Movie Ticket 🎟️",
      subtitle: "Our first movie together...",
      question: "What was the first movie we watched together?",
      answer: "Thiruchitrambalam",
      onWin: "Aww 🥹💗 That memory is safe with you!",
    },
    {
      id: "food",
      x: 450,
      y: 110,
      name: "Food Receipt 🍗",
      subtitle: "A delicious memory...",
      question: "What's our favourite food shop?",
      answer: "Southern park chicken rice",
      onWin: "Yum 😋💖 Now I'm craving it!",
    },
    {
      id: "clone",
      x: 780,
      y: 150,
      name: "Clone Detector 🧪",
      subtitle: "Only the real Girrja knows...",
      question: "If you were a clone, what phrase would I use to find out?",
      answer: "So clever my baby.",
      onWin: "Correct 😌💞 You're the real one!",
    },
    {
      id: "song",
      x: 110,
      y: 620,
      name: "Secret Song 🎶",
      subtitle: "A melody with our inside joke...",
      question: "Which song has our inside joke?",
      answer: "Un Vizhigal",
      onWin: "Eee 🥰💗 Our song!",
    },
    {
      id: "story",
      x: 400,
      y: 620,
      name: "Storybook 📖",
      subtitle: "A story that makes us smile...",
      question: "What's the best story you have heard?",
      answer: "Cool story",
      onWin: "Hehe 😄💘 That's the one!",
    },
  ];
  items.forEach((it) => (it.r = 20));

  // Treasure position (in locked room)
  const treasure = { x: 750, y: 620 };

  // State
  let state = { started: false, collected: {}, finished: false };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        state.started = !!obj.started;
        state.collected = obj.collected || {};
        state.finished = !!obj.finished;
      }
    } catch (e) {}
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function resetAll() {
    state = { started: false, collected: {}, finished: false };
    player.x = 400;
    player.y = 340;
    save();
    updateHeartsUI();
    final.style.display = "none";
    splash.style.display = "flex";
  }

  function collectedCount() {
    return Object.keys(state.collected).length;
  }

  function updateHeartsUI() {
    heartsEl.innerHTML = "";
    const got = collectedCount();
    for (let i = 0; i < 5; i++) {
      const d = document.createElement("div");
      d.className = "heart" + (i < got ? " on" : "");
      d.textContent = "❤";
      heartsEl.appendChild(d);
    }
  }

  // Input
  const input = { up: false, down: false, left: false, right: false };

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") input.up = true;
    if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") input.down = true;
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") input.left = true;
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d")
      input.right = true;
  });
  document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") input.up = false;
    if (e.key === "ArrowDown" || e.key.toLowerCase() === "s")
      input.down = false;
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a")
      input.left = false;
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d")
      input.right = false;
  });

  document.querySelectorAll(".padBtn").forEach((btn) => {
    const dir = btn.dataset.dir;
    const start = () => {
      input[dir] = true;
    };
    const end = () => {
      input[dir] = false;
    };
    btn.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        start();
      },
      { passive: false }
    );
    btn.addEventListener(
      "touchend",
      (e) => {
        e.preventDefault();
        end();
      },
      { passive: false }
    );
    btn.addEventListener("touchcancel", end);
    btn.addEventListener("mousedown", start);
    btn.addEventListener("mouseup", end);
    btn.addEventListener("mouseleave", end);
  });

  // Collision
  function getWalls() {
    const all = [...walls];
    if (collectedCount() < gate.need) all.push(gate);
    return all;
  }

  function canMove(nx, ny) {
    const r = { x: nx, y: ny, w: player.w, h: player.h };
    for (const wall of getWalls()) {
      if (rectsOverlap(r, wall)) return false;
    }
    return (
      nx >= 0 && ny >= 0 && nx + player.w <= world.w && ny + player.h <= world.h
    );
  }

  // Item interaction
  let currentItem = null;
  let overlayCooldown = 0;

  function getNearbyItem() {
    const px = player.x + player.w / 2,
      py = player.y + player.h / 2;
    for (const it of items) {
      if (state.collected[it.id]) continue;
      const d = Math.hypot(px - it.x, py - it.y);
      if (d < 40) return it;
    }
    return null;
  }

  function openOverlay(item) {
    currentItem = item;
    itemTitle.textContent = item.name;
    cardSub.textContent = item.subtitle;
    questionEl.textContent = item.question;
    answerInput.value = "";
    feedback.textContent = "";
    feedback.className = "";
    overlay.style.display = "flex";
    setTimeout(() => answerInput.focus(), 50);
  }

  function closeOverlay() {
    overlay.style.display = "none";
    currentItem = null;
    overlayCooldown = now() + 500; // 500ms cooldown before reopening
  }

  function checkAnswer() {
    if (!currentItem) return;
    if (normalize(answerInput.value) === normalize(currentItem.answer)) {
      feedback.textContent = currentItem.onWin;
      feedback.className = "ok";
      state.collected[currentItem.id] = true;
      save();
      updateHeartsUI();
      setTimeout(closeOverlay, 1200);
    } else {
      feedback.textContent = "Not quite right, try again! 💭";
      feedback.className = "no";
    }
  }

  // Check if near treasure
  function checkTreasure() {
    if (state.finished) return;
    if (collectedCount() < 5) return;
    const px = player.x + player.w / 2,
      py = player.y + player.h / 2;
    if (Math.hypot(px - treasure.x, py - treasure.y) < 50) {
      state.finished = true;
      save();
      final.style.display = "flex";
    }
  }

  function updateCamera() {
    const vw = canvas.clientWidth,
      vh = canvas.clientHeight;
    cam.x = clamp(
      player.x + player.w / 2 - vw / 2,
      0,
      Math.max(0, world.w - vw)
    );
    cam.y = clamp(
      player.y + player.h / 2 - vh / 2,
      0,
      Math.max(0, world.h - vh)
    );
  }

  // Draw pixel girl
  function drawPlayer(x, y) {
    ctx.save();
    const px = Math.floor(x),
      py = Math.floor(y);
    const bob = player.walking ? Math.sin(now() / 80) * 2 : 0;

    if (player.dir === -1) {
      ctx.translate(px + player.w, py);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(px, py);
    }

    // Hair back
    ctx.fillStyle = "#2d2d3a";
    ctx.fillRect(2, 2 + bob, 20, 12);
    ctx.fillRect(0, 6 + bob, 3, 18);
    ctx.fillRect(21, 6 + bob, 3, 18);

    // Face
    ctx.fillStyle = "#ffe4d4";
    ctx.fillRect(5, 6 + bob, 14, 12);

    // Hair bangs
    ctx.fillStyle = "#2d2d3a";
    ctx.fillRect(3, 3 + bob, 18, 5);
    ctx.fillRect(3, 6 + bob, 4, 3);
    ctx.fillRect(17, 6 + bob, 4, 3);

    // Hair clip (green)
    ctx.fillStyle = "#5cb85c";
    ctx.fillRect(16, 3 + bob, 5, 4);

    // Eyes
    ctx.fillStyle = "#4a3728";
    ctx.fillRect(7, 10 + bob, 3, 3);
    ctx.fillRect(14, 10 + bob, 3, 3);
    ctx.fillStyle = "#fff";
    ctx.fillRect(7, 10 + bob, 1, 1);
    ctx.fillRect(14, 10 + bob, 1, 1);

    // Blush
    ctx.fillStyle = "#ffb0b0";
    ctx.fillRect(5, 13 + bob, 2, 2);
    ctx.fillRect(17, 13 + bob, 2, 2);

    // Mouth
    ctx.fillStyle = "#e08080";
    ctx.fillRect(10, 15 + bob, 4, 1);

    // Body/dress
    ctx.fillStyle = "#b8f0d8";
    ctx.fillRect(5, 18 + bob, 14, 10);
    ctx.fillStyle = "#90e0c0";
    ctx.fillRect(5, 18 + bob, 14, 2);

    // Arms
    ctx.fillStyle = "#ffe4d4";
    ctx.fillRect(2, 20 + bob, 3, 5);
    ctx.fillRect(19, 20 + bob, 3, 5);

    // Legs
    ctx.fillRect(7, 28 + bob, 3, 3);
    ctx.fillRect(14, 28 + bob, 3, 3);

    // Shoes
    ctx.fillStyle = "#2d2d3a";
    ctx.fillRect(6, 30 + bob, 5, 2);
    ctx.fillRect(13, 30 + bob, 5, 2);

    ctx.restore();
  }

  // Draw
  function draw() {
    const vw = canvas.clientWidth,
      vh = canvas.clientHeight;
    ctx.clearRect(0, 0, vw, vh);
    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    // Floor
    ctx.fillStyle = "#1a1e30";
    ctx.fillRect(0, 0, world.w, world.h);

    // Floor tiles
    ctx.fillStyle = "#1e2338";
    for (let x = 0; x < world.w; x += 50) {
      for (let y = 0; y < world.h; y += 50) {
        if ((x + y) % 100 === 0) ctx.fillRect(x, y, 50, 50);
      }
    }

    // Room labels
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.font = "bold 14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Room 1", 110, 60);
    ctx.fillText("Room 2", 450, 60);
    ctx.fillText("Room 3", 780, 60);
    ctx.fillText("Room 4", 110, 560);
    ctx.fillText("Room 5", 400, 560);
    ctx.fillText("🔐 Treasure", 750, 560);

    // Walls
    ctx.fillStyle = "#3a3f5c";
    for (const w of walls) {
      ctx.fillRect(w.x, w.y, w.w, w.h);
    }

    // Gate (locked door)
    const got = collectedCount();
    if (got < gate.need) {
      const pulse = Math.sin(now() / 400) * 0.2 + 0.8;
      ctx.fillStyle = `rgba(255, 107, 179, ${pulse})`;
      ctx.fillRect(gate.x, gate.y, gate.w, gate.h);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("🔒", gate.x + gate.w / 2, gate.y + gate.h / 2 - 8);
      ctx.fillText(
        `${gate.need}❤`,
        gate.x + gate.w / 2,
        gate.y + gate.h / 2 + 10
      );
    } else {
      // Open door glow
      ctx.fillStyle = "rgba(108, 255, 184, 0.3)";
      ctx.fillRect(gate.x, gate.y, gate.w, gate.h);
    }

    // Items (hearts)
    for (const it of items) {
      if (state.collected[it.id]) continue;
      const pulse = Math.sin(now() / 250 + items.indexOf(it)) * 0.3 + 0.7;

      // Glow
      ctx.beginPath();
      ctx.arc(it.x, it.y, 30 + pulse * 8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 107, 179, ${0.2 * pulse})`;
      ctx.fill();

      // Circle
      ctx.beginPath();
      ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2);
      ctx.fillStyle = "#ff6bb3";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Heart icon
      ctx.font = "14px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("💗", it.x, it.y);
    }

    // Treasure (if door is open)
    if (got >= gate.need && !state.finished) {
      const pulse = Math.sin(now() / 200) * 0.3 + 0.7;
      ctx.beginPath();
      ctx.arc(treasure.x, treasure.y, 35 + pulse * 10, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 215, 0, ${0.3 * pulse})`;
      ctx.fill();

      ctx.font = "30px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🎁", treasure.x, treasure.y);
    }

    // Player
    drawPlayer(player.x, player.y);

    ctx.restore();
  }

  // Game loop
  let lastTime = now();

  function loop() {
    const t = now();
    const dt = Math.min((t - lastTime) / 1000, 0.1);
    lastTime = t;

    if (state.started && !state.finished && overlay.style.display !== "flex") {
      let dx = 0,
        dy = 0;
      if (input.up) dy = -1;
      if (input.down) dy = 1;
      if (input.left) {
        dx = -1;
        player.dir = -1;
      }
      if (input.right) {
        dx = 1;
        player.dir = 1;
      }

      player.walking = dx !== 0 || dy !== 0;
      if (dx && dy) {
        dx *= 0.707;
        dy *= 0.707;
      }

      const mx = dx * player.speed * dt;
      const my = dy * player.speed * dt;
      if (canMove(player.x + mx, player.y)) player.x += mx;
      if (canMove(player.x, player.y + my)) player.y += my;

      // Check item
      const near = getNearbyItem();
      if (near && now() > overlayCooldown) {
        const px = player.x + player.w / 2,
          py = player.y + player.h / 2;
        if (Math.hypot(px - near.x, py - near.y) < 25) {
          openOverlay(near);
        }
      }

      checkTreasure();

      // Hint
      const gateNear =
        collectedCount() < gate.need &&
        Math.hypot(
          player.x + player.w / 2 - (gate.x + gate.w / 2),
          player.y + player.h / 2 - (gate.y + gate.h / 2)
        ) < 80;

      if (gateNear) {
        hintBubble.textContent = `🔒 Locked! Need ${
          gate.need
        } hearts (you have ${collectedCount()})`;
        hintBubble.style.display = "block";
      } else if (near) {
        hintBubble.textContent = `Walk into ${near.name}`;
        hintBubble.style.display = "block";
      } else if (collectedCount() >= 5 && !state.finished) {
        hintBubble.textContent = "✨ Go to the treasure room! ✨";
        hintBubble.style.display = "block";
      } else {
        hintBubble.style.display = "none";
      }
    }

    resize();
    updateCamera();
    draw();
    requestAnimationFrame(loop);
  }

  // Events
  startBtn.addEventListener("click", () => {
    state.started = true;
    save();
    splash.style.display = "none";
  });
  startBtn.addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      state.started = true;
      save();
      splash.style.display = "none";
    },
    { passive: false }
  );

  resetBtn.addEventListener("click", resetAll);
  replayBtn.addEventListener("click", resetAll);
  closeX.addEventListener("click", closeOverlay);
  submitBtn.addEventListener("click", checkAnswer);
  answerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") checkAnswer();
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeOverlay();
  });

  // Init
  load();
  updateHeartsUI();
  if (state.finished) {
    splash.style.display = "none";
    final.style.display = "flex";
  } else if (state.started) {
    splash.style.display = "none";
  }

  window.addEventListener("resize", resize);
  resize();
  loop();
})();
