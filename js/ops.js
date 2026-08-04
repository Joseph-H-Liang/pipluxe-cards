/**
 * Phase-1 ops: day counter, drought, odds board (0), day log (9).
 * Does not change the pack play loop — only records & displays.
 */
window.CM = window.CM || {};

CM.Ops = (function () {
  var STORAGE_KEY = "pipluxe-day";

  function winIds() {
    return (CM.WIN_PRIZE_IDS || []).slice();
  }

  function droughtIds() {
    return winIds().concat(["bonus"]);
  }

  function displayOrder() {
    return (
      CM.PRIZE_DISPLAY_ORDER ||
      ["box", "ascended", "chaos", "tin", "bundle", "zacian", "funko", "triple", "pbpack", "abyss", "sticker", "bonus"]
    );
  }

  function todayKey() {
    var d = new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return (
      d.getFullYear() +
      "-" +
      (m < 10 ? "0" : "") +
      m +
      "-" +
      (day < 10 ? "0" : "") +
      day
    );
  }

  function emptyStock() {
    var o = {};
    winIds().forEach(function (id) {
      o[id] = "";
    });
    return o;
  }

  function emptyCounts() {
    var o = { sticker: 0, bonus: 0 };
    winIds().forEach(function (id) {
      o[id] = 0;
    });
    return o;
  }

  function emptySince() {
    var o = {};
    droughtIds().forEach(function (id) {
      o[id] = 0;
    });
    return o;
  }

  function blankDay() {
    return {
      date: todayKey(),
      opens: 0,
      paidOpens: 0,
      freeOpens: 0,
      revenue: 0,
      cogs: 0,
      wins: emptyCounts(),
      stock: emptyStock(),
      themes: typeof CM.emptyDayThemes === "function" ? CM.emptyDayThemes() : {},
      log: [],
    };
  }

  function ensureDayThemes(data) {
    if (!data.themes) data.themes = CM.emptyDayThemes ? CM.emptyDayThemes() : {};
    if (CM.THEMES) {
      CM.THEMES.forEach(function (t) {
        if (!data.themes[t.id]) {
          data.themes[t.id] = CM.emptyThemeStats
            ? CM.emptyThemeStats()
            : { opens: 0, prizes: {} };
        }
      });
    }
    return data;
  }

  function loadDay() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return blankDay();
      var data = JSON.parse(raw);
      if (!data || data.date !== todayKey()) return blankDay();
      if (!data.wins) data.wins = emptyCounts();
      if (data.wins.miss != null) {
        data.wins.sticker = (data.wins.sticker || 0) + (data.wins.miss || 0);
        delete data.wins.miss;
      }
      if (data.wins.sticker == null) data.wins.sticker = 0;
      winIds().forEach(function (id) {
        if (data.wins[id] == null) data.wins[id] = 0;
      });
      if (data.wins.bonus == null) data.wins.bonus = 0;
      if (!data.stock) data.stock = emptyStock();
      else {
        winIds().forEach(function (id) {
          if (data.stock[id] == null) data.stock[id] = "";
        });
      }
      if (!Array.isArray(data.log)) data.log = [];
      if (typeof data.opens !== "number") data.opens = 0;
      if (typeof data.paidOpens !== "number") data.paidOpens = 0;
      if (typeof data.freeOpens !== "number") data.freeOpens = 0;
      if (typeof data.revenue !== "number") data.revenue = 0;
      if (typeof data.cogs !== "number") data.cogs = 0;
      ensureDayThemes(data);
      return data;
    } catch (e) {
      return blankDay();
    }
  }

  function saveDay(day) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(day));
    } catch (e) {}
  }

  var day = loadDay();
  var since = emptySince();
  var session = {
    opens: 0,
    paidOpens: 0,
    freeOpens: 0,
    revenue: 0,
    cogs: 0,
    wins: emptyCounts(),
  };

  function prizeCogs(prizeId) {
    var p = CM.prizeById(prizeId);
    return p && p.cogs ? p.cogs : 0;
  }

  function sessionProfit() {
    return session.revenue - session.cogs;
  }

  function dayProfit() {
    return (day.revenue || 0) - (day.cogs || 0);
  }

  function formatChance(p) {
    if (p >= 0.01) return (p * 100).toFixed(2) + "%";
    if (p >= 0.001) return (p * 100).toFixed(3) + "%";
    return (p * 100).toFixed(4) + "%";
  }

  function formatTime(ms) {
    try {
      return new Date(ms).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (e) {
      return "";
    }
  }

  function stockLabel(prizeId) {
    var custom = day.stock && day.stock[prizeId];
    if (custom && String(custom).trim()) return String(custom).trim();
    var p = CM.prizeById(prizeId);
    return p ? p.name : prizeId;
  }

  function displayName(prize) {
    if (!prize) return "";
    if (prize.id !== "sticker" && prize.id !== "bonus" && prize.id !== "miss") {
      return stockLabel(prize.id);
    }
    return prize.name;
  }

  function handToText(prize) {
    if (!prize) {
      return "Sticker tallied — hand out at the end";
    }
    if (prize.id === "sticker" || prize.id === "miss") {
      return "Sticker tallied — hand out at the end";
    }
    if (prize.id === "bonus") {
      return "No product — FREE PLAY card → next pack is free";
    }
    if (winIds().indexOf(prize.id) >= 0) {
      return "Hand them: 1 " + stockLabel(prize.id);
    }
    return prize.handTo || "Hand them: " + prize.name;
  }

  /** Effective prize odds for the odds board. */
  function oddsTable(fullWeights) {
    var ids = ["sticker"].concat(winIds());
    if (fullWeights) {
      var totalW = 0;
      Object.keys(fullWeights).forEach(function (k) {
        totalW += fullWeights[k] || 0;
      });
      var stickerW =
        fullWeights.sticker != null
          ? fullWeights.sticker
          : fullWeights.miss || 0;
      var rows = ids.map(function (id) {
        var prize = CM.prizeById(id);
        var w = id === "sticker" ? stickerW : fullWeights[id] || 0;
        return {
          id: id,
          name: displayName(prize),
          chance: totalW ? w / totalW : 0,
        };
      });
      return {
        rows: rows,
        bonus: CM.BONUS_CHANCE || 0,
        // “Any sealed/product prize” excludes sticker consolation
        anyPrize: totalW ? 1 - stickerW / totalW : 0,
      };
    }

    var stickerP = CM.STICKER_CHANCE || CM.MISS_CHANCE || 0;
    var winP = 1 - stickerP;
    var weights = CM.WIN_WEIGHTS || {};
    var tw = 0;
    Object.keys(weights).forEach(function (k) {
      tw += weights[k] || 0;
    });
    var rows2 = [
      {
        id: "sticker",
        name: displayName(CM.prizeById("sticker")),
        chance: stickerP,
      },
    ];
    winIds().forEach(function (id) {
      var prize = CM.prizeById(id);
      var w = weights[id] || 0;
      rows2.push({
        id: id,
        name: displayName(prize),
        chance: tw ? (winP * w) / tw : 0,
      });
    });
    return {
      rows: rows2,
      bonus: CM.BONUS_CHANCE || 0,
      anyPrize: winP,
    };
  }

  function droughtHeat(n) {
    if (n >= 80) return "blazing";
    if (n >= 40) return "hot";
    if (n >= 20) return "warm";
    return "";
  }

  /**
   * Call when an open resolves (after outcome known).
   * @param {{prizeId:string,hasBonus:boolean,wasFree:boolean,pricePaid?:number,mode?:string}} outcome
   */
  function recordOpen(outcome) {
    var prizeId = outcome.prizeId || "sticker";
    if (prizeId === "miss") prizeId = "sticker";
    var hasBonus = !!outcome.hasBonus;
    var wasFree = !!outcome.wasFree;
    var defaultPrice = (CM.PRICES && CM.PRICES.singleOpen) || 5;
    var cogs = prizeCogs(prizeId);
    var revenue = wasFree
      ? 0
      : outcome.pricePaid != null
        ? Number(outcome.pricePaid) || 0
        : defaultPrice;

    day.opens += 1;
    session.opens += 1;
    if (wasFree) {
      day.freeOpens += 1;
      session.freeOpens += 1;
    } else {
      day.paidOpens += 1;
      session.paidOpens += 1;
    }

    day.revenue = (day.revenue || 0) + revenue;
    day.cogs = (day.cogs || 0) + cogs;
    session.revenue += revenue;
    session.cogs += cogs;

    if (day.wins[prizeId] != null) day.wins[prizeId] += 1;
    if (session.wins[prizeId] != null) session.wins[prizeId] += 1;
    if (hasBonus) {
      day.wins.bonus += 1;
      session.wins.bonus += 1;
    }

    droughtIds().forEach(function (id) {
      since[id] = (since[id] || 0) + 1;
    });
    if (prizeId !== "sticker" && since[prizeId] != null) since[prizeId] = 0;
    if (hasBonus) since.bonus = 0;

    // Theme performance board (cosmetic only — does not affect odds)
    ensureDayThemes(day);
    var themeId = outcome.theme || null;
    if (themeId) {
      if (!day.themes[themeId]) {
        day.themes[themeId] = CM.emptyThemeStats
          ? CM.emptyThemeStats()
          : { opens: 0, prizes: {} };
      }
      day.themes[themeId].opens = (day.themes[themeId].opens || 0) + 1;
      if (
        prizeId !== "sticker" &&
        prizeId !== "bonus" &&
        day.themes[themeId].prizes &&
        day.themes[themeId].prizes[prizeId] != null
      ) {
        day.themes[themeId].prizes[prizeId] += 1;
      }
    }

    day.log.push({
      t: Date.now(),
      prize: prizeId,
      bonus: hasBonus,
      free: wasFree,
      revenue: revenue,
      cogs: cogs,
      mode: outcome.mode || null,
      theme: themeId,
      packageId: outcome.packageId || null,
      packageKind: outcome.packageKind || outcome.mode || null,
      packageOpen: outcome.packageOpen != null ? outcome.packageOpen : null,
      guaranteed: !!outcome.guaranteed,
    });
    if (day.log.length > 400) day.log = day.log.slice(-400);

    saveDay(day);
  }

  function resetSession() {
    session = {
      opens: 0,
      paidOpens: 0,
      freeOpens: 0,
      revenue: 0,
      cogs: 0,
      wins: emptyCounts(),
    };
    since = emptySince();
  }

  function readStockFromInputs() {
    if (!day.stock) day.stock = emptyStock();
    winIds().forEach(function (k) {
      var input = document.getElementById("stock-" + k);
      if (input) day.stock[k] = input.value.trim();
    });
    saveDay(day);
  }

  function writeStockToInputs() {
    var stock = day.stock || emptyStock();
    winIds().forEach(function (k) {
      var input = document.getElementById("stock-" + k);
      if (input) input.value = stock[k] || "";
    });
  }

  function renderDayCounter() {
    var el = document.getElementById("dayOpens");
    if (el) el.textContent = String(day.opens);
    var paid = document.getElementById("dayPaid");
    if (paid) paid.textContent = String(day.paidOpens);
  }

  function renderDrought() {
    var grid = document.getElementById("droughtGrid");
    if (!grid) return;
    grid.innerHTML = droughtIds().map(function (id) {
      var prize = CM.prizeById(id);
      var n = since[id] || 0;
      var heat = droughtHeat(n);
      var due =
        heat === "hot" || heat === "blazing"
          ? '<span class="drought-due">DUE</span>'
          : "";
      return (
        '<div class="drought-chip ' +
        (prize ? prize.cssClass : "") +
        (heat ? " " + heat : "") +
        '" title="' +
        (prize ? prize.name : id) +
        ': ' +
        n +
        ' packs since last">' +
        due +
        '<span class="drought-name">' +
        (prize ? prize.short : id) +
        "</span>" +
        '<strong class="drought-count">' +
        n +
        "</strong>" +
        "</div>"
      );
    }).join("");
  }

  function themePrizeSummary(stats) {
    var parts = [];
    winIds().forEach(function (id) {
      var n = (stats && stats.prizes && stats.prizes[id]) || 0;
      if (n > 0) {
        var p = CM.prizeById(id);
        parts.push(n + "× " + (p ? p.short : id));
      }
    });
    return parts.length ? parts.join(" · ") : "no wins yet";
  }

  function renderThemeBoard(activeThemeId) {
    var board = document.getElementById("theme-board");
    if (!board || !CM.THEMES) return;
    ensureDayThemes(day);
    board.innerHTML = CM.THEMES.map(function (t) {
      var stats = day.themes[t.id] || CM.emptyThemeStats();
      var active = t.id === activeThemeId ? " active" : "";
      return (
        '<div class="theme-board-row theme-' +
        t.id +
        active +
        '">' +
        '<img class="tbr-sprite" src="' +
        t.gif +
        '" alt="' +
        t.name +
        '" />' +
        '<span class="tbr-name">' +
        t.short +
        "</span>" +
        '<span class="tbr-opens">' +
        (stats.opens || 0) +
        " opens</span>" +
        '<span class="tbr-prizes">' +
        themePrizeSummary(stats) +
        "</span>" +
        "</div>"
      );
    }).join("");
  }

  function refreshChrome(activeThemeId) {
    renderDayCounter();
    renderDrought();
    renderThemeBoard(activeThemeId);
    var panel = document.getElementById("operator");
    if (panel && !panel.hidden) renderOperator();
  }

  function fillOddsTbody(selector, table) {
    var tbody = document.querySelector(selector + " tbody");
    if (!tbody || !table) return;
    tbody.innerHTML = table.rows
      .map(function (row) {
        var cls = row.id === "sticker" ? "odds-sticker" : "odds-win";
        return (
          '<tr class="' +
          cls +
          '"><td>' +
          row.name +
          "</td><td>" +
          formatChance(row.chance) +
          "</td></tr>"
        );
      })
      .join("");
  }

  function renderOddsBoard() {
    var singleTable = oddsTable();
    var packTable = oddsTable(CM.PACKAGE_WEIGHTS);
    fillOddsTbody("#odds-table-single", singleTable);
    fillOddsTbody("#odds-table-pack", packTable);

    var noteSingle = document.getElementById("oddsNoteSingle");
    if (noteSingle) {
      var margin = CM.expectedMarginPaidOpen();
      noteSingle.textContent =
        "Sealed/single prize: " +
        formatChance(singleTable.anyPrize) +
        " · else sticker · Free play: " +
        formatChance(singleTable.bonus) +
        " · EV COGS ~" +
        CM.formatMoney(margin.evCogs) +
        " / $" + ((CM.PRICES && CM.PRICES.singleOpen) || 5);
    }
    var notePack = document.getElementById("oddsNotePack");
    if (notePack) {
      notePack.textContent =
        "Per open on pack table · Free play / paid open: " +
        formatChance(packTable.bonus) +
        " · free plays do not consume a slot";
    }

    writeStockToInputs();
    var stockMount = document.getElementById("stockFields");
    if (stockMount && !stockMount.dataset.built) {
      stockMount.dataset.built = "1";
      stockMount.innerHTML = winIds()
        .map(function (id) {
          var p = CM.prizeById(id);
          return (
            '<label class="stock-field">' +
            "<span>" +
            (p ? p.short : id) +
            "</span>" +
            '<input id="stock-' +
            id +
            '" type="text" placeholder="' +
            (p ? p.name : id) +
            '" autocomplete="off" />' +
            "</label>"
          );
        })
        .join("");
      winIds().forEach(function (id) {
        var input = document.getElementById("stock-" + id);
        if (!input) return;
        input.addEventListener("change", function () {
          readStockFromInputs();
          renderOddsBoard();
        });
        input.addEventListener("input", function () {
          readStockFromInputs();
        });
      });
      writeStockToInputs();
    }
    var prev = document.getElementById("stockPreview");
    if (prev) {
      prev.textContent = winIds()
        .slice(0, 4)
        .map(function (id) {
          var p = CM.prizeById(id);
          return (p ? p.short : id) + " → " + stockLabel(id);
        })
        .join(" · ");
    }
  }

  function emptyPrizeCounts() {
    return emptyCounts();
  }

  function countsFromEntries(entries) {
    var counts = emptyPrizeCounts();
    (entries || []).forEach(function (e) {
      var pid = e.prize === "miss" ? "sticker" : e.prize;
      if (counts[pid] != null) counts[pid] += 1;
      if (e.bonus) counts.bonus += 1;
    });
    return counts;
  }

  function formatTiers(counts, opts) {
    opts = opts || {};
    var parts = [];
    displayOrder().forEach(function (id) {
      var n = counts[id] || 0;
      if (!n) return;
      var label =
        id === "bonus"
          ? "Free play"
          : id === "sticker"
            ? "Sticker"
            : stockLabel(id);
      parts.push(n + "× " + label);
    });
    return parts.length ? parts.join(" · ") : "none";
  }

  function renderTierTable(el, counts, spinsLabel) {
    if (!el) return;
    var order = ["sticker"].concat(winIds()).concat(["bonus"]);
    el.innerHTML =
      "<caption>" +
      spinsLabel +
      "</caption><thead><tr><th>Prize</th><th>Qty</th></tr></thead><tbody>" +
      order
        .map(function (id) {
          var prize = CM.prizeById(id);
          var label =
            id === "bonus"
              ? "Free play"
              : id === "sticker"
                ? "Sticker"
                : stockLabel(id);
          return (
            "<tr><td>" +
            label +
            "</td><td>" +
            (counts[id] || 0) +
            "</td></tr>"
          );
        })
        .join("") +
      "</tbody>";
  }

  function buildDayLogGroups() {
    var log = day.log || [];
    var singles = [];
    var packs = {};
    var packOrder = [];
    log.forEach(function (e, i) {
      var kind = e.packageKind || e.mode || "single";
      var isPack = kind === "pack";
      var packId = e.packageId;
      if (isPack && packId) {
        if (!packs[packId]) {
          packs[packId] = [];
          packOrder.push(packId);
        }
        packs[packId].push(e);
      } else if (isPack && !packId) {
        // Legacy pack open without id — keep as lone pack bucket
        var legacyId = "legacy-pack-" + (e.t || i);
        packs[legacyId] = [e];
        packOrder.push(legacyId);
      } else {
        singles.push(e);
      }
    });
    return { singles: singles, packs: packs, packOrder: packOrder };
  }

  function renderLog() {
    var groups = buildDayLogGroups();
    var singleCounts = countsFromEntries(groups.singles);
    var packEntries = [];
    groups.packOrder.forEach(function (id) {
      packEntries = packEntries.concat(groups.packs[id]);
    });
    var packCounts = countsFromEntries(packEntries);

    renderTierTable(
      document.getElementById("log-table-single"),
      singleCounts,
      groups.singles.length +
        " single open" +
        (groups.singles.length === 1 ? "" : "s")
    );
    renderTierTable(
      document.getElementById("log-table-pack"),
      packCounts,
      groups.packOrder.length +
        "× 5-pack · " +
        packEntries.length +
        " open" +
        (packEntries.length === 1 ? "" : "s") +
        " (incl. free)"
    );

    var feed = document.getElementById("logFeed");
    if (!feed) return;

    var rows = [];
    groups.singles.forEach(function (e) {
      rows.push({ t: e.t, kind: "single", entry: e });
    });
    groups.packOrder.forEach(function (id) {
      var opens = groups.packs[id];
      var last = opens[opens.length - 1];
      rows.push({
        t: last.t,
        kind: "pack",
        opens: opens,
        packId: id,
      });
    });
    rows.sort(function (a, b) {
      return (b.t || 0) - (a.t || 0);
    });

    if (!rows.length) {
      feed.innerHTML = '<p class="log-empty">No opens yet today.</p>';
      return;
    }

    var packSize = (CM.PRICES && CM.PRICES.packageOpens) || 5;
    feed.innerHTML = rows
      .map(function (row) {
        if (row.kind === "single") {
          var e = row.entry;
          var theme = e.theme ? String(e.theme).toUpperCase() : "";
          var prize = CM.prizeById(e.prize);
          return (
            '<article class="log-row log-single">' +
            "<time>" +
            formatTime(e.t) +
            "</time>" +
            '<span class="log-mode">' +
            (e.free ? "FREE" : "SINGLE") +
            "</span>" +
            '<span class="log-detail">' +
            (theme ? theme + " · " : "") +
            (prize ? displayName(prize) : e.prize) +
            (e.bonus ? " + FREE PLAY" : "") +
            (e.free ? " (bonus open)" : "") +
            "</span>" +
            "</article>"
          );
        }

        var opens = row.opens.slice().sort(function (a, b) {
          return (a.t || 0) - (b.t || 0);
        });
        var paidCount = opens.filter(function (s) {
          return !s.free;
        }).length;
        var done = paidCount >= packSize;
        var counts = countsFromEntries(opens);
        var theme0 = opens[0] && opens[0].theme
          ? String(opens[0].theme).toUpperCase()
          : "";
        var detail = formatTiers(counts, { includeMiss: true });
        var openLines = opens
          .map(function (s, idx) {
            var p = CM.prizeById(s.prize);
            var num =
              s.packageOpen != null
                ? s.packageOpen
                : s.free
                  ? "F"
                  : idx + 1;
            return (
              '<div class="log-spin-line">' +
              formatTime(s.t) +
              " · #" +
              num +
              (s.free ? " FREE" : "") +
              " · " +
              (p ? displayName(p) : s.prize) +
              (s.bonus ? " + FREE PLAY" : "") +
              "</div>"
            );
          })
          .join("");

        return (
          '<article class="log-row log-pack' +
          (done ? "" : " in-progress") +
          '">' +
          "<time>" +
          formatTime(row.t) +
          "</time>" +
          '<span class="log-mode">5-PACK' +
          (done ? "" : " · " + paidCount + "/" + packSize) +
          "</span>" +
          '<span class="log-detail">' +
          (theme0 ? theme0 + " · " : "") +
          detail +
          "</span>" +
          '<div class="log-pack-spins">' +
          openLines +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderOperator() {
    var set = function (id, text) {
      var el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    set("opSessionOpens", String(session.opens));
    set("opSessionPaid", String(session.paidOpens));
    set("opDayOpens", String(day.opens));
    set("opRevenue", CM.formatMoney(session.revenue));
    set("opCogs", CM.formatMoney(session.cogs));
    set("opProfit", CM.formatMoney(sessionProfit()));
    set("opDayRevenue", CM.formatMoney(day.revenue || 0));
    set("opDayCogs", CM.formatMoney(day.cogs || 0));
    set("opDayProfit", CM.formatMoney(dayProfit()));

    var margin = CM.expectedMarginPaidOpen();
    set(
      "opEvLine",
      "Model EV / paid open: " +
        CM.formatMoney(margin.evCogs) +
        " COGS on " +
        CM.formatMoney(margin.price) +
        " (" +
        (margin.margin * 100).toFixed(1) +
        "% margin)"
    );

    var winsEl = document.getElementById("opWins");
    if (winsEl) {
      var order = displayOrder();
      winsEl.innerHTML = order
        .map(function (id) {
          var prize = CM.prizeById(id);
          var n = session.wins[id] || 0;
          return (
            "<div><span>" +
            (prize ? prize.short : id) +
            "</span><strong>" +
            n +
            "</strong></div>"
          );
        })
        .join("");
    }

    var droughtEl = document.getElementById("opDrought");
    if (droughtEl) {
      droughtEl.innerHTML =
        "<p><strong>Opens since last</strong></p>" +
        droughtIds().map(function (id) {
          var prize = CM.prizeById(id);
          return (
            "<div>" +
            (prize ? prize.name : id) +
            ": <strong>" +
            (since[id] || 0) +
            "</strong></div>"
          );
        }).join("");
    }
  }

  return {
    get DROUGHT_IDS() {
      return droughtIds();
    },
    getDay: function () {
      return day;
    },
    getSince: function () {
      return since;
    },
    getSession: function () {
      return session;
    },
    stockLabel: stockLabel,
    displayName: displayName,
    handToText: handToText,
    formatChance: formatChance,
    oddsTable: oddsTable,
    recordOpen: recordOpen,
    resetSession: resetSession,
    sessionProfit: sessionProfit,
    dayProfit: dayProfit,
    readStockFromInputs: readStockFromInputs,
    writeStockToInputs: writeStockToInputs,
    renderOddsBoard: renderOddsBoard,
    renderLog: renderLog,
    renderOperator: renderOperator,
    renderThemeBoard: renderThemeBoard,
    refreshChrome: refreshChrome,
  };
})();
