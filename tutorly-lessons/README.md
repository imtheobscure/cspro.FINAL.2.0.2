# tutorly-lessons

Two different kinds of thing live here.

## 1. Generator modules (imported by the main app)

`Avatar_Lesson/`, `Avatar_Lesson_V2/`, `Mock-Test/`, `Mock_Test_V3/` are pure
TypeScript modules. They export the HTML generators the main app imports, so they
compile into `dist/assets/main-*.js`, have no URL of their own, and nothing gets
copied to `dist/` for them. They are deliberately kept **inside** the main
typecheck (see the comment in `tsconfig.json`).

## 2. Lesson apps (published under `/tutorly-lessons/`)

`englishlesson2/` and `Video-Lesson/` are standalone Vite apps, published by
`scripts/collect-standalone-apps.mjs` at `/tutorly-lessons/englishlesson2/` and
`/tutorly-lessons/Video-Lesson/`. Neither has been built yet, so `dist/` gets a
signpost page there until a real build is dropped in.

`Video-Lesson/prebuilt/` is the **finished build** of the `Video-Lesson` source
above (591 kB single page, recovered from the live server). It is filed the same
way the Transcriber's shipped build is — `prebuilt/` holds the artifact that
ships, the folder around it holds the source. To publish it, point the
`tutorly-lessons/Video-Lesson` entry in `collect-standalone-apps.mjs` at
`prebuilt/` instead of the (unbuilt) `dist/`.

## 3. Retired lesson studios — archived, NOT published

These are the per-lesson standalone studios that used to live at the web root and
were later moved aside into a `used/` folder on the server:

| folder | app (from its `<title>`) |
| --- | --- |
| `music-lesson/`             | Song Lesson • Tutorly |
| `live-lesson/`              | LessonForge AI – Live Lesson Instructor Engine |
| `daily-lesson/`             | Daily Lesson — Interactive Language Learning |
| `gamified-challenge/`       | LinguaArena – Gamified Weekly Challenge |
| `flipbook-homework/`        | Tutorly – Homework Magazine |
| `learning-app-v2/`          | App (Learning App V2) |

They are kept here for safekeeping and version history, but they are **not in
`APPS`**, so nothing is copied into `dist/` and no URL is created for them. The
main app's built-in **Lesson Creator** now generates these lesson types (Music
Lesson, Flipbook Homework, Daily Lesson, Gamified Challenge, Learning App V2, …)
as downloadable pages, which is why the standalone studios were retired.

Do not add them to `APPS` without a decision to make the retired URLs live again —
the archived pages reference `/learners/`-style sibling paths that only resolve
from the site root.

`interactive-lesson-maker/` is an orphan: the page is here (888 B) but the
`../assets/interactive-lesson-maker/*` files it loads are **not** on the server any
more, so it cannot run. It is archived for reference only.
