window.AgSynth = (() => {
  let audioCtx = null;
  let analyser = null;
  let glottalWave = null;
  let currentAudioEl = null;
  let currentBlobUrl = null;
  let activeSynthNodes = null;
  let activeVisemes = [];
  let playMode = "none";
  let synthStartTimeCtx = 0;
  let synthEndTimeCtx = 0;

  const state = {
    token: "ag", phoneme: "sil", koma_node: 0, base_f0: 130.81, pitch_hz: 130.81,
    jaw_open: 0.20, tongue_x: 0.48, tongue_y: 0.32,
    lip_open: 0.14, lip_round: 0.05, velum_open: 0.00,
    glottis_voicing: 0.00, f1: 750, f2: 1220, f3: 2500
  };

  const PHONEME_TABLE = {
    "a": [1.35, 0.25, 0.15, 1.35, 0.00, 0.00, 1.00, 0.00, 740, 1220, 2500, 1700],
    "e": [0.90, 0.78, 0.42, 1.15, 0.00, 0.00, 1.00, 0.00, 500, 1880, 2560, 2000],
    "i": [0.42, 0.90, 0.65, 1.05, 0.00, 0.00, 1.00, 0.00, 300, 2260, 2940, 2400],
    "ı": [0.48, 0.45, 0.55, 1.00, 0.00, 0.00, 1.00, 0.00, 400, 1460, 2460, 1900],
    "o": [0.80, 0.18, 0.36, 0.60, 0.85, 0.00, 1.00, 0.00, 460,  860, 2380, 1350],
    "ö": [0.74, 0.72, 0.45, 0.58, 0.85, 0.00, 1.00, 0.00, 430, 1550, 2300, 1700],
    "u": [0.44, 0.16, 0.60, 0.36, 0.95, 0.00, 1.00, 0.00, 310,  760, 2240, 1150],
    "ü": [0.40, 0.82, 0.62, 0.34, 0.95, 0.00, 1.00, 0.00, 300, 1700, 2240, 1550],
    "b": [0.10, 0.50, 0.32, 0.02, 0.05, 0.00, 0.62, 0.18, 280,  950, 2200, 1100],
    "p": [0.10, 0.50, 0.32, 0.02, 0.05, 0.00, 0.00, 0.34, 280,  950, 2200, 1150],
    "m": [0.12, 0.50, 0.32, 0.02, 0.05, 0.88, 0.88, 0.00, 260, 1050, 2250, 1000],
    "d": [0.26, 0.86, 0.94, 0.68, 0.05, 0.00, 0.62, 0.22, 340, 1650, 2540, 3100],
    "t": [0.26, 0.86, 0.94, 0.68, 0.05, 0.00, 0.00, 0.40, 340, 1650, 2540, 3300],
    "n": [0.28, 0.86, 0.94, 0.70, 0.05, 0.88, 0.88, 0.00, 280, 1550, 2480, 2200],
    "k": [0.40, 0.18, 0.94, 0.78, 0.05, 0.00, 0.00, 0.42, 360, 1180, 2360, 1850],
    "g": [0.40, 0.18, 0.94, 0.78, 0.05, 0.00, 0.62, 0.24, 360, 1180, 2360, 1800],
    "w": [0.34, 0.20, 0.58, 0.32, 0.88, 0.00, 0.92, 0.03, 330,  820, 2240, 1100],
    "v": [0.28, 0.62, 0.40, 0.28, 0.10, 0.00, 0.72, 0.30, 360, 1220, 2400, 2400],
    "f": [0.28, 0.62, 0.40, 0.28, 0.10, 0.00, 0.00, 0.44, 380, 1260, 2440, 2600],
    "s": [0.24, 0.88, 0.84, 0.68, 0.05, 0.00, 0.00, 0.62, 360, 1750, 2720, 3800],
    "z": [0.24, 0.88, 0.84, 0.68, 0.05, 0.00, 0.68, 0.45, 360, 1750, 2720, 3500],
    "ş": [0.28, 0.76, 0.82, 0.52, 0.60, 0.00, 0.00, 0.58, 380, 1940, 2640, 2800],
    "r": [0.48, 0.86, 0.76, 0.85, 0.05, 0.00, 0.92, 0.08, 440, 1420, 1960, 2100],
    "l": [0.48, 0.86, 0.74, 0.88, 0.05, 0.00, 0.94, 0.03, 380, 1520, 2520, 2200],
    "y": [0.38, 0.88, 0.70, 0.92, 0.05, 0.00, 0.94, 0.03, 320, 2100, 2840, 2600],
    "h": [0.68, 0.45, 0.32, 0.92, 0.10, 0.00, 0.00, 0.40, 560, 1460, 2480, 2000],
    "sil": [0.20, 0.48, 0.32, 0.14, 0.05, 0.00, 0.00, 0.00, 500, 1500, 2500, 1900]
  };
  const VOWELS = new Set(["a", "e", "i", "ı", "o", "ö", "u", "ü"]);
  const STOPS = new Set(["p", "b", "t", "d", "k", "g"]);
  const VOICED_STOPS = new Set(["b", "d", "g"]);

  function trLower(s) {
    return s.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase();
  }

  function buildSoftGlottalWave(ctx) {
    // Yumuşak, sıcak ses teli harmonik eğrisi (sert cızırtıyı önler)
    const harmonics = 20;
    const real = new Float32Array(harmonics);
    const imag = new Float32Array(harmonics);
    for (let n = 1; n < harmonics; n++) {
      imag[n] = 1.0 / Math.pow(n, 1.55);
    }
    return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  function unlockAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.76;
      glottalWave = buildSoftGlottalWave(audioCtx);
    }
    if (audioCtx.state !== "running") {
      audioCtx.resume().catch(() => {});
    }
    try {
      const silentBuf = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
      const src = audioCtx.createBufferSource();
      src.buffer = silentBuf;
      src.connect(audioCtx.destination);
      src.start(0);
    } catch (_) {}
  }

  function stopSpeech(label = "DURDURULDU") {
    playMode = "none";
    if (currentAudioEl) {
      try { currentAudioEl.pause(); currentAudioEl.src = ""; } catch (_) {}
      currentAudioEl = null;
    }
    if (currentBlobUrl) {
      try { URL.revokeObjectURL(currentBlobUrl); } catch (_) {}
      currentBlobUrl = null;
    }
    if (activeSynthNodes) {
      try {
        activeSynthNodes.masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
        activeSynthNodes.masterGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
        activeSynthNodes.oscMain.stop();
        activeSynthNodes.oscSub.stop();
        activeSynthNodes.noiseSrc.stop();
      } catch (_) {}
      activeSynthNodes = null;
    }
    activeVisemes = [];
    state.glottis_voicing = 0.0;
    state.velum_open = 0.0;
    state.jaw_open = 0.20;
    state.lip_open = 0.14;
    state.lip_round = 0.05;
    state.phoneme = "sil";
    if (window.AgApp) window.AgApp.setStatus(label);
  }

  function buildSynthTimeline(gunesText, metaItems = [], slowMode = false) {
    const tokens = gunesText.match(/[a-zA-ZçğıöşüÇĞİÖŞÜ]+|[.,!?;]/g) || [];
    const timeline = [];
    const tempo = slowMode ? 1.65 : 1.0;
    const pauseTempo = slowMode ? 1.50 : 1.0;
    let cursor = 0.05;
    let wordIdx = 0;

    for (const tok of tokens) {
      if (/^[.,!?;]$/.test(tok)) {
        const pauseDur = (tok === "," || tok === ";") ? (0.34 * pauseTempo) : (0.52 * pauseTempo);
        const sil = PHONEME_TABLE["sil"];
        timeline.push({
          start_s: cursor, end_s: cursor + pauseDur,
          token: "—", phoneme: "sil", koma_node: 0,
          jaw_open: sil[0], tongue_x: sil[1], tongue_y: sil[2],
          lip_open: sil[3], lip_round: sil[4], velum_open: sil[5],
          voicing: 0, frication: 0, f1: sil[8], f2: sil[9], f3: sil[10], burstFreq: 1900
        });
        cursor += pauseDur;
        continue;
      }

      const meta = metaItems[wordIdx] || {};
      const koma = typeof meta.koma_slot === "number"
        ? meta.koma_slot
        : [...tok].reduce((acc, ch, i) => (acc + (i + 1) * ch.charCodeAt(0)) % 53, 0);

      const chars = [...trLower(tok)].filter(c => PHONEME_TABLE[c]);
      if (chars.length === 0) chars.push("a");

      for (const c of chars) {
        const p = PHONEME_TABLE[c];
        if (STOPS.has(c)) {
          const closureDur = 0.030 * tempo;
          timeline.push({
            start_s: cursor, end_s: cursor + closureDur,
            token: tok, phoneme: c, koma_node: koma,
            jaw_open: p[0] * 0.5, tongue_x: p[1], tongue_y: p[2],
            lip_open: p[3] * 0.4, lip_round: p[4], velum_open: 0,
            voicing: VOICED_STOPS.has(c) ? 0.14 : 0.0, frication: 0.0,
            f1: p[8], f2: p[9], f3: p[10], burstFreq: p[11]
          });
          cursor += closureDur;

          const burstDur = 0.036 * tempo;
          timeline.push({
            start_s: cursor, end_s: cursor + burstDur,
            token: tok, phoneme: c, koma_node: koma,
            jaw_open: p[0], tongue_x: p[1], tongue_y: p[2],
            lip_open: p[3], lip_round: p[4], velum_open: p[5],
            voicing: p[6], frication: p[7] * 1.15,
            f1: p[8], f2: p[9], f3: p[10], burstFreq: p[11]
          });
          cursor += burstDur;
        } else {
          const dur = (VOWELS.has(c) ? 0.138 : 0.072) * tempo;
          timeline.push({
            start_s: cursor, end_s: cursor + dur,
            token: tok, phoneme: c, koma_node: koma,
            jaw_open: p[0], tongue_x: p[1], tongue_y: p[2],
            lip_open: p[3], lip_round: p[4], velum_open: p[5],
            voicing: p[6], frication: p[7],
            f1: p[8], f2: p[9], f3: p[10], burstFreq: p[11]
          });
          cursor += dur;
        }
      }

      const wordGap = 0.155 * pauseTempo;
      const sil = PHONEME_TABLE["sil"];
      timeline.push({
        start_s: cursor, end_s: cursor + wordGap,
        token: tok, phoneme: "sil", koma_node: koma,
        jaw_open: sil[0], tongue_x: sil[1], tongue_y: sil[2],
        lip_open: sil[3], lip_round: sil[4], velum_open: sil[5],
        voicing: 0, frication: 0, f1: sil[8], f2: sil[9], f3: sil[10], burstFreq: 1900
      });
      cursor += wordGap;
      wordIdx++;
    }
    return { timeline, totalDur: cursor };
  }

  async function speakFormant(gunesText, metaItems, voiceId, slowMode = false) {
    stopSpeech(slowMode ? "YAVAŞ SENTEZ..." : "53-KOMA YUMUŞAK...");
    unlockAudio();
    if (audioCtx.state !== "running") {
      await audioCtx.resume();
    }

    const { timeline, totalDur } = buildSynthTimeline(gunesText, metaItems, slowMode);
    if (!timeline.length) return;

    const octaveMult = voiceId === "synth_deep" ? 0.72 : 1.0;
    const now = audioCtx.currentTime + 0.02;

    // Yumuşak Harmonik Ses Teli Kaynağı + Sıcak Sinüs Gövde
    const oscMain = audioCtx.createOscillator();
    if (glottalWave) oscMain.setPeriodicWave(glottalWave);
    else oscMain.type = "triangle";

    const oscSub = audioCtx.createOscillator();
    oscSub.type = "sine";

    const subGain = audioCtx.createGain();
    subGain.gain.setValueAtTime(0.45, now);

    const glottalFilter = audioCtx.createBiquadFilter();
    glottalFilter.type = "lowpass";
    glottalFilter.frequency.setValueAtTime(2150, now);
    glottalFilter.Q.setValueAtTime(0.65, now);

    const voiceGain = audioCtx.createGain();
    voiceGain.gain.setValueAtTime(0.0001, now);

    oscMain.connect(glottalFilter);
    oscSub.connect(subGain);
    subGain.connect(glottalFilter);
    glottalFilter.connect(voiceGain);

    // Yumuşatılmış Ünsüz Hava Akışı Kaynağı
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noiseSrc = audioCtx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.loop = true;

    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(2500, now);
    noiseFilter.Q.setValueAtTime(2.6, now);

    const noiseSoftLp = audioCtx.createBiquadFilter();
    noiseSoftLp.type = "lowpass";
    noiseSoftLp.frequency.setValueAtTime(4600, now);

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseSoftLp);
    noiseSoftLp.connect(noiseGain);

    // Doğal Yuvarlatılmış Formant Rezonatörleri
    const f1Filter = audioCtx.createBiquadFilter();
    f1Filter.type = "bandpass";
    f1Filter.Q.setValueAtTime(5.2, now);
    const f1Gain = audioCtx.createGain();
    f1Gain.gain.setValueAtTime(1.40, now);

    const f2Filter = audioCtx.createBiquadFilter();
    f2Filter.type = "bandpass";
    f2Filter.Q.setValueAtTime(6.5, now);
    const f2Gain = audioCtx.createGain();
    f2Gain.gain.setValueAtTime(1.10, now);

    const f3Filter = audioCtx.createBiquadFilter();
    f3Filter.type = "bandpass";
    f3Filter.Q.setValueAtTime(7.5, now);
    const f3Gain = audioCtx.createGain();
    f3Gain.gain.setValueAtTime(0.55, now);

    const f4Filter = audioCtx.createBiquadFilter();
    f4Filter.type = "bandpass";
    f4Filter.frequency.setValueAtTime(3400, now);
    f4Filter.Q.setValueAtTime(7.0, now);
    const f4Gain = audioCtx.createGain();
    f4Gain.gain.setValueAtTime(0.22, now);

    const nasalFilter = audioCtx.createBiquadFilter();
    nasalFilter.type = "bandpass";
    nasalFilter.frequency.setValueAtTime(265, now);
    nasalFilter.Q.setValueAtTime(5.5, now);
    const nasalGain = audioCtx.createGain();
    nasalGain.gain.setValueAtTime(0.001, now);

    voiceGain.connect(f1Filter);
    voiceGain.connect(f2Filter);
    voiceGain.connect(f3Filter);
    voiceGain.connect(f4Filter);
    voiceGain.connect(nasalFilter);

    const consGain = audioCtx.createGain();
    consGain.gain.setValueAtTime(0.62, now);
    noiseGain.connect(consGain);

    // Hafif Sıcaklık & Netlik Dengesi
    const warmthEq = audioCtx.createBiquadFilter();
    warmthEq.type = "lowshelf";
    warmthEq.frequency.setValueAtTime(320, now);
    warmthEq.gain.setValueAtTime(3.2, now);

    const clarityShelf = audioCtx.createBiquadFilter();
    clarityShelf.type = "highshelf";
    clarityShelf.frequency.setValueAtTime(2100, now);
    clarityShelf.gain.setValueAtTime(2.0, now);

    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-16, now);
    compressor.knee.setValueAtTime(16, now);
    compressor.ratio.setValueAtTime(3.2, now);
    compressor.attack.setValueAtTime(0.008, now);
    compressor.release.setValueAtTime(0.09, now);

    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.68, now);

    f1Filter.connect(f1Gain); f1Gain.connect(warmthEq);
    f2Filter.connect(f2Gain); f2Gain.connect(warmthEq);
    f3Filter.connect(f3Gain); f3Gain.connect(warmthEq);
    f4Filter.connect(f4Gain); f4Gain.connect(warmthEq);
    nasalFilter.connect(nasalGain); nasalGain.connect(warmthEq);
    consGain.connect(warmthEq);

    warmthEq.connect(clarityShelf);
    clarityShelf.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(analyser);
    analyser.connect(audioCtx.destination);

    for (const seg of timeline) {
      const t0 = now + seg.start_s;
      const f0 = state.base_f0 * octaveMult * Math.pow(2.0, seg.koma_node / 53.0);
      oscMain.frequency.setTargetAtTime(f0, t0, 0.015);
      oscSub.frequency.setTargetAtTime(f0, t0, 0.015);
      f1Filter.frequency.setTargetAtTime(seg.f1, t0, 0.015);
      f2Filter.frequency.setTargetAtTime(seg.f2, t0, 0.015);
      f3Filter.frequency.setTargetAtTime(seg.f3, t0, 0.015);
      noiseFilter.frequency.setTargetAtTime(seg.burstFreq || 2400, t0, 0.012);
      voiceGain.gain.setTargetAtTime(Math.max(0.0001, seg.voicing * 0.90), t0, 0.014);
      noiseGain.gain.setTargetAtTime(Math.max(0.0001, seg.frication * 0.24), t0, 0.010);
      nasalGain.gain.setTargetAtTime(Math.max(0.0001, seg.velum_open * 0.85), t0, 0.014);
    }

    const endAt = now + totalDur + 0.06;
    masterGain.gain.setTargetAtTime(0.0001, endAt - 0.05, 0.018);

    oscMain.start(now); oscSub.start(now); noiseSrc.start(now);
    oscMain.stop(endAt); oscSub.stop(endAt); noiseSrc.stop(endAt);

    activeSynthNodes = { oscMain, oscSub, noiseSrc, masterGain, octaveMult };
    activeVisemes = timeline;
    synthStartTimeCtx = now;
    synthEndTimeCtx = endAt;
    playMode = "synth";
    if (window.AgApp) window.AgApp.setStatus(slowMode ? "YAVAŞ SENTEZ" : "YUMUŞAK NET");
  }

  async function speakNeuralAI(gunesText, voiceId, slowMode = false) {
    stopSpeech(slowMode ? "AI YAVAŞ..." : "AI ÜRETİYOR...");
    unlockAudio();
    try {
      const res = await fetch("/api/v1/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: gunesText, voice_id: voiceId })
      });
      if (!res.ok) throw new Error("TTS API Hatası");
      const data = await res.json();

      const rate = slowMode ? 0.65 : 1.0;
      activeVisemes = (data.visemes || []).map(v => ({
        ...v, start_s: v.start_s / rate, end_s: v.end_s / rate
      }));

      const binStr = atob(data.audio_base64);
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
      const blob = new Blob([bytes], { type: data.mime_type || "audio/mpeg" });
      currentBlobUrl = URL.createObjectURL(blob);

      const audio = new Audio(currentBlobUrl);
      audio.playbackRate = rate;

      try {
        const sourceNode = audioCtx.createMediaElementSource(audio);
        sourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
      } catch (_) {}

      currentAudioEl = audio;
      playMode = "ai";
      if (window.AgApp) window.AgApp.setStatus(slowMode ? "AI YAVAŞ" : "AI KONUŞUYOR");

      audio.onended = () => stopSpeech("TAMAMLANDI");
      audio.onerror = () => speakFormant(gunesText, [], "synth_koma", slowMode);
      await audio.play();
    } catch (err) {
      console.warn("AI TTS fallback to Formant Synth:", err);
      await speakFormant(gunesText, [], "synth_koma", slowMode);
    }
  }

  async function speak(gunesText, metaItems = [], forceSlow = false) {
    if (!gunesText || !gunesText.trim()) return;
    const slowMode = forceSlow || (document.getElementById("speedSelect").value !== "1.0");
    const voiceId = document.getElementById("voiceSelect").value;
    if (voiceId.startsWith("synth_")) {
      await speakFormant(gunesText, metaItems, voiceId, slowMode);
    } else {
      await speakNeuralAI(gunesText, voiceId, slowMode);
    }
  }

  function tickLipSync() {
    if (playMode === "none" || !analyser) return;
    const timeDomain = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(timeDomain);
    let sumSq = 0;
    for (let i = 0; i < timeDomain.length; i++) {
      const norm = (timeDomain[i] - 128) / 128.0;
      sumSq += norm * norm;
    }
    const rms = Math.min(1.0, Math.sqrt(sumSq / timeDomain.length) * 4.2);

    let t = 0;
    if (playMode === "ai" && currentAudioEl) {
      t = currentAudioEl.currentTime;
    } else if (playMode === "synth" && audioCtx) {
      if (audioCtx.currentTime >= synthEndTimeCtx) {
        stopSpeech("TAMAMLANDI");
        return;
      }
      t = Math.max(0, audioCtx.currentTime - synthStartTimeCtx);
    }

    let target = null;
    for (let i = 0; i < activeVisemes.length; i++) {
      if (t >= activeVisemes[i].start_s && t <= activeVisemes[i].end_s) {
        target = activeVisemes[i];
        break;
      }
    }

    if (target) {
      state.token = target.token;
      state.phoneme = target.phoneme;
      state.koma_node = target.koma_node;
      state.pitch_hz = Math.round(state.base_f0 * Math.pow(2.0, target.koma_node / 53.0) * 10) / 10;
      if (target.f1) { state.f1 = target.f1; state.f2 = target.f2; state.f3 = target.f3; }

      const energyGain = playMode === "synth" ? 0.95 : (0.45 + rms * 0.85);
      state.jaw_open += ((target.jaw_open * energyGain) - state.jaw_open) * 0.34;
      state.tongue_x += (target.tongue_x - state.tongue_x) * 0.32;
      state.tongue_y += (target.tongue_y - state.tongue_y) * 0.32;
      state.lip_open += ((target.lip_open * energyGain) - state.lip_open) * 0.34;
      state.lip_round += (target.lip_round - state.lip_round) * 0.32;
      state.velum_open += (target.velum_open - state.velum_open) * 0.32;
    } else {
      state.jaw_open += ((0.20 + rms * 0.65) - state.jaw_open) * 0.25;
      state.lip_open += ((0.14 + rms * 0.75) - state.lip_open) * 0.25;
    }
    state.glottis_voicing = playMode === "ai" ? Math.max(rms, 0.38) : rms;
  }

  function setBaseF0(val) {
    state.base_f0 = val;
    state.pitch_hz = Math.round(state.base_f0 * Math.pow(2.0, state.koma_node / 53.0) * 10) / 10;
    if (playMode === "synth" && activeSynthNodes && audioCtx) {
      const f0 = state.pitch_hz * activeSynthNodes.octaveMult;
      activeSynthNodes.oscMain.frequency.setTargetAtTime(f0, audioCtx.currentTime, 0.02);
      activeSynthNodes.oscSub.frequency.setTargetAtTime(f0, audioCtx.currentTime, 0.02);
    }
  }

  return {
    unlockAudio,
    state,
    speak,
    stopSpeech,
    tickLipSync,
    setBaseF0,
    getAnalyser: () => analyser
  };
})();
