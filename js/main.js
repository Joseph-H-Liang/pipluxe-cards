/**
 * Feel prototype controller — attract → TOS → mode → pack open loop.
 */
(function () {
  var state = "attract"; // attract | age | tos | mode | idle | opening | dealing | result | freeQueued
  var round = 0;
  var freeQueued = false;
  var packOrigin = null;
  var lastOutcome = null;
  var resultPhase = null; // "prize" | "bonus"
  var playMode = null; // "single" | "pack"
  var packageLeft = 0;
  var packageTotal = 0;
  var packageQueue = null;
  var packageIndex = 0;
  var packageGuaranteeIndex = -1;
  var currentTheme = "piplup";
  var ageDeniedTimer = null;
  var currentPackageId = null;
  var currentPackageKind = null;
  var currentPackageOpen = 0;
  var packageCollected = [];

  var demoMode = false;
  var demoRunning = false;
  var demoToken = 0;
  var demoEnabled = true;
  var lastActivity = Date.now();
  var DEMO_IDLE_MS = 30 * 1000;

  var packZone = document.getElementById("packZone");
  var packBtn = document.getElementById("packBtn");
  var packCue = document.getElementById("packCue");
  var hexBoard = document.getElementById("hexBoard");
  var hexCenter = document.getElementById("hexCenter");
  var centerHype = document.getElementById("centerHype");
  var centerCount = document.getElementById("centerCount");
  var centerResult = document.getElementById("centerResult");
  var resultLabel = document.getElementById("resultLabel");
  var resultHand = document.getElementById("resultHand");
  var fxLayer = document.getElementById("fxLayer");
  var dockStatus = document.getElementById("dockStatus");
  var modeHint = document.getElementById("modeHint");
  var playModeLabel = document.getElementById("playModeLabel");
  var gate = document.getElementById("gate");
  var resultOverlay = document.getElementById("result-overlay");
  var resultCard = document.getElementById("resultCard");
  var resultEyebrow = document.getElementById("resultEyebrow");
  var resultArt = document.getElementById("resultArt");
  var resultTitle = document.getElementById("resultTitle");
  var resultHandto = document.getElementById("resultHandto");
  var resultNext = document.getElementById("resultNext");
  var slots = Array.prototype.slice.call(
    document.querySelectorAll(".card-slot")
  );

  /** Pause after each reveal flip. 1–4 snappy, 5 slower, 6 slowest. */
  var REVEAL_PAUSE = [0, 0, 0, 10, 280, 1100];
  var REVEAL_FLIP_MS = [220, 220, 240, 240, 420, 620];

  function setDock(text) {
    dockStatus.textContent = text;
  }

  function noteActivity() {
    lastActivity = Date.now();
    if (demoMode || demoRunning) stopDemo();
  }

  function demoAlive(token) {
    return demoMode && demoRunning && token === demoToken;
  }

  function demoWait(ms, token) {
    return new Promise(function (resolve) {
      var start = Date.now();
      function tick() {
        if (!demoAlive(token)) {
          resolve(false);
          return;
        }
        if (Date.now() - start >= ms) {
          resolve(true);
          return;
        }
        setTimeout(tick, 80);
      }
      tick();
    });
  }

  function updateDemoToggleUI() {
    var el = document.getElementById("demo-toggle");
    var stateEl = document.getElementById("demo-toggle-state");
    if (stateEl) stateEl.textContent = demoEnabled ? "ON" : "OFF";
    if (el) el.classList.toggle("is-off", !demoEnabled);
  }

  function toggleDemoEnabled() {
    demoEnabled = !demoEnabled;
    if (!demoEnabled && (demoMode || demoRunning)) stopDemo();
    updateDemoToggleUI();
    CM.Audio.click();
  }

  function stopDemo() {
    if (!demoMode && !demoRunning) return;
    demoToken += 1;
    demoMode = false;
    demoRunning = false;
    document.body.classList.remove("demo-mode");
    freeQueued = false;
    packageCollected = [];
    hideWinBanner();
    hideResultOverlay();
    var summaryEl = document.getElementById("summary-overlay");
    if (summaryEl) summaryEl.hidden = true;
    lastActivity = Date.now();
    goAttract();
  }

  async function startDemoLoop() {
    if (!demoEnabled || demoRunning) return;
    if (oddsOpen() || logOpen() || opOpen()) return;

    demoToken += 1;
    var token = demoToken;
    demoRunning = true;
    demoMode = true;
    document.body.classList.add("demo-mode");

    while (demoAlive(token)) {
      var themes = CM.THEMES || [];
      if (themes.length) {
        applyTheme(themes[Math.floor(Math.random() * themes.length)].id);
      }

      playMode = "single";
      packageQueue = null;
      packageIndex = 0;
      packageGuaranteeIndex = -1;
      packageTotal = 0;
      packageLeft = 0;
      packageCollected = [];
      currentPackageId = null;
      currentPackageKind = "single";
      currentPackageOpen = 0;
      freeQueued = false;
      lastOutcome = null;
      resultPhase = null;

      hideGate();
      clearBoard();
      hexBoard.classList.add("is-dim");
      hexBoard.classList.remove("is-ready");
      packZone.classList.remove("is-away", "is-busy");
      resetPackClasses();
      packBtn.classList.add("is-idle");
      packCue.textContent = "DEMO · auto open";
      updatePlayChrome();
      state = "idle";
      modeHint.textContent = "Auto-demo · any tap cancels";
      setDock("DEMO — watching a sample open.");

      if (!(await demoWait(700, token))) break;

      await openPack();
      if (!demoAlive(token)) break;

      // Auto-dismiss prize (+ bonus card if needed)
      while (state === "result" && demoAlive(token)) {
        var hold =
          lastOutcome &&
          (lastOutcome.prizeId === "sticker" || lastOutcome.prizeId === "miss")
            ? 1400
            : 2000;
        if (!(await demoWait(hold, token))) break;
        dismissResult();
        if (!(await demoWait(280, token))) break;
      }

      while (state === "freeQueued" && demoAlive(token)) {
        if (!(await demoWait(900, token))) break;
        await openPack();
        if (!demoAlive(token)) break;
        while (state === "result" && demoAlive(token)) {
          if (!(await demoWait(1600, token))) break;
          dismissResult();
          if (!(await demoWait(280, token))) break;
        }
      }

      // Back to attract between demos
      hideWinBanner();
      hideResultOverlay();
      packageCollected = [];
      freeQueued = false;
      showGateScreen("attract");
      state = "attract";
      modeHint.textContent = "DEMO";
      setDock("DEMO — next sample soon.");
      updatePlayChrome();
      if (!(await demoWait(2200, token))) break;
    }

    demoRunning = false;
    demoMode = false;
    document.body.classList.remove("demo-mode");
  }

  function checkDemoIdle() {
    if (!demoEnabled) return;
    if (demoRunning) return;
    if (oddsOpen() || logOpen() || opOpen()) return;
    if (state !== "attract") return;
    if (Date.now() - lastActivity < DEMO_IDLE_MS) return;
    startDemoLoop();
  }

  function gateOpen() {
    return gate && !gate.hidden;
  }

  function showGateScreen(name) {
    ["attract", "age", "tos", "mode"].forEach(function (id) {
      var el = document.getElementById("screen-" + id);
      if (el) el.classList.toggle("is-active", id === name);
    });
    if (gate) gate.hidden = false;
  }

  function hideGate() {
    if (gate) gate.hidden = true;
  }

  function fillOddsTbody(tableId, table) {
    var tbody = document.querySelector("#" + tableId + " tbody");
    if (!tbody || !table) return;
    tbody.innerHTML = table.rows
      .map(function (row) {
        return (
          "<tr><td>" +
          row.name +
          "</td><td>" +
          CM.Ops.formatChance(row.chance) +
          "</td></tr>"
        );
      })
      .join("");
  }

  function refreshTosOdds() {
    var singleTable = CM.Ops.oddsTable();
    var packTable = CM.Ops.oddsTable(CM.PACKAGE_WEIGHTS);
    fillOddsTbody("tos-odds-single", singleTable);
    fillOddsTbody("tos-odds-pack", packTable);
    var noteSingle =
      "Sealed/single prize: " +
      CM.Ops.formatChance(singleTable.anyPrize) +
      " · else sticker · Free play: " +
      CM.Ops.formatChance(singleTable.bonus) +
      " on paid opens only";
    var notePack =
      "Per open on pack table · Free play: " +
      CM.Ops.formatChance(packTable.bonus) +
      " on each paid open";
    var n1 = document.getElementById("tos-odds-note-single");
    var n2 = document.getElementById("tos-odds-note-pack");
    if (n1) n1.textContent = noteSingle;
    if (n2) n2.textContent = notePack;
  }

  function applyTheme(id) {
    var theme = CM.themeById(id) || CM.THEMES[0];
    currentTheme = theme.id;
    (CM.THEME_IDS || []).forEach(function (tid) {
      document.body.classList.remove("theme-" + tid);
    });
    document.body.classList.add("theme-" + theme.id);
    document.documentElement.style.setProperty("--theme-accent", theme.accent);
    document.documentElement.style.setProperty(
      "--theme-accent-2",
      theme.accent2
    );
    document.documentElement.style.setProperty("--theme-glow", theme.glow);
    document.documentElement.style.setProperty("--accent", theme.accent);
    document.documentElement.style.setProperty("--accent-2", theme.accent2);

    var badge = document.getElementById("active-theme-badge");
    if (badge) {
      var line = (theme.line || [])
        .map(function (mon, i) {
          return (
            '<span class="evo-dancer" style="animation-delay:' +
            i * 0.35 +
            's">' +
            '<img src="' +
            mon.gif +
            '" alt="' +
            mon.name +
            '" />' +
            "</span>"
          );
        })
        .join("");
      badge.innerHTML =
        '<img class="theme-starter" src="' +
        theme.gif +
        '" alt="" />' +
        '<span class="theme-badge-name">' +
        theme.short +
        "</span>" +
        (line ? '<span class="theme-evo-line">' + line + "</span>" : "");
    }

    var pill = document.getElementById("mode-theme-pill");
    if (pill) {
      pill.innerHTML =
        '<img src="' +
        theme.gif +
        '" alt="" /> <span>' +
        theme.short +
        "</span>";
    }
    if (CM.Ops && CM.Ops.renderThemeBoard) {
      CM.Ops.renderThemeBoard(currentTheme);
    }
  }

  function hideWinBanner() {
    var banner = document.getElementById("win-banner");
    if (!banner) return;
    banner.hidden = true;
    banner.setAttribute("aria-hidden", "true");
    banner.classList.remove("jackpot");
    CM.Audio.stopCall();
  }

  function playWinBanner(prize, outcome) {
    var theme = CM.themeById(currentTheme) || CM.THEMES[0];
    var banner = document.getElementById("win-banner");
    if (!banner || !theme || !prize) return;

    var sprite = document.getElementById("win-banner-sprite");
    var call = document.getElementById("win-banner-call");
    var prizeLine = document.getElementById("win-banner-prize");
    var titleName = CM.Ops.displayName(prize);

    sprite.src = theme.gif;
    sprite.alt = theme.name;
    call.textContent = theme.name + "!";
    prizeLine.textContent =
      prize.id === "bonus" ? "BONUS · FREE PLAY" : "WON · " + titleName;

    banner.classList.toggle(
      "jackpot",
      prize.rarity === "jackpot" || prize.rarity === "legendary"
    );
    banner.hidden = false;
    banner.setAttribute("aria-hidden", "false");

    var inner = banner.querySelector(".win-banner-inner");
    if (inner) {
      inner.style.animation = "none";
      void inner.offsetWidth;
      inner.style.animation = "";
    }

    if (prize.id !== "bonus") {
      CM.Audio.callStarter(theme);
    } else {
      CM.Audio.stopCall();
    }

    clearTimeout(playWinBanner._timer);
    playWinBanner._timer = setTimeout(
      function () {
        banner.hidden = true;
        banner.setAttribute("aria-hidden", "true");
      },
      prize.rarity === "jackpot" || prize.rarity === "legendary" ? 2200 : 1900
    );
  }

  function buildThemeGrid() {
    var grid = document.getElementById("theme-grid");
    if (!grid || grid.dataset.ready) return;
    grid.innerHTML = (CM.THEMES || [])
      .map(function (theme, i) {
        return (
          '<button type="button" class="theme-card theme-' +
          theme.id +
          '" data-theme="' +
          theme.id +
          '">' +
          '<img class="theme-sprite" src="' +
          theme.gif +
          '" alt="' +
          theme.name +
          '" />' +
          '<span class="theme-name">' +
          theme.short +
          "</span>" +
          '<span class="theme-pokemon">' +
          theme.name +
          "</span>" +
          '<span class="theme-key">' +
          (i + 1) +
          "</span>" +
          "</button>"
        );
      })
      .join("");
    grid.dataset.ready = "1";
    grid.addEventListener("click", function (e) {
      var btn = e.target.closest(".theme-card");
      if (!btn || state !== "theme") return;
      pickTheme(btn.getAttribute("data-theme"));
    });
  }

  function pickTheme(id) {
    applyTheme(id);
    goMode();
  }

  function updatePlayChrome() {
    if (!playModeLabel) return;
    if (!playMode) {
      playModeLabel.hidden = true;
      playModeLabel.textContent = "";
      return;
    }
    playModeLabel.hidden = false;
    if (playMode === "pack") {
      var price = typeof CM.packagePrice === "function" ? CM.packagePrice() : 20;
      playModeLabel.textContent =
        "$" + price + " · " + packageLeft + "/" + packageTotal + " left";
    } else {
      playModeLabel.textContent =
        "$" + ((CM.PRICES && CM.PRICES.singleOpen) || 5) + " single";
    }
  }

  function priceForOpen(wasFree) {
    if (wasFree) return 0;
    if (playMode === "pack") {
      var n = (CM.PRICES && CM.PRICES.packageOpens) || 5;
      var pack =
        typeof CM.packagePrice === "function"
          ? CM.packagePrice()
          : (CM.PRICES && (CM.PRICES.packagePrice || CM.PRICES.sixPack)) || 20;
      return pack / n;
    }
    return (CM.PRICES && CM.PRICES.singleOpen) || 5;
  }

  function minAge() {
    return (CM.MIN_AGE != null ? CM.MIN_AGE : 19) | 0;
  }

  function refreshAgeCopy() {
    var age = minAge();
    var tag = document.getElementById("age-tagline");
    var q = document.getElementById("age-question");
    var yes = document.getElementById("btn-age-yes");
    var denied = document.getElementById("age-denied");
    if (tag) tag.textContent = "You must be " + age + " or older to play";
    if (q) q.textContent = "Are you " + age + " years of age or older?";
    if (yes) yes.textContent = "YES · " + age + "+";
    if (denied) {
      denied.textContent =
        "Sorry — this attraction is for players " + age + "+.";
      denied.hidden = true;
    }
  }

  function goAttract() {
    playMode = null;
    packageLeft = 0;
    packageTotal = 0;
    packageQueue = null;
    packageIndex = 0;
    packageGuaranteeIndex = -1;
    currentPackageId = null;
    currentPackageKind = null;
    currentPackageOpen = 0;
    packageCollected = [];
    freeQueued = false;
    lastOutcome = null;
    resultPhase = null;
    clearTimeout(ageDeniedTimer);
    hideWinBanner();
    hideResultOverlay();
    var summaryEl = document.getElementById("summary-overlay");
    if (summaryEl) summaryEl.hidden = true;
    clearBoard();
    hexBoard.classList.add("is-dim");
    hexBoard.classList.remove("is-ready");
    packZone.classList.remove("is-away", "is-busy");
    resetPackClasses();
    packBtn.classList.remove("is-idle");
    updatePlayChrome();
    showGateScreen("attract");
    state = "attract";
    modeHint.textContent = "Space to start";
    setDock("Attract — tap or Space to begin.");
  }

  function goAge() {
    noteActivity();
    CM.Audio.unlock();
    CM.Audio.click();
    refreshAgeCopy();
    showGateScreen("age");
    state = "age";
    modeHint.textContent = "1 = Yes · 2 = No";
    setDock("Confirm you are " + minAge() + "+ to continue.");
  }

  function acceptAge() {
    if (state !== "age") return;
    clearTimeout(ageDeniedTimer);
    var denied = document.getElementById("age-denied");
    if (denied) denied.hidden = true;
    goTos();
  }

  function denyAge() {
    if (state !== "age") return;
    CM.Audio.unlock();
    CM.Audio.click();
    var denied = document.getElementById("age-denied");
    if (denied) denied.hidden = false;
    setDock("Age check failed — returning to attract.");
    clearTimeout(ageDeniedTimer);
    ageDeniedTimer = setTimeout(function () {
      goAttract();
    }, 1600);
  }

  function goTos() {
    CM.Audio.unlock();
    CM.Audio.click();
    refreshTosOdds();
    showGateScreen("tos");
    state = "tos";
    modeHint.textContent = "Press 1 to agree";
    setDock("Read house rules, then agree.");
    var scroll = document.getElementById("tos-scroll");
    if (scroll) scroll.scrollTop = 0;
  }

  function goTheme() {
    // Theme picker removed — always Piplup.
    applyTheme("piplup");
    goMode();
  }

  function goMode() {
    CM.Audio.unlock();
    CM.Audio.click();
    applyTheme(currentTheme || "piplup");
    showGateScreen("mode");
    state = "mode";
    var single = (CM.PRICES && CM.PRICES.singleOpen) || 5;
    var pack =
      typeof CM.packagePrice === "function"
        ? CM.packagePrice()
        : (CM.PRICES && (CM.PRICES.packagePrice || CM.PRICES.sixPack)) || 20;
    modeHint.textContent = "1 = $" + single + " · 2 = $" + pack;
    setDock("Choose single open or 5-pack.");
  }

  function startMode(selected) {
    CM.Audio.unlock();
    CM.Audio.click();
    playMode = selected === "pack" ? "pack" : "single";
    packageQueue = null;
    packageIndex = 0;
    packageGuaranteeIndex = -1;
    currentPackageId =
      "pkg-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e5);
    currentPackageKind = playMode;
    currentPackageOpen = 0;
    packageCollected = [];
    if (playMode === "pack") {
      var pack = CM.rollPackage();
      packageQueue = pack.outcomes;
      packageGuaranteeIndex =
        pack.guaranteeIndex != null ? pack.guaranteeIndex : -1;
      packageTotal = packageQueue.length;
      packageLeft = packageTotal;
    } else {
      packageTotal = 0;
      packageLeft = 0;
    }
    hideGate();
    clearBoard();
    hexBoard.classList.add("is-dim");
    hexBoard.classList.remove("is-ready");
    packZone.classList.remove("is-away", "is-busy");
    resetPackClasses();
    packBtn.classList.add("is-idle");
    packCue.textContent =
      playMode === "pack"
        ? "5-pack ready — " + packageLeft + " opens"
        : "Open a pack — 3 matching cards wins";
    updatePlayChrome();
    state = "idle";
    modeHint.textContent = "Space / click to open";
    setDock(
      playMode === "pack"
        ? "5-pack started — open when ready."
        : "Single open — tap the pack."
    );
  }

  function afterResultContinue() {
    if (freeQueued) {
      packCue.textContent = "Free pack ready — tap to open";
      setDock("Free play ready — tap the pack.");
      modeHint.textContent = demoMode
        ? "Demo · free play next"
        : "Free play · tap pack";
      state = "freeQueued";
      updatePlayChrome();
      return;
    }

    if (playMode === "pack" && packageLeft > 0) {
      packCue.textContent =
        "Open next — " + packageLeft + " of " + packageTotal + " left";
      setDock("Pack open remaining — tap when ready.");
      modeHint.textContent = "Space / click to open";
      state = "idle";
      updatePlayChrome();
      return;
    }

    // Demo singles return to attract loop without a summary screen
    if (demoMode) {
      packageCollected = [];
      state = "demoHold";
      return;
    }

    if (packageCollected.length) {
      showPackageSummary();
      return;
    }

    goAttract();
  }

  function showPackageSummary() {
    var isPack = playMode === "pack" || currentPackageKind === "pack";
    var counts = {};
    var bonusHits = 0;
    packageCollected.forEach(function (item) {
      var id = item.prizeId || "sticker";
      if (id === "miss") id = "sticker";
      var prize = CM.prizeById(id);
      if (!prize) return;
      if (!counts[id]) {
        counts[id] = {
          prize: prize,
          n: 0,
          freeOpens: 0,
        };
      }
      counts[id].n += 1;
      if (item.wasFree) counts[id].freeOpens += 1;
      if (item.hasBonus) bonusHits += 1;
    });
    if (bonusHits) {
      counts.bonus = {
        prize: CM.prizeById("bonus"),
        n: bonusHits,
        freeOpens: 0,
      };
    }

    var list = document.getElementById("summary-list");
    if (!list) {
      goAttract();
      return;
    }
    list.innerHTML = "";
    (CM.PRIZE_DISPLAY_ORDER || [
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
    ]).forEach(function (id) {
        var row = counts[id];
        if (!row) return;
        var li = document.createElement("li");
        var detail = "";
        if (id === "bonus") {
          detail =
            '<div class="summary-detail">Triggered free open(s) — no product</div>';
        } else if (id === "sticker") {
          detail =
            '<div class="summary-detail">Hand them: ' +
            row.n +
            " sticker" +
            (row.n === 1 ? "" : "s") +
            "</div>";
          if (row.freeOpens) {
            detail +=
              '<div class="summary-free">' +
              row.freeOpens +
              " from free play</div>";
          }
        } else {
          detail =
            '<div class="summary-detail">' +
            CM.Ops.handToText(row.prize) +
            "</div>";
          if (row.freeOpens) {
            detail +=
              '<div class="summary-free">' +
              row.freeOpens +
              " from free play</div>";
          }
        }
        li.innerHTML =
          '<span class="qty">' +
          row.n +
          '</span><span><div class="summary-name">' +
          CM.Ops.displayName(row.prize) +
          "</div>" +
          detail +
          '</span><span class="summary-ico ' +
          row.prize.cssClass +
          '">' +
          CM.Game.artFor(row.prize.id) +
          "</span>";
        list.appendChild(li);
      });

    var eyebrow = document.querySelector("#summary-overlay .summary-eyebrow");
    if (eyebrow) {
      eyebrow.textContent = isPack ? "5-PACK COMPLETE" : "SINGLE COMPLETE";
    }

    var overlay = document.getElementById("summary-overlay");
    if (overlay) overlay.hidden = false;
    state = "summary";
    modeHint.textContent = "Space / Done · new player";
    setDock(
      (isPack ? "5-pack" : "Single") +
        " summary — hand out prizes, then Done."
    );
  }

  function closePackageSummary() {
    var overlay = document.getElementById("summary-overlay");
    if (overlay) overlay.hidden = true;
    packageCollected = [];
    goAttract();
  }

  function summaryOpen() {
    var el = document.getElementById("summary-overlay");
    return el && !el.hidden;
  }

  function resetPackClasses() {
    packBtn.classList.remove(
      "is-idle",
      "is-dropping",
      "is-shake",
      "is-cutting",
      "is-split"
    );
    var halves = packBtn.querySelectorAll(".pack-half");
    halves.forEach(function (half) {
      half.style.animation = "none";
      half.style.opacity = "1";
      half.style.transform = "none";
    });
    void packBtn.offsetWidth;
    halves.forEach(function (half) {
      half.style.animation = "";
      half.style.opacity = "";
      half.style.transform = "";
    });
  }

  function clearBoard() {
    slots.forEach(function (slot) {
      slot.innerHTML = "";
      slot.classList.remove(
        "is-filled",
        "is-match",
        "is-bonus",
        "is-landing",
        "is-ghost",
        "is-pair",
        "is-dimmed"
      );
    });
    centerHype.textContent = "";
    centerCount.textContent = "";
    centerResult.classList.add("is-hidden");
    resultLabel.textContent = "";
    resultHand.textContent = "";
    hexBoard.classList.remove("has-pair-watch");
    hexCenter.classList.remove("is-win", "is-miss", "is-bonus", "is-hype", "is-pair-watch");
    if (window.CM && CM.Celebrate) {
      CM.Celebrate.clear(slots, hexBoard, fxLayer);
    }
    fxLayer.innerHTML = "";
    packOrigin = null;
  }

  /**
   * When any revealed prize has exactly 2, spotlight those slots
   * for anticipation (tension, not a win celebration).
   */
  function refreshPairAwards(faces, revealedCount) {
    slots.forEach(function (slot) {
      slot.classList.remove("is-pair", "is-dimmed");
    });
    hexBoard.classList.remove("has-pair-watch");
    hexCenter.classList.remove("is-pair-watch");

    var byId = {};
    for (var i = 0; i < revealedCount; i++) {
      var id = faces[i];
      if (id === "bonus") continue;
      if (id === "sticker" || id === "miss") continue;
      if (!byId[id]) byId[id] = [];
      byId[id].push(i);
    }

    var pairSlots = null;
    Object.keys(byId).forEach(function (id) {
      if (byId[id].length === 2) pairSlots = byId[id];
    });

    if (!pairSlots) return;

    hexBoard.classList.add("has-pair-watch");
    hexCenter.classList.add("is-pair-watch");
    slots.forEach(function (slot, idx) {
      if (pairSlots.indexOf(idx) !== -1) {
        slot.classList.add("is-pair");
      } else if (slot.classList.contains("is-filled")) {
        // Only dim already-revealed non-pair cards; leave facedown crisp
        var card = slot.querySelector(".card");
        if (card && !card.classList.contains("is-facedown")) {
          slot.classList.add("is-dimmed");
        }
      }
    });
  }

  function hideResultOverlay() {
    resultOverlay.hidden = true;
    resultOverlay.classList.add("is-hidden");
  }

  function capturePackOrigin() {
    var r = packBtn.getBoundingClientRect();
    packOrigin = {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
      w: Math.min(r.width * 0.72, slots[0].getBoundingClientRect().width || 110),
    };
  }

  function burstParticles(at) {
    var n = 32;
    for (var i = 0; i < n; i++) {
      var p = document.createElement("span");
      p.className = "spark";
      var angle = (Math.PI * 2 * i) / n + Math.random() * 0.25;
      var dist = 70 + Math.random() * 160;
      p.style.left = (at ? at.x : window.innerWidth / 2) + "px";
      p.style.top = (at ? at.y : window.innerHeight / 2) + "px";
      p.style.position = "fixed";
      p.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      p.style.setProperty("--dy", Math.sin(angle) * dist + "px");
      p.style.setProperty("--delay", Math.random() * 0.1 + "s");
      p.style.setProperty("--hue", 45 + Math.random() * 40 + "");
      fxLayer.appendChild(p);
    }
  }

  function cutGlow() {
    var g = document.createElement("span");
    g.className = "cut-glow";
    if (packOrigin) {
      g.style.position = "fixed";
      g.style.left = packOrigin.x + "px";
      g.style.top = packOrigin.y + "px";
      g.style.margin = 0;
      g.style.translate = "-50% -50%";
    }
    fxLayer.appendChild(g);
  }

  function showGhostSlots() {
    slots.forEach(function (slot) {
      slot.classList.add("is-ghost");
    });
  }

  function flyFacedownToSlot(prize, slot, index) {
    return new Promise(function (resolve) {
      var target = slot.getBoundingClientRect();
      var origin = packOrigin || {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        w: target.width,
      };

      var startW = origin.w * 0.75;
      var startH = startW * 1.4;
      var startLeft = origin.x - startW / 2;
      var startTop = origin.y - startH / 2;

      var flyer = document.createElement("div");
      flyer.className = "card-flyer";
      flyer.style.width = startW + "px";
      flyer.style.height = startH + "px";
      flyer.style.left = startLeft + "px";
      flyer.style.top = startTop + "px";
      flyer.innerHTML = CM.Game.cardMarkup(prize, true);
      fxLayer.appendChild(flyer);

      var dx = target.left - startLeft;
      var dy = target.top - startTop;
      var endScaleX = target.width / startW;
      var endScaleY = target.height / startH;
      var spin = (index % 2 === 0 ? -1 : 1) * (8 + Math.random() * 10);
      var duration = 360 + index * 45;

      var anim = flyer.animate(
        [
          {
            transform: "translate(0px, 0px) rotate(" + spin + "deg) scale(0.9)",
            offset: 0,
          },
          {
            transform:
              "translate(" +
              dx * 0.5 +
              "px, " +
              (dy * 0.35 - 28) +
              "px) rotate(" +
              spin * 0.4 +
              "deg) scale(1.05)",
            offset: 0.5,
          },
          {
            transform:
              "translate(" +
              dx +
              "px, " +
              dy +
              "px) rotate(0deg) scale(" +
              endScaleX +
              ", " +
              endScaleY +
              ")",
            offset: 1,
          },
        ],
        {
          duration: duration,
          easing: "cubic-bezier(0.22, 0.82, 0.18, 1)",
          fill: "forwards",
        }
      );

      anim.onfinish = function () {
        slot.classList.remove("is-ghost");
        slot.innerHTML = CM.Game.cardMarkup(prize, true);
        slot.classList.add("is-filled", "is-landing");
        flyer.remove();
        CM.Audio.cardLand(index);
        setTimeout(function () {
          slot.classList.remove("is-landing");
          resolve();
        }, 120);
      };
    });
  }

  function revealCard(slot, prize, seen, flipMs) {
    return new Promise(function (resolve) {
      var card = slot.querySelector(".card");
      if (!card) {
        resolve();
        return;
      }

      var hype = CM.Game.runningHype(seen, prize.id);
      centerHype.textContent = hype.hype;
      centerCount.textContent = hype.count;
      hexCenter.classList.toggle(
        "is-hype",
        hype.tone === "hype" || hype.tone === "win"
      );

      var duration = flipMs != null ? flipMs : 620;
      card.style.setProperty("--flip-ms", duration + "ms");
      card.classList.add("is-flipping");
      void card.offsetWidth;
      card.classList.remove("is-facedown");
      CM.Audio.cardFlip();

      setTimeout(function () {
        if (prize.id === "bonus") slot.classList.add("is-bonus");
        if (hype.tone === "bonus") CM.Audio.bonus();
        else if (hype.tone === "hype" || hype.tone === "win") CM.Audio.hype();
        card.classList.remove("is-flipping");
        resolve(hype);
      }, duration);
    });
  }

  async function openPack() {
    if (state !== "idle" && state !== "freeQueued") return;
    var myDemoToken = demoToken;
    var wasDemo = demoMode;
    function demoAborted() {
      return wasDemo && myDemoToken !== demoToken;
    }
    CM.Audio.unlock();

    var wasFree = freeQueued;
    freeQueued = false;
    if (!wasFree && playMode === "pack") {
      if (!packageQueue || packageIndex >= packageQueue.length) return;
      packageLeft = Math.max(0, packageQueue.length - packageIndex - 1);
    }
    round += 1;
    modeHint.textContent = wasFree
      ? wasDemo
        ? "DEMO · free play!"
        : "Free play!"
      : wasDemo
        ? "DEMO · opening…"
        : "Opening…";
    setDock(wasFree ? "Free play — no charge." : "Pack incoming…");
    updatePlayChrome();

    state = "opening";
    hideWinBanner();
    hideResultOverlay();
    lastOutcome = null;
    resultPhase = null;
    clearBoard();

    hexBoard.classList.remove("is-ready");
    hexBoard.classList.add("is-dim");
    packZone.classList.remove("is-away");
    packZone.classList.add("is-busy");
    resetPackClasses();
    packCue.textContent = wasFree ? "Free pack!" : "Watch the drop…";

    void packBtn.offsetWidth;
    packBtn.classList.add("is-dropping");
    CM.Audio.packDrop();
    await CM.Game.sleep(760);
    if (demoAborted()) return;

    packBtn.classList.remove("is-dropping");
    packBtn.classList.add("is-shake");
    CM.Audio.packShake();
    await CM.Game.sleep(520);
    if (demoAborted()) return;

    capturePackOrigin();
    packBtn.classList.remove("is-shake");
    packBtn.classList.add("is-cutting");
    CM.Audio.packCut();
    cutGlow();
    await CM.Game.sleep(160);
    if (demoAborted()) return;

    packBtn.classList.add("is-split");
    CM.Audio.packBurst();
    burstParticles(packOrigin);
    setDock("Packaging off…");
    await CM.Game.sleep(520);
    if (demoAborted()) return;

    packZone.classList.add("is-away");
    hexBoard.classList.remove("is-dim");
    hexBoard.classList.add("is-ready");
    showGhostSlots();
    centerHype.textContent = "Lining up…";
    centerCount.textContent = "";
    setDock("Placing cards face-down…");

    var outcome;
    if (wasFree) {
      outcome = CM.rollOutcome({ free: true, allowBonus: false });
    } else if (playMode === "pack" && packageQueue) {
      outcome = packageQueue[packageIndex];
      // Silent flag for ops — never shown in player copy
      outcome.guaranteed = packageIndex === packageGuaranteeIndex;
      packageIndex += 1;
      packageLeft = Math.max(0, packageQueue.length - packageIndex);
    } else {
      outcome = CM.rollOutcome({ allowBonus: true });
    }
    outcome.wasFree = wasFree;
    outcome.mode = playMode || "single";
    outcome.theme = currentTheme;
    outcome.pricePaid = priceForOpen(wasFree);
    outcome.packageId = currentPackageId;
    outcome.packageKind = currentPackageKind || playMode || "single";
    if (!wasFree) {
      currentPackageOpen += 1;
      outcome.packageOpen = currentPackageOpen;
    } else {
      outcome.packageOpen = null;
    }
    if (!wasDemo && (playMode === "pack" || playMode === "single")) {
      packageCollected.push({
        prizeId: outcome.prizeId,
        wasFree: wasFree,
        hasBonus: !!outcome.hasBonus,
        guaranteed: !!outcome.guaranteed,
      });
    }
    var faces = CM.Game.buildDeal(outcome);

    state = "dealing";
    await placeFacedown(faces);
    if (demoAborted()) return;
    await CM.Game.sleep(380);
    if (demoAborted()) return;

    centerHype.textContent = "Revealing…";
    setDock("Flipping one by one…");
    await revealFaces(faces, outcome);
    if (demoAborted()) return;

    // Keep pack fully hidden until result card(s) are dismissed
    packZone.classList.add("is-away");
    packZone.classList.remove("is-busy");

    lastOutcome = outcome;
    if (!wasDemo) {
      CM.Ops.recordOpen(outcome);
      CM.Ops.refreshChrome(currentTheme);
    }

    // Real prizes celebrate; stickers are near-misses (tallied at summary only)
    if (
      outcome.prizeId !== "bonus" &&
      outcome.prizeId !== "sticker" &&
      outcome.prizeId !== "miss"
    ) {
      setDock("Match celebration…");
      playWinBanner(CM.prizeById(outcome.prizeId), outcome);
      await playMatchCelebration(outcome);
      if (demoAborted()) return;
    }

    await showPrizeResult(outcome);
  }

  function matchIndexesFor(prizeId) {
    var idxs = [];
    slots.forEach(function (slot, i) {
      var card = slot.querySelector(".card");
      if (card && card.getAttribute("data-prize") === prizeId) {
        idxs.push(i);
      }
    });
    return idxs;
  }

  async function playMatchCelebration(outcome) {
    var prize = CM.prizeById(outcome.prizeId);
    var idxs = matchIndexesFor(outcome.prizeId);
    if (idxs.length < 3) return;

    var style = CM.Celebrate.pick();
    modeHint.textContent = "Match · " + style;
    await CM.Celebrate.run(style, {
      slots: slots,
      matchIndexes: idxs,
      prize: prize,
      hexCenter: hexCenter,
      hexBoard: hexBoard,
      fxLayer: fxLayer,
      sleep: CM.Game.sleep,
      onHype: function (hype, count) {
        centerHype.textContent = hype;
        centerCount.textContent = count || "";
        centerResult.classList.add("is-hidden");
      },
    });
    await CM.Game.sleep(200);
  }

  async function placeFacedown(faces) {
    var pending = faces.map(function (id, i) {
      return (async function () {
        await CM.Game.sleep(i * 70);
        CM.Audio.cardWhoosh();
        await flyFacedownToSlot(CM.prizeById(id), slots[i], i);
      })();
    });
    await Promise.all(pending);
  }

  async function revealFaces(faces, outcome) {
    var seen = [];
    for (var i = 0; i < faces.length; i++) {
      var prize = CM.prizeById(faces[i]);
      var flipMs = REVEAL_FLIP_MS[i] != null ? REVEAL_FLIP_MS[i] : 400;
      var hype = await revealCard(slots[i], prize, seen, flipMs);
      seen.push(faces[i]);
      var hadPair = slots.some(function (s) {
        return s.classList.contains("is-pair");
      });
      refreshPairAwards(faces, seen.length);
      var hasPair = slots.some(function (s) {
        return s.classList.contains("is-pair");
      });
      if (hasPair && !hadPair) CM.Audio.hype();

      var pause = REVEAL_PAUSE[i] != null ? REVEAL_PAUSE[i] : 200;
      // Extra beat only on the final card when tension peaks
      if (i >= 5 && hype && hype.tone === "hype") pause += 200;
      if (i >= 5 && hype && hype.tone === "win") pause += 280;
      if (i >= 5 && slots.some(function (s) { return s.classList.contains("is-pair"); })) {
        pause += 160;
      }
      await CM.Game.sleep(pause);
    }

    // Clear pair spotlight; promote full match highlight
    slots.forEach(function (slot) {
      slot.classList.remove("is-pair", "is-dimmed");
    });
    hexBoard.classList.remove("has-pair-watch");
    hexCenter.classList.remove("is-pair-watch");

    // Highlight matching prize cards (never for sticker / miss)
    if (outcome.prizeId !== "sticker" && outcome.prizeId !== "miss") {
      slots.forEach(function (slot) {
        var card = slot.querySelector(".card");
        if (card && card.getAttribute("data-prize") === outcome.prizeId) {
          slot.classList.add("is-match");
        }
      });
    }
  }

  async function showPrizeResult(outcome) {
    await CM.Game.sleep(280);
    var prize = CM.prizeById(outcome.prizeId);
    var isSticker =
      (prize && prize.id === "sticker") ||
      outcome.prizeId === "sticker" ||
      outcome.prizeId === "miss";
    var handTo = isSticker
      ? "Sticker tallied — hand out at the end"
      : CM.Ops.handToText(prize);
    var titleName = CM.Ops.displayName(prize);

    centerHype.textContent = "";
    centerCount.textContent = "";
    centerResult.classList.remove("is-hidden");
    hexCenter.classList.remove("is-bonus", "is-win");
    if (isSticker) {
      hexCenter.classList.add("is-miss");
      resultLabel.textContent = "No match";
      resultHand.textContent = handTo;
      CM.Audio.miss();
    } else {
      hexCenter.classList.add("is-win");
      resultLabel.textContent = prize ? prize.short : "PRIZE";
      resultHand.textContent = handTo;
      CM.Audio.win();
    }

    resultCard.className =
      "result-card " + (isSticker ? "prize-sticker" : prize ? prize.cssClass : "");
    resultCard.classList.remove("is-jackpot");
    if (
      !isSticker &&
      prize &&
      (prize.rarity === "jackpot" || prize.rarity === "legendary")
    ) {
      resultCard.classList.add("is-jackpot");
    }

    if (!isSticker && prize && prize.rarity === "jackpot") {
      resultEyebrow.textContent = "★ JACKPOT ★";
      resultTitle.textContent = titleName;
    } else if (isSticker) {
      resultEyebrow.textContent = "SO CLOSE";
      resultTitle.textContent = "No Match";
    } else {
      resultEyebrow.textContent = "YOU WON";
      resultTitle.textContent = titleName;
    }

    resultArt.innerHTML = CM.Game.artFor(isSticker ? "sticker" : prize.id);
    resultHandto.textContent = handTo;
    resultNext.textContent = outcome.hasBonus
      ? "Click / Space · free play next"
      : playMode === "pack" && packageLeft > 0
        ? "Click / Space · next pack"
        : "Click / Space to continue";

    resultOverlay.hidden = false;
    resultOverlay.classList.remove("is-hidden");
    setDock("What did they get?");
    modeHint.textContent = "Tap result to continue";
    resultPhase = "prize";
    state = "result";
  }

  function showBonusResult() {
    var bonus = CM.prizeById("bonus");
    hexCenter.classList.add("is-bonus");
    CM.Audio.bonus();

    resultCard.className = "result-card " + bonus.cssClass;
    resultCard.classList.remove("is-jackpot");
    resultEyebrow.textContent = "BONUS";
    resultTitle.textContent = "Free Play";
    resultArt.innerHTML = CM.Game.artFor("bonus");
    resultHandto.textContent = CM.Ops.handToText(bonus);
    resultNext.textContent = "Click / Space · then open free pack";

    resultCard.style.animation = "none";
    void resultCard.offsetWidth;
    resultCard.style.animation = "";

    resultOverlay.hidden = false;
    resultOverlay.classList.remove("is-hidden");
    setDock("Free play earned!");
    modeHint.textContent = "Tap to claim free play";
    freeQueued = true;
    resultPhase = "bonus";
    state = "result";
  }

  /** Dismiss result → bonus card if earned, else idle pack for next open. */
  function dismissResult() {
    if (state !== "result") return;

    if (resultPhase === "prize" && lastOutcome && lastOutcome.hasBonus) {
      hideResultOverlay();
      // Brief beat then bonus card
      setTimeout(function () {
        showBonusResult();
      }, 180);
      return;
    }

    hideResultOverlay();
    hideWinBanner();
    resultPhase = null;
    CM.Celebrate.clear(slots, hexBoard, fxLayer);
    slots.forEach(function (slot) {
      slot.classList.remove("is-cele-hot", "is-cele-dim", "is-cele-hide");
    });
    hexBoard.classList.remove("cele-active");

    hexBoard.classList.add("is-dim");
    hexBoard.classList.remove("is-ready");
    packZone.classList.remove("is-away", "is-busy");
    resetPackClasses();
    packBtn.classList.add("is-idle");

    afterResultContinue();
  }

  function onAdvance() {
    if (demoMode || demoRunning) {
      noteActivity();
      return;
    }
    if (state === "attract") {
      noteActivity();
      goAge();
      return;
    }
    if (state === "summary") {
      closePackageSummary();
      return;
    }
    if (state === "result") {
      dismissResult();
      return;
    }
    if (oddsOpen() || logOpen() || gateOpen() || summaryOpen()) return;
    if (state === "idle" || state === "freeQueued") {
      openPack();
    }
  }

  function oddsOpen() {
    var el = document.getElementById("odds-overlay");
    return el && !el.hidden;
  }

  function logOpen() {
    var el = document.getElementById("log-overlay");
    return el && !el.hidden;
  }

  function openOdds() {
    if (logOpen()) closeLog();
    if (opOpen()) closeOp();
    if (summaryOpen()) return;
    CM.Ops.renderOddsBoard();
    document.getElementById("odds-overlay").hidden = false;
  }

  function closeOdds() {
    CM.Ops.readStockFromInputs();
    document.getElementById("odds-overlay").hidden = true;
  }

  function toggleOdds() {
    if (oddsOpen()) closeOdds();
    else openOdds();
  }

  function openLog() {
    if (oddsOpen()) closeOdds();
    if (opOpen()) closeOp();
    if (summaryOpen()) return;
    CM.Ops.renderLog();
    document.getElementById("log-overlay").hidden = false;
  }

  function closeLog() {
    document.getElementById("log-overlay").hidden = true;
  }

  function toggleLog() {
    if (logOpen()) closeLog();
    else openLog();
  }

  function opOpen() {
    var el = document.getElementById("operator");
    return el && !el.hidden;
  }

  function openOp() {
    if (oddsOpen()) closeOdds();
    if (logOpen()) closeLog();
    if (summaryOpen()) return;
    CM.Ops.renderOperator();
    document.getElementById("operator").hidden = false;
  }

  function closeOp() {
    document.getElementById("operator").hidden = true;
  }

  function toggleOp() {
    if (opOpen()) closeOp();
    else openOp();
  }

  packBtn.addEventListener("click", function (e) {
    e.preventDefault();
    if (oddsOpen() || logOpen() || gateOpen()) return;
    if (state === "idle" || state === "freeQueued") openPack();
  });
  resultCard.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    dismissResult();
  });
  resultOverlay.addEventListener("click", function (e) {
    if (e.target === resultOverlay) dismissResult();
  });

  if (gate) {
    gate.addEventListener("click", function (e) {
      if (state !== "attract") return;
      if (e.target.closest("button, a, input, textarea, select, label")) return;
      goAge();
    });
  }
  document.getElementById("btn-age-yes").addEventListener("click", function () {
    acceptAge();
  });
  document.getElementById("btn-age-no").addEventListener("click", function () {
    denyAge();
  });
  document.getElementById("btn-tos-agree").addEventListener("click", function () {
    if (state === "tos") goTheme();
  });
  document.getElementById("btn-single").addEventListener("click", function () {
    if (state === "mode") startMode("single");
  });
  document.getElementById("btn-pack").addEventListener("click", function () {
    if (state === "mode") startMode("pack");
  });

  document.getElementById("btnCloseOdds").addEventListener("click", closeOdds);
  document.getElementById("btnCloseLog").addEventListener("click", closeLog);
  document.getElementById("btnCloseOp").addEventListener("click", closeOp);
  document.getElementById("btn-summary-done").addEventListener("click", function () {
    if (state === "summary") closePackageSummary();
  });
  document.getElementById("odds-overlay").addEventListener("click", function (e) {
    if (e.target.id === "odds-overlay") closeOdds();
  });
  document.getElementById("log-overlay").addEventListener("click", function (e) {
    if (e.target.id === "log-overlay") closeLog();
  });
  document.getElementById("summary-overlay").addEventListener("click", function (e) {
    if (e.target.id === "summary-overlay" && state === "summary") {
      closePackageSummary();
    }
  });

  document.getElementById("btnMute").addEventListener("click", function () {
    var on = CM.Audio.toggleMute();
    document.getElementById("btnMute").textContent = on
      ? "Unmute sounds"
      : "Mute sounds";
  });
  document.getElementById("btnResetSession").addEventListener("click", function () {
    CM.Ops.resetSession();
    CM.Ops.refreshChrome(currentTheme);
    CM.Ops.renderOperator();
  });
  document.getElementById("btnFullscreen").addEventListener("click", function () {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function () {});
    } else {
      document.exitFullscreen().catch(function () {});
    }
  });

  // Stock inputs are wired dynamically in CM.Ops.renderOddsBoard

  document.addEventListener("keydown", function (e) {
    var key = e.key;

    if (key === "7") {
      e.preventDefault();
      toggleDemoEnabled();
      noteActivity();
      return;
    }

    if (demoMode || demoRunning) {
      e.preventDefault();
      noteActivity();
      return;
    }

    noteActivity();

    if (key === "0") {
      e.preventDefault();
      toggleOdds();
      return;
    }
    if (key === "9") {
      e.preventDefault();
      toggleLog();
      return;
    }
    if (key === "o" || key === "O") {
      e.preventDefault();
      toggleOp();
      return;
    }
    if (key === "Escape") {
      e.preventDefault();
      if (oddsOpen()) closeOdds();
      else if (logOpen()) closeLog();
      else if (opOpen()) closeOp();
      else if (state === "summary") closePackageSummary();
      else if (state === "age") goAttract();
      else if (state === "tos") goAge();
      else if (state === "mode") goTos();
      else if (state === "idle" || state === "freeQueued") goAttract();
      return;
    }
    if (state === "age" && (key === "1" || key === "y" || key === "Y")) {
      e.preventDefault();
      acceptAge();
      return;
    }
    if (state === "age" && (key === "2" || key === "n" || key === "N")) {
      e.preventDefault();
      denyAge();
      return;
    }
    if (state === "tos" && key === "1") {
      e.preventDefault();
      goMode();
      return;
    }
    if (state === "mode" && (key === "1" || key === "2")) {
      e.preventDefault();
      startMode(key === "2" ? "pack" : "single");
      return;
    }
    if (key === " " || key === "Enter") {
      if (oddsOpen() || logOpen()) return;
      if (state === "age" || state === "tos" || state === "mode")
        return;
      e.preventDefault();
      onAdvance();
    }
  });

  var demoToggle = document.getElementById("demo-toggle");
  if (demoToggle) {
    demoToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleDemoEnabled();
      noteActivity();
    });
  }

  document.addEventListener(
    "pointerdown",
    function () {
      if (demoMode || demoRunning) noteActivity();
      else lastActivity = Date.now();
    },
    true
  );

  setInterval(checkDemoIdle, 1000);
  updateDemoToggleUI();

  hideResultOverlay();
  applyTheme(currentTheme);
  goAttract();
  CM.Ops.refreshChrome(currentTheme);
})();
