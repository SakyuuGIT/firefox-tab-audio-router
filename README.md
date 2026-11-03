# Firefox Tab Audio Router

Firefox/Zen extension that routes audio from **YouTube** and **X (Twitter)** tabs to a chosen output device, with a quick selection banner.

## How it works

- Firefox enforces a security policy: `navigator.mediaDevices.selectAudioOutput()` requires a user gesture, once per browser session.
- The extension detects playback and shows a banner in the top-right corner.
- Clicking "Choose output device" opens Firefox's native audio output selector.
- The chosen `deviceId` is stored (`browser.storage.local` + `localStorage`) and applied to all `<audio>`/`<video>` elements via `HTMLMediaElement.setSinkId()`.
- Routing is re-armed automatically on track changes (`emptied`, `loadstart`) and SPA navigations.
- A single choice applies to all supported sites.

## Supported sites

- `youtube.com` (including `music.youtube.com`)
- `x.com`
- `instagram.com`

## Installation

### Temporary (unsigned)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on".
3. Select `manifest.json` from the extension folder.
4. Active until the browser is restarted.

### Permanent (developer method, Zen/Firefox)

1. Open `about:config` and accept the warning.
2. Set `xpinstall.signatures.required` to `false`.
3. Open `about:addons` -> gear icon -> "Install Add-on From File...".
4. Select `firefox-tab-audio-router.xpi`.

## Usage

1. Go to YouTube or X.
2. Start playback: the banner appears.
3. Click "Choose output device" and pick the output.
4. The choice is remembered and re-applied automatically afterwards.

## Permissions

- `storage` - remember the chosen output device.
- Hosts: `*://youtube.com/*`, `*://*.youtube.com/*`, `*://x.com/*`, `*://*.x.com/*`, `*://instagram.com/*`, `*://*.instagram.com/*`.

## Known limitations

- **SoundCloud**: could not be made to work. SoundCloud uses a player inside a crossfade iframe and/or the Web Audio API (`AudioContext`) instead of standard `<audio>`/`<video>` elements; `setSinkId` fails with `NotFoundError` in that context. Help / PRs to support SoundCloud are welcome.
- `selectAudioOutput` may be unavailable on older Firefox versions.
