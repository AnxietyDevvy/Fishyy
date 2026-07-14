const rarityData = {
  common: { label: "Common", payout: 8, sell: 12, weight: 56 },
  uncommon: { label: "Uncommon", payout: 15, sell: 22, weight: 25 },
  rare: { label: "Rare", payout: 28, sell: 40, weight: 12 },
  epic: { label: "Epic", payout: 45, sell: 65, weight: 6 },
  legendary: { label: "Legendary", payout: 85, sell: 130, weight: 1 },
};

const gear = {
  rods: [
    { id: "twig", name: "Twig Rod", cost: 0, bonus: 0, unlocked: true },
    { id: "pine", name: "Pine Rod", cost: 160, bonus: 6, unlocked: false },
    { id: "riversteel", name: "Riversteel Rod", cost: 450, bonus: 14, unlocked: false },
    { id: "moonline", name: "Moonline Rod", cost: 900, bonus: 25, unlocked: false },
  ],
  bait: [
    { id: "worms", name: "Garden Worms", cost: 50, bonusRare: 2, unlocked: true },
    { id: "glowgrub", name: "Glow Grub", cost: 180, bonusRare: 5, unlocked: false },
    { id: "starshrimp", name: "Star Shrimp", cost: 420, bonusRare: 8, unlocked: false },
  ],
  lures: [
    { id: "woodchip", name: "Woodchip Lure", cost: 40, bonusLegendary: 0.2, unlocked: true },
    { id: "silverleaf", name: "Silverleaf Spinner", cost: 200, bonusLegendary: 0.8, unlocked: false },
    { id: "sunflash", name: "Sunflash Spoon", cost: 520, bonusLegendary: 1.6, unlocked: false },
  ],
};

const regions = [
  {
    id: "meadow-pond",
    name: "Meadow Pond",
    unlockCost: 0,
    multiplier: 1,
    fish: [
      { name: "Bluegill", rarity: "common" },
      { name: "Pond Carp", rarity: "common" },
      { name: "Golden Minnow", rarity: "uncommon" },
      { name: "Lily Koi", rarity: "rare" },
      { name: "Sunlace Trout", rarity: "epic" },
    ],
  },
  {
    id: "whisper-river",
    name: "Whisper River",
    unlockCost: 340,
    multiplier: 1.45,
    fish: [
      { name: "Silver Darter", rarity: "common" },
      { name: "Moss Pike", rarity: "uncommon" },
      { name: "Stream Salmon", rarity: "rare" },
      { name: "Glass Catfish", rarity: "epic" },
      { name: "River Crown Eel", rarity: "legendary" },
    ],
  },
  {
    id: "misty-lake",
    name: "Misty Lake",
    unlockCost: 980,
    multiplier: 2.1,
    fish: [
      { name: "Cloud Perch", rarity: "uncommon" },
      { name: "Moon Bass", rarity: "rare" },
      { name: "Echo Sturgeon", rarity: "epic" },
      { name: "Star Pike", rarity: "legendary" },
    ],
  },
  {
    id: "frost-bay",
    name: "Frost Bay",
    unlockCost: 2300,
    multiplier: 3.2,
    fish: [
      { name: "Ice Char", rarity: "rare" },
      { name: "Snowfin", rarity: "epic" },
      { name: "Aurora Halibut", rarity: "legendary" },
    ],
  },
];

const seasonalEventFish = {
  spring: [{ name: "Petal Guppy", rarity: "rare" }],
  summer: [{ name: "Sunray Dorado", rarity: "epic" }],
  autumn: [{ name: "Harvest Catfish", rarity: "epic" }],
  winter: [{ name: "Frost Lantern Eel", rarity: "legendary" }],
};

const state = {
  coins: 120,
  inventory: [],
  catchesByName: {},
  unlockedRegions: new Set(["meadow-pond"]),
  activeRegionId: "meadow-pond",
  equippedRod: "twig",
  equippedBait: "worms",
  equippedLure: "woodchip",
  isFishing: false,
  dayTick: 0,
  soundOn: true,
  quest: null,
  activeTab: "npc",
};

const ui = {
  app: document.getElementById("app"),
  coins: document.getElementById("coins"),
  regionName: document.getElementById("regionName"),
  rodName: document.getElementById("rodName"),
  timeSeason: document.getElementById("timeSeason"),
  fishBtn: document.getElementById("fishBtn"),
  soundBtn: document.getElementById("soundBtn"),
  catchLog: document.getElementById("catchLog"),
  inventoryList: document.getElementById("inventoryList"),
  sellOneBtn: document.getElementById("sellOneBtn"),
  sellAllBtn: document.getElementById("sellAllBtn"),
  gearContent: document.getElementById("gearContent"),
  routesContent: document.getElementById("routesContent"),
  questContent: document.getElementById("questContent"),
  refreshQuestBtn: document.getElementById("refreshQuestBtn"),
  pondCanvas: document.getElementById("pondCanvas"),
  shopContent: document.getElementById("shopContent"),
  tabButtons: Array.from(document.querySelectorAll(".tab-button")),
  tabPanels: Array.from(document.querySelectorAll(".tab-panel")),
};

const ctx = ui.pondCanvas.getContext("2d");
let ripplePhase = 0;
let bobberY = 128;
let bobberPulse = 0;
let ambientTimer = 0;
let audioCtx;

const seasons = ["spring", "summer", "autumn", "winter"];
const dayModes = ["day", "evening", "night"];

function getCurrentSeason() {
  const seasonIndex = Math.floor((Date.now() / 45000) % 4);
  return seasons[seasonIndex];
}

function getCurrentMode() {
  const modeIndex = Math.floor((Date.now() / 30000) % 3);
  return dayModes[modeIndex];
}

function getRegion() {
  return regions.find((region) => region.id === state.activeRegionId);
}

function getGearItem(type, id) {
  return gear[type].find((item) => item.id === id);
}

function weightedChoice(options) {
  const total = options.reduce((sum, option) => sum + option.weight, 0);
  let pick = Math.random() * total;
  for (const option of options) {
    pick -= option.weight;
    if (pick <= 0) {
      return option;
    }
  }
  return options[0];
}

function buildRarityTable(region) {
  const activeRod = getGearItem("rods", state.equippedRod);
  const activeBait = getGearItem("bait", state.equippedBait);
  const activeLure = getGearItem("lures", state.equippedLure);

  const base = Object.entries(rarityData).map(([key, data]) => ({ key, weight: data.weight }));

  for (const entry of base) {
    if (entry.key === "rare") {
      entry.weight += activeBait.bonusRare;
    }
    if (entry.key === "legendary") {
      entry.weight += activeLure.bonusLegendary;
    }
    if (["rare", "epic", "legendary"].includes(entry.key)) {
      entry.weight += activeRod.bonus * 0.15;
    }
    if (region.multiplier > 1.4 && entry.key !== "common") {
      entry.weight += 2;
    }
  }

  return base;
}

function chooseFish(region) {
  const rarityTable = buildRarityTable(region);
  const selectedRarity = weightedChoice(rarityTable).key;
  const options = region.fish.filter((fish) => fish.rarity === selectedRarity);

  const season = getCurrentSeason();
  const seasonalFish = seasonalEventFish[season] || [];
  const eventChance = 0.08 + getGearItem("lures", state.equippedLure).bonusLegendary * 0.01;

  if (Math.random() < eventChance) {
    const eventPick = seasonalFish[Math.floor(Math.random() * seasonalFish.length)];
    if (eventPick) {
      return { ...eventPick, event: true };
    }
  }

  if (!options.length) {
    const fallback = region.fish[Math.floor(Math.random() * region.fish.length)];
    return { ...fallback, event: false };
  }

  const pick = options[Math.floor(Math.random() * options.length)];
  return { ...pick, event: false };
}

function catchFish() {
  if (state.isFishing) {
    return;
  }

  state.isFishing = true;
  ui.fishBtn.disabled = true;
  ui.catchLog.textContent = "You cast your line...";

  ping(300, 0.08, 0.03);

  const wait = 1000 + Math.random() * 1700;
  setTimeout(() => {
    const region = getRegion();
    const fish = chooseFish(region);
    const rarity = rarityData[fish.rarity];
    const immediateCoins = Math.round(rarity.payout * region.multiplier);

    state.coins += immediateCoins;
    state.inventory.push({
      id: crypto.randomUUID(),
      name: fish.name,
      rarity: fish.rarity,
      region: region.name,
      event: fish.event,
    });
    state.catchesByName[fish.name] = (state.catchesByName[fish.name] || 0) + 1;

    const eventText = fish.event ? " Event catch!" : "";
    ui.catchLog.textContent = `You caught ${fish.name} (${rarity.label}) and earned ${immediateCoins} coins.${eventText}`;

    if (fish.event) {
      ping(900, 0.16, 0.06);
    } else {
      ping(560, 0.1, 0.04);
    }

    state.isFishing = false;
    ui.fishBtn.disabled = false;

    checkQuestCompletion();
    renderAll();
  }, wait);
}

