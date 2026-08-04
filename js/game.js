/**
 * Result-first dramatization + hex board choreography.
 */
window.CM = window.CM || {};

CM.Game = (function () {
  var FILLERS = ["sticker", "sticker", "sticker", "abyss", "pbpack"];
  var TEASE_FALLBACK = [
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

  function pickTease() {
    var weights = CM.TEASE_WEIGHTS;
    if (weights && typeof CM.rollWeighted === "function") {
      return CM.rollWeighted(weights);
    }
    return TEASE_FALLBACK[Math.floor(Math.random() * TEASE_FALLBACK.length)];
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function pickFiller(avoidId, maxCounts) {
    var pool = FILLERS.filter(function (id) {
      if (id === avoidId) return false;
      if ((maxCounts[id] || 0) >= 2) return false;
      return true;
    });
    if (!pool.length) return "sticker";
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * Build 6 face ids that dramatize a predetermined outcome.
   * Reveal order = array order (dealt one-by-one into hex slots).
   * Sticker outcomes play as near-misses (no 3-match) — tally is for handout only.
   */
  function buildDeal(outcome) {
    var prizeId = outcome.prizeId === "miss" ? "sticker" : outcome.prizeId;
    var isSticker = prizeId === "sticker";
    var faces = isSticker ? buildNearMissDeal() : buildWinDeal(prizeId);

    if (outcome.hasBonus) {
      // Swap a non-critical face for FREE PLAY (prefer a sticker filler).
      var swapAt = -1;
      for (var i = 0; i < faces.length; i++) {
        if (faces[i] === "sticker") {
          swapAt = i;
          break;
        }
      }
      if (swapAt < 0) {
        for (var j = faces.length - 1; j >= 0; j--) {
          var id = faces[j];
          var count = faces.filter(function (x) {
            return x === id;
          }).length;
          if (isSticker || count < 3 || id !== prizeId) {
            swapAt = j;
            break;
          }
        }
      }
      if (swapAt < 0) swapAt = faces.length - 1;

      var before = faces[swapAt];
      faces[swapAt] = "bonus";
      if (!isSticker) {
        var matchCount = faces.filter(function (x) {
          return x === prizeId;
        }).length;
        if (matchCount < 3) {
          faces[swapAt] = before;
          var stickerIdx = faces.indexOf("sticker");
          if (stickerIdx >= 0) faces[stickerIdx] = "bonus";
          else {
            for (var k = 0; k < faces.length; k++) {
              if (faces[k] !== prizeId) {
                faces[k] = "bonus";
                break;
              }
            }
          }
        }
      }
    }

    return faces;
  }

  function buildWinDeal(prizeId) {
    // Pattern: tease → second → filler → tension → third (often last).
    var patterns = [
      [prizeId, "fill", prizeId, "fill", "fill", prizeId],
      ["fill", prizeId, "fill", prizeId, "fill", prizeId],
      [prizeId, "fill", "fill", prizeId, "fill", prizeId],
    ];
    var pattern = patterns[Math.floor(Math.random() * patterns.length)];
    var counts = {};
    return pattern.map(function (slot) {
      if (slot === prizeId) {
        counts[prizeId] = (counts[prizeId] || 0) + 1;
        return prizeId;
      }
      var f = pickFiller(prizeId, counts);
      counts[f] = (counts[f] || 0) + 1;
      return f;
    });
  }

  function buildNearMissDeal() {
    var tease = pickTease();
    // Two of tease, never three. Rest fillers with at most 2 each.
    var skeleton = [tease, "fill", tease, "fill", "fill", "fill"];
    if (Math.random() < 0.55) {
      skeleton = [tease, "fill", "fill", tease, "fill", "break"];
    }
    var counts = {};
    counts[tease] = 0;
    return skeleton.map(function (slot) {
      if (slot === tease) {
        counts[tease]++;
        return tease;
      }
      if (slot === "break") {
        var dud = pickFiller(tease, counts);
        counts[dud] = (counts[dud] || 0) + 1;
        return dud;
      }
      var f = pickFiller(tease, counts);
      counts[f] = (counts[f] || 0) + 1;
      return f;
    });
  }

  function runningHype(facesSoFar, nextId) {
    var counts = {};
    facesSoFar.forEach(function (id) {
      counts[id] = (counts[id] || 0) + 1;
    });
    var after = (counts[nextId] || 0) + 1;
    var prize = CM.prizeById(nextId);
    var short = prize ? prize.short : nextId;

    if (nextId === "bonus") {
      return {
        hype: "Free play card!",
        count: "Bonus unlocked",
        tone: "bonus",
      };
    }
    if (nextId === "sticker" || nextId === "miss") {
      if (after === 1) {
        return { hype: "Blank…", count: "", tone: "soft" };
      }
      return { hype: "Another blank", count: "", tone: "soft" };
    }

    if (after === 1) {
      return {
        hype: short + " appears!",
        count: "1 / 3",
        tone: "land",
      };
    }
    if (after === 2) {
      var lines = ["Just one more!", "Almost there!", "Two " + short + "s…"];
      return {
        hype: lines[Math.floor(Math.random() * lines.length)],
        count: "2 / 3",
        tone: "hype",
      };
    }
    if (after >= 3) {
      return {
        hype: "THREE " + short + "S!",
        count: "3 / 3 · MATCH",
        tone: "win",
      };
    }
    return { hype: short, count: "", tone: "land" };
  }

  function cardMarkup(prize, facedown) {
    var downClass = facedown ? " is-facedown" : "";
    return (
      '<article class="card ' +
      prize.cssClass +
      downClass +
      '" data-prize="' +
      prize.id +
      '">' +
      '<div class="card-flipper">' +
      '<div class="card-face">' +
      '<p class="card-rarity">' +
      prize.rarity +
      "</p>" +
      '<div class="card-art" aria-hidden="true">' +
      artFor(prize.id) +
      "</div>" +
      '<p class="card-name">' +
      prize.short +
      "</p>" +
      '<p class="card-blurb">' +
      prize.blurb +
      "</p>" +
      "</div>" +
      '<div class="card-back" aria-hidden="true">' +
      '<span class="card-back-mat"></span>' +
      '<span class="card-back-frame"></span>' +
      '<span class="card-back-emblem">' +
      '<span class="cbe-ring"></span>' +
      '<span class="cbe-band"></span>' +
      '<span class="cbe-core"></span>' +
      "</span>" +
      "</div>" +
      "</div>" +
      "</article>"
    );
  }

  function artFor(id) {
    if (id === "sticker" || id === "miss")
      return '<span class="art art-sticker"></span>';
    if (id === "bonus") return '<span class="art art-bonus">+</span>';
    if (id === "abyss") return '<span class="art art-abyss">◆</span>';
    if (id === "pbpack") return '<span class="art art-pbpack"></span>';
    if (id === "triple") return '<span class="art art-triple">3</span>';
    if (id === "funko") return '<span class="art art-funko">★</span>';
    if (id === "bundle") return '<span class="art art-bundle"></span>';
    if (id === "zacian") return '<span class="art art-zacian">⚔</span>';
    if (id === "chaos") return '<span class="art art-chaos"></span>';
    if (id === "ascended") return '<span class="art art-ascended">▲</span>';
    if (id === "tin") return '<span class="art art-tin"></span>';
    if (id === "box") return '<span class="art art-box"></span>';
    return "";
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  return {
    buildDeal: buildDeal,
    runningHype: runningHype,
    cardMarkup: cardMarkup,
    artFor: artFor,
    sleep: sleep,
    shuffle: shuffle,
  };
})();
