/**
 * Pipluxe Cards — result-first odds + money for EV / operator panel.
 * All money values in USD. Target ~20% margin (~80% RTP).
 */
window.CM = window.CM || {};

CM.CARD_COUNT = 6;
CM.MATCH_NEED = 3;
/** Minimum player age for paid play (venue / amusement gate). */
CM.MIN_AGE = 19;
/** Independent free-play card on paid opens only (never on free follow-ups). */
CM.BONUS_CHANCE = 0.05;

CM.PRICES = {
  singleOpen: 5,
  packagePrice: 20,
  packageOpens: 5,
  /** @deprecated alias */
  sixPack: 20,
};

/** Silent package inject — JP Pack floor (not advertised in player-facing copy). */
CM.PACKAGE_GUARANTEE = "abyss";

/** Paid win tiers (excludes sticker consolation + free-play bonus). */
CM.WIN_PRIZE_IDS = [
  "abyss",
  "pbpack",
  "triple",
  "funko",
  "bundle",
  "zacian",
  "chaos",
  "ascended",
  "tin",
  "box",
];

CM.PRIZES = [
  {
    id: "sticker",
    name: "Sticker",
    short: "STICKER",
    handTo: "Hand them: 1 sticker",
    blurb: "Consolation takeaway",
    cogs: 0.25,
    msrp: 1,
    cssClass: "prize-sticker",
    rarity: "common",
  },
  {
    id: "bonus",
    name: "Free Play",
    short: "FREE",
    handTo: "Free pack — does not cost a play",
    blurb: "Bonus round unlocked",
    cogs: 0,
    msrp: 0,
    cssClass: "prize-bonus",
    rarity: "bonus",
  },
  {
    id: "abyss",
    name: "JP Pack",
    short: "JP PACK",
    handTo: "Hand them: 1 JP Abyss Eye pack",
    blurb: "Abyss Eye",
    cogs: 3,
    msrp: 5,
    cssClass: "prize-abyss",
    rarity: "uncommon",
  },
  {
    id: "pbpack",
    name: "Eng Pack",
    short: "ENG PACK",
    handTo: "Hand them: 1 CB/PB pack",
    blurb: "CB/PB",
    cogs: 8,
    msrp: 8,
    cssClass: "prize-pbpack",
    rarity: "uncommon",
  },
  {
    id: "triple",
    name: "PB 3-Pack",
    short: "3-PACK",
    handTo: "Hand them: 1 Pitch Black 3-pack",
    blurb: "Three PB packs",
    cogs: 24,
    msrp: 24,
    cssClass: "prize-triple",
    rarity: "rare",
  },
  {
    id: "funko",
    name: "Choose a Pokémon Funko",
    short: "FUNKO",
    handTo: "Hand them: 1 Pokémon Funko Pop (their pick)",
    blurb: "Player's choice Funko",
    cogs: 26,
    msrp: 26,
    cssClass: "prize-funko",
    rarity: "rare",
  },
  {
    id: "bundle",
    name: "PB/CB Booster Bundle",
    short: "BUNDLE",
    handTo: "Hand them: 1 PB/CB booster bundle",
    blurb: "PB or CB bundle",
    cogs: 50,
    msrp: 50,
    cssClass: "prize-bundle",
    rarity: "epic",
  },
  {
    id: "zacian",
    name: "Hop's Zacian ex Box",
    short: "ZACIAN",
    handTo: "Hand them: 1 Hop's Zacian ex box",
    blurb: "Hop's Zacian ex",
    cogs: 45,
    msrp: 45,
    cssClass: "prize-zacian",
    rarity: "epic",
  },
  {
    id: "chaos",
    name: "Chaos ETB",
    short: "CHAOS",
    handTo: "Hand them: 1 Chaos Rising Elite Trainer Box",
    blurb: "Chaos Rising ETB",
    cogs: 90,
    msrp: 90,
    cssClass: "prize-chaos",
    rarity: "legendary",
  },
  {
    id: "ascended",
    name: "Ascended Heroes Bundle",
    short: "ASCENDED",
    handTo: "Hand them: 1 Ascended Heroes booster bundle",
    blurb: "Ascended Heroes bundle",
    cogs: 100,
    msrp: 100,
    cssClass: "prize-ascended",
    rarity: "legendary",
  },
  {
    id: "tin",
    name: "Shining Fates Tin",
    short: "TIN",
    handTo: "Hand them: 1 Shining Fates tin",
    blurb: "Shining Fates tin",
    cogs: 80,
    msrp: 80,
    cssClass: "prize-tin",
    rarity: "legendary",
  },
  {
    id: "box",
    name: "PB Booster Box",
    short: "BOX",
    handTo: "Hand them: 1 Pitch Black BOOSTER BOX!",
    blurb: "Full PB booster box",
    cogs: 260,
    msrp: 260,
    cssClass: "prize-box",
    rarity: "jackpot",
  },
];

