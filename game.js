(() => {
  const FINAL_MESSAGE = `You found the treasure! 💖

You deserve all the happiness in this world, chellam. 
Thank you for being my favorite person in the whole world.
Every memory with you is precious to me.

I love you more than words can say.
Happy Birthday, chellam!

— Your kanna 💞`;

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
  const lerp = (start, end, amt) => (1 - amt) * start + amt * end;

  // Audio System
  const Audio = {
    ctx: null,
    init: function() {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    },
    playTone: function(freq, type, duration, vol = 0.1) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    },
    playStep: function() {
      if (!this.ctx) return;
      // Random pitch for variety
      const pitch = 100 + Math.random() * 50;
      this.playTone(pitch, 'triangle', 0.05, 0.05);
    },
    playCollect: function() {
      if (!this.ctx) return;
      this.playTone(800, 'sine', 0.1, 0.2);
      setTimeout(() => this.playTone(1200, 'sine', 0.3, 0.2), 100);
    },
    playWin: function() {
      if (!this.ctx) return;
      [400, 500, 600, 800, 1000].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 'sine', 0.4, 0.2), i * 150);
      });
    },
    playClick: function() {
      if (!this.ctx) return;
      this.playTone(400, 'sine', 0.1, 0.1);
    }
  };

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
  const mcqOptions = document.getElementById("mcqOptions");
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

  // Hallway bottom walls connecting to rooms below
  // Leave gaps for Room 4 entrance (around x: 100-150) and Room 5 entrance (around x: 350-450)
  addWall(W, 400, 80, W);     // Left side before Room 4 entrance
  addWall(160, 400, 140, W);  // Wall between Room 4 and Room 5 entrance
  addWall(450, 400, 150, W);  // Wall between Room 5 entrance and Treasure room

  // Room 1 (top-left)
  addWall(W, W, 200, W);
  addWall(200, W, W, 200);
  addWall(W, 200, 120, W);

  // Room 2 (top-right)
  addWall(350, W, 200, W); // Top wall
  addWall(350, W, W, 200); // Left wall
  addWall(550, W, W, 200); // Right wall
  addWall(350, 200, 80, W); // Left side of bottom wall (entrance gap)
  addWall(480, 200, 70, W); // Right side of bottom wall (leaving gap from 430 to 480)

  // Room 3 (right side)
  addWall(650, W, 234, W);
  addWall(650, W, W, 220);
  addWall(650, 280, W, 20);

  // Room 4 (bottom-left)
  addWall(W, 500, 70, W);     // Top-left part of top wall
  addWall(150, 500, 50, W);   // Top-right part of top wall (gap from x:86 to x:150)
  addWall(200, 500, W, 234);  // Right wall
  addWall(W, 500, W, 234);    // Left wall

  // Room 5 (bottom-center)
  addWall(300, 500, W, 234);  // Left wall
  addWall(300, 500, 50, W);   // Top-left part of top wall
  addWall(500, 500, W, 234);  // Right wall
  addWall(450, 500, 50, W);   // Top-right part of top wall (gap from x:366 to x:450)

  // Treasure Room (bottom-right)
  addWall(600, 500, W, 234);  // Left wall
  addWall(600, 500, 80, W);   // Top-left part of top wall
  addWall(730, 500, 154, W);  // Top-right part of top wall (gap from x:680 to x:730)
  addWall(884, 500, W, 234);  // Right wall
  addWall(600, 734, 284, W);  // Bottom wall
  addWall(600, 400, 80, W);   // Left side of entrance wall
  addWall(730, 400, 154, W);  // Right side of entrance wall (leaving gap from 680 to 730)

  // Decorations
  const decos = [
    // Room 1 (Bedroom)
    { type: 'bed', x: 30, y: 30, w: 60, h: 80, c: '#5d4037' },
    { type: 'pillow', x: 40, y: 40, w: 40, h: 20, c: '#fff' },
    { type: 'table', x: 150, y: 50, w: 40, h: 40, c: '#8d6e63' },
    
    // Room 2 (Kitchen/Dining)
    { type: 'table', x: 400, y: 80, w: 100, h: 50, c: '#d7ccc8' },
    { type: 'chair', x: 410, y: 60, w: 20, h: 20, c: '#5d4037' },
    { type: 'chair', x: 470, y: 60, w: 20, h: 20, c: '#5d4037' },
    { type: 'fridge', x: 550, y: 30, w: 40, h: 60, c: '#e0e0e0' },

    // Room 3 (Lab/Study)
    { type: 'desk', x: 670, y: 50, w: 100, h: 40, c: '#3e2723' },
    { type: 'bookshelf', x: 840, y: 30, w: 30, h: 100, c: '#5d4037' },
    
    // Room 4 (Music Room)
    { type: 'piano', x: 50, y: 650, w: 60, h: 30, c: '#000' },
    { type: 'rug', x: 80, y: 600, w: 80, h: 80, c: '#ef535055' },

    // Room 5 (Lounge)
    { type: 'sofa', x: 340, y: 650, w: 100, h: 40, c: '#5c6bc0' },
    { type: 'tv', x: 360, y: 520, w: 60, h: 10, c: '#212121' },

    // Treasure Room
    { type: 'carpet', x: 620, y: 550, w: 240, h: 160, c: '#d81b6033' },
  ];

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
      options: ["Thiruchitrambalam", "Vikram", "KGF", "Ponniyin Selvan"],
      onWin: "You kissed me first during the movie! 😝",
    },
    {
      id: "food",
      x: 450,
      y: 110,
      name: "Food Receipt 🍗",
      subtitle: "A delicious memory...",
      question: "What's our favourite food shop?",
      answer: "Southern Park Chicken Rice",
      options: ["Southern Park Chicken Rice", "KFC", "McDonald's", "Texas Chicken"],
      onWin: "I know, it surperceeds MCD 🥹",
    },
    {
      id: "clone",
      x: 780,
      y: 150,
      name: "Clone Detector 🧪",
      subtitle: "Only the real Girrja knows...",
      question: "If you were a clone, what phrase would I use to find out? (Only one part of the phrase)",
      answer: "So clever my baby.",
      options: ["So clever my baby.", "You're so smart!", "That's amazing!", "Good job!"],
      onWin: "Correct 😌💞 You know what I am gonna show next 😉",
    },
    {
      id: "song",
      x: 110,
      y: 620,
      name: "Secret Song 🎶",
      subtitle: "A melody with our inside joke...",
      question: "Which song has our inside joke?",
      answer: "Un Vizhigal",
      options: ["Un Vizhigal", "Vaa Vaathi", "Katchi Sera", "Arabic Kuthu"],
      onWin: "If you know, you know 😂😂",
    },
    {
      id: "story",
      x: 400,
      y: 620,
      name: "Storybook 📖",
      subtitle: "A story that makes us smile...",
      question: "What's the best story you have heard?",
      answer: "Cool story",
      options: ["Cool story", "Amazing tale", "Great adventure", "Wonderful journey"],
      onWin: "Hehe 😄💘 That's the one!",
    },
  ];
  items.forEach((it) => (it.r = 20));

  // Treasure position (in locked room)
  const treasure = { x: 750, y: 620 };

  // NPCs (pets/friends that give hints)
  const npcs = [
    {
      id: 'dog',
      x: 300,
      y: 350,
      w: 20,
      h: 16,
      speed: 30,
      vx: 0,
      vy: 0,
      moveTimer: 0,
      bounds: { minX: 220, maxX: 400, minY: 320, maxY: 390 },
      name: '🐕 Puppy',
      dialogue: [
        "Woof! There are 5 hearts hidden in the rooms!",
        "Find them all to unlock the treasure! 🔐"
      ]
    },
    {
      id: 'cat',
      x: 550,
      y: 350,
      w: 18,
      h: 14,
      speed: 25,
      vx: 0,
      vy: 0,
      moveTimer: 0,
      bounds: { minX: 500, maxX: 630, minY: 320, maxY: 390 },
      name: '🐈 Kitty',
      dialogue: [
        "Meow~ The hearts glow pink... look carefully!",
        "Walk right into them to interact! 💗"
      ]
    }
  ];
  let currentNpcDialogue = null;
  let npcCooldown = 0;

  // State
  let state = { started: false, collected: {}, finished: false };
  let particles = []; // { x, y, vx, vy, color, life, size }

  function spawnConfetti(x, y) {
    const colors = ['#ff6bb3', '#7cf2ff', '#6cffb8', '#ffd700', '#fff'];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 200 + 50;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.0 + Math.random(),
        size: Math.random() * 4 + 2
      });
    }
  }

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
  let closedItemId = null; // Track which item was manually closed
  let selectedAnswer = null; // Track the selected MCQ answer

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

  function isPlayerNearItem(itemId) {
    const px = player.x + player.w / 2,
      py = player.y + player.h / 2;
    const it = items.find(i => i.id === itemId);
    if (!it) return false;
    return Math.hypot(px - it.x, py - it.y) < 40;
  }

  function openOverlay(item) {
    currentItem = item;
    selectedAnswer = null;
    itemTitle.textContent = item.name;
    cardSub.textContent = item.subtitle;
    questionEl.textContent = item.question;
    feedback.textContent = "";
    feedback.className = "";

    // Create MCQ options
    mcqOptions.innerHTML = "";
    if (item.options && item.options.length > 0) {
      item.options.forEach((option) => {
        const btn = document.createElement("button");
        btn.className = "mcq-option";
        btn.textContent = option;
        btn.addEventListener("click", () => {
          // Deselect all options
          mcqOptions.querySelectorAll(".mcq-option").forEach(b => b.classList.remove("selected"));
          // Select this option
          btn.classList.add("selected");
          selectedAnswer = option;
          Audio.playClick(); // UI Sound
        });
        mcqOptions.appendChild(btn);
      });
    }

    overlay.style.display = "flex";
  }

  function closeOverlay() {
    overlay.style.display = "none";
    closedItemId = currentItem ? currentItem.id : null; // Remember which item was closed
    currentItem = null;
    overlayCooldown = now() + 500; // 500ms cooldown before reopening
  }

  function checkAnswer() {
    if (!currentItem) return;
    if (!selectedAnswer) {
      feedback.textContent = "Please select an answer! 💭";
      feedback.className = "no";
      return;
    }
    if (normalize(selectedAnswer) === normalize(currentItem.answer)) {
      feedback.textContent = currentItem.onWin;
      feedback.className = "ok";
      state.collected[currentItem.id] = true;
      save();
      updateHeartsUI();
      Audio.playCollect(); // Sound
      spawnConfetti(player.x, player.y); // Particles
      // Modal stays open until user clicks close button
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
      Audio.playWin(); // Sound
      spawnConfetti(treasure.x, treasure.y);
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
    // Smooth camera (Lerp) - if dist is large, snap (teleport), else lerp
    if (!cam.curX) { cam.curX = cam.x; cam.curY = cam.y; }
    cam.curX = lerp(cam.curX, cam.x, 0.1);
    cam.curY = lerp(cam.curY, cam.y, 0.1);
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

  // Draw NPCs
  function drawNpc(npc) {
    const bob = Math.sin(now() / 300) * 1;
    ctx.save();
    ctx.translate(npc.x, npc.y + bob);

    if (npc.id === 'dog') {
      // Body
      ctx.fillStyle = '#d4a373';
      ctx.fillRect(0, 4, 16, 10);
      // Head
      ctx.fillRect(12, 0, 8, 10);
      // Ears
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(14, -2, 3, 4);
      ctx.fillRect(17, -2, 3, 4);
      // Eyes
      ctx.fillStyle = '#000';
      ctx.fillRect(15, 3, 2, 2);
      ctx.fillRect(18, 3, 2, 2);
      // Nose
      ctx.fillStyle = '#333';
      ctx.fillRect(20, 5, 2, 2);
      // Tail
      ctx.fillStyle = '#d4a373';
      ctx.fillRect(-4, 6, 5, 3);
      // Legs
      ctx.fillRect(2, 14, 3, 4);
      ctx.fillRect(10, 14, 3, 4);
    } else if (npc.id === 'cat') {
      // Body
      ctx.fillStyle = '#888';
      ctx.fillRect(0, 4, 14, 8);
      // Head
      ctx.fillRect(10, 0, 8, 8);
      // Ears (triangular effect)
      ctx.fillStyle = '#666';
      ctx.fillRect(11, -3, 3, 4);
      ctx.fillRect(15, -3, 3, 4);
      // Eyes
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(12, 2, 2, 2);
      ctx.fillRect(15, 2, 2, 2);
      // Whiskers
      ctx.fillStyle = '#fff';
      ctx.fillRect(18, 4, 3, 1);
      ctx.fillRect(18, 6, 3, 1);
      // Tail
      ctx.fillStyle = '#888';
      ctx.fillRect(-5, 2, 6, 2);
      // Legs
      ctx.fillRect(2, 12, 2, 3);
      ctx.fillRect(9, 12, 2, 3);
    }

    ctx.restore();
  }

  function showNpcDialogue(npc) {
    currentNpcDialogue = npc;
    npcCooldown = now() + 1000;
    Audio.playClick();
  }

  function closeNpcDialogue() {
    currentNpcDialogue = null;
  }

  // Draw
  function draw() {
    const vw = canvas.clientWidth,
      vh = canvas.clientHeight;
    ctx.clearRect(0, 0, vw, vh);
    ctx.save();
    // Use smoothed camera coordinates
    const cx = cam.curX || cam.x;
    const cy = cam.curY || cam.y;
    ctx.translate(-cx, -cy);

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

    // Decorations
    for (const d of decos) {
      ctx.fillStyle = d.c;
      ctx.fillRect(d.x, d.y, d.w, d.h);
    }

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

    // NPCs
    for (const npc of npcs) {
      drawNpc(npc);
    }

    // Player
    drawPlayer(player.x, player.y);

    // Particles
    for (const p of particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life; // Fade out
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1.0;
    }

    // Lighting/Vignette Effect
    ctx.restore(); // Return to screen space for overlay
    const lx = player.x + player.w/2 - cx;
    const ly = player.y + player.h/2 - cy;
    
    // Create radial gradient for \"lantern\" effect (smaller for mobile)
    const grad = ctx.createRadialGradient(lx, ly, 50, lx, ly, 250);
    grad.addColorStop(0, "rgba(15, 18, 32, 0)"); // Transparent center
    grad.addColorStop(1, "rgba(15, 18, 32, 0.85)"); // Dark edges
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vw, vh);

    // NPC Dialogue Bubble (in screen space)
    if (currentNpcDialogue) {
      const bubbleW = 260;
      const bubbleH = 80;
      const bx = (vw - bubbleW) / 2;
      const by = 50;
      
      // Bubble background
      ctx.fillStyle = 'rgba(30, 35, 56, 0.95)';
      ctx.beginPath();
      ctx.roundRect(bx, by, bubbleW, bubbleH, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 107, 179, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // NPC name
      ctx.fillStyle = '#ff6bb3';
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(currentNpcDialogue.name, bx + 12, by + 10);
      
      // Dialogue text
      ctx.fillStyle = '#fff';
      ctx.font = '12px system-ui';
      let textY = by + 30;
      for (const line of currentNpcDialogue.dialogue) {
        ctx.fillText(line, bx + 12, textY);
        textY += 18;
      }
      
      // Close hint
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText('walk away to close', bx + bubbleW - 10, by + bubbleH - 8);
    }

    // No restart needed since we restored earlier
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

      // Footstep sound (simple timer)
      if (player.walking) {
        if (!player.stepTimer) player.stepTimer = 0;
        player.stepTimer -= dt;
        if (player.stepTimer <= 0) {
          Audio.playStep();
          player.stepTimer = 0.35; // Step every 350ms
        }
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }

      // Update NPC movement
      for (const npc of npcs) {
        npc.moveTimer -= dt;
        if (npc.moveTimer <= 0) {
          // Pick new random direction (or stop)
          const action = Math.random();
          if (action < 0.3) {
            // Stop moving
            npc.vx = 0;
            npc.vy = 0;
          } else {
            // Move in a random direction
            const angle = Math.random() * Math.PI * 2;
            npc.vx = Math.cos(angle) * npc.speed;
            npc.vy = Math.sin(angle) * npc.speed;
          }
          npc.moveTimer = 1 + Math.random() * 2; // 1-3 seconds
        }
        
        // Apply movement
        npc.x += npc.vx * dt;
        npc.y += npc.vy * dt;
        
        // Keep within bounds
        if (npc.x < npc.bounds.minX) { npc.x = npc.bounds.minX; npc.vx *= -1; }
        if (npc.x > npc.bounds.maxX) { npc.x = npc.bounds.maxX; npc.vx *= -1; }
        if (npc.y < npc.bounds.minY) { npc.y = npc.bounds.minY; npc.vy *= -1; }
        if (npc.y > npc.bounds.maxY) { npc.y = npc.bounds.maxY; npc.vy *= -1; }
      }

      // Check item
      const near = getNearbyItem();

      // Reset closedItemId if player moved away from that item
      if (closedItemId && !isPlayerNearItem(closedItemId)) {
        closedItemId = null;
      }

      if (near && now() > overlayCooldown && near.id !== closedItemId) {
        const px = player.x + player.w / 2,
          py = player.y + player.h / 2;
        if (Math.hypot(px - near.x, py - near.y) < 25) {
          openOverlay(near);
        }
      }

      checkTreasure();

      // NPC interaction
      const px = player.x + player.w / 2;
      const py = player.y + player.h / 2;
      let nearNpc = null;
      for (const npc of npcs) {
        const npcCenterX = npc.x + npc.w / 2;
        const npcCenterY = npc.y + npc.h / 2;
        if (Math.hypot(px - npcCenterX, py - npcCenterY) < 35) {
          nearNpc = npc;
          break;
        }
      }
      
      if (nearNpc && now() > npcCooldown && !currentNpcDialogue) {
        showNpcDialogue(nearNpc);
      } else if (!nearNpc && currentNpcDialogue) {
        closeNpcDialogue();
      }

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
    Audio.init(); // Initialize audio context on user gesture
    save();
    splash.style.display = "none";
  });
  startBtn.addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      state.started = true;
      Audio.init(); // Initialize audio context on touch
      save();
      splash.style.display = "none";
    },
    { passive: false }
  );

  resetBtn.addEventListener("click", resetAll);
  replayBtn.addEventListener("click", resetAll);
  closeX.addEventListener("click", closeOverlay);
  submitBtn.addEventListener("click", checkAnswer);
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
