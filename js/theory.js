/*
 * theory.js — Données et helpers de théorie musicale (solfège français).
 * Aucune dépendance. Expose window.PMT.theory.
 *
 * Conventions :
 *  - Une "clé de portée" VexFlow est notée "lettre/octave", ex. "c/4" (Do central).
 *  - Les lettres internes sont anglo-saxonnes (C..B) pour parler à VexFlow ;
 *    l'affichage est toujours en français (Do, Ré, Mi, ...).
 */
(function (global) {
  "use strict";

  var PMT = global.PMT = global.PMT || {};

  // --- Noms français des 7 notes naturelles ---------------------------------
  var LETTER_FR = { C: "Do", D: "Ré", E: "Mi", F: "Fa", G: "Sol", A: "La", B: "Si" };
  // Ordre d'affichage des boutons : Do Ré Mi Fa Sol La Si
  var LETTER_ORDER = ["C", "D", "E", "F", "G", "A", "B"];

  var SHARP = "♯"; // ♯
  var FLAT = "♭";  // ♭
  var NAT = "♮";   // ♮

  // Renvoie le nom français d'une note. acc = "#", "b" ou "" (ou "n").
  function frNote(letter, acc) {
    var base = LETTER_FR[letter] || letter;
    if (acc === "#") return base + SHARP;
    if (acc === "b") return base + FLAT;
    return base;
  }

  // Lettre à partir d'une clé VexFlow "c/4" -> "C"
  function letterOf(key) {
    return key.charAt(0).toUpperCase();
  }

  // --- Échelles de notes par clé (diatonique, du grave à l'aigu) -------------
  // On définit trois paliers de portée :
  //   staff   = notes qui tiennent sur les 5 lignes/interlignes
  //   ledger1 = + 1 ligne supplémentaire de chaque côté
  //   ledger2 = + 2 lignes supplémentaires de chaque côté
  var LADDERS = {
    treble: {
      staff:   ["e/4", "f/4", "g/4", "a/4", "b/4", "c/5", "d/5", "e/5", "f/5"],
      ledger1: ["c/4", "d/4", "g/5", "a/5"],   // Do central + Ré grave, Sol/La aigus
      ledger2: ["a/3", "b/3", "b/5", "c/6"]
    },
    bass: {
      staff:   ["g/2", "a/2", "b/2", "c/3", "d/3", "e/3", "f/3", "g/3", "a/3"],
      ledger1: ["e/2", "f/2", "b/3", "c/4"],   // ... jusqu'au Do central (c/4)
      ledger2: ["c/2", "d/2", "d/4", "e/4"]
    }
  };

  // Ensemble de notes disponibles pour un palier donné (1..3).
  function notePool(clef, tier) {
    var l = LADDERS[clef];
    var pool = l.staff.slice();
    if (tier >= 2) pool = pool.concat(l.ledger1);
    if (tier >= 3) pool = pool.concat(l.ledger2);
    return pool;
  }

  // Lettres qui acceptent un dièse / un bémol "naturel" (touche noire adjacente),
  // pour éviter les enharmonies déroutantes (Mi♯, Si♯, Fa♭, Do♭).
  var CAN_SHARP = { C: 1, D: 1, F: 1, G: 1, A: 1 };
  var CAN_FLAT = { D: 1, E: 1, G: 1, A: 1, B: 1 };

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // Tire une note au hasard.
  // opts: { clef, tier (1..3), accidentals (bool) }
  // Renvoie { key:"c/4", letter:"C", acc:"" | "#" | "b" }
  function randomNote(opts) {
    var clef = opts.clef;
    var tier = opts.tier || 1;
    var key = pick(notePool(clef, tier));
    var letter = letterOf(key);
    var acc = "";
    if (opts.accidentals && Math.random() < 0.45) {
      var choices = [];
      if (CAN_SHARP[letter]) choices.push("#");
      if (CAN_FLAT[letter]) choices.push("b");
      if (choices.length) acc = pick(choices);
    }
    return { key: key, letter: letter, acc: acc };
  }

  // Génère une séquence de n notes (pour l'exercice de lecture).
  function randomSequence(n, opts) {
    var seq = [];
    for (var i = 0; i < n; i++) seq.push(randomNote(opts));
    return seq;
  }

  // --- Armures / tonalités ---------------------------------------------------
  // spec = code VexFlow pour addKeySignature (identique pour majeur/mineur relatif).
  var KEY_SIGS = [
    { n: 0, type: "",  major: { spec: "C",  fr: "Do majeur" },     minor: { spec: "Am",  fr: "La mineur" } },
    { n: 1, type: "#", major: { spec: "G",  fr: "Sol majeur" },    minor: { spec: "Em",  fr: "Mi mineur" } },
    { n: 2, type: "#", major: { spec: "D",  fr: "Ré majeur" },     minor: { spec: "Bm",  fr: "Si mineur" } },
    { n: 3, type: "#", major: { spec: "A",  fr: "La majeur" },     minor: { spec: "F#m", fr: "Fa" + SHARP + " mineur" } },
    { n: 4, type: "#", major: { spec: "E",  fr: "Mi majeur" },     minor: { spec: "C#m", fr: "Do" + SHARP + " mineur" } },
    { n: 5, type: "#", major: { spec: "B",  fr: "Si majeur" },     minor: { spec: "G#m", fr: "Sol" + SHARP + " mineur" } },
    { n: 6, type: "#", major: { spec: "F#", fr: "Fa" + SHARP + " majeur" }, minor: { spec: "D#m", fr: "Ré" + SHARP + " mineur" } },
    { n: 7, type: "#", major: { spec: "C#", fr: "Do" + SHARP + " majeur" }, minor: { spec: "A#m", fr: "La" + SHARP + " mineur" } },
    { n: 1, type: "b", major: { spec: "F",  fr: "Fa majeur" },     minor: { spec: "Dm",  fr: "Ré mineur" } },
    { n: 2, type: "b", major: { spec: "Bb", fr: "Si" + FLAT + " majeur" },  minor: { spec: "Gm",  fr: "Sol mineur" } },
    { n: 3, type: "b", major: { spec: "Eb", fr: "Mi" + FLAT + " majeur" },  minor: { spec: "Cm",  fr: "Do mineur" } },
    { n: 4, type: "b", major: { spec: "Ab", fr: "La" + FLAT + " majeur" },  minor: { spec: "Fm",  fr: "Fa mineur" } },
    { n: 5, type: "b", major: { spec: "Db", fr: "Ré" + FLAT + " majeur" },  minor: { spec: "Bbm", fr: "Si" + FLAT + " mineur" } },
    { n: 6, type: "b", major: { spec: "Gb", fr: "Sol" + FLAT + " majeur" }, minor: { spec: "Ebm", fr: "Mi" + FLAT + " mineur" } },
    { n: 7, type: "b", major: { spec: "Cb", fr: "Do" + FLAT + " majeur" },  minor: { spec: "Abm", fr: "La" + FLAT + " mineur" } }
  ];

  // Nombre max d'altérations et modes autorisés par palier (1..4).
  function scaleConfig(tier) {
    if (tier <= 1) return { maxAcc: 2, modes: ["major"] };
    if (tier === 2) return { maxAcc: 4, modes: ["major"] };
    if (tier === 3) return { maxAcc: 4, modes: ["major", "minor"] };
    return { maxAcc: 7, modes: ["major", "minor"] };
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Génère une question de reconnaissance de tonalité.
  // Renvoie { spec, mode, prompt, options:[fr...], answer:fr, keySig }
  function randomScaleQuestion(tier) {
    var cfg = scaleConfig(tier);
    var pool = KEY_SIGS.filter(function (k) { return k.n <= cfg.maxAcc; });
    var mode = pick(cfg.modes);
    var correct = pick(pool);

    // Distracteurs : autres tonalités du même mode, préférence aux voisines.
    var others = pool.filter(function (k) { return k !== correct; });
    others.sort(function (a, b) {
      return Math.abs(a.n - correct.n) - Math.abs(b.n - correct.n);
    });
    // On mélange légèrement en piochant parmi les plus proches.
    var near = shuffle(others.slice(0, Math.min(6, others.length))).slice(0, 3);
    var opts = shuffle(near.concat([correct])).map(function (k) { return k[mode].fr; });

    return {
      spec: correct.major.spec,              // rendu de l'armure (identique maj/min)
      mode: mode,
      prompt: mode === "major" ? "Tonalité majeure ?" : "Tonalité mineure ?",
      options: opts,
      answer: correct[mode].fr,
      keySig: correct
    };
  }

  PMT.theory = {
    LETTER_FR: LETTER_FR,
    LETTER_ORDER: LETTER_ORDER,
    SHARP: SHARP, FLAT: FLAT, NAT: NAT,
    frNote: frNote,
    letterOf: letterOf,
    notePool: notePool,
    randomNote: randomNote,
    randomSequence: randomSequence,
    KEY_SIGS: KEY_SIGS,
    randomScaleQuestion: randomScaleQuestion,
    shuffle: shuffle
  };
})(window);
