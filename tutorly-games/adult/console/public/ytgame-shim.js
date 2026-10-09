/*
 * Tutorly Consol – YouTube Playables SDK shim
 * Implements the public `ytgame` API (https://developers.google.com/youtube/gaming/playables/reference/sdk)
 * so real Playables Unity/HTML5 builds run outside youtube.com. Score, lifecycle and save events
 * are forwarded to the Tutorly Consol host frame via postMessage.
 */
(function () {
  if (window.ytgame && window.ytgame.__tutorly) return;

  var segs = location.pathname.split("/").filter(Boolean);
  /**
   * One key per game, so `saveData` from two different Playables cannot collide.
   *
   * Four shapes reach this shim:
   *   /api/play/<buildHost>/…            (the old Node proxy)
   *   …/play.php/<buildHost>/…           (the PHP proxy, on the cPanel host)
   *   …/local-unity/<gameId>/…           (a folder the player loaded)
   *   anything else (a URL the tutor pasted)
   * and in the first three the game's own identifier is the segment after the marker.
   *
   * The marker is searched for at *any* depth, not at `segs[0]`. The console is served
   * from a sub-path — `/tutorly-games/adult/console/play.php/<host>/index.html` — so a
   * positional check never matched: every local build and every proxied game on the
   * sub-path was named "generic", and so shared one save slot with every other game.
   *
   * The fallback is a short hash of the pathname rather than the fixed string "generic",
   * for the same reason: two builds pasted from two different hosts are two games, and
   * naming them the same thing means the second inherits the first one's money.
   *
   * **`lib/gameReset.ts` implements this identical rule in TypeScript** (
   * `gameKeyFromPath`) so the console's Cheat Engine names the same key the game does.
   * If you change one, change the other; `.freebuff/console-check.ts` fails if they
   * stop agreeing.
   */
  function after(marker) {
    var i = segs.indexOf(marker);
    return i >= 0 && segs[i + 1] ? segs[i + 1] : "";
  }
  var api = segs.indexOf("api");
  var gameKey =
    after("play.php") ||
    after("local-unity") ||
    (api >= 0 && segs[api + 2] ? segs[api + 2] : "") ||
    after("unity") ||
    "";
  if (!gameKey) {
    var hash = 0x811c9dc5;
    for (var i = 0; i < location.pathname.length; i++) {
      hash ^= location.pathname.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    var tail = segs[segs.length - 2] || segs[segs.length - 1] || "game";
    gameKey = tail.replace(/[^a-z0-9_-]/gi, "") + "-" + hash.toString(36).slice(0, 6);
  }
  var SAVE_KEY = "tutorly:ytgame:save:" + gameKey;

  function post(type, payload) {
    try {
      var msg = { source: "tutorly-ytgame", type: type, gameKey: gameKey, at: Date.now() };
      if (payload) for (var k in payload) msg[k] = payload[k];
      window.parent.postMessage(msg, "*");
    } catch (e) {}
  }

  var audioEnabled = true;
  var audioCbs = [];
  var pauseCbs = [];
  var resumeCbs = [];

  /*
   * Ads are simulated, and a rewarded ad always pays out.
   *
   * A Playable grants its own reward: it calls `requestRewardedAd()` and then does
   * whatever the reward is — coins, a power-up, another life — based on what the
   * promise resolves with. On youtube.com that resolution follows a video the
   * player watched. Here there is no video to watch and no advertiser to satisfy,
   * so the honest simulation is to answer exactly as a completed ad would: resolve
   * with `{ rewardGranted: true }` (the SDK's own shape) and let the game hand over
   * its reward through its normal path. Nothing in the build is patched, which is
   * why this keeps working when a game is updated.
   *
   * The delay is not decoration: several builds show a spinner until the promise
   * settles, and a zero-delay resolve reads as a bug in the UI. The host can turn
   * granting off by posting `{ source: 'tutorly-host', type: 'ads', grant: false }`.
   */
  var grantAdRewards = true;

  function fire(list, arg) {
    list.slice().forEach(function (cb) {
      try {
        cb(arg);
      } catch (e) {}
    });
  }

  window.addEventListener("message", function (e) {
    var d = e && e.data;
    if (!d || d.source !== "tutorly-host") return;
    if (d.type === "audio") {
      audioEnabled = !!d.enabled;
      fire(audioCbs, audioEnabled);
    } else if (d.type === "pause") {
      fire(pauseCbs);
    } else if (d.type === "resume") {
      fire(resumeCbs);
    } else if (d.type === "ads") {
      grantAdRewards = !!d.grant;
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) fire(pauseCbs);
    else fire(resumeCbs);
  });

  function SdkError(errorType, message) {
    var err = new Error(message || "SdkError");
    err.name = "SdkError";
    err.errorType = errorType;
    return err;
  }

  var SdkErrorType = { UNKNOWN: 0, API_UNAVAILABLE: 1, INVALID_PARAMS: 2, SIZE_LIMIT_EXCEEDED: 3 };

  function unsubscriber(list, cb) {
    return function () {
      var i = list.indexOf(cb);
      if (i >= 0) list.splice(i, 1);
    };
  }

  window.ytgame = {
    __tutorly: true,
    SDK_VERSION: "1.0.0",
    IN_PLAYABLES_ENV: true,
    SdkError: SdkError,
    SdkErrorType: SdkErrorType,

    ads: {
      requestInterstitialAd: function () {
        return new Promise(function (resolve) {
          setTimeout(function () {
            post("ad", { kind: "interstitial", skipped: true });
            resolve();
          }, 350);
        });
      },
      requestRewardedAd: function () {
        return new Promise(function (resolve) {
          setTimeout(function () {
            post("ad", { kind: "rewarded", granted: grantAdRewards, skipped: true });
            resolve({ rewardGranted: grantAdRewards });
          }, 600);
        });
      },
    },

    engagement: {
      sendScore: function (opts) {
        var value = opts && typeof opts === "object" ? Number(opts.value) : Number(opts);
        if (!isFinite(value)) return Promise.reject(SdkError(SdkErrorType.INVALID_PARAMS, "Invalid score"));
        post("score", { value: value });
        return Promise.resolve();
      },
      openYTContent: function (opts) {
        post("openContent", { content: opts || null });
        return Promise.resolve();
      },
    },

    game: {
      firstFrameReady: function () {
        post("firstFrameReady");
      },
      gameReady: function () {
        post("gameReady");
      },
      loadData: function () {
        var data = "";
        try {
          data = localStorage.getItem(SAVE_KEY) || "";
        } catch (e) {}
        post("loadData", { bytes: data.length });
        return Promise.resolve(data);
      },
      saveData: function (data) {
        if (typeof data !== "string")
          return Promise.reject(SdkError(SdkErrorType.INVALID_PARAMS, "saveData expects a string"));
        if (data.length > 3 * 1024 * 1024)
          return Promise.reject(SdkError(SdkErrorType.SIZE_LIMIT_EXCEEDED, "Save data exceeds 3 MiB"));
        try {
          localStorage.setItem(SAVE_KEY, data);
        } catch (e) {
          return Promise.reject(SdkError(SdkErrorType.UNKNOWN, "Storage unavailable"));
        }
        post("saveData", { bytes: data.length });
        return Promise.resolve();
      },
    },

    health: {
      logError: function () {
        post("healthError");
      },
      logWarning: function () {
        post("healthWarning");
      },
    },

    system: {
      isAudioEnabled: function () {
        return audioEnabled;
      },
      onAudioEnabledChange: function (cb) {
        if (typeof cb === "function") audioCbs.push(cb);
        return unsubscriber(audioCbs, cb);
      },
      onPause: function (cb) {
        if (typeof cb === "function") pauseCbs.push(cb);
        return unsubscriber(pauseCbs, cb);
      },
      onResume: function (cb) {
        if (typeof cb === "function") resumeCbs.push(cb);
        return unsubscriber(resumeCbs, cb);
      },
      getLanguage: function () {
        return Promise.resolve(navigator.language || "en-US");
      },
    },
  };

  /*
   * ── The simulated clock ─────────────────────────────────────────────────────
   * The Cheat Engine's "simulate one day passing" stores an offset under
   * `tutorly:console:time-offset:<gameKey>` and reloads the game. This is where the
   * game actually feels it: the shim runs before the build's first script, so
   * `Date.now()` is already moved when the game asks whether a day has passed.
   *
   * A daily reward is the one cheat no save editor can reliably reach — the count
   * lives in the save, but the *decision* lives in the clock, and some builds keep a
   * second copy of the timestamps in PlayerPrefs or their own key where the save
   * editor never looks. Patching `Date` covers every one of them at once, with no
   * knowledge of any game's format.
   *
   * Only wall-clock time is moved. `performance.now()` and the rAF timestamp are
   * monotonic and stay untouched: a frame must not take 24 hours.
   */
  var timeKey = "tutorly:console:time-offset:" + gameKey;
  var timeOffset = 0;
  try {
    timeOffset = parseInt(localStorage.getItem(timeKey) || "0", 10) || 0;
  } catch (e) {}
  if (timeOffset > 0) {
    (function () {
      var RealDate = Date;
      var realNow = RealDate.now;
      // A constructor that returns a real Date for every arity, so `instanceof Date`
      // and every `new Date(...)` form in the build keep working unchanged.
      function OffsetDate(a, b, c, d, e, f, g) {
        var n = arguments.length;
        if (n === 0) return new RealDate(realNow.call(RealDate) + timeOffset);
        if (n === 1) return new RealDate(a);
        if (n === 2) return new RealDate(a, b);
        if (n === 3) return new RealDate(a, b, c);
        if (n === 4) return new RealDate(a, b, c, d);
        if (n === 5) return new RealDate(a, b, c, d, e);
        if (n === 6) return new RealDate(a, b, c, d, e, f);
        return new RealDate(a, b, c, d, e, f, g);
      }
      OffsetDate.now = function () {
        return realNow.call(RealDate) + timeOffset;
      };
      OffsetDate.parse = RealDate.parse;
      OffsetDate.UTC = RealDate.UTC;
      OffsetDate.prototype = RealDate.prototype;
      try {
        window.Date = OffsetDate;
      } catch (e) {}
      post("timeShift", { offsetMs: timeOffset, days: Math.round(timeOffset / 86400000) });
    })();
  }

  // Surface uncaught game errors to the console HUD (useful for diagnosing builds)
  window.addEventListener("error", function (e) {
    post("runtimeError", { message: String((e && e.message) || "Unknown error") });
  });

  post("sdkLoaded");
})();
