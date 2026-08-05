/** Pipluxe Cards — single Piplup theme (cosmetics only). Odds never change. */
window.CM = window.CM || {};

CM.THEMES = [
  {
    id: "piplup",
    name: "Piplup",
    short: "PIPLUXE",
    blurb: "Sinnoh water starter",
    img: "assets/themes/piplup.png",
    gif: "assets/themes/piplup.gif",
    cry: "assets/cries/piplup.mp3",
    accent: "#a78bfa",
    accent2: "#7c3aed",
    glow: "rgba(167, 139, 250, 0.4)",
    line: [
      { name: "Prinplup", gif: "assets/evo/prinplup.gif" },
      { name: "Empoleon", gif: "assets/evo/empoleon.gif" },
    ],
  },
];

CM.THEME_IDS = CM.THEMES.map(function (t) {
  return t.id;
});

CM.themeById = function (id) {
  return CM.THEMES.find(function (t) {
    return t.id === id;
  });
};

CM.emptyThemeStats = function () {
  var prizes = {};
  (CM.WIN_PRIZE_IDS || []).forEach(function (id) {
    prizes[id] = 0;
  });
  return {
    opens: 0,
    prizes: prizes,
  };
};

CM.emptyDayThemes = function () {
  var out = {};
  (CM.THEMES || []).forEach(function (t) {
    out[t.id] = CM.emptyThemeStats();
  });
  return out;
};
