# Tutorly — The Playroom

A tutor-controlled, bilingual early-language workspace for ages 3–6. Next.js App Router, React, Drizzle ORM and PostgreSQL.

## Studios

- **Letter sandbox:** pointer/touch sand drawing, real centre-line guides, numbered stroke starts, traced-path coverage, undo, free drawing and coloured sand. Latin upper/lowercase, 0–9, Turkish/German/French extensions, and beginner Chinese characters.
- **Momo’s echo cave:** real local microphone capture (8 seconds maximum), live audio meter, original and pitch-shifted replay, speaking rounds over the whole dictionary. This is not pronunciation assessment.
- **Sound smoothies:** draggable/tappable sound tiles, order checking, CVC words, syllables and Mandarin pinyin. Optional Azure IPA for English sound models. Teachers should model pure sounds when browser TTS reads letter names.
- **Object hunters:** live mirrored tutor webcam, movable target overlay, draggable dictionary-picture stickers, safe household missions, tutor-confirmed finds, illustrated fallback. Use picture stickers or hide them to find real objects. No automatic computer vision.
- **Feelings mirror:** independently sculpt mouth/eyebrows/eyes, situation stories, optional live camera mirror. No face or emotion recognition.
- **Move like me:** articulated action animation, play/pause, slow motion, word reveal, guessing and tutor-confirmed physical response.
- **Talking train:** authored, language-specific sentence strips; pointer/touch drag or tap, ordered validation and read-aloud.
- **Where’s Teddy?:** illustrated dollhouse, seven spatial relationships, object placement, hide/reveal and location guessing.
- **Pip’s dressing room:** eight garments, six colours, visible outfit changes, free styling and 48 colour–noun requests with language-specific adjective agreement.

## Teaching workspace

Searchable lesson library; reorderable lesson shelf; database-backed reusable playlists; illustrated, searchable six-language word garden with read-aloud and CCQs; learner nicknames/avatars; per-language studio completion history; device-local pending progress with retry.

The tutor UI is English. Child-facing words, prompts, requests, phonics and sentence strips use English, Simplified Chinese, French, Italian, German or Turkish. A second language can be shown or switched off. Child view hides the tutor guide/navigation; Escape returns. N moves to the next lesson (except when editing a field).

## Run

The managed preview installs dependencies and starts the production app. Database connection: `DATABASE_URL` in the server environment.

After bootstrapping: `npx drizzle-kit push` applies `src/db/schema.ts`.

## Optional Azure Speech

Set server-only `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`. `/api/tts` validates input and proxies SSML to Azure's regional speech endpoint. API keys never reach the browser. Azure voices are restricted to the allowed per-language list. Requests time out and responses are cached in bounded process memory. If unavailable, read-aloud uses the Web Speech API.

Child voices: English Ana, Chinese Xiaoshuang, French Eloise. Italian, German and Turkish use warm natural adult voices rather than being advertised as child voices.

Browser TTS depends on voices installed on the tutor device; not every browser has every language or supports isolated phonemes accurately. Screen-sharing tools require the tutor to enable tab/system audio for learners to hear speech or echoes.

## Media & privacy

Camera/microphone permission is requested only after an explicit tutor action. Audio clips and camera frames are never uploaded. Audio object URLs, streams, audio contexts and timers are released on leaving their activity. Denied/unavailable devices have text guidance and practice alternatives.

Progress and playlist APIs are intended for a **single trusted tutor workspace**, not a public multi-tenant school platform. Browser workspace IDs scope studio completion records; they are not authentication credentials. Do not expose learner/playlist APIs to an untrusted shared deployment without adding authentication/authorization. Only use learner nicknames.

Dictionary SVGs are cached in `public/emoji`; their CC BY 4.0 attribution is in `public/artwork-credits.txt`.

## Validation

`npx next typegen`

`npm exec tsc -- --noEmit --pretty false`

`npm run build`

The platform `build_and_start` tool starts the application and verifies `/api/health` against PostgreSQL.