function sellFish(item) {
  const region = regions.find((r) => r.name === item.region) || getRegion();
  const rarity = rarityData[item.rarity];
  const sellValue = Math.round(rarity.sell * region.multiplier * (item.event ? 1.4 : 1));
  state.coins += sellValue;
  return sellValue;
}

function sellOneRandom() {
  if (!state.inventory.length) {
    ui.catchLog.textContent = "Your basket is empty.";
    return;
  }

  const index = Math.floor(Math.random() * state.inventory.length);
  const [item] = state.inventory.splice(index, 1);
  const value = sellFish(item);
  ui.catchLog.textContent = `Sold ${item.name} for ${value} coins.`;
  ping(420, 0.08, 0.03);
  renderAll();
}

function sellAllFish() {
  if (!state.inventory.length) {
    ui.catchLog.textContent = "No fish to sell yet.";
    return;
  }

  let total = 0;
  for (const item of state.inventory) {
    total += sellFish(item);
  }

  state.inventory = [];
  ui.catchLog.textContent = `Sold all fish for ${total} coins.`;
  ping(380, 0.1, 0.04);
  renderAll();
}

function tryBuy(type, id) {
  const item = getGearItem(type, id);
  if (!item) {
    return;
  }

  if (item.unlocked) {
    state[`equipped${capitalize(type.slice(0, -1))}`] = id;
    ui.catchLog.textContent = `${item.name} equipped.`;
    renderAll();
    return;
  }

  if (state.coins < item.cost) {
    ui.catchLog.textContent = `Need ${item.cost - state.coins} more coins for ${item.name}.`;
    return;
  }

  state.coins -= item.cost;
  item.unlocked = true;
  state[`equipped${capitalize(type.slice(0, -1))}`] = id;
  ui.catchLog.textContent = `Bought and equipped ${item.name}.`;
  ping(740, 0.12, 0.05);
  renderAll();
}

function unlockOrTravel(regionId) {
  const region = regions.find((entry) => entry.id === regionId);
  if (!region) {
    return;
  }

  if (!state.unlockedRegions.has(regionId)) {
    if (state.coins < region.unlockCost) {
      ui.catchLog.textContent = `Need ${region.unlockCost - state.coins} more coins to unlock ${region.name}.`;
      return;
    }
    state.coins -= region.unlockCost;
    state.unlockedRegions.add(regionId);
    ui.catchLog.textContent = `${region.name} unlocked!`;
  }

  state.activeRegionId = regionId;
  renderAll();
}

function buildQuest() {
  const region = getRegion();
  const pool = region.fish;
  const targetFish = pool[Math.floor(Math.random() * pool.length)];
  const required = Math.ceil(Math.random() * 3) + (targetFish.rarity === "common" ? 1 : 0);
  const rarity = rarityData[targetFish.rarity];
  const reward = Math.round((rarity.sell * required + 30) * region.multiplier);

  state.quest = {
    fishName: targetFish.name,
    required,
    progress: 0,
    reward,
    completed: false,
  };
}

function checkQuestCompletion() {
  if (!state.quest || state.quest.completed) {
    return;
  }

  state.quest.progress = Math.min(state.quest.required, state.catchesByName[state.quest.fishName] || 0);
  if (state.quest.progress >= state.quest.required) {
    state.quest.completed = true;
    state.coins += state.quest.reward;
    ui.catchLog.textContent = `Request complete: +${state.quest.reward} coins for ${state.quest.fishName}.`;
    ping(980, 0.14, 0.08);
  }
}

function renderInventory() {
  ui.inventoryList.innerHTML = "";
  if (!state.inventory.length) {
    ui.inventoryList.innerHTML = "<li><span>No fish yet</span><span>0</span></li>";
    return;
  }

  const grouped = state.inventory.reduce((acc, item) => {
    const key = `${item.name}::${item.rarity}`;
    if (!acc[key]) {
      acc[key] = { ...item, count: 0 };
    }
    acc[key].count += 1;
    return acc;
  }, {});

  Object.values(grouped)
    .sort((a, b) => b.count - a.count)
    .forEach((entry) => {
      const li = document.createElement("li");
      const rarity = rarityData[entry.rarity].label;
      li.innerHTML = `<span>${entry.name} x${entry.count} <small>(${rarity})</small></span><span>${entry.event ? "Event" : entry.region}</span>`;
      ui.inventoryList.appendChild(li);
    });
}

