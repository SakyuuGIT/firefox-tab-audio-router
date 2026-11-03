// Wrap everything in an IIFE so `return` is a reliable early-exit.
(function () {

  // Guard against double-injection.
  if (document.documentElement.dataset.tabAudioRouterActive === "1") {
    return;
  }
  document.documentElement.dataset.tabAudioRouterActive = "1";

  const isTopFrame = (window.top === window.self);

  const EXT_KEY = "tabAudioSink_v1";
  const LS_KEY = "tabAudioSink_v1";

  const UI_ID = "tab-audio-router-overlay";
  const UI_BTN_ID = "tab-audio-router-overlay-btn";

  function log(...a) { console.log("[Audio Router]", ...a); }
  function warn(...a) { console.warn("[Audio Router]", ...a); }

  log("v1.0.0", new Date().toISOString(), "url =", location.href);

  /* ---------------- Storage helpers ---------------- */

  async function extGet() {
    try {
      const obj = await browser.storage.local.get(EXT_KEY);
      return obj[EXT_KEY] || null;
    } catch (e) { warn("extGet failed:", e?.name, e?.message); return null; }
  }
  async function extSet(val) {
    try { await browser.storage.local.set({ [EXT_KEY]: val }); return true; }
    catch (e) { warn("extSet failed:", e?.name, e?.message); return false; }
  }
  function siteGet() {
    try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; }
    catch (e) { warn("siteGet failed:", e?.name, e?.message); return null; }
  }
  function siteSet(val) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(val)); return true; }
    catch (e) { warn("siteSet failed:", e?.name, e?.message); return false; }
  }

  async function getSaved() {
    const ext = await extGet();
    const site = siteGet();
    const chosen = ext || site || null;
    if (!ext && site) { await extSet(site); }
    if (chosen?.deviceId) _deviceCache = chosen;
    return chosen;
  }

  async function savePicked(deviceId, label) {
    const val = { deviceId: String(deviceId || ""), label: String(label || "") };
    log("Saving device:", label || deviceId.slice(0, 12));
    _deviceCache = val;
    await extSet(val);
    siteSet(val);
    return val;
  }

  /* ---------------- UI overlay ---------------- */

  function ensureOverlay() {
    if (document.getElementById(UI_ID)) return;

    const style = document.createElement("style");
    style.textContent = `
      @keyframes tar-slide-in {
        from { opacity: 0; transform: translateY(20px) scale(0.95); }
        to   { opacity: 1; transform: translateY(0)    scale(1);    }
      }
      @keyframes tar-fade-out {
        from { opacity: 1; transform: translateY(0) scale(1); }
        to   { opacity: 0; transform: translateY(8px) scale(0.97); pointer-events: none; }
      }
      #${UI_ID} { animation: tar-slide-in 0.35s cubic-bezier(0.16,1,0.3,1) both; }
      #${UI_ID}.tar-hiding { animation: tar-fade-out 0.4s cubic-bezier(0.4,0,1,1) forwards; }
      #${UI_BTN_ID}:hover:not(:disabled) { filter: brightness(1.12); transform: scale(1.02); }
      #${UI_BTN_ID}:active:not(:disabled) { transform: scale(0.97); }
      #${UI_BTN_ID} { transition: filter 0.15s, transform 0.1s; }
    `;
    document.documentElement.appendChild(style);

    const wrap = document.createElement("div");
    wrap.id = UI_ID;
    Object.assign(wrap.style, {
      position: "fixed",
      top: "24px",
      right: "20px",
      zIndex: "2147483647",
      background: "rgba(18,18,31,0.97)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      color: "#e8e6f0",
      padding: "16px 18px 14px",
      borderRadius: "0px",
      border: "1px solid #2a2a3f",
      fontSize: "14px",
      lineHeight: "1.4",
      width: "280px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,45,122,0.15)",
      display: "none",
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
    });

    const header = document.createElement("div");
    Object.assign(header.style, { display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" });

    const icon = document.createElement("span");
    icon.textContent = "🔊";
    icon.style.fontSize = "16px";

    const title = document.createElement("span");
    title.style.fontWeight = "700";
    title.style.fontSize = "13px";
    title.style.letterSpacing = "0.02em";
    title.style.textTransform = "uppercase";
    title.style.opacity = "0.9";
    title.style.color = "#ff2d7a";
    title.textContent = "Audio Output";

    header.appendChild(icon);
    header.appendChild(title);

    const msg = document.createElement("div");
    msg.id = UI_ID + "-msg";
    msg.style.marginBottom = "12px";
    msg.style.fontSize = "14px";
    msg.textContent = "…";

    const btn = document.createElement("button");
    btn.id = UI_BTN_ID;
    btn.textContent = "Choose output device";
    Object.assign(btn.style, {
      display: "block",
      width: "100%",
      padding: "9px 14px",
      fontSize: "13px",
      fontWeight: "600",
      fontFamily: "inherit",
      borderRadius: "0px",
      border: "0",
      cursor: "pointer",
      background: "#ff2d7a",
      color: "#fff",
      letterSpacing: "0.01em",
    });

    wrap.appendChild(header);
    wrap.appendChild(msg);
    wrap.appendChild(btn);
    document.documentElement.appendChild(wrap);

    btn.addEventListener("click", async () => { await promptAndApply("overlay-button"); });
  }

  function showOverlay(text, { buttonText = "Choose output device", disableButton = false, success = false } = {}) {
    if (!isTopFrame) return;
    ensureOverlay();
    const wrap = document.getElementById(UI_ID);
    const msg = document.getElementById(UI_ID + "-msg");
    const btn = document.getElementById(UI_BTN_ID);

    if (msg) msg.textContent = text;
    if (btn) {
      if (success) {
        btn.style.display = "none";
      } else {
        btn.style.display = "block";
        btn.textContent = buttonText;
        btn.disabled = disableButton;
        btn.style.opacity = disableButton ? "0.55" : "1";
        btn.style.cursor = disableButton ? "default" : "pointer";
        btn.style.background = "#ff2d7a";
      }
    }

    if (wrap) {
      clearTimeout(_hideTimer);
      clearTimeout(_hideCleanupTimer);
      wrap.classList.remove("tar-hiding");
      wrap.style.animation = "none";
      void wrap.offsetWidth;
      wrap.style.animation = "";
      wrap.style.display = "block";
    }
  }

  const FADE_OUT_MS = 400;
  let _hideTimer = null;
  let _hideCleanupTimer = null;
  function hideOverlay(delay = 0) {
    clearTimeout(_hideTimer);
    const wrap = document.getElementById(UI_ID);
    if (!wrap) return;
    const doFade = () => {
      wrap.classList.add("tar-hiding");
      _hideCleanupTimer = setTimeout(() => {
        wrap.classList.remove("tar-hiding");
        wrap.style.display = "none";
      }, FADE_OUT_MS);
    };
    if (delay > 0) {
      _hideTimer = setTimeout(doFade, delay);
    } else {
      doFade();
    }
  }

  /* ---------------- Routing logic ---------------- */

  function collectMediaElements(root = document) {
    const results = [];
    try { root.querySelectorAll("audio,video").forEach(el => results.push(el)); } catch (e) {}
    try {
      root.querySelectorAll("*").forEach(el => {
        if (el.shadowRoot) results.push(...collectMediaElements(el.shadowRoot));
      });
    } catch (e) {}
    return results;
  }

  async function applyToAllMedia(deviceId) {
    const media = collectMediaElements();
    let appliedAny = false;
    let lastError = null;

    for (const el of media) {
      if (typeof el.setSinkId !== "function") continue;
      try {
        if (el.sinkId === deviceId && armedElements.has(el) && !pendingElements.has(el)) {
          appliedAny = true;
          continue;
        }
        if (el.sinkId === deviceId) await el.setSinkId("");
        await el.setSinkId(deviceId);
        pendingElements.delete(el);
        armedElements.add(el);
        log(el.tagName, "->", deviceId.slice(0, 12));
        appliedAny = true;
      } catch (e) {
        lastError = e;
        warn(el.tagName, "setSinkId FAIL:", e?.name, e?.message);
      }
    }
    return { appliedAny, lastError };
  }

  let needsRearm = false;
  let promptInFlight = false;
  let sessionArmed = false;
  let hasEverArmed = false;
  let applyGeneration = 0;
  const armedElements = new WeakSet();
  const pendingElements = new WeakSet();
  let _deviceCache = null;
  let _skipPollTimer = null;

  function startSkipPoll() {
    clearInterval(_skipPollTimer);
    if (!_deviceCache?.deviceId) return;
    let ticks = 0;
    _skipPollTimer = setInterval(async () => {
      ticks++;
      if (ticks > 12) { clearInterval(_skipPollTimer); return; }
      const device = _deviceCache?.deviceId;
      if (!device) { clearInterval(_skipPollTimer); return; }
      for (const el of collectMediaElements()) {
        if (typeof el.setSinkId === "function" && el.sinkId !== device) {
          await applySavedToElement(el, { forceRearm: true });
        }
      }
    }, 250);
  }

  async function applySaved(reason) {
    const myGen = ++applyGeneration;
    const saved = await getSaved();

    if (!saved?.deviceId) {
      if (myGen !== applyGeneration) return false;
      needsRearm = true;
      showOverlay("Choose an output device for this tab.", { buttonText: "Choose output device" });
      return false;
    }

    for (let i = 1; i <= 10; i++) {
      if (myGen !== applyGeneration) return false;
      const r = await applyToAllMedia(saved.deviceId);
      if (myGen !== applyGeneration) return false;

      if (r.appliedAny) {
        sessionArmed = true;
        needsRearm = false;
        hideOverlay();
        return true;
      }

      if (r.lastError?.name === "NotFoundError") {
        if (!sessionArmed) {
          needsRearm = true;
          showOverlay(
            "Output routing needs to be re-armed for this tab.\nClick Play (or press the button) to choose an output device.",
            { buttonText: "Re-arm output" }
          );
          warn("Saved deviceId not valid in this session → re-arm on user gesture.");
        }
        return false;
      }

      await new Promise(res => setTimeout(res, 700));
    }

    if (myGen !== applyGeneration) return false;
    if (needsRearm && !sessionArmed) {
      showOverlay("Click Play to re-arm output routing (or press the button).", { buttonText: "Re-arm output" });
    } else {
      hideOverlay();
    }
    return false;
  }

  async function promptAndApply(source) {
    if (!isTopFrame) return;
    if (promptInFlight) return;
    promptInFlight = true;
    try {
      showOverlay("Picking output device…", { buttonText: "Picking…", disableButton: true });
      const d = await navigator.mediaDevices.selectAudioOutput();
      const deviceId = String(d?.deviceId || "");
      const label = String(d?.label || "");
      if (!deviceId) throw new Error("No deviceId returned");
      await savePicked(deviceId, label);
      await applySaved("after-pick");
      sessionArmed = true;
      hasEverArmed = true;
      needsRearm = false;
      showOverlay("✔ Output set — " + (label || "device"), { success: true });
      hideOverlay(3000);
    } catch (e) {
      warn("promptAndApply FAIL:", e?.name, e?.message);
      needsRearm = true;
      showOverlay("Could not set output. Click to try again.", { buttonText: "Choose output device" });
    } finally {
      promptInFlight = false;
    }
  }

  /* ---------------- Boot + event hooks ---------------- */

  async function applySavedToElement(el, { forceRearm = false } = {}) {
    if (typeof el.setSinkId !== "function") return;
    if (!forceRearm && armedElements.has(el)) return;

    const fast = _deviceCache;
    if (fast?.deviceId) {
      try {
        const alreadySet = el.sinkId === fast.deviceId;
        if (forceRearm && alreadySet) {
          await el.setSinkId("");
        }
        if (!alreadySet || forceRearm) await el.setSinkId(fast.deviceId);
        pendingElements.add(el);
        sessionArmed = true;
        return;
      } catch (e) {
        if (e?.name !== "NotFoundError") {
          warn("applySavedToElement FAIL:", e?.name, e?.message);
          return;
        }
      }
    }

    const saved = await getSaved();
    if (!saved?.deviceId) return;

    for (let attempt = 0; attempt < 5; attempt++) {
      if (!forceRearm && armedElements.has(el)) return;
      try {
        if (el.sinkId !== saved.deviceId) await el.setSinkId(saved.deviceId);
        pendingElements.add(el);
        sessionArmed = true;
        return;
      } catch (e) {
        if (e?.name !== "NotFoundError" || attempt === 4) {
          warn("applySavedToElement: setSinkId FAIL after", attempt + 1, "attempts:", e?.name);
          needsRearm = true;
          showOverlay(
            "Output routing needs to be re-armed.\nPress the button to select your audio device.",
            { buttonText: "Re-arm output" }
          );
          return;
        }
        await new Promise(r => setTimeout(r, 150));
      }
    }
  }

  const _mediaObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.("audio,video")) applySavedToElement(node);
        node.querySelectorAll?.("audio,video").forEach(el => applySavedToElement(el));
        if (node.shadowRoot) {
          _mediaObserver.observe(node.shadowRoot, { childList: true, subtree: true });
          node.shadowRoot.querySelectorAll("audio,video").forEach(el => applySavedToElement(el));
        }
      }
    }
  });
  try { _mediaObserver.observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}

  ensureOverlay();
  applySaved("initial");

  document.addEventListener("click", (ev) => {
    if (!needsRearm || hasEverArmed) return;
    const t = ev.target;
    if (!t) return;
    if (t.closest?.(`#${UI_BTN_ID}`)) return;
    if (t.closest?.("input,select,textarea,a[href],label")) return;
    promptAndApply("click-heuristic");
  }, true);

  document.addEventListener("play", () => applySaved("play"), true);
  document.addEventListener("playing", () => applySaved("playing"), true);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) applySaved("visibility");
  });

  document.addEventListener("emptied", (ev) => {
    const el = ev.composedPath?.()?.[0] ?? ev.target;
    if (el.tagName !== "AUDIO" && el.tagName !== "VIDEO") return;
    if (!hasEverArmed) return;
    armedElements.delete(el);
    pendingElements.delete(el);
    startSkipPoll();
  }, true);

  document.addEventListener("loadstart", async (ev) => {
    const el = ev.composedPath?.()?.[0] ?? ev.target;
    if (el.tagName !== "AUDIO" && el.tagName !== "VIDEO") return;
    if (!hasEverArmed) return;
    if (!_deviceCache?.deviceId) return;
    armedElements.delete(el);
    await applySavedToElement(el, { forceRearm: true });
  }, true);

})();