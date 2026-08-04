/**
 * Audio — prefers local clip files when present, else Web Audio stingers.
 *
 * Pack cut / card flips: see CM.SFX in config.js
 */
window.CM = window.CM || {};

CM.Audio = (function () {
  var ctx = null;
  var htmlPlayers = {};
  var lastFlipSrc = null;
  var muted = false;
  var cryPlayer = null;

  function ac() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, gainVal, when) {
    if (muted) return;
    var c = ac();
    if (!c) return;
    var t0 = c.currentTime + (when || 0);
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gainVal || 0.08, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  /** Noise burst with falling filter — procedural slash fallback. */
  function slashFallback() {
    if (muted) return;
    var c = ac();
    if (!c) return;
    var t0 = c.currentTime;
    var len = 0.26;
    var sampleRate = c.sampleRate;
    var n = Math.floor(sampleRate * len);
    var buffer = c.createBuffer(1, n, sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < n; i++) {
      var env = Math.pow(1 - i / n, 2.2);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    var src = c.createBufferSource();
    src.buffer = buffer;
    var filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.setValueAtTime(0.7, t0);
    filter.frequency.setValueAtTime(2800, t0);
    filter.frequency.exponentialRampToValueAtTime(420, t0 + 0.2);
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    src.connect(filter);
    filter.connect(g);
    g.connect(c.destination);
    src.start(t0);
    src.stop(t0 + len + 0.02);
    tone(900, 0.06, "triangle", 0.02, 0);
  }

  function flipFallback() {
    if (muted) return;
    tone(380, 0.08, "triangle", 0.04);
    tone(520, 0.1, "sine", 0.045, 0.05);
    tone(260, 0.06, "square", 0.02, 0.12);
  }

  function sfxConf(key) {
    return (CM.SFX && CM.SFX[key]) || null;
  }

  function playClip(key, fallbackFn) {
    if (muted) return;
    var conf = sfxConf(key);
    if (!conf || !conf.src) {
      if (fallbackFn) fallbackFn();
      return;
    }

    var player = htmlPlayers[key];
    if (!player) {
      player = new Audio(conf.src);
      player.preload = "auto";
      htmlPlayers[key] = player;
      player.addEventListener("error", function () {
        player._failed = true;
      });
    }

    if (player._failed) {
      if (fallbackFn) fallbackFn();
      return;
    }

    try {
      ac();
      var start = conf.start || 0;
      var dur = conf.duration || 0;
      player.pause();
      player.volume = conf.volume != null ? conf.volume : 0.75;
      player.currentTime = start;
      var p = player.play();
      if (p && p.catch) {
        p.catch(function () {
          if (fallbackFn) fallbackFn();
        });
      }
      if (dur > 0) {
        clearTimeout(player._stopTimer);
        player._stopTimer = setTimeout(function () {
          try {
            player.pause();
          } catch (e) {}
        }, dur * 1000);
      }
    } catch (e) {
      if (fallbackFn) fallbackFn();
    }
  }

  /** Pick a random src from conf.srcs; allow overlapping plays for fast flips. */
  function playRandomPool(key, fallbackFn) {
    if (muted) return;
    var conf = sfxConf(key);
    var srcs = conf && conf.srcs ? conf.srcs.slice() : [];
    if (!srcs.length) {
      if (fallbackFn) fallbackFn();
      return;
    }

    // Avoid immediate repeat when possible
    if (srcs.length > 1 && lastFlipSrc) {
      srcs = srcs.filter(function (s) {
        return s !== lastFlipSrc;
      });
      if (!srcs.length) srcs = conf.srcs.slice();
    }
    var src = srcs[Math.floor(Math.random() * srcs.length)];
    lastFlipSrc = src;

    try {
      ac();
      var a = new Audio(src);
      a.volume = conf.volume != null ? conf.volume : 1;
      var p = a.play();
      if (p && p.catch) {
        p.catch(function () {
          if (fallbackFn) fallbackFn();
        });
      }
    } catch (e) {
      if (fallbackFn) fallbackFn();
    }
  }

  function preload() {
    var cut = sfxConf("packCut");
    if (cut && cut.src && !htmlPlayers.packCut) {
      var a = new Audio(cut.src);
      a.preload = "auto";
      htmlPlayers.packCut = a;
      a.addEventListener("error", function () {
        a._failed = true;
      });
    }

    var flip = sfxConf("cardFlip");
    if (flip && flip.srcs) {
      flip.srcs.forEach(function (src, i) {
        var key = "cardFlipPre" + i;
        if (htmlPlayers[key]) return;
        var p = new Audio(src);
        p.preload = "auto";
        htmlPlayers[key] = p;
      });
    }
  }

  return {
    unlock: function () {
      ac();
      preload();
    },
    preload: preload,
    isMuted: function () {
      return muted;
    },
    setMuted: function (on) {
      muted = !!on;
    },
    toggleMute: function () {
      muted = !muted;
      return muted;
    },
    packShake: function () {
      tone(90, 0.08, "triangle", 0.05);
      tone(70, 0.1, "sawtooth", 0.03, 0.05);
    },
    packDrop: function () {
      tone(140, 0.18, "sine", 0.04);
      tone(90, 0.22, "triangle", 0.055, 0.12);
      tone(60, 0.12, "square", 0.03, 0.55);
    },
    packCut: function () {
      playClip("packCut", slashFallback);
    },
    packBurst: function () {
      tone(180, 0.15, "square", 0.06);
      tone(320, 0.2, "sine", 0.07, 0.04);
      tone(520, 0.25, "triangle", 0.05, 0.08);
    },
    cardWhoosh: function () {
      tone(280, 0.1, "sine", 0.03);
      tone(420, 0.12, "triangle", 0.035, 0.03);
    },
    cardFlip: function () {
      playRandomPool("cardFlip", flipFallback);
    },
    cardLand: function (n) {
      var f = 220 + n * 55;
      tone(f, 0.12, "triangle", 0.055);
    },
    hype: function () {
      tone(440, 0.1, "sine", 0.05);
      tone(660, 0.14, "sine", 0.045, 0.06);
    },
    win: function () {
      [523, 659, 784, 1046].forEach(function (f, i) {
        tone(f, 0.22, "triangle", 0.07, i * 0.07);
      });
    },
    miss: function () {
      tone(220, 0.18, "sine", 0.05);
      tone(165, 0.28, "triangle", 0.04, 0.1);
    },
    bonus: function () {
      [392, 523, 659, 784, 988].forEach(function (f, i) {
        tone(f, 0.16, "square", 0.045, i * 0.05);
      });
    },
    /** Soft UI confirm blip (TOS / theme / mode buttons). */
    click: function () {
      tone(600, 0.035, "square", 0.04);
    },
    themeCry: function (src) {
      if (muted || !src) return;
      try {
        if (cryPlayer) {
          cryPlayer.pause();
          cryPlayer = null;
        }
        ac();
        var a = new Audio(src);
        a.volume = 0.9;
        cryPlayer = a;
        var p = a.play();
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    },
    callStarter: function (theme) {
      if (!theme || !theme.cry) return;
      this.themeCry(theme.cry);
    },
    stopCall: function () {
      try {
        if (cryPlayer) {
          cryPlayer.pause();
          cryPlayer.currentTime = 0;
          cryPlayer = null;
        }
      } catch (e) {}
    },
  };
})();
