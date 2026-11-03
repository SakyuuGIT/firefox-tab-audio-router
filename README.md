# Firefox Tab Audio Router

Extension Firefox/Zen qui route l'audio des onglets **YouTube** et **X (Twitter)** vers une sortie audio choisie, avec une bannière de sélection rapide.

Thème visuel : **Digital Parasite** (fond sombre, accent rose `#ff2d7a`, coins carrés).

## Fonctionnement

- Firefox impose une sécurité : `navigator.mediaDevices.selectAudioOutput()` nécessite un geste utilisateur, une fois par session navigateur.
- L'extension détecte la lecture et affiche une bannière en haut à droite.
- Au clic sur « Choose output device », le sélecteur natif de Firefox s'ouvre.
- Le `deviceId` choisi est mémorisé (`browser.storage.local` + `localStorage`) et appliqué à tous les éléments `<audio>`/`<video>` via `HTMLMediaElement.setSinkId()`.
- Le routage est ré-armé automatiquement sur les changements de piste (`emptied`, `loadstart`) et les navigations SPA.
- Un seul choix s'applique à tous les sites supportés.

## Sites supportés

- `youtube.com` (incl. `music.youtube.com`)
- `x.com`

## Installation

### Temporaire (sans signature)

1. Ouvrir `about:debugging#/runtime/this-firefox`.
2. « Charger un module complémentaire temporaire ».
3. Sélectionner `manifest.json` dans le dossier de l'extension.
4. Active jusqu'au redémarrage du navigateur.

### Permanente (méthode développeur, Zen/Firefox)

1. Ouvrir `about:config`, accepter l'avertissement.
2. Passer `xpinstall.signatures.required` à `false`.
3. `about:addons` → engrenage ⚙ → « Installer un module depuis un fichier… ».
4. Sélectionner `firefox-tab-audio-router.xpi`.

## Utilisation

1. Aller sur YouTube ou X.
2. Lancer une lecture : la bannière apparaît.
3. Cliquer « Choose output device » et choisir la sortie.
4. Le choix est mémorisé et réappliqué automatiquement ensuite.

## Permissions

- `storage` — mémoriser la sortie choisie.
- Hosts : `*://youtube.com/*`, `*://*.youtube.com/*`, `*://x.com/*`, `*://*.x.com/*`.

## Limitations connues

- **SoundCloud** : n'a pas pu être fait fonctionner. SoundCloud utilise un player dans un iframe de crossfade et/ou l'API Web Audio (`AudioContext`) au lieu d'éléments `<audio>`/`<video>` standards ; `setSinkId` échoue avec `NotFoundError` dans ce contexte. Toute aide / PR pour supporter SoundCloud est bienvenue.
- `selectAudioOutput` peut être indisponible sur les anciennes versions de Firefox.
