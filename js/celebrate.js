/**
 * Win celebrations — random style, same purpose: spotlight the 3-match
 * before the result card. Styles: converge | orbit | connect | ascend
 */
window.CM = window.CM || {};

CM.Celebrate = (function () {
  var STYLES = ["converge", "orbit", "connect", "ascend"];

  function pick() {
    return STYLES[Math.floor(Math.random() * STYLES.length)];
  }

  function waitAnim(anim, ms) {
    if (anim && anim.finished && typeof anim.finished.then === "function") {
      return anim.finished.catch(function () {});
    }
    return new Promise(function (resolve) {
      setTimeout(resolve, ms || 700);
    });
  }

  function slotRect(slot) {
    return slot.getBoundingClientRect();
  }

  function centerPoint(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  }

  function cloneCardAt(slot, prize, fxLayer) {
    var r = slotRect(slot);
    var flyer = document.createElement("div");
    flyer.className = "cele-flyer";
    flyer.style.left = r.left + "px";
    flyer.style.top = r.top + "px";
    flyer.style.width = r.width + "px";
    flyer.style.height = r.height + "px";
    flyer.innerHTML = CM.Game.cardMarkup(prize, false);
    fxLayer.appendChild(flyer);
    return flyer;
  }

  function burstAt(fxLayer, x, y, hueBase) {
    for (var i = 0; i < 22; i++) {
      var p = document.createElement("span");
      p.className = "spark cele-spark";
      var angle = (Math.PI * 2 * i) / 22 + Math.random() * 0.2;
      var dist = 50 + Math.random() * 120;
      p.style.position = "fixed";
      p.style.left = x + "px";
      p.style.top = y + "px";
      p.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      p.style.setProperty("--dy", Math.sin(angle) * dist + "px");
      p.style.setProperty("--delay", Math.random() * 0.08 + "s");
      p.style.setProperty("--hue", hueBase + Math.random() * 40 + "");
      fxLayer.appendChild(p);
    }
  }

  function dimNonMatches(slots, matchIndexes) {
    slots.forEach(function (slot, i) {
      if (matchIndexes.indexOf(i) === -1) {
        slot.classList.add("is-cele-dim");
      } else {
        slot.classList.add("is-cele-hot");
      }
    });
  }

  function clearCeleClasses(slots, hexBoard, fxLayer) {
    slots.forEach(function (slot) {
      slot.classList.remove("is-cele-dim", "is-cele-hot", "is-cele-hide");
    });
    hexBoard.classList.remove(
      "cele-active",
      "cele-converge",
      "cele-orbit",
      "cele-connect",
      "cele-ascend"
    );
    if (fxLayer) {
      fxLayer
        .querySelectorAll(".cele-flyer, .cele-spark, .cele-shock, .cele-orbit-ring, .cele-lines")
        .forEach(function (n) {
          n.remove();
        });
    }
    document.querySelectorAll(".cele-orbit-ring, .cele-lines").forEach(function (n) {
      n.remove();
    });
  }

  async function converge(ctx) {
    var c = centerPoint(ctx.hexCenter);
    dimNonMatches(ctx.slots, ctx.matchIndexes);
    ctx.hexBoard.classList.add("cele-active", "cele-converge");
    ctx.hexCenter.classList.add("is-win");
    ctx.onHype("MATCH!", "3 / 3");
    CM.Audio.win();

    var flyers = ctx.matchIndexes.map(function (idx) {
      ctx.slots[idx].classList.add("is-cele-hide");
      return cloneCardAt(ctx.slots[idx], ctx.prize, ctx.fxLayer);
    });

    await Promise.all(
      flyers.map(function (flyer, i) {
        var r = flyer.getBoundingClientRect();
        var dx = c.x - (r.left + r.width / 2);
        var dy = c.y - (r.top + r.height / 2);
        var scale = Math.min(c.w / r.width, 0.85);
        var anim = flyer.animate(
            [
              { transform: "translate(0,0) rotate(0) scale(1)", offset: 0 },
              {
                transform:
                  "translate(" +
                  dx * 0.5 +
                  "px," +
                  (dy * 0.4 - 20) +
                  "px) rotate(" +
                  (i - 1) * 8 +
                  "deg) scale(1.08)",
                offset: 0.45,
              },
              {
                transform:
                  "translate(" + dx + "px," + dy + "px) rotate(0deg) scale(" + scale + ")",
                offset: 1,
              },
            ],
            {
              duration: 700 + i * 40,
              easing: "cubic-bezier(0.22, 0.82, 0.18, 1)",
              fill: "forwards",
            }
          );
          return waitAnim(anim, 780);
      })
    );

    burstAt(ctx.fxLayer, c.x, c.y, 150);
    CM.Audio.packBurst();
    await ctx.sleep(420);
    flyers.forEach(function (f) {
      f.remove();
    });
  }

  async function orbit(ctx) {
    dimNonMatches(ctx.slots, ctx.matchIndexes);
    ctx.hexBoard.classList.add("cele-active", "cele-orbit");
    ctx.hexCenter.classList.add("is-win");
    ctx.onHype("MATCH!", "Orbiting…");
    CM.Audio.win();

    var c = centerPoint(ctx.hexCenter);
    var ring = document.createElement("div");
    ring.className = "cele-orbit-ring";
    ring.style.left = c.x + "px";
    ring.style.top = c.y + "px";
    ctx.fxLayer.appendChild(ring);

    var radius = Math.min(120, window.innerWidth * 0.18);
    var flyers = ctx.matchIndexes.map(function (idx, i) {
      ctx.slots[idx].classList.add("is-cele-hide");
      var flyer = cloneCardAt(ctx.slots[idx], ctx.prize, ctx.fxLayer);
      var w = flyer.offsetWidth;
      var h = flyer.offsetHeight;
      flyer.style.left = c.x - w / 2 + "px";
      flyer.style.top = c.y - h / 2 + "px";
      flyer.style.transformOrigin = "center center";
      flyer.dataset.orbitI = String(i);
      return flyer;
    });

    var duration = 1400;
    await Promise.all(
      flyers.map(function (flyer, i) {
        var startAng = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
        var frames = [];
        for (var s = 0; s <= 12; s++) {
          var t = s / 12;
          var ang = startAng + t * Math.PI * 2;
          var x = Math.cos(ang) * radius;
          var y = Math.sin(ang) * radius;
          frames.push({
            transform:
              "translate(" + x + "px," + y + "px) rotate(" + (t * 360) + "deg) scale(0.92)",
            offset: t,
          });
        }
        // settle to center
        frames.push({
          transform: "translate(0px,0px) rotate(360deg) scale(0.8)",
          offset: 1,
        });
        return waitAnim(
          flyer.animate(frames, {
            duration: duration,
            easing: "cubic-bezier(0.35, 0.1, 0.2, 1)",
            fill: "forwards",
          }),
          duration + 40
        );
      })
    );

    burstAt(ctx.fxLayer, c.x, c.y, 160);
    CM.Audio.packBurst();
    await ctx.sleep(350);
    flyers.forEach(function (f) {
      f.remove();
    });
    ring.remove();
  }

  async function connect(ctx) {
    dimNonMatches(ctx.slots, ctx.matchIndexes);
    ctx.hexBoard.classList.add("cele-active", "cele-connect");
    ctx.hexCenter.classList.add("is-win");
    ctx.onHype("MATCH!", "Set complete");
    CM.Audio.win();

    var pts = ctx.matchIndexes.map(function (idx) {
      return centerPoint(ctx.slots[idx]);
    });

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "cele-lines");
    svg.style.position = "fixed";
    svg.style.left = "0";
    svg.style.top = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.style.zIndex = "18";
    ctx.fxLayer.appendChild(svg);

    function addLine(a, b, delay) {
      var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", a.x);
      line.setAttribute("y1", a.y);
      line.setAttribute("x2", b.x);
      line.setAttribute("y2", b.y);
      line.setAttribute("class", "cele-line");
      var len = Math.hypot(b.x - a.x, b.y - a.y);
      line.style.strokeDasharray = String(len);
      line.style.strokeDashoffset = String(len);
      line.style.animationDelay = delay + "s";
      svg.appendChild(line);
    }

    addLine(pts[0], pts[1], 0);
    addLine(pts[1], pts[2], 0.12);
    addLine(pts[2], pts[0], 0.24);

    await ctx.sleep(720);
    ctx.matchIndexes.forEach(function (idx) {
      ctx.slots[idx].classList.add("is-cele-hot");
    });
    var mid = {
      x: (pts[0].x + pts[1].x + pts[2].x) / 3,
      y: (pts[0].y + pts[1].y + pts[2].y) / 3,
    };
    burstAt(ctx.fxLayer, mid.x, mid.y, 145);
    CM.Audio.hype();
    await ctx.sleep(500);
    svg.remove();
  }

  async function ascend(ctx) {
    dimNonMatches(ctx.slots, ctx.matchIndexes);
    ctx.hexBoard.classList.add("cele-active", "cele-ascend");
    ctx.hexCenter.classList.add("is-win");
    ctx.onHype("MATCH!", "Rising…");
    CM.Audio.win();

    var c = centerPoint(ctx.hexCenter);
    var flyers = ctx.matchIndexes.map(function (idx) {
      ctx.slots[idx].classList.add("is-cele-hide");
      var flyer = cloneCardAt(ctx.slots[idx], ctx.prize, ctx.fxLayer);
      var r = flyer.getBoundingClientRect();
      burstAt(ctx.fxLayer, r.left + r.width / 2, r.top + r.height / 2, 40);
      return flyer;
    });

    await Promise.all(
      flyers.map(function (flyer, i) {
        return waitAnim(
          flyer.animate(
            [
              {
                transform: "translate(0,0) scale(1) rotate(0deg)",
                opacity: 1,
                offset: 0,
              },
              {
                transform:
                  "translate(" +
                  (i - 1) * 18 +
                  "px," +
                  -90 +
                  "px) scale(1.1) rotate(" +
                  (i - 1) * 12 +
                  "deg)",
                opacity: 1,
                offset: 0.45,
              },
              {
                transform: "translate(0px," + -180 + "px) scale(0.3) rotate(0deg)",
                opacity: 0,
                offset: 1,
              },
            ],
            {
              duration: 900 + i * 60,
              easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
              fill: "forwards",
            }
          ),
          1000
        );
      })
    );

    burstAt(ctx.fxLayer, c.x, c.y, 155);
    var shock = document.createElement("div");
    shock.className = "cele-shock";
    shock.style.left = c.x + "px";
    shock.style.top = c.y + "px";
    ctx.fxLayer.appendChild(shock);
    CM.Audio.packBurst();
    await ctx.sleep(480);
    flyers.forEach(function (f) {
      f.remove();
    });
    shock.remove();
  }

  async function run(style, ctx) {
    clearCeleClasses(ctx.slots, ctx.hexBoard, ctx.fxLayer);
    try {
      if (style === "converge") await converge(ctx);
      else if (style === "orbit") await orbit(ctx);
      else if (style === "connect") await connect(ctx);
      else if (style === "ascend") await ascend(ctx);
      else await converge(ctx);
    } finally {
      // leave match cards visible again for a beat under the result
      ctx.slots.forEach(function (slot) {
        slot.classList.remove("is-cele-hide", "is-cele-dim");
      });
      ctx.fxLayer.querySelectorAll(".cele-flyer, .cele-orbit-ring, .cele-lines, .cele-shock").forEach(
        function (n) {
          n.remove();
        }
      );
      ctx.hexBoard.classList.remove(
        "cele-converge",
        "cele-orbit",
        "cele-connect",
        "cele-ascend"
      );
    }
  }

  return {
    STYLES: STYLES,
    pick: pick,
    run: run,
    clear: clearCeleClasses,
  };
})();