/** Display / log order: jackpot → floor → sticker → bonus. */
CM.PRIZE_DISPLAY_ORDER = [
  "box",
  "ascended",
  "chaos",
  "tin",
  "bundle",
  "zacian",
  "funko",
  "triple",
  "pbpack",
  "abyss",
  "sticker",
  "bonus",
];

/** Rough weights among non-sticker wins ($5 single open). */
CM.WIN_WEIGHTS = {
  abyss: 2200,
  pbpack: 1000,
  triple: 200,
  funko: 160,
  bundle: 25,
  zacian: 75,
  chaos: 20,
  ascended: 14,
  tin: 24,
  box: 6,
};

/**
 * Chance the open is a sticker (consolation).
 * Tuned with WIN/PACKAGE/FREE for ~20% margin on $5 / 5-for-$20
 * after JP Pack COGS cut to $3 (softer hit rate than the $5-COGS table).
 */
CM.STICKER_CHANCE = 0.606;
CM.MISS_CHANCE = CM.STICKER_CHANCE; // legacy alias

/**
 * Full tables (include sticker) for package companions + free follow-ups.
 * Silent guarantee injects JP Pack separately (not shown in UI copy).
 */
CM.PACKAGE_WEIGHTS = {
  sticker: 7450,
  abyss: 980,
  pbpack: 500,
  triple: 155,
  funko: 125,
  bundle: 30,
  zacian: 78,
  chaos: 22,
  ascended: 15,
  tin: 28,
  box: 8,
};

CM.FREE_WEIGHTS = {
  sticker: 7450,
  abyss: 980,
  pbpack: 500,
  triple: 155,
  funko: 125,
  bundle: 30,
  zacian: 78,
  chaos: 22,
  ascended: 15,
  tin: 28,
  box: 8,
};

/** Near-miss tease drama — any prize tier can be the almost-win. */
CM.TEASE_WEIGHTS = {
  abyss: 18,
  pbpack: 18,
  triple: 16,
  funko: 14,
  bundle: 8,
  zacian: 12,
  chaos: 6,
  ascended: 6,
  tin: 6,
  box: 4,
};

CM.SFX = {
  packCut: {
    src: "audio/pack-cut.mp3",
    start: 0,
    duration: 0,
    volume: 0.4,
  },
  cardFlip: {
    srcs: [
      "audio/card-flip-1.mp3",
      "audio/card-flip-2.mp3",
      "audio/card-flip-3.mp3",
      "audio/card-flip-4.mp3",
      "audio/card-flip-5.mp3",
    ],
    volume: 0.45,
  },
};

CM.prizeById = function (id) {
  if (id === "miss") id = "sticker"; // legacy log / save compat
  return CM.PRIZES.find(function (p) {
    return p.id === id;
  });
};

CM.rollWeighted = function (weights) {
  var keys = Object.keys(weights);
  var total = 0;
  keys.forEach(function (k) {
    total += weights[k];
  });
  var r = Math.random() * total;
  var acc = 0;
  for (var i = 0; i < keys.length; i++) {
    acc += weights[keys[i]];
    if (r < acc) return keys[i];
  }
  return keys[keys.length - 1];
};

/**
 * @param {{allowBonus?:boolean, free?:boolean, table?:object}} [opts]
 * free → FREE_WEIGHTS, no bonus. table → full sticker+prize weights.
 */