function renderGearSection(type, container) {
  container.innerHTML = "";

  for (const item of gear[type]) {
    const wrapper = document.createElement("div");
    wrapper.className = "item";

    const isEquipped = state[`equipped${capitalize(type.slice(0, -1))}`] === item.id;
    const buyLabel = item.unlocked ? (isEquipped ? "Equipped" : "Equip") : `Buy ${item.cost}`;

    wrapper.innerHTML = `
      <div class="item-head">
        <span>${item.name}</span>
        <span>${item.unlocked ? "Owned" : item.cost + "c"}</span>
      </div>
      <div class="small">${describeGear(type, item)}</div>
    `;

    const button = document.createElement("button");
    button.className = "btn tiny";
    button.textContent = buyLabel;
    button.disabled = isEquipped;
    button.addEventListener("click", () => tryBuy(type, item.id));
    wrapper.appendChild(button);
    container.appendChild(wrapper);
  }
}

function renderGearPanel() {
  ui.gearContent.innerHTML = "";

  const sections = [
    { title: "Rods", type: "rods" },
    { title: "Bait", type: "bait" },
    { title: "Lures", type: "lures" },
  ];

  for (const section of sections) {
    const wrapper = document.createElement("div");
    wrapper.className = "item";

    const heading = document.createElement("div");
    heading.className = "item-head";
    heading.innerHTML = `<span>${section.title}</span>`;
    wrapper.appendChild(heading);

    const list = document.createElement("div");
    list.className = "gear-stack";
    wrapper.appendChild(list);

    ui.gearContent.appendChild(wrapper);
    renderGearSection(section.type, list);
  }
}

function renderShopPanel() {
  ui.shopContent.innerHTML = "";

  const rod = getGearItem("rods", state.equippedRod);
  const bait = getGearItem("bait", state.equippedBait);
  const lure = getGearItem("lures", state.equippedLure);

  const notes = [
    { title: "Current setup", text: `${rod.name} • ${bait.name} • ${lure.name}` },
    { title: "Helpful tip", text: "Save coins for the next rod or a rare-lure upgrade to improve your odds." },
  ];

  for (const note of notes) {
    const card = document.createElement("div");
    card.className = "item";
    card.innerHTML = `
      <div class="item-head">
        <span>${note.title}</span>
      </div>
      <div class="small">${note.text}</div>
    `;
    ui.shopContent.appendChild(card);
  }
}

function describeGear(type, item) {
  if (type === "rods") {
    return `Boosts better catches by ${item.bonus}.`;
  }
  if (type === "bait") {
    return `+${item.bonusRare}% rare fish odds.`;
  }
  return `+${item.bonusLegendary.toFixed(1)}% legendary odds.`;
}

function renderRegions() {
  ui.routesContent.innerHTML = "";

  for (const region of regions) {
    const unlocked = state.unlockedRegions.has(region.id);
    const isCurrent = state.activeRegionId === region.id;

    const card = document.createElement("div");
    card.className = "item";

    card.innerHTML = `
      <div class="item-head">
        <span>${region.name}</span>
        <span>x${region.multiplier.toFixed(2)}</span>
      </div>
      <div class="small">${unlocked ? "Unlocked" : "Unlock for " + region.unlockCost + " coins"}</div>
    `;

    const button = document.createElement("button");
    button.className = "btn tiny";
    button.textContent = isCurrent ? "Here" : unlocked ? "Travel" : "Unlock";
    button.disabled = isCurrent;
    button.addEventListener("click", () => unlockOrTravel(region.id));

    card.appendChild(button);
    ui.routesContent.appendChild(card);
  }
}

function renderQuest() {
  if (!state.quest) {
    buildQuest();
  }

  const quest = state.quest;
  const rarity = getFishRarityLabel(quest.fishName);
  const completeText = quest.completed ? "Completed" : `Progress ${quest.progress}/${quest.required}`;

  ui.questContent.innerHTML = `
    <div class="quest-card">
      <div><strong>Request:</strong> Catch ${quest.required} ${quest.fishName}</div>
      <div class="small">Rarity: ${rarity}</div>
      <div class="small">Reward: ${quest.reward} coins</div>
      <div class="small">Status: ${completeText}</div>
      ${quest.completed ? '<button id="claimQuestBtn" class="btn tiny">Generate Next Request</button>' : ""}
    </div>
  `;

  const claimBtn = document.getElementById("claimQuestBtn");
  if (claimBtn) {
    claimBtn.addEventListener("click", () => {
      buildQuest();
      renderQuest();
    });
  }
}

function getFishRarityLabel(name) {
  const region = getRegion();
  const fish = region.fish.find((entry) => entry.name === name);
  return fish ? rarityData[fish.rarity].label : "Unknown";
}

