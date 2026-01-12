(() => {
  const FINAL_MESSAGE = `Actually, you were my treasure! 💖

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

  // Create keys display element below hearts
  const keysEl = document.createElement("div");
  keysEl.id = "keysDisplay";
  keysEl.style.cssText = "display:flex;gap:4px;margin-top:8px;justify-content:flex-end;";
  // Wrap hearts and keys in a column container
  const statsContainer = document.createElement("div");
  statsContainer.style.cssText = "display:flex;flex-direction:column;align-items:flex-end;";
  heartsEl.parentNode.insertBefore(statsContainer, heartsEl);
  statsContainer.appendChild(heartsEl);
  statsContainer.appendChild(keysEl);
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

  // ========== MAP DESIGN - EXPANDED MAZE ==========
  const world = { w: 1350, h: 1100 }; // 50% larger!
  const W = 16; // wall thickness
  const walls = [];
  const addWall = (x, y, w, h) => walls.push({ x, y, w, h });

  // Outer walls
  addWall(0, 0, world.w, W);
  addWall(0, world.h - W, world.w, W);
  addWall(0, 0, W, world.h);
  addWall(world.w - W, 0, W, world.h);

  // ===== TOP SECTION (Rooms 1, 2, 3) =====
  
  // Room 1 (top-left corner) - Bedroom
  addWall(W, W, 280, W);           // Top
  addWall(280, W, W, 200);         // Right wall
  addWall(W, 200, 200, W);         // Bottom left part (gap x:216 to x:280)

  // Corridor from Room 1 going right
  addWall(280, 200, 120, W);       // Top of corridor
  addWall(280, 280, 200, W);       // Bottom of corridor
  
  // Room 2 (top-center) - Kitchen
  addWall(480, W, 250, W);         // Top
  addWall(480, W, W, 200);         // Left wall
  addWall(730, W, W, 280);         // Right wall
  addWall(480, 200, 100, W);       // Bottom left part (gap x:580 to x:630)
  addWall(630, 200, 100, W);       // Bottom right part

  // Winding corridor to Room 3
  addWall(730, 200, 150, W);       // Corridor top
  addWall(730, 280, 70, W);        // Corridor bottom left
  addWall(860, 280, W, 100);       // Vertical wall
  addWall(860, 280, 200, W);       // Continue right
  
  // Room 3 (top-right) - Lab
  addWall(1010, W, 324, W);        // Top
  addWall(1010, W, W, 280);        // Left wall top (gap y:296 to y:330)
  addWall(1010, 330, W, 100);      // Left wall bottom
  addWall(1010, 430, 324, W);      // Bottom
  
  // ===== MIDDLE MAZE SECTION =====
  
  // Central maze corridors
  addWall(W, 400, 200, W);         // Left horizontal
  addWall(W, 500, 280, W);         // Left horizontal 2
  
  // Maze pillars and obstacles
  addWall(350, 350, W, 100);       // Vertical pillar 1
  addWall(350, 350, 80, W);        // Attached horizontal
  addWall(500, 400, W, 150);       // Vertical pillar 2
  addWall(500, 400, 100, W);       // Attached horizontal
  addWall(650, 320, 80, W);        // Floating wall
  addWall(650, 420, W, 80);        // Vertical piece
  
  // Hidden alcove for key (left side) - gap at top for entry
  addWall(W, 600, 40, W);         // Shorter top wall (gap from x:56 to x:100)
  addWall(100, 600, W, 100);
  addWall(W, 700, 100, W);
  
  // More maze walls
  addWall(200, 550, W, 150);       // Vertical divider
  addWall(200, 550, 150, W);       // Horizontal piece
  addWall(400, 550, 200, W);       // Middle section
  addWall(400, 550, W, 100);       // Vertical
  
  // Secret passage (narrow corridor) - open at top for entry
  addWall(700, 500, W, 200);
  addWall(780, 500, W, 200);
  // Top wall removed to allow entry into secret passage
  
  // Right side maze
  addWall(860, 380, W, 220);       // Vertical
  addWall(860, 600, 200, W);       // Horizontal
  addWall(1000, 500, W, 100);      // Another vertical
  addWall(1000, 500, 150, W);      // Horizontal
  
  // Hidden corner (top right of maze) - shorter left wall for access from below
  addWall(1150, 350, W, 80);      // Shorter wall (gap from y:430 to y:500 for entry)
  addWall(1150, 350, 184, W);
  
  // ===== BOTTOM SECTION (Rooms 4, 5, Treasure) =====
  
  // Bottom corridor
  addWall(W, 750, 300, W);
  addWall(W, 850, 200, W);
  
  // Room 4 (bottom-left) - Music Room
  addWall(W, 900, 200, W);         // Top wall left part (gap x:216 to x:280)
  addWall(280, 900, 20, W);        // Top wall right part
  addWall(300, 850, W, 234);       // Right wall
  addWall(W, 850, W, 234);         // Left wall
  
  // Corridor between Rooms 4 and 5
  addWall(300, 750, 150, W);
  addWall(500, 750, 100, W);
  
  // Room 5 (bottom-center) - Lounge
  addWall(450, 850, 100, W);       // Top left part (gap x:550 to x:600)
  addWall(600, 850, 100, W);       // Top right part
  addWall(450, 850, W, 234);       // Left wall
  addWall(700, 850, W, 234);       // Right wall
  
  // Corridor to Treasure Room - simplified for accessibility
  addWall(700, 750, 150, W);       // Top corridor wall (shortened)
  addWall(850, 750, W, 80);        // Partial wall (gap at y:830-900 for entry)
  
  // Treasure Room (bottom-right) - Large fancy room with wider entrance
  addWall(1050, 750, W, 80);       // Left wall top (gap y:830 to y:920)
  addWall(1050, 920, W, 164);      // Left wall bottom
  addWall(1050, 750, 284, W);      // Top

  // Decorations - updated for new map
  const decos = [
    // Room 1 (Bedroom)
    { type: 'bed', x: 40, y: 40, w: 80, h: 100, c: '#5d4037' },
    { type: 'pillow', x: 50, y: 50, w: 60, h: 30, c: '#fff' },
    { type: 'table', x: 200, y: 60, w: 50, h: 50, c: '#8d6e63' },
    
    // Room 2 (Kitchen)
    { type: 'table', x: 550, y: 80, w: 120, h: 60, c: '#d7ccc8' },
    { type: 'chair', x: 560, y: 50, w: 25, h: 25, c: '#5d4037' },
    { type: 'chair', x: 640, y: 50, w: 25, h: 25, c: '#5d4037' },
    { type: 'fridge', x: 500, y: 40, w: 40, h: 70, c: '#e0e0e0' },

    // Room 3 (Lab)
    { type: 'desk', x: 1050, y: 60, w: 150, h: 50, c: '#3e2723' },
    { type: 'bookshelf', x: 1280, y: 40, w: 40, h: 150, c: '#5d4037' },
    { type: 'computer', x: 1100, y: 80, w: 40, h: 30, c: '#424242' },
    
    // Maze decorations
    { type: 'plant', x: 380, y: 380, w: 30, h: 30, c: '#4caf50' },
    { type: 'barrel', x: 520, y: 450, w: 35, h: 35, c: '#795548' },
    { type: 'crate', x: 680, y: 360, w: 40, h: 40, c: '#8d6e63' },
    { type: 'plant', x: 920, y: 450, w: 30, h: 30, c: '#66bb6a' },
    
    // Room 4 (Music Room)
    { type: 'piano', x: 60, y: 950, w: 100, h: 50, c: '#000' },
    { type: 'rug', x: 100, y: 930, w: 120, h: 100, c: '#ef535055' },

    // Room 5 (Lounge)
    { type: 'sofa', x: 520, y: 950, w: 120, h: 50, c: '#5c6bc0' },
    { type: 'tv', x: 540, y: 880, w: 80, h: 15, c: '#212121' },

    // Treasure Room
    { type: 'carpet', x: 1080, y: 800, w: 220, h: 250, c: '#d81b6033' },
  ];

  // Player starts in center of maze
  const player = {
    x: 600,
    y: 450,
    w: 24,
    h: 32,
    speed: 170, // Faster for bigger map
    dir: 1,
    walking: false,
  };
  const cam = { x: 0, y: 0 };

  // The locked gate to Treasure Room (wider entrance: y:830 to y:920)
  const gate = { x: 1050, y: 830, w: W, h: 90, need: 5 };

  // Items (5 hearts in 5 rooms) - positioned in the rooms
  const items = [
    {
      id: "movie",
      x: 140,
      y: 110,
      name: "Movie Ticket 🎟️",
      subtitle: "Our first movie together...",
      question: "What was the first movie we watched together?",
      answer: "Thiruchitrambalam",
      options: ["Vikram", "Thiruchitrambalam", "KGF", "Ponniyin Selvan"],
      onWin: "You kissed me first during the movie! 😝",
    },
    {
      id: "food",
      x: 600,
      y: 110,
      name: "Food Receipt 🍗",
      subtitle: "A delicious memory...",
      question: "What's our favourite food shop?",
      answer: "Southern Park Chicken Rice",
      options: ["Southern Park Chicken Rice", "KFC", "Texas Chicken", "McDonald's"],
      onWin: "I know, it surperceeds MCD 🥹",
    },
    {
      id: "clone",
      x: 1180,
      y: 250,
      name: "Clone Detector 🧪",
      subtitle: "Only the real Girrja knows...",
      question: "If you were a clone, what phrase would I use to find out? (Only one part of the phrase)",
      answer: "So clever my baby.",
      options: ["You're so smart!", "That's amazing!", "So clever my baby", "Good job!"],
      onWin: "Correct 😌💞 You know what I am gonna show next 😉",
    },
    {
      id: "song",
      x: 150,
      y: 980,
      name: "Secret Song 🎶",
      subtitle: "A melody with our inside joke...",
      question: "Which song has our inside joke?",
      answer: "Un Vizhigal",
      options: ["Vaa Vaathi", "Katchi Sera", "Arabic Kuthu", "Un Vizhigal"],
      onWin: "If you know, you know 😂😂",
    },
    {
      id: "story",
      x: 580,
      y: 980,
      name: "Storybook 📖",
      subtitle: "A story that makes us smile...",
      question: "What's the best story you have heard?",
      answer: "Cool story",
      options: ["Cool story", "Amazing tale", "Great adventure", "Wonderful journey"],
      onWin: "Story so cool, that you're married to the storyteller",
    },
  ];
  items.forEach((it) => (it.r = 20));

  // Treasure position (in locked room)
  const treasure = { x: 1200, y: 950 };

  // NPCs (pets that give hints) - in maze area
  const npcs = [
    {
      id: 'dog',
      x: 450,
      y: 450,
      w: 20,
      h: 16,
      speed: 35,
      vx: 0,
      vy: 0,
      moveTimer: 0,
      bounds: { minX: 350, maxX: 650, minY: 400, maxY: 540 },
      name: '🐕 Puppy',
      dialogue: [
        "Woof! This maze is tricky!",
        "Keys are hidden in secret spots! �"
      ]
    },
    {
      id: 'cat',
      x: 800,
      y: 550,
      w: 18,
      h: 14,
      speed: 30,
      vx: 0,
      vy: 0,
      moveTimer: 0,
      bounds: { minX: 720, maxX: 850, minY: 520, maxY: 680 },
      name: '🐈 Kitty',
      dialogue: [
        "Meow~ Explore every corner!",
        "Matching colors = matching doors! 💗"
      ]
    }
  ];
  let currentNpcDialogue = null;
  let npcCooldown = 0;

  // Room Doors - block entry to rooms until unlocked
  const doors = [
    { id: 'door1', roomName: 'Room 1', x: 216, y: 200, w: 64, h: 16, keyId: 'key1', unlocked: false, color: '#e57373' },   // Gap x:216 to x:280
    { id: 'door2', roomName: 'Room 2', x: 580, y: 200, w: 50, h: 16, keyId: 'key2', unlocked: false, color: '#81c784' },   // Gap x:580 to x:630
    { id: 'door3', roomName: 'Room 3', x: 1010, y: 296, w: 16, h: 34, keyId: 'key3', unlocked: false, color: '#64b5f6' },  // Gap y:296 to y:330
    { id: 'door4', roomName: 'Room 4', x: 216, y: 900, w: 64, h: 16, keyId: 'key4', unlocked: false, color: '#ffb74d' },   // Gap x:216 to x:280
    { id: 'door5', roomName: 'Room 5', x: 550, y: 850, w: 50, h: 16, keyId: 'key5', unlocked: false, color: '#ba68c8' },   // Gap x:550 to x:600
  ];

  // Keys - HIDDEN in tricky spots!
  const keys = [
    { id: 'key1', x: 50, y: 650, color: '#e57373', collected: false, doorId: 'door1', icon: '🔑' },      // Hidden alcove left
    { id: 'key2', x: 1280, y: 480, color: '#81c784', collected: false, doorId: 'door2', icon: '🗝️' },    // Hidden corner top-right (below Room 3)
    { id: 'key3', x: 740, y: 650, color: '#64b5f6', collected: false, doorId: 'door3', icon: '🔑' },     // Secret passage
    { id: 'key4', x: 950, y: 560, color: '#ffb74d', collected: false, doorId: 'door4', icon: '🗝️' },    // Right maze area
    { id: 'key5', x: 380, y: 480, color: '#ba68c8', collected: false, doorId: 'door5', icon: '🔑' },     // Near maze pillar
  ];
  keys.forEach(k => k.r = 15);

  // State
  let state = { started: false, collected: {}, finished: false, keysCollected: {}, doorsUnlocked: {} };
  let particles = []; // { x, y, vx, vy, color, life, size }
  let footsteps = []; // { x, y, life, size } - fading footprints
  let sparkles = [];  // { x, y, vx, vy, color, life, size } - floating sparkles around items
  let screenShake = { x: 0, y: 0, intensity: 0, duration: 0 }; // Screen shake effect

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

  // Spawn footstep at player position
  function spawnFootstep(x, y) {
    footsteps.push({
      x: x,
      y: y,
      life: 1.0, // Fades over 1 second
      size: 6
    });
    // Limit footsteps to prevent memory issues
    if (footsteps.length > 100) footsteps.shift();
  }

  // Spawn sparkles around an item
  function spawnSparkle(x, y, color) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 20 + 10;
    sparkles.push({
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      vx: (Math.random() - 0.5) * 20,
      vy: -Math.random() * 30 - 10, // Float upward
      color: color,
      life: 0.8 + Math.random() * 0.5,
      size: Math.random() * 3 + 1
    });
  }

  // Trigger screen shake
  function triggerScreenShake(intensity, duration) {
    screenShake.intensity = intensity;
    screenShake.duration = duration;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        state.started = !!obj.started;
        state.collected = obj.collected || {};
        state.finished = !!obj.finished;
        state.keysCollected = obj.keysCollected || {};
        state.doorsUnlocked = obj.doorsUnlocked || {};
        // Sync keys and doors arrays with state
        keys.forEach(k => k.collected = !!state.keysCollected[k.id]);
        doors.forEach(d => d.unlocked = !!state.doorsUnlocked[d.id]);
      }
    } catch (e) {}
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function resetAll() {
    state = { started: false, collected: {}, finished: false, keysCollected: {}, doorsUnlocked: {} };
    // Reset doors and keys in the arrays as well
    doors.forEach(d => d.unlocked = false);
    keys.forEach(k => k.collected = false);
    player.x = 400;
    player.y = 340;
    save();
    updateHeartsUI();
    updateKeysUI();
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

  // Keys UI - show collected keys as colored icons
  function updateKeysUI() {
    keysEl.innerHTML = "";
    for (const key of keys) {
      const d = document.createElement("div");
      d.style.cssText = `
        width: 20px;
        height: 20px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        background: ${state.keysCollected[key.id] ? key.color : '#333'};
        opacity: ${state.keysCollected[key.id] ? '1' : '0.4'};
        border: 2px solid ${key.color};
      `;
      d.textContent = state.keysCollected[key.id] ? "🔑" : "";
      keysEl.appendChild(d);
    }
  }

  // Get nearby key
  function getNearbyKey() {
    const px = player.x + player.w / 2,
      py = player.y + player.h / 2;
    for (const key of keys) {
      if (state.keysCollected[key.id]) continue;
      const d = Math.hypot(px - key.x, py - key.y);
      if (d < 30) return key;
    }
    return null;
  }

  // Get nearby locked door
  function getNearbyLockedDoor() {
    const px = player.x + player.w / 2,
      py = player.y + player.h / 2;
    for (const door of doors) {
      if (state.doorsUnlocked[door.id]) continue;
      const doorCx = door.x + door.w / 2;
      const doorCy = door.y + door.h / 2;
      const d = Math.hypot(px - doorCx, py - doorCy);
      if (d < 50) return door;
    }
    return null;
  }

  // Collect a key
  function collectKey(key) {
    state.keysCollected[key.id] = true;
    key.collected = true;
    save();
    updateKeysUI();
    Audio.playCollect();
    spawnConfetti(key.x, key.y);
    triggerScreenShake(4, 0.15); // Small shake on key collect
  }

  // Unlock a door
  function unlockDoor(door) {
    if (state.keysCollected[door.keyId]) {
      state.doorsUnlocked[door.id] = true;
      door.unlocked = true;
      save();
      // Play unlock sound
      Audio.playTone(600, 'sine', 0.2, 0.2);
      setTimeout(() => Audio.playTone(800, 'sine', 0.3, 0.2), 100);
      spawnConfetti(door.x + door.w/2, door.y + door.h/2);
      triggerScreenShake(8, 0.3); // Screen shake on unlock!
      return true;
    }
    return false;
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
    // Add locked doors as walls
    for (const door of doors) {
      if (!state.doorsUnlocked[door.id]) {
        all.push(door);
      }
    }
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
      triggerScreenShake(5, 0.2); // Small screen shake on heart collect
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
    // Use smoothed camera coordinates + screen shake
    const cx = (cam.curX || cam.x) + screenShake.x;
    const cy = (cam.curY || cam.y) + screenShake.y;
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

    // Draw footstep trails
    for (const f of footsteps) {
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size * f.life, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 180, 200, ${f.life * 0.3})`;
      ctx.fill();
    }

    // Room labels
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.font = "bold 14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Room 1", 150, 60);
    ctx.fillText("Room 2", 600, 60);
    ctx.fillText("Room 3", 1180, 200);
    ctx.fillText("Room 4", 150, 970);
    ctx.fillText("Room 5", 580, 950);
    ctx.fillText("🔐 Treasure", 1180, 830);

    // Decorations (with animations!)
    for (const d of decos) {
      ctx.save();
      const t = now() / 1000;
      
      // Animate plants (sway)
      if (d.type === 'plant') {
        const sway = Math.sin(t * 2 + d.x) * 3;
        ctx.translate(d.x + d.w/2, d.y + d.h);
        ctx.rotate(sway * Math.PI / 180);
        ctx.fillStyle = d.c;
        ctx.fillRect(-d.w/2, -d.h, d.w, d.h);
      }
      // Animate rugs (subtle pulse)
      else if (d.type === 'rug' || d.type === 'carpet') {
        const pulse = 1 + Math.sin(t * 1.5) * 0.02;
        ctx.translate(d.x + d.w/2, d.y + d.h/2);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = d.c;
        ctx.fillRect(-d.w/2, -d.h/2, d.w, d.h);
      }
      // Animate piano (keys shimmer)
      else if (d.type === 'piano') {
        ctx.fillStyle = d.c;
        ctx.fillRect(d.x, d.y, d.w, d.h);
        // White keys shimmer
        const shimmer = Math.sin(t * 3) * 0.1 + 0.9;
        ctx.fillStyle = `rgba(255, 255, 255, ${shimmer * 0.3})`;
        for (let i = 0; i < 6; i++) {
          ctx.fillRect(d.x + 5 + i * 15, d.y + 5, 12, d.h - 15);
        }
      }
      // TV flicker
      else if (d.type === 'tv') {
        ctx.fillStyle = d.c;
        ctx.fillRect(d.x, d.y, d.w, d.h);
        // Screen glow
        const flicker = Math.random() * 0.2 + 0.3;
        ctx.fillStyle = `rgba(100, 180, 255, ${flicker})`;
        ctx.fillRect(d.x + 2, d.y + 2, d.w - 4, d.h - 4);
      }
      // Default static decoration
      else {
        ctx.fillStyle = d.c;
        ctx.fillRect(d.x, d.y, d.w, d.h);
      }
      ctx.restore();
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

    // Draw Keys
    for (const key of keys) {
      if (state.keysCollected[key.id]) continue;
      const pulse = Math.sin(now() / 300 + keys.indexOf(key)) * 0.3 + 0.7;

      // Glow
      ctx.beginPath();
      ctx.arc(key.x, key.y, 25 + pulse * 6, 0, Math.PI * 2);
      ctx.fillStyle = `${key.color}33`; // Semi-transparent
      ctx.fill();

      // Circle
      ctx.beginPath();
      ctx.arc(key.x, key.y, key.r, 0, Math.PI * 2);
      ctx.fillStyle = key.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Key icon
      ctx.font = "12px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.fillText(key.icon, key.x, key.y);
    }

    // Draw Room Doors
    for (const door of doors) {
      const isUnlocked = state.doorsUnlocked[door.id];
      const hasKey = state.keysCollected[door.keyId];
      
      if (isUnlocked) {
        // Open door - just a subtle glow
        ctx.fillStyle = `${door.color}44`;
        ctx.fillRect(door.x, door.y, door.w, door.h);
      } else {
        // Locked door - pulsing
        const pulse = Math.sin(now() / 350 + doors.indexOf(door)) * 0.2 + 0.8;
        ctx.fillStyle = door.color;
        ctx.globalAlpha = pulse;
        ctx.fillRect(door.x, door.y, door.w, door.h);
        ctx.globalAlpha = 1.0;
        
        // Lock icon or key hint
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const iconX = door.x + door.w / 2;
        const iconY = door.y + door.h / 2;
        if (hasKey) {
          ctx.fillText("🔓", iconX, iconY); // Show they can unlock
        } else {
          ctx.fillText("🔒", iconX, iconY);
        }
      }
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

    // Particles (confetti)
    for (const p of particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life; // Fade out
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1.0;
    }

    // Sparkles (floating around items)
    for (const s of sparkles) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = s.life;
      ctx.fill();
      // Add a little glow
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 2, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = s.life * 0.3;
      ctx.fill();
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
          // Spawn footstep trail
          spawnFootstep(player.x + player.w/2, player.y + player.h);
          player.stepTimer = 0.25; // Footstep every 250ms
        }
      }

      // Update particles (confetti)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }

      // Update footsteps (fade out)
      for (let i = footsteps.length - 1; i >= 0; i--) {
        footsteps[i].life -= dt * 0.5; // Fade slower
        if (footsteps[i].life <= 0) footsteps.splice(i, 1);
      }

      // Update sparkles
      for (let i = sparkles.length - 1; i >= 0; i--) {
        const s = sparkles[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
        if (s.life <= 0) sparkles.splice(i, 1);
      }

      // Spawn sparkles around uncollected keys and hearts
      if (Math.random() < 0.1) { // 10% chance per frame
        // Sparkle around a random key
        const uncollectedKeys = keys.filter(k => !state.keysCollected[k.id]);
        if (uncollectedKeys.length > 0) {
          const key = uncollectedKeys[Math.floor(Math.random() * uncollectedKeys.length)];
          spawnSparkle(key.x, key.y, key.color);
        }
        // Sparkle around a random heart
        const uncollectedItems = items.filter(it => !state.collected[it.id]);
        if (uncollectedItems.length > 0) {
          const item = uncollectedItems[Math.floor(Math.random() * uncollectedItems.length)];
          spawnSparkle(item.x, item.y, '#ff6bb3');
        }
      }

      // Update screen shake
      if (screenShake.duration > 0) {
        screenShake.duration -= dt;
        screenShake.x = (Math.random() - 0.5) * screenShake.intensity * 2;
        screenShake.y = (Math.random() - 0.5) * screenShake.intensity * 2;
      } else {
        screenShake.x = 0;
        screenShake.y = 0;
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

      // Check for key collection
      const nearKey = getNearbyKey();
      if (nearKey) {
        const px = player.x + player.w / 2,
          py = player.y + player.h / 2;
        if (Math.hypot(px - nearKey.x, py - nearKey.y) < 20) {
          collectKey(nearKey);
        }
      }

      // Check for door unlocking (walk into door with key)
      const nearDoor = getNearbyLockedDoor();
      if (nearDoor && state.keysCollected[nearDoor.keyId]) {
        const px = player.x + player.w / 2,
          py = player.y + player.h / 2;
        const doorCx = nearDoor.x + nearDoor.w / 2;
        const doorCy = nearDoor.y + nearDoor.h / 2;
        if (Math.hypot(px - doorCx, py - doorCy) < 35) {
          unlockDoor(nearDoor);
        }
      }

      // Hint
      const gateNear =
        collectedCount() < gate.need &&
        Math.hypot(
          player.x + player.w / 2 - (gate.x + gate.w / 2),
          player.y + player.h / 2 - (gate.y + gate.h / 2)
        ) < 80;

      // Check for nearby key or door for hints
      if (nearKey) {
        const door = doors.find(d => d.keyId === nearKey.id);
        hintBubble.textContent = `🔑 Pick up key for ${door ? door.roomName : 'a room'}!`;
        hintBubble.style.display = "block";
      } else if (nearDoor) {
        if (state.keysCollected[nearDoor.keyId]) {
          hintBubble.textContent = `🔓 Walk in to unlock ${nearDoor.roomName}!`;
        } else {
          hintBubble.textContent = `🔒 Need key to open ${nearDoor.roomName}`;
        }
        hintBubble.style.display = "block";
      } else if (gateNear) {
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
  updateKeysUI();
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
