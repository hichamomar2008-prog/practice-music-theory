# Solfège Piano 🎹

Petit site d'entraînement au **solfège pour le piano**. Pas de cours : uniquement
des exercices courts et chronométrés, à faire 5–10 minutes par jour, pensés pour
le **téléphone**.

Tout est en français (notes **Do Ré Mi Fa Sol La Si**) et adapté au piano : les
deux clés que lit un pianiste — **clé de sol** (main droite) et **clé de fa**
(main gauche) — et une **grande portée** pour les armures.

## Les exercices

### 1. Lecture de notes
Une série de notes s'affiche sur la portée. Tu nommes la note surlignée en
appuyant sur le bon bouton.
- ✅ bonne réponse → la note passe en **vert** et on avance ;
- ❌ mauvaise réponse → **rouge**, on réessaie jusqu'à trouver ;
- un **chrono** tourne : l'objectif est d'aller vite.

### 2. Reconnaître la gamme
Une **armure** s'affiche sur la grande portée. Tu choisis la bonne **tonalité**
(majeure ou mineure selon le niveau) parmi 4 propositions, toujours chronométré.

## Niveaux (progressif)

Par défaut le niveau **monte tout seul** quand tu réussis sans faute et assez
vite, et redescend si c'est trop dur :

| Niveau | Lecture de notes | Reconnaître la gamme |
|:------:|------------------|----------------------|
| 1 | notes sur la portée | jusqu'à 2 altérations, majeur |
| 2 | + 1 ligne supplémentaire | jusqu'à 4 altérations, majeur |
| 3 | + 2 lignes supplémentaires | + gammes mineures |
| 4 | + dièses / bémols (♯ ♭ ♮) | toutes les armures (jusqu'à 7) |

Tu peux aussi **fixer un niveau** ou changer la clé, le nombre de notes, les
sons et la vibration dans **Réglages** (⚙). Tes records sont gardés sur ton
téléphone.

## Ouvrir le site

Le site est 100 % statique (aucun serveur, aucune dépendance externe : la
bibliothèque de notation **VexFlow** est incluse dans `vendor/`). Il fonctionne
donc hors-ligne une fois chargé.

### Publier avec GitHub Pages
1. Dépôt GitHub → **Settings** → **Pages**.
2. *Build and deployment* → **Source : Deploy from a branch**.
3. Choisis la branche (`main` après fusion, ou directement la branche de
   développement) et le dossier **`/ (root)`**, puis **Save**.
4. Le site sera accessible à `https://<ton-utilisateur>.github.io/practice-music-theory/`.

> Astuce téléphone : ouvre ce lien puis « Ajouter à l'écran d'accueil » — grâce
> au manifest PWA, il s'installe comme une petite appli.

### Tester en local
```bash
python3 -m http.server 8000
# puis ouvre http://localhost:8000
```

## Structure

```
index.html            page unique (SPA)
css/styles.css         style mobile-first, thème clair/sombre automatique
js/theory.js           données de solfège (notes, clés, armures, gammes)
js/render.js           rendu des portées via VexFlow
js/notes.js            exercice « Lecture de notes »
js/scales.js           exercice « Reconnaître la gamme »
js/app.js              navigation, chrono, score, progression, sons, stockage
vendor/vexflow.js      VexFlow 4.2.2 (MIT) — notation musicale
icons/                 icône de l'appli (SVG + PNG)
manifest.webmanifest   installation sur l'écran d'accueil
```

## Plus tard (idées)

- Exercices d'**intervalles** et de **rythme**.
- Un vrai **clavier de piano** pour répondre en cliquant la touche.
- Système de **cours** en plus des exercices.

---

VexFlow est distribué sous licence MIT (voir l'en-tête de `vendor/vexflow.js`).
