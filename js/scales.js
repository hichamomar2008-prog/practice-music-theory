/*
 * scales.js — Exercice « Reconnaître la gamme ».
 * On affiche une armure sur une grande portée (clés de sol + fa) ; l'élève
 * choisit la bonne tonalité (majeure ou mineure selon le palier). QCM à 4 choix.
 * Expose window.PMT.exercises.scales.create(ctx).
 */
(function (global) {
  "use strict";
  var PMT = global.PMT = global.PMT || {};
  PMT.exercises = PMT.exercises || {};

  var SET_SIZE = 5; // nombre de questions par manche

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function create(ctx) {
    var theory = PMT.theory, render = PMT.render;
    var state = null;

    function draw() {
      render.renderKeySignature(ctx.stageEl, { spec: state.q.spec });
    }

    function loadQuestion() {
      state.q = theory.randomScaleQuestion(state.palier);
      draw();
      ctx.promptEl.textContent = state.q.prompt + "  (" + (state.done + 1) + "/" + SET_SIZE + ")";
      buildAnswers();
    }

    function flash(btn, cls) {
      if (!btn) return;
      btn.classList.add(cls);
      setTimeout(function () { btn.classList.remove(cls); }, 380);
    }

    function buildAnswers() {
      ctx.answersEl.innerHTML = "";
      var grid = el("div", "choice-grid");
      state.q.options.forEach(function (opt) {
        var b = el("button", "btn choice-btn", opt);
        b.addEventListener("click", function () { answer(opt, b); });
        grid.appendChild(b);
      });
      ctx.answersEl.appendChild(grid);
    }

    function answer(opt, btn) {
      if (!state || state.locked) return;
      if (opt === state.q.answer) {
        ctx.sound("ok");
        flash(btn, "flash-ok");
        btn.classList.add("correct");
        state.done++;
        ctx.setProgress(state.done, SET_SIZE);
        state.locked = true;
        setTimeout(function () {
          if (!state) return;
          state.locked = false;
          if (state.done >= SET_SIZE) {
            ctx.roundDone({ errors: state.errors, total: SET_SIZE });
          } else {
            loadQuestion();
          }
        }, 360);
      } else {
        ctx.sound("no");
        ctx.vibrate();
        flash(btn, "flash-no");
        btn.classList.add("wrong");
        state.errors++;
      }
    }

    function start(palier) {
      state = { palier: palier, done: 0, errors: 0, locked: false, q: null };
      ctx.setProgress(0, SET_SIZE);
      loadQuestion();
    }

    function redraw() { if (state && state.q) draw(); }

    return { start: start, redraw: redraw };
  }

  PMT.exercises.scales = { create: create, label: "Reconnaître la gamme" };
})(window);