CM.rollOutcome = function (opts) {
  opts = opts || {};
  var allowBonus = opts.allowBonus !== false && !opts.free;
  var hasBonus = allowBonus && Math.random() < (CM.BONUS_CHANCE || 0);

  if (opts.free || opts.table) {
    var table = opts.table || CM.FREE_WEIGHTS || CM.PACKAGE_WEIGHTS;
    var prizeId = CM.rollWeighted(table);
    if (prizeId === "bonus") prizeId = "sticker";
    if (prizeId === "miss") prizeId = "sticker";
    return { prizeId: prizeId, hasBonus: hasBonus };
  }

  var isSticker =
    Math.random() < (CM.STICKER_CHANCE || CM.MISS_CHANCE || 0);
  if (isSticker) {
    return { prizeId: "sticker", hasBonus: hasBonus };
  }
  return {
    prizeId: CM.rollWeighted(CM.WIN_WEIGHTS),
    hasBonus: hasBonus,
  };
};

/**
 * Pre-roll a package: companions + 1 silent guaranteed JP Pack.
 * Bonus can land on any paid seat including the guarantee.
 */
CM.rollPackage = function () {
  var n = (CM.PRICES && CM.PRICES.packageOpens) || 5;
  var guaranteeId = CM.PACKAGE_GUARANTEE || "abyss";
  var companions = n - 1;
  var outcomes = [];
  for (var i = 0; i < companions; i++) {
    outcomes.push(
      CM.rollOutcome({ table: CM.PACKAGE_WEIGHTS, allowBonus: true })
    );
  }
  var insertAt =
    Math.random() < 0.75
      ? Math.max(0, n - 3) + Math.floor(Math.random() * Math.min(3, n))
      : Math.floor(Math.random() * n);
  if (insertAt > outcomes.length) insertAt = outcomes.length;
  outcomes.splice(insertAt, 0, {
    prizeId: guaranteeId,
    hasBonus: Math.random() < (CM.BONUS_CHANCE || 0),
    guaranteed: true,
  });
  return {
    outcomes: outcomes.slice(0, n),
    guaranteeIndex: insertAt,
  };
};

/** Expected COGS of the predetermined prize (sticker + weighted wins). */
CM.expectedPrizeCogs = function (weights) {
  if (weights) {
    var totalW = 0;
    var sum = 0;
    Object.keys(weights).forEach(function (k) {
      var w = weights[k] || 0;
      totalW += w;
      var p = CM.prizeById(k);
      sum += w * (p ? p.cogs || 0 : 0);
    });
    return totalW ? sum / totalW : 0;
  }
  var stickerP = CM.STICKER_CHANCE || CM.MISS_CHANCE || 0;
  var winP = 1 - stickerP;
  var winWeights = CM.WIN_WEIGHTS || {};
  var tw = 0;
  Object.keys(winWeights).forEach(function (k) {
    tw += winWeights[k] || 0;
  });
  var sticker = CM.prizeById("sticker");
  var stickerCogs = sticker ? sticker.cogs || 0 : 0;
  if (!tw) return stickerP * stickerCogs;
  var s = 0;
  Object.keys(winWeights).forEach(function (k) {
    var p = CM.prizeById(k);
    s += ((winWeights[k] || 0) / tw) * (p ? p.cogs || 0 : 0);
  });
  return stickerP * stickerCogs + winP * s;
};

/**
 * EV COGS per paid open, including independent free-play card.
 * Free follow-up cannot re-bonus.
 */
CM.expectedCogsPaidOpen = function () {
  var prizeEv = CM.expectedPrizeCogs();
  var freeEv = CM.expectedPrizeCogs(CM.FREE_WEIGHTS);
  var bonusP = CM.BONUS_CHANCE || 0;
  return prizeEv + bonusP * freeEv;
};

CM.expectedMarginPaidOpen = function () {
  var price = (CM.PRICES && CM.PRICES.singleOpen) || 5;
  var ev = CM.expectedCogsPaidOpen();
  return {
    price: price,
    evCogs: ev,
    profit: price - ev,
    margin: price ? (price - ev) / price : 0,
  };
};

CM.formatMoney = function (n) {
  var v = Number(n) || 0;
  var sign = v < 0 ? "-" : "";
  return sign + "$" + Math.abs(v).toFixed(2);
};

CM.packagePrice = function () {
  var p = CM.PRICES || {};
  return p.packagePrice != null ? p.packagePrice : p.sixPack || 20;
};
