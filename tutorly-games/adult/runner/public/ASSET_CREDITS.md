# Mob Survival: English Arena - Visual Asset Credits

## Real-time rendering

- Three.js: https://threejs.org/ (MIT license).
- The battlefield, suspension bridge, vehicles, supply caches, weapon geometry,
  procedural infantry fallback, water shader, VFX, and rifle SVG were created
  specifically for this application.
- The harbor panorama at `images/harbor-dusk.jpg` is an original AI-generated
  environmental matte painting. It is used as a background; combat is rendered
  in real time, not played as a video.

## Free external assets

- Asphalt 02 diffuse and OpenGL normal maps by Poly Haven:
  https://polyhaven.com/a/asphalt_02
  License: CC0 1.0, https://polyhaven.com/license
  The application requests the public 1K JPG maps from the Poly Haven CDN.
  A built-in procedural surface is used if those requests fail.
- Soldier.glb, the animated infantry demonstration model hosted by Three.js:
  https://threejs.org/examples/models/gltf/Soldier.glb
  Source: https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf
  This is a Mixamo-origin model. See Adobe's Mixamo usage terms for asset
  redistribution; the Three.js code license should not be assumed to cover
  every demonstration asset. The application streams the model from the
  original host, rather than including the model in downloads.
  If unavailable, locally generated 3D infantry render instead.

## Interface

- Lucide icons: https://lucide.dev/ (ISC license).
- Barlow Condensed, Inter, and IBM Plex Mono, served by Google Fonts:
  SIL Open Font License. Local system font fallbacks are configured.
- Fruit emoji are rendered using the device's native emoji font.

## Browser notes

The 3D battlefield requires WebGL 2. Cinematic mode uses a capped render
resolution, soft shadow maps, and optional bloom. Balanced and Performance
presets are available for lower-powered classroom computers.

Microphone recognition is optional, browser-dependent, and permission-based.
Speech synthesis uses installed browser voices; Azure credentials are not
included. Rival leaderboard entries are illustrative, while the personal best
is saved on the current device.