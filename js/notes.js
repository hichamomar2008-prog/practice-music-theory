/*
 * notes.js — Exercice « Lecture de notes ».
 * On affiche une portée (clé de sol ou de fa) avec une série de notes ; l'élève
 * nomme chaque note (Do, Ré, ...). Vert si juste, rouge sinon, jusqu'à réussite.
 * Expose window.PMT.exercises.notes.create(ctx).
 */
(function (global) {
  "use strict";
  var PMT = global.PMT = global.PMT || {};
  PMT.exercises = PMT.exercises || {};

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function chooseClef(setting) {
    if (setting === "treble") return "treble";
    if (setting === "bass") return "bass";
    return Math.random() < 0.5 ? "treble" : "bass"; // "both"
  }

  // Palier (1..4) -> difficulté de portée.
  function difficulty(palier, settings) {
    var tier = 1, accidentals = false;
    if (palier === 2) { tier = 2; }
    else if (palier === 3) { tier = 3; }
    else if (palier >= 4) { tier = 3; accidentals = true; }
    if (settings.acc === "off") accidentals = false;
    if (settings.acc === "on") accidentals = true;
    return { tier: tier, accidentals: accidentals };
  }

  function create(ctx) {
    var theory = PMT.theory, render = PMT.render;
    var state = null;
    var selAcc = "";      // altération sélectionnée pour la prochaine réponse
    var accButtons = [];
    var letterButtons = {};

    function draw() {
      render.renderSequence(ctx.stageEl, {
        clef: state.clef,
        notes: state.notes,
        statuses: state.statuses
      });
    }

    function updatePrompt() {
      var pos = state.idx + 1;
      ctx.promptEl.textContent = "Nomme la note surlignée (" + pos + "/" + state.notes.length + ")";
    }

    function setSelAcc(acc) {
      selAcc = acc;
      accButtons.forEach(function (b) {
        b.classList.toggle("active", b.dataset.acc === acc);
      });
    }

    function buildAnswers(accidentals) {
      ctx.answersEl.innerHTML = "";
      accButtons = [];
      letterButtons = {};

      if (accidentals) {
        var accRow = el("div", "acc-row");
        [["b", theory.FLAT], ["", theory.NAT], ["#", theory.SHARP]].forEach(function (pair) {
          var b = el("button", "btn acc-btn", pair[1]);
          b.dataset.acc = pair[0];
          b.setAttribute("aria-label", pair[0] === "#" ? "dièse" : pair[0] === "b" ? "bémol" : "bécarre");
          b.addEventListener("click", function () { setSelAcc(pair[0]); });
          accRow.appendChild(b);
          accButtons.push(b);
        });
        ctx.answersEl.appendChild(accRow);
      }

      var row = el("div", "note-row");
      theory.LETTER_ORDER.forEach(function (L) {
        var b = el("button", "btn note-btn", theory.frNote(L, ""));
        b.dataset.letter = L;
        b.addEventListener("click", function () { answer(L); });
        row.appendChild(b);
        letterButtons[L] = b;
      });
      ctx.answersEl.appendChild(row);
      setSelAcc("");
    }

    function flash(btn, cls) {
      if (!btn) return;
      btn.classList.add(cls);
      setTimeout(function () { btn.classList.remove(cls); }, 380);
    }

    function answer(letter) {
      if (!state || state.locked || state.done) return;
      var note = state.notes[state.idx];
      var ok = (letter === note.letter) && (selAcc === note.acc);
      var btn = letterButtons[letter];

      if (ok) {
        ctx.sound("ok");
        flash(btn, "flash-ok");
        state.statuses[state.idx] = "correct";
        state.idx++;
        ctx.setProgress(state.idx, state.notes.length);
        if (state.idx >= state.notes.length) {
          state.done = true;
          draw();
          ctx.roundDone({ errors: state.errors, total: state.notes.length });
          return;
        }
        state.statuses[state.idx] = "current";
        setSelAcc("");
        draw();
        updatePrompt();
      } else {
        ctx.sound("no");
        ctx.vibrate();
        flash(btn, "flash-no");
        state.errors++;
        state.locked = true;
        state.statuses[state.idx] = "wrong";
        draw();
        setTimeout(function () {
          if (!state || state.done) return;
          state.statuses[state.idx] = "current";
          state.locked = false;
          draw();
        }, 420);
      }
    }

    function start(palier) {
      var d = difficulty(palier, ctx.settings);
      var clef = chooseClef(ctx.settings.clef);
      var n = ctx.settings.noteCount || 6;
      var notes = theory.randomSequence(n, { clef: clef, tier: d.tier, accidentals: d.accidentals });
      state = {
        clef: clef, notes: notes,
        statuses: notes.map(function () { return "pending"; }),
        idx: 0, errors: 0, locked: false, done: false
      };
      state.statuses[0] = "current";
      buildAnswers(d.accidentals);
      draw();
      ctx.setProgress(0, n);
      updatePrompt();
    }

    function redraw() { if (state) draw(); }

    return { start: start, redraw: redraw };
  }

  PMT.exercises.notes = { create: create, label: "Lecture de notes" };
})(window);
