window.AgApp = (() => {
  let lastTranslatedItems = [];
  let lastDecodedResults = [];

  function updateClock() {
    const now = new Date();
    const str = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    document.getElementById("localClock").textContent = `LOCAL TIME // ${str}`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  function setStatus(txt) {
    document.getElementById("hudStatus").textContent = txt;
  }

  function updateHUD() {
    const s = window.AgSynth.state;
    document.getElementById("hudPhoneme").textContent = `/${s.phoneme}/`;
    document.getElementById("hudToken").textContent = `HECE: ${s.token}`;
    document.getElementById("hudFormants").textContent =
      `F₀: ${s.pitch_hz.toFixed(1)}Hz • F₁: ${Math.round(s.f1)} • F₂: ${Math.round(s.f2)} • F₃: ${Math.round(s.f3)}`;

    const cadF0 = document.getElementById("cadGlottisVal");
    const cadTongue = document.getElementById("cadTongueVal");
    const cadLip = document.getElementById("cadLipVal");
    if (cadF0) cadF0.textContent = `${s.pitch_hz.toFixed(1)} Hz`;
    if (cadTongue) cadTongue.textContent = `X:${s.tongue_x.toFixed(2)} Y:${s.tongue_y.toFixed(2)}`;
    if (cadLip) cadLip.textContent = `OPEN:${s.lip_open.toFixed(2)}`;

    const ringFg = document.getElementById("komaRingFg");
    const ringVal = document.getElementById("komaRingVal");
    if (ringFg && ringVal) {
      const pct = Math.max(0.03, s.koma_node / 53);
      ringFg.style.strokeDashoffset = (226 * (1 - pct)).toFixed(1);
      ringVal.textContent = `${s.koma_node}`;
    }

    const setBar = (id, pct) => {
      const el = document.getElementById(id);
      if (el) el.style.height = `${Math.max(8, Math.min(100, pct))}%`;
    };
    setBar("barF1", (s.f1 / 900) * 100);
    setBar("barF2", (s.f2 / 2500) * 100);
    setBar("barF3", (s.f3 / 3200) * 100);
    setBar("barRms", s.glottis_voicing * 100);
    setBar("barZ53", (s.koma_node / 53) * 100);

    document.getElementById("slJaw").value = s.jaw_open;
    document.getElementById("valJaw").textContent = s.jaw_open.toFixed(2);
    document.getElementById("slTx").value = s.tongue_x;
    document.getElementById("valTx").textContent = s.tongue_x.toFixed(2);
    document.getElementById("slTy").value = s.tongue_y;
    document.getElementById("valTy").textContent = s.tongue_y.toFixed(2);
    document.getElementById("slLo").value = s.lip_open;
    document.getElementById("valLo").textContent = s.lip_open.toFixed(2);
    document.getElementById("slLr").value = s.lip_round;
    document.getElementById("valLr").textContent = s.lip_round.toFixed(2);
    document.getElementById("slVel").value = s.velum_open;
    document.getElementById("valVel").textContent = s.velum_open.toFixed(2);
    document.getElementById("slGlo").value = s.glottis_voicing;
    document.getElementById("valGlo").textContent = s.glottis_voicing.toFixed(2);
    document.getElementById("slF0").value = s.base_f0;
    document.getElementById("valF0").textContent = s.base_f0.toFixed(1);
  }

  async function checkApiHealth() {
    try {
      const res = await fetch("/api/v1/health");
      const data = await res.json();
      document.getElementById("apiStatusText").textContent = `MOTOR AKTİF • ${data.suffixes_count} Z₅₃ EK`;
    } catch (_) {
      document.getElementById("apiStatusText").textContent = "53-KOMA YEREL SYNTH";
    }
  }

  async function runTranslation(andSpeak = false, forceSlow = false) {
    const text = document.getElementById("trInput").value;
    let gunesText = document.getElementById("gunesOutput").textContent.trim();

    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 3500);
      const res = await fetch("/api/v1/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: ctrl.signal
      });
      clearTimeout(tid);
      if (res.ok) {
        const data = await res.json();
        lastTranslatedItems = data.items || [];
        gunesText = data.gunes_text;
        document.getElementById("gunesOutput").textContent = gunesText;
        document.getElementById("trMeta").textContent = `${data.word_count} KELİME • ${data.elapsed_ms} MS`;

        const list = document.getElementById("morphList");
        list.innerHTML = "";
        for (const item of lastTranslatedItems) {
          const div = document.createElement("div");
          div.className = "morph-item";
          const sufHtml = item.suffixes.join("");
          const badgesHtml = [
            item.root_gunes ? `<span class="badge">Kök: ${item.root_gunes}</span>` : "",
            ...item.suffix_details.map(s => `<span class="badge">${s.code}: ${s.role}</span>`),
            `<span class="badge">Z₅₃:${item.koma_slot}</span>`
          ].join("");

          div.innerHTML = `
            <div class="morph-top">
              <span class="morph-src">${item.source}</span>
              <span class="morph-dst"><span class="root">${item.root_gunes}</span><span class="suf">${sufHtml}</span></span>
            </div>
            <div class="badges">${badgesHtml}</div>
          `;
          list.appendChild(div);
        }
      }
    } catch (err) {
      console.warn("Translate fallback:", err);
    }

    if (andSpeak && gunesText) {
      await window.AgSynth.speak(gunesText, lastTranslatedItems, forceSlow);
    }
  }

  async function runDecode(andSpeak = false, forceSlow = false) {
    const text = document.getElementById("gunesInput").value;
    try {
      const res = await fetch("/api/v1/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const data = await res.json();
        lastDecodedResults = data.results || [];

        const list = document.getElementById("decodeList");
        list.innerHTML = "";
        for (const r of lastDecodedResults) {
          const div = document.createElement("div");
          div.className = "morph-item";
          const slotBadges = r.slots.map(s => `<span class="badge">${s.code} → ${s.role}</span>`).join("");
          div.innerHTML = `
            <div class="morph-top">
              <span class="morph-dst"><span class="root">${r.segmented}</span></span>
              <span style="color:var(--accent);font-weight:700;">≈ ${r.tr_reconstructed}</span>
            </div>
            <div class="badges">
              <span class="badge">Kök (${r.root_pos}): ${r.root_tr}</span>
              ${slotBadges}
            </div>
          `;
          list.appendChild(div);
        }
      }
    } catch (err) {
      console.warn("Decode fallback:", err);
    }

    if (andSpeak && text.trim()) {
      const meta = lastDecodedResults.map(r => ({
        koma_slot: r.slots && r.slots.length ? r.slots[r.slots.length - 1].koma : 0
      }));
      await window.AgSynth.speak(text, meta, forceSlow);
    }
  }

  async function sendChatMessage() {
    const input = document.getElementById("chatInput");
    const msg = input.value.trim();
    if (!msg) return;
    input.value = "";

    const log = document.getElementById("chatLog");
    const userDiv = document.createElement("div");
    userDiv.className = "chat-msg user";
    userDiv.textContent = msg;
    log.appendChild(userDiv);
    log.scrollTop = log.scrollHeight;

    try {
      const res = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, voice_id: document.getElementById("voiceSelect").value })
      });
      const data = await res.json();
      document.getElementById("chatEngineBadge").textContent = data.ai_engine;

      const botDiv = document.createElement("div");
      botDiv.className = "chat-msg bot";
      botDiv.innerHTML = `
        <div class="g-line">☀️ ${data.gunes_text}</div>
        <div class="tr-line">🇹🇷 ${data.reply_tr}</div>
      `;
      log.appendChild(botDiv);
      log.scrollTop = log.scrollHeight;

      await window.AgSynth.speak(data.gunes_text, data.items || [], false);
    } catch (err) {
      console.error(err);
    }
  }

  function switchTab(activeTabId, activePaneId) {
    ["tabTrToGunes", "tabGunesToTr", "tabAiChat"].forEach(id => {
      document.getElementById(id).classList.toggle("active", id === activeTabId);
    });
    ["paneTrToGunes", "paneGunesToTr", "paneAiChat"].forEach(id => {
      document.getElementById(id).style.display = id === activePaneId ? "flex" : "none";
    });
  }

  function bindEvents() {
    document.getElementById("tabTrToGunes").addEventListener("click", () => switchTab("tabTrToGunes", "paneTrToGunes"));
    document.getElementById("tabGunesToTr").addEventListener("click", () => {
      switchTab("tabGunesToTr", "paneGunesToTr");
      runDecode(false, false);
    });
    document.getElementById("tabAiChat").addEventListener("click", () => switchTab("tabAiChat", "paneAiChat"));

    document.getElementById("presetSelect").addEventListener("change", (e) => {
      const presets = {
        s1: "Güneş doğarken çocuklar evlerinden çıkıp okullarına gidiyorlardı. Gözlemcilerimiz bu olayı görmemişler miydi?",
        s2: "Derdin ne?",
        s3: "Kitaplarımızdan öğrendiklerimizi unutmayacağız. Güneşte yürüyenler terliyordu.",
        s4: "Merhaba dünya, güneş dili konuşuyor."
      };
      document.getElementById("trInput").value = presets[e.target.value];
      runTranslation(false, false);
    });

    document.getElementById("translateBtn").addEventListener("click", () => runTranslation(false, false));
    document.getElementById("speakBtn").addEventListener("click", () => {
      window.AgSynth.unlockAudio();
      runTranslation(true, false);
    });
    document.getElementById("speakSlowBtn").addEventListener("click", () => {
      window.AgSynth.unlockAudio();
      runTranslation(true, true);
    });
    document.getElementById("stopBtn").addEventListener("click", () => window.AgSynth.stopSpeech("DURDURULDU"));

    document.getElementById("decodeBtn").addEventListener("click", () => runDecode(false, false));
    document.getElementById("speakGunesBtn").addEventListener("click", () => {
      window.AgSynth.unlockAudio();
      runDecode(true, false);
    });
    document.getElementById("speakGunesSlowBtn").addEventListener("click", () => {
      window.AgSynth.unlockAudio();
      runDecode(true, true);
    });
    document.getElementById("stopBtn2").addEventListener("click", () => window.AgSynth.stopSpeech("DURDURULDU"));

    document.getElementById("chatSendBtn").addEventListener("click", () => {
      window.AgSynth.unlockAudio();
      sendChatMessage();
    });
    document.getElementById("chatInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        window.AgSynth.unlockAudio();
        sendChatMessage();
      }
    });

    const sliderMap = [
      ["slJaw", "jaw_open"], ["slTx", "tongue_x"], ["slTy", "tongue_y"],
      ["slLo", "lip_open"], ["slLr", "lip_round"], ["slVel", "velum_open"],
      ["slGlo", "glottis_voicing"]
    ];
    sliderMap.forEach(([id, key]) => {
      document.getElementById(id).addEventListener("input", (e) => {
        const s = window.AgSynth.state;
        s[key] = parseFloat(e.target.value);
        s.token = "MANUEL_3D_POSE";
        s.f1 = Math.round(260 + s.jaw_open * 360 - s.tongue_y * 120);
        s.f2 = Math.round(750 + s.tongue_x * 1650 - s.lip_round * 420);
        s.f3 = Math.round(2200 + s.tongue_x * 650 - s.lip_round * 250);
        updateHUD();
      });
    });

    document.getElementById("slF0").addEventListener("input", (e) => {
      window.AgSynth.setBaseF0(parseFloat(e.target.value));
      updateHUD();
    });
  }

  function init() {
    bindEvents();
    checkApiHealth();
    runTranslation(false, false);
    window.AgHead3D.startLoop(() => {
      window.AgSynth.tickLipSync();
      updateHUD();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
  return { setStatus, updateHUD };
})();
