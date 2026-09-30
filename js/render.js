/*
 * render.js — Rendu de la notation musicale via VexFlow (SVG).
 * Dépend de window.Vex (vendor/vexflow.js). Expose window.PMT.render.
 */
(function (global) {
  "use strict";

  var PMT = global.PMT = global.PMT || {};

  // Thème de couleurs courant (mis à jour par app.js selon clair/sombre).
  var THEME = {
    fg: "#1b1b1f",
    muted: "#b6b6c0",
    correct: "#12a150",
    wrong: "#e5484d",
    current: "#4c6ef5"
  };

  function setTheme(t) {
    for (var k in t) if (t.hasOwnProperty(k)) THEME[k] = t[k];
  }

  function VF() {
    if (!global.Vex || !global.Vex.Flow) {
      throw new Error("VexFlow non chargé");
    }
    return global.Vex.Flow;
  }

  function makeRenderer(el, w, h) {
    el.innerHTML = "";
    var vf = VF();
    var renderer = new vf.Renderer(el, vf.Renderer.Backends.SVG);
    renderer.resize(w, h);
    var ctx = renderer.getContext();
    ctx.setFillStyle(THEME.fg);
    ctx.setStrokeStyle(THEME.fg);
    return { vf: vf, ctx: ctx };
  }

  function width(el, min, max) {
    var w = el.clientWidth || min;
    return Math.max(min, Math.min(w, max));
  }

  function colorFor(status) {
    if (status === "correct") return THEME.correct;
    if (status === "wrong") return THEME.wrong;
    if (status === "current") return THEME.current;
    if (status === "pending") return THEME.muted;
    return THEME.fg;
  }

  /*
   * Dessine une séquence de notes sur une portée.
   * o = { clef:"treble"|"bass", notes:[{key,acc}], statuses:[...] }
   */
  function renderSequence(el, o) {
    var w = width(el, 280, 900);
    var h = 160;
    var r = makeRenderer(el, w, h);
    var vf = r.vf, ctx = r.ctx;

    var clef = o.clef === "bass" ? "bass" : "treble";
    var stave = new vf.Stave(8, 24, w - 16);
    stave.addClef(clef);
    stave.setContext(ctx).draw();

    var notes = o.notes.map(function (nn, i) {
      var sn = new vf.StaveNote({ clef: clef, keys: [nn.key], duration: "q" });
      if (nn.acc === "#") sn.addModifier(new vf.Accidental("#"), 0);
      else if (nn.acc === "b") sn.addModifier(new vf.Accidental("b"), 0);
      var color = colorFor(o.statuses ? o.statuses[i] : "");
      sn.setStyle({ fillStyle: color, strokeStyle: color });
      return sn;
    });

    vf.Formatter.FormatAndDraw(ctx, stave, notes);
    return el.querySelector("svg");
  }

  /*
   * Dessine une grande portée (clé de sol + clé de fa) avec une armure.
   * o = { spec:"G" }  (code d'armure VexFlow)
   */
  function renderKeySignature(el, o) {
    var w = width(el, 260, 620);
    var h = 220;
    var r = makeRenderer(el, w, h);
    var vf = r.vf, ctx = r.ctx;

    var x = 34;
    var sw = w - x - 14;

    var top = new vf.Stave(x, 18, sw);
    top.addClef("treble").addKeySignature(o.spec);
    var bottom = new vf.Stave(x, 112, sw);
    bottom.addClef("bass").addKeySignature(o.spec);

    top.setContext(ctx).draw();
    bottom.setContext(ctx).draw();

    var T = vf.StaveConnector.type;
    [T.BRACE, T.SINGLE_LEFT, T.SINGLE_RIGHT].forEach(function (type) {
      new vf.StaveConnector(top, bottom).setType(type).setContext(ctx).draw();
    });
    return el.querySelector("svg");
  }

  PMT.render = {
    setTheme: setTheme,
    renderSequence: renderSequence,
    renderKeySignature: renderKeySignature
  };
})(window);
