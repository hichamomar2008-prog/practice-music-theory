/*
 * app.js — Coquille de l'application : navigation, chrono, score, progression,
 * réglages, sons, stockage local. Dépend de PMT.theory / render / exercises.
 */
(function (global) {
  "use strict";
  var PMT = global.PMT = global.PMT || {};

  // --- Stockage local (tolérant aux erreurs) --------------------------------
  var LS = {
    get: function (k, fallback) {
      try {
        var v = localStorage.getItem(k);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    }
  };

  var DEFAULTS = { level: "auto", clef: "both", noteCount: 6, sound: true, vibrate: true };
  var settings = Object.assign({}, DEFAULTS, LS.get("pmt.settings", {}));
  var stats = Object.assign(
    { palier: { notes: 1, scales: 1 }, best: {}, streak: { notes: 0, scales: 0 } },
    LS.get("pmt.stats", {})
  );
  if (!stats.palier) stats.palier = { notes: 1, scales: 1 };
  if (!stats.best) stats.best = {};
  if (!stats.streak) stats.streak = { notes: 0, scales: 0 };

  function saveSettings() { LS.set("pmt.settings", settings); }
  function saveStats() { LS.set("pmt.stats", stats); }

  var DESCR = {
    notes: "Nomme les notes sur la portée",
    scales: "Trouve la tonalité d'après l'armure"
  };

  // --- Raccourcis DOM -------------------------------------------------------
  function $(id) { return document.getElementById(id); }
  var els = {};
  ["backBtn", "settingsBtn", "screenTitle", "home", "exercise", "settings",
   "stage", "prompt", "answers", "timer", "progressFill", "progressText", "levelBadge",
   "overlay", "resultTitle", "resultTime", "resultErrors", "resultNote", "againBtn", "homeBtn",
   "sub-notes", "sub-scales", "loaderror",
   "set-level", "set-clef", "set-count", "set-sound", "set-vibrate", "resetStats"
  ].forEach(function (id) { els[id] = $(id); });

  // --- Thème ----------------------------------------------------------------
  function applyTheme() {
    var dark = global.matchMedia && global.matchMedia("(prefers-color-scheme: dark)").matches;
    PMT.render.setTheme(dark
      ? { fg: "#ececf2", muted: "#4a4a55", correct: "#4ade80", wrong: "#ff7477", current: "#8aa0ff" }
      : { fg: "#1b1b1f", muted: "#c2c2cc", correct: "#17a34a", wrong: "#e23b3b", current: "#3b5bdb" });
  }

  // --- Sons (WebAudio) ------------------------------------------------------
  var audioCtx = null;
  function ensureAudio() {
    if (audioCtx) return;
    try { audioCtx = new (global.AudioContext || global.webkitAudioContext)(); } catch (e) { audioCtx = null; }
  }
  function tone(freq, dur, type, delay) {
    if (!audioCtx) return;
    var t0 = audioCtx.currentTime + (delay || 0);
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }
  function sound(kind) {
    if (!settings.sound) return;
    ensureAudio();
    if (!audioCtx) return;
    if (kind === "ok") tone(880, 0.10);
    else if (kind === "no") tone(160, 0.18, "square");
    else if (kind === "win") { tone(660, 0.11); tone(880, 0.11, "sine", 0.10); tone(1180, 0.16, "sine", 0.20); }
  }

  // --- Chrono ---------------------------------------------------------------
  var timer = { raf: 0, start: 0, running: false, target: 1 };
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function fmt(ms) {
    var m = Math.floor(ms / 60000);
    var s = Math.floor((ms % 60000) / 1000);
    var d = Math.floor((ms % 1000) / 100);
    return m + ":" + pad(s) + "." + d;
  }
  function renderTimer(e) {
    els.timer.textContent = fmt(e);
    els.timer.classList.toggle("warn", e > timer.target && e <= timer.target * 1.5);
    els.timer.classList.toggle("late", e > timer.target * 1.5);
  }
  function tick() {
    if (!timer.running) return;
    renderTimer(performance.now() - timer.start);
    timer.raf = requestAnimationFrame(tick);
  }
  function startTimer(target) {
    timer.start = performance.now();
    timer.target = target || 1;
    timer.running = true;
    renderTimer(0);
    tick();
  }
  function stopTimer() {
    timer.running = false;
    if (timer.raf) cancelAnimationFrame(timer.raf);
    return performance.now() - timer.start;
  }

  // --- Progression ----------------------------------------------------------
  function palierFor(key) {
    return settings.level === "auto" ? (stats.palier[key] || 1) : Number(settings.level);
  }
  function targetMs(key, palier) {
    var p = Math.max(1, Math.min(palier, 4));
    if (key === "notes") {
      var pace = [0, 3.4, 3.0, 2.6, 2.3][p];
      return (settings.noteCount || 6) * pace * 1000;
    }
    var pace2 = [0, 5, 4.5, 4, 3.5][p];
    return 5 * pace2 * 1000;
  }

  // --- Écrans ---------------------------------------------------------------
  var TITLES = { home: "Solfège Piano", exercise: "", settings: "Réglages" };
  function showScreen(name) {
    ["home", "exercise", "settings"].forEach(function (s) { els[s].hidden = (s !== name); });
    els.backBtn.hidden = (name === "home");
    els.settingsBtn.hidden = (name !== "home");
    els.screenTitle.textContent = name === "exercise"
      ? (PMT.exercises[current.key] ? PMT.exercises[current.key].label : "Exercice")
      : TITLES[name];
  }

  // --- Contexte d'exercice --------------------------------------------------
  var controllers = {};
  var current = { key: null, ctrl: null };

  function makeCtx(key) {
    return {
      stageEl: els.stage,
      promptEl: els.prompt,
      answersEl: els.answers,
      settings: settings,
      setProgress: function (done, total) {
        els.progressFill.style.width = (total ? (done / total) * 100 : 0) + "%";
        els.progressText.textContent = done + "/" + total;
      },
      roundDone: function (res) { onRoundDone(key, res); },
      sound: sound,
      vibrate: function () {
        if (settings.vibrate && navigator.vibrate) { try { navigator.vibrate(30); } catch (e) {} }
      }
    };
  }

  function startExercise(key) {
    current.key = key;
    if (!controllers[key]) controllers[key] = PMT.exercises[key].create(makeCtx(key));
    current.ctrl = controllers[key];
    showScreen("exercise");
    var palier = palierFor(key);
    els.levelBadge.textContent = String(palier);
    try {
      current.ctrl.start(palier);
    } catch (e) {
      els.loaderror.hidden = false;
      return;
    }
    startTimer(targetMs(key, palier));
  }

  function onRoundDone(key, res) {
    var ms = stopTimer();
    var palier = palierFor(key);
    var bkey = key + ":" + palier;
    var isBest = false;

    if (res.errors === 0) {
      var prev = stats.best[bkey];
      if (prev == null || ms < prev) { stats.best[bkey] = ms; isBest = true; }
      stats.streak[key] = (stats.streak[key] || 0) + 1;
    } else {
      stats.streak[key] = 0;
    }

    var levelMsg = "";
    if (settings.level === "auto") {
      if (res.errors === 0 && ms <= targetMs(key, palier) && palier < 4) {
        stats.palier[key] = palier + 1;
        levelMsg = "Niveau " + (palier + 1) + " débloqué !";
      } else if (res.errors > res.total && palier > 1) {
        stats.palier[key] = palier - 1;
        levelMsg = "Niveau " + (palier - 1);
      }
    }
    saveStats();
    if (res.errors === 0) sound("win");
    showResult({ ms: ms, errors: res.errors, isBest: isBest, levelMsg: levelMsg });
  }

  function showResult(r) {
    els.resultTitle.textContent = r.errors === 0 ? "Parfait !" : "Manche terminée";
    els.resultTime.textContent = fmt(r.ms);
    els.resultErrors.textContent = String(r.errors);
    var parts = [];
    if (r.isBest) parts.push("Nouveau record !");
    if (r.levelMsg) parts.push(r.levelMsg);
    els.resultNote.textContent = parts.join("  ·  ");
    els.overlay.hidden = false;
  }

  function goHome() {
    stopTimer();
    els.overlay.hidden = true;
    showScreen("home");
    refreshHome();
  }

  function refreshHome() {
    ["notes", "scales"].forEach(function (key) {
      var p = palierFor(key);
      var best = stats.best[key + ":" + p];
      var txt = DESCR[key] + " · niveau " + p;
      if (best != null) txt += " · record " + fmt(best);
      els["sub-" + key].textContent = txt;
    });
  }

  // --- Réglages -------------------------------------------------------------
  function loadSettingsUI() {
    els["set-level"].value = settings.level;
    els["set-clef"].value = settings.clef;
    els["set-count"].value = String(settings.noteCount);
    els["set-sound"].checked = !!settings.sound;
    els["set-vibrate"].checked = !!settings.vibrate;
  }
  function wireSettings() {
    els["set-level"].addEventListener("change", function () { settings.level = this.value; saveSettings(); });
    els["set-clef"].addEventListener("change", function () { settings.clef = this.value; saveSettings(); });
    els["set-count"].addEventListener("change", function () { settings.noteCount = Number(this.value); saveSettings(); });
    els["set-sound"].addEventListener("change", function () { settings.sound = this.checked; saveSettings(); });
    els["set-vibrate"].addEventListener("change", function () { settings.vibrate = this.checked; saveSettings(); });
    els.resetStats.addEventListener("click", function () {
      stats = { palier: { notes: 1, scales: 1 }, best: {}, streak: { notes: 0, scales: 0 } };
      saveStats();
      this.textContent = "Records réinitialisés ✓";
      var b = this;
      setTimeout(function () { b.textContent = "Réinitialiser mes records"; }, 1500);
    });
  }

  // --- Amorçage -------------------------------------------------------------
  function boot() {
    if (!global.Vex || !global.Vex.Flow) {
      els.loaderror.hidden = false;
    }
    applyTheme();
    if (global.matchMedia) {
      var mq = global.matchMedia("(prefers-color-scheme: dark)");
      var onChange = function () { applyTheme(); if (current.ctrl && !els.exercise.hidden) current.ctrl.redraw(); };
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }

    document.querySelectorAll(".card").forEach(function (card) {
      card.addEventListener("click", function () { startExercise(card.dataset.exercise); });
    });
    els.backBtn.addEventListener("click", goHome);
    els.settingsBtn.addEventListener("click", function () { loadSettingsUI(); showScreen("settings"); });
    els.againBtn.addEventListener("click", function () { els.overlay.hidden = true; startExercise(current.key); });
    els.homeBtn.addEventListener("click", goHome);
    wireSettings();

    // Débloquer l'audio au premier contact.
    var unlock = function () {
      ensureAudio();
      if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("mousedown", unlock);
    };
    document.addEventListener("touchstart", unlock, { passive: true });
    document.addEventListener("mousedown", unlock);

    // Re-rendu au redimensionnement / rotation.
    var rz;
    global.addEventListener("resize", function () {
      clearTimeout(rz);
      rz = setTimeout(function () {
        if (current.ctrl && !els.exercise.hidden) current.ctrl.redraw();
      }, 150);
    });

    loadSettingsUI();
    refreshHome();
    showScreen("home");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window);