function renderHUD() {
  const region = getRegion();
  const rod = getGearItem("rods", state.equippedRod);
  ui.coins.textContent = state.coins.toString();
  ui.regionName.textContent = region.name;
  ui.rodName.textContent = rod.name;

  const season = capitalize(getCurrentSeason());
  const mode = capitalize(getCurrentMode());
  ui.timeSeason.textContent = `${mode} • ${season}`;

  ui.app.classList.remove("mode-day", "mode-evening", "mode-night");
  ui.app.classList.add(`mode-${getCurrentMode()}`);
}

function renderTabContent() {
  ui.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === state.activeTab);
  });

  ui.tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === state.activeTab);
  });
}

function renderAll() {
  renderHUD();
  renderInventory();
  renderGearPanel();
  renderShopPanel();
  renderRegions();
  renderQuest();
  renderTabContent();
}

function drawPond() {
  const w = ui.pondCanvas.width;
  const h = ui.pondCanvas.height;

  ripplePhase += 0.02;
  bobberPulse += state.isFishing ? 0.15 : 0.04;
  bobberY = 128 + Math.sin(bobberPulse) * (state.isFishing ? 8 : 3);

  const mode = getCurrentMode();
  const palette =
    mode === "night"
      ? { sky: "#2d4f7c", water: "#2d6988" }
      : mode === "evening"
        ? { sky: "#f6a377", water: "#5796b4" }
        : { sky: "#8ed3e7", water: "#64aec7" };

  ctx.fillStyle = palette.sky;
  ctx.fillRect(0, 0, w, h * 0.32);

  ctx.fillStyle = palette.water;
  ctx.fillRect(0, h * 0.32, w, h * 0.68);

  for (let i = 0; i < 7; i += 1) {
    const y = 120 + i * 23;
    const sway = Math.sin(ripplePhase * 2 + i * 0.7) * 9;
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)";
    ctx.fillRect(20 + sway, y, w - 40, 3);
  }

  ctx.fillStyle = "#3d5e3d";
  ctx.fillRect(0, h * 0.28, w, 18);

  const bx = w * 0.52;
  ctx.fillStyle = "#f6f6f6";
  ctx.fillRect(bx, bobberY - 10, 2, 15);
  ctx.fillStyle = "#e04c4c";
  ctx.fillRect(bx - 4, bobberY, 8, 8);

  for (let r = 0; r < 3; r += 1) {
    const rad = 10 + r * 8 + Math.sin(ripplePhase * 5 + r) * 2;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.22 - r * 0.06})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx, bobberY + 7, rad, 0, Math.PI * 2);
    ctx.stroke();
  }

  requestAnimationFrame(drawPond);
}

function setupAudio() {
  if (!window.AudioContext) {
    state.soundOn = false;
    ui.soundBtn.textContent = "Sound: N/A";
    ui.soundBtn.disabled = true;
    return;
  }

  audioCtx = new window.AudioContext();
  startAmbientLoop();
}

function ping(freq, gainValue, duration) {
  if (!state.soundOn || !audioCtx) {
    return;
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = "triangle";
  osc.frequency.value = freq;
  gain.gain.value = gainValue;

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.start(now);
  osc.stop(now + duration);
}

function startAmbientLoop() {
  function tick() {
    if (!state.soundOn || !audioCtx) {
      return;
    }

    ambientTimer += 1;
    const base = getCurrentMode() === "night" ? 180 : 240;
    const notes = [base, base * 1.2, base * 1.5, base * 1.8];
    const note = notes[ambientTimer % notes.length];
    ping(note, 0.02, 0.7);
  }

  setInterval(tick, 2200);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

ui.tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.activeTab = button.dataset.tab;
    renderTabContent();
  });
});

ui.fishBtn.addEventListener("click", () => {
  if (audioCtx?.state === "suspended") {
    audioCtx.resume();
  }
  catchFish();
});

ui.soundBtn.addEventListener("click", () => {
  state.soundOn = !state.soundOn;
  ui.soundBtn.textContent = state.soundOn ? "Sound: On" : "Sound: Off";
});

ui.sellOneBtn.addEventListener("click", sellOneRandom);
ui.sellAllBtn.addEventListener("click", sellAllFish);
ui.refreshQuestBtn.addEventListener("click", () => {
  if (state.coins < 60) {
    ui.catchLog.textContent = "Need 60 coins to ask villagers for a fresh request.";
    return;
  }

  state.coins -= 60;
  buildQuest();
  ui.catchLog.textContent = "A villager posted a fresh request.";
  renderAll();
});

setInterval(() => {
  state.dayTick += 1;
  renderHUD();
}, 1200);

setupAudio();
buildQuest();
renderAll();
drawPond();
