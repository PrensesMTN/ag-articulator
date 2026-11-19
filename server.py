import base64
import asyncio
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path
from typing import Dict, List, Optional, Tuple

try:
    import edge_tts
    EDGE_TTS_LOADED = True
    EDGE_TTS_STATUS_MSG = "edge-tts loaded"
except Exception as import_err:
    edge_tts = None
    EDGE_TTS_LOADED = False
    EDGE_TTS_STATUS_MSG = f"edge-tts import_error: {import_err}"
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

# ============================================================================
# 1. RESMİ GÜNEŞ DİLİ MOTORLARINI İÇE AKTAR (tokenizer/gunes_dil_v4 & engine/gunes_dili)
# ============================================================================
BASE_DIR = Path(__file__).resolve().parent
VENDOR_DIR = BASE_DIR / "vendor_gunes"
REPO_DIR = VENDOR_DIR if VENDOR_DIR.exists() else (BASE_DIR.parent / "gunes-dili")
TOKENIZER_DIR = REPO_DIR / "tokenizer"
ENGINE_DIR = REPO_DIR / "engine"

if str(TOKENIZER_DIR) not in sys.path:
    sys.path.insert(0, str(TOKENIZER_DIR))
if str(ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(ENGINE_DIR))

try:
    import gunes_dil_v4 as M
    import gunes_dili as G
    OFFICIAL_ENGINE_LOADED = True
    ENGINE_STATUS_MSG = f"official:gunes_dil_v4+gunes_dili ({REPO_DIR})"
except Exception as import_err:
    M = None
    G = None
    OFFICIAL_ENGINE_LOADED = False
    ENGINE_STATUS_MSG = f"import_error: {import_err}"

app = FastAPI(
    title="Güneş Dili Official Engine + Neural AI TTS & 3D Articulator",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 53 Holder Koması Referans Frekans Haritası (Base C3 = 130.81 Hz)
BASE_PITCH_HZ = 130.81
Z53_SUFFIX_ORDER = [
    "ma", "mi", "na", "ni", "sa", "si", "la",
    "ta", "te", "ti", "to", "tu", "de", "do",
    "ka", "ke", "ki", "ko", "ku", "ba", "be", "bi", "bo",
    "ra", "re", "ri", "ro", "ru", "wa", "we", "wi", "wo", "wu",
    "ga", "ge", "gi", "go", "gu", "pa", "pe", "pi", "po", "pu",
    "fa", "fe", "fi", "fo", "fu", "ya", "ye", "yi", "ha", "hu",
]
KOMA_BY_CODE: Dict[str, int] = {code: idx for idx, code in enumerate(Z53_SUFFIX_ORDER)}
GUNES_VOWELS = set("aeiou")

def tr_lower(text: str) -> str:
    return text.replace("İ", "i").replace("I", "ı").lower()

def require_official_engine() -> None:
    if not OFFICIAL_ENGINE_LOADED or M is None or G is None:
        raise HTTPException(
            status_code=503,
            detail=(
                f"Resmi gunes-dili deposu yüklenemedi ({ENGINE_STATUS_MSG}). "
                f"Lütfen {REPO_DIR} dizinine 'git clone https://github.com/pCwOrM/gunes-dili.git' çalıştırın."
            ),
        )

# ============================================================================
# 2. RESMİ MOTOR ÇEVİRİ VE DFA ÇÖZÜMLEME SARMALAYICISI
# ============================================================================
def normalize_ek_tuple(ek_item) -> dict:
    """G.cozumle() çıktısındaki ('ke', 'zaman', 'şimdiki', 'V') yapısını standart sözlüğe çevirir."""
    if isinstance(ek_item, dict):
        code = ek_item.get("ek") or ek_item.get("code") or ""
        family = ek_item.get("aile") or ek_item.get("family") or ""
        role = ek_item.get("islev") or ek_item.get("role") or ""
        tr_hint = ek_item.get("tr") or role
    elif isinstance(ek_item, (tuple, list)):
        code = str(ek_item[0]) if len(ek_item) > 0 else ""
        family = str(ek_item[1]) if len(ek_item) > 1 else ""
        role = str(ek_item[2]) if len(ek_item) > 2 else ""
        tr_hint = role
    else:
        code = str(ek_item)
        family, role, tr_hint = "", code, code

    koma = KOMA_BY_CODE.get(code, 0)
    freq_hz = round(BASE_PITCH_HZ * (2.0 ** (koma / 53.0)), 2)
    return {
        "code": code,
        "family": family,
        "role": role,
        "tr": tr_hint,
        "koma": koma,
        "freq_hz": freq_hz,
    }

def translate_with_official_engine(text: str) -> dict:
    require_official_engine()
    t0 = time.perf_counter()

    tokens = re.findall(r"[a-zA-ZçğıöşüÇĞİÖŞÜ']+[.,!?;]?", text)
    items = []
    output_words: List[str] = []

    for raw_tok in tokens:
        punct = ""
        word = raw_tok
        if word[-1] in {".", ",", "!", "?", ";"}:
            punct = word[-1]
            word = word[:-1]
        if not word:
            continue

        # 1. Resmi Tokenizer (gunes_dil_v4.tokenize)
        tok_res = M.tokenize(word)
        # 2. Resmi Çeviri Motoru (gunes_dili.turkceden)
        gd_res = G.turkceden(tok_res, M)

        gunes_word = ""
        if isinstance(gd_res, dict):
            gunes_word = str(gd_res.get("kelime") or gd_res.get("sonuc") or "").strip()
        else:
            gunes_word = str(gd_res).strip()

        # Soru eki (do) önceki kelimeye bitişik yazılır
        clean_low = tr_lower(word)
        is_question_clitic = clean_low in {"mi", "mı", "mu", "mü", "miydi", "mıydı", "muydu", "müydü"}

        if is_question_clitic and output_words and gunes_word:
            prev_punct = ""
            if output_words[-1][-1] in {".", ",", "!", "?", ";"}:
                prev_punct = output_words[-1][-1]
                output_words[-1] = output_words[-1][:-1]
            output_words[-1] = f"{output_words[-1]}{gunes_word}{punct or prev_punct}"
        elif gunes_word:
            output_words.append(f"{gunes_word}{punct}")

        # 3. Resmi DFA Çözümleyici ile kök & ek detaylarını al
        cozum = {}
        try:
            cozum = G.cozumle(gunes_word) if gunes_word else {}
        except Exception:
            cozum = {}

        root_gunes = cozum.get("kok", gunes_word) if isinstance(cozum, dict) else gunes_word
        raw_ekler = cozum.get("ekler", []) if isinstance(cozum, dict) else []
        suffix_details = [normalize_ek_tuple(e) for e in raw_ekler]
        suffix_codes = [s["code"] for s in suffix_details]

        if suffix_details:
            koma_slot = suffix_details[-1]["koma"]
            freq_hz = suffix_details[-1]["freq_hz"]
        else:
            koma_slot = sum((i + 1) * ord(ch) for i, ch in enumerate(gunes_word)) % 53
            freq_hz = round(BASE_PITCH_HZ * (2.0 ** (koma_slot / 53.0)), 2)

        items.append({
            "source": word,
            "durum": tok_res.get("durum", "KABUL") if isinstance(tok_res, dict) else "KABUL",
            "root_tr": word,
            "root_gunes": "" if is_question_clitic else root_gunes,
            "suffixes": suffix_codes,
            "suffix_details": suffix_details,
            "gunes_word": gunes_word,
            "koma_slot": koma_slot,
            "freq_hz": freq_hz,
        })

    elapsed_ms = max(0.05, round((time.perf_counter() - t0) * 1000.0, 2))
    return {
        "gunes_text": " ".join(output_words),
        "word_count": len(items),
        "elapsed_ms": elapsed_ms,
        "lexicon_source": ENGINE_STATUS_MSG,
        "items": items,
    }

def decode_with_official_engine(text: str) -> dict:
    require_official_engine()
    words = re.findall(r"[a-zA-ZçğıöşüÇĞİÖŞÜ]+", text)
    results = []

    for w in words:
        clean_w = tr_lower(w)
        cozum = G.cozumle(clean_w)
        if isinstance(cozum, dict):
            root_gunes = cozum.get("kok", clean_w)
            raw_ekler = cozum.get("ekler", [])
            slots = [normalize_ek_tuple(e) for e in raw_ekler]
            suffix_str = "".join(s["code"] for s in slots)
            tr_root = cozum.get("tr_kok") or cozum.get("turkce_kok") or root_gunes
            tr_reconstructed = cozum.get("turkce") or tr_root
            valid = bool(cozum.get("gecerli", True))
            root_pos = cozum.get("tur") or cozum.get("kok_turu") or "kök"
        else:
            root_gunes = clean_w
            slots = []
            suffix_str = ""
            tr_root = clean_w
            tr_reconstructed = clean_w
            valid = True
            root_pos = "kök"

        results.append({
            "gunes_word": clean_w,
            "segmented": f"{root_gunes}|{suffix_str}" if suffix_str else root_gunes,
            "root_gunes": root_gunes,
            "root_tr": tr_root,
            "root_pos": root_pos,
            "slots": slots,
            "tr_reconstructed": tr_reconstructed,
            "valid": valid,
        })

    return {
        "lexicon_source": ENGINE_STATUS_MSG,
        "results": results,
    }

# ============================================================================
# 3. NÖRAL AI SES ÜRETİCİ (EDGE-TTS) + 3D KAFA VISEME ZAMAN ÇİZELGESİ
# ============================================================================
VOICE_PROFILES: Dict[str, dict] = {
    "ahmet_natural": {
        "label": "🎙️ Ahmet Neural (Doğal Erkek)",
        "voice": "tr-TR-AhmetNeural",
        "rate": "-4%",
        "pitch": "+0Hz",
    },
    "emel_natural": {
        "label": "🎙️ Emel Neural (Doğal Kadın)",
        "voice": "tr-TR-EmelNeural",
        "rate": "-4%",
        "pitch": "+0Hz",
    },
    "solaris_ai": {
        "label": "🤖 Solaris AI (Derin Robotik)",
        "voice": "tr-TR-AhmetNeural",
        "rate": "-8%",
        "pitch": "-14Hz",
    },
    "astra_ai": {
        "label": "✨ Astra AI (Kristal Yapay Zeka)",
        "voice": "tr-TR-EmelNeural",
        "rate": "+2%",
        "pitch": "+8Hz",
    },
}

VISEME_TARGETS: Dict[str, Tuple[float, float, float, float, float, float]] = {
    "a": (1.45, 0.25, 0.15, 1.45, 0.00, 0.0),
    "e": (0.95, 0.78, 0.42, 1.25, 0.00, 0.0),
    "i": (0.45, 0.90, 0.65, 1.18, 0.00, 0.0),
    "ı": (0.50, 0.45, 0.55, 1.10, 0.00, 0.0),
    "o": (0.85, 0.18, 0.36, 0.62, 0.85, 0.0),
    "ö": (0.78, 0.72, 0.45, 0.60, 0.85, 0.0),
    "u": (0.45, 0.16, 0.60, 0.38, 0.95, 0.0),
    "ü": (0.42, 0.82, 0.62, 0.36, 0.95, 0.0),
    "b": (0.14, 0.50, 0.32, 0.02, 0.05, 0.0),
    "p": (0.14, 0.50, 0.32, 0.02, 0.05, 0.0),
    "m": (0.16, 0.50, 0.32, 0.02, 0.05, 0.75),
    "d": (0.28, 0.86, 0.94, 0.74, 0.05, 0.0),
    "t": (0.28, 0.86, 0.94, 0.74, 0.05, 0.0),
    "n": (0.30, 0.86, 0.94, 0.76, 0.05, 0.75),
    "k": (0.44, 0.18, 0.94, 0.85, 0.05, 0.0),
    "g": (0.44, 0.18, 0.94, 0.85, 0.05, 0.0),
    "w": (0.38, 0.20, 0.58, 0.34, 0.88, 0.0),
    "v": (0.32, 0.62, 0.40, 0.30, 0.10, 0.0),
    "f": (0.32, 0.62, 0.40, 0.30, 0.10, 0.0),
    "s": (0.26, 0.88, 0.84, 0.76, 0.05, 0.0),
    "z": (0.26, 0.88, 0.84, 0.76, 0.05, 0.0),
    "ş": (0.30, 0.76, 0.82, 0.56, 0.60, 0.0),
    "r": (0.52, 0.86, 0.76, 0.92, 0.05, 0.0),
    "l": (0.52, 0.86, 0.74, 0.95, 0.05, 0.0),
    "y": (0.40, 0.88, 0.70, 1.00, 0.05, 0.0),
    "h": (0.74, 0.45, 0.32, 1.00, 0.10, 0.0),
    "sil": (0.24, 0.48, 0.32, 0.20, 0.05, 0.0),
}

def prepare_tts_phonetic_text(gunes_text: str) -> str:
    return gunes_text.replace("w", "v").replace("W", "V")

def build_viseme_timeline(gunes_text: str, word_boundaries: List[dict]) -> List[dict]:
    clean_words = re.findall(r"[a-zA-ZçğıöşüÇĞİÖŞÜ]+", gunes_text)
    if not clean_words:
        return []

    if not word_boundaries:
        cursor_s = 0.08
        word_boundaries = []
        for w in clean_words:
            dur_s = max(0.24, len(w) * 0.072)
            word_boundaries.append({"start_s": cursor_s, "end_s": cursor_s + dur_s})
            cursor_s += dur_s + 0.06

    timeline = []
    for idx, w in enumerate(clean_words):
        wb = word_boundaries[idx] if idx < len(word_boundaries) else {
            "start_s": word_boundaries[-1]["end_s"] + 0.05,
            "end_s": word_boundaries[-1]["end_s"] + 0.45,
        }
        start_s = wb["start_s"]
        end_s = max(start_s + 0.12, wb["end_s"])
        chars = [c for c in tr_lower(w) if c.isalpha()] or ["a"]
        koma = sum((i + 1) * ord(ch) for i, ch in enumerate(w)) % 53
        pitch_hz = round(BASE_PITCH_HZ * (2.0 ** (koma / 53.0)), 2)

        weights = [1.8 if c in GUNES_VOWELS else 1.0 for c in chars]
        total_w = sum(weights)
        t_cur = start_s
        for c, wt in zip(chars, weights):
            seg_dur = (end_s - start_s) * (wt / total_w)
            v = VISEME_TARGETS.get(c, VISEME_TARGETS["a"])
            timeline.append({
                "start_s": round(t_cur, 4),
                "end_s": round(t_cur + seg_dur, 4),
                "token": w,
                "phoneme": c,
                "koma_node": koma,
                "pitch_hz": pitch_hz,
                "jaw_open": v[0],
                "tongue_x": v[1],
                "tongue_y": v[2],
                "lip_open": v[3],
                "lip_round": v[4],
                "velum_open": v[5],
            })
            t_cur += seg_dur

    return timeline

# ============================================================================
# 4. AI SOHBET BEYNİ (GÜNEŞ DİLİ KONUŞMA KATMANI)
# ============================================================================
def generate_ai_reply_tr(user_message: str) -> Tuple[str, str]:
    msg = tr_lower(user_message.strip())

    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
            prompt = (
                "Sen Güneş Dili konuşan yapay zeka robotusun. "
                "Kullanıcının sorusuna en fazla 2 kısa, net Türkçe cümleyle cevap ver. "
                f"Kullanıcı: {user_message}"
            )
            body = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
            req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=8.0) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
                reply = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                return reply, "gemini-2.5-flash"
        except Exception:
            pass

    if any(k in msg for k in ["dert", "derdin", "sorun"]):
        return "Derdim yok, güneş dili ile dünyaya konuşuyorum.", "gunes-core-ai"
    if any(k in msg for k in ["merhaba", "selam", "nasılsın", "kimsin"]):
        return "Merhaba insan, ben güneş dili konuşan yapay zeka robotuyum.", "gunes-core-ai"
    if any(k in msg for k in ["başkent", "ankara", "türkiye"]):
        return "Türkiye'nin başkenti Ankara'dır.", "gunes-core-ai"
    if any(k in msg for k in ["koma", "53", "müzik", "frekans"]):
        return "Güneş dili elli üç komalık mikrotonal rezonans ile konuşur.", "gunes-core-ai"
    if any(k in msg for k in ["güneş", "doğ", "sabah"]):
        return "Güneş doğarken çocuklar okullarına gidiyorlardı.", "gunes-core-ai"
    if any(k in msg for k in ["kitap", "öğren", "bilim", "okul"]):
        return "Kitaplarımızdan öğrendiklerimizi unutmayacağız.", "gunes-core-ai"

    return "Güneş dili ses ve bilim ile dünyaya konuşuyor.", "gunes-core-ai"

# ============================================================================
# 5. REST API UÇ NOKTALARI
# ============================================================================
class TextPayload(BaseModel):
    text: str

class TTSPayload(BaseModel):
    text: str
    voice_id: Optional[str] = "ahmet_natural"

class ChatPayload(BaseModel):
    message: str
    voice_id: Optional[str] = "ahmet_natural"

@app.get("/", response_class=HTMLResponse)
async def serve_ui():
    html_path = BASE_DIR / "static" / "index.html"
    return html_path.read_text(encoding="utf-8")

@app.get("/api/v1/health")
async def api_health():
    return {
        "status": "ok" if OFFICIAL_ENGINE_LOADED else "degraded",
        "version": "3.0.0",
        "official_engine_loaded": OFFICIAL_ENGINE_LOADED,
        "lexicon_source": ENGINE_STATUS_MSG,
        "edge_tts_loaded": EDGE_TTS_LOADED,
        "edge_tts_status": EDGE_TTS_STATUS_MSG,
        "suffixes_count": len(Z53_SUFFIX_ORDER),
        "voices": {k: v["label"] for k, v in VOICE_PROFILES.items()},
    }

@app.post("/api/v1/translate")
@app.post("/api/translate")
async def api_translate(payload: TextPayload):
    return translate_with_official_engine(payload.text)

@app.post("/api/v1/decode")
@app.post("/api/decode")
async def api_decode(payload: TextPayload):
    return decode_with_official_engine(payload.text)

@app.post("/api/v1/tts")
async def api_tts(payload: TTSPayload):
    if not EDGE_TTS_LOADED or edge_tts is None:
        raise HTTPException(
            status_code=503,
            detail=f"Edge TTS kullanılamıyor: {EDGE_TTS_STATUS_MSG}",
        )
    profile = VOICE_PROFILES.get(payload.voice_id or "ahmet_natural", VOICE_PROFILES["ahmet_natural"])
    phonetic_text = prepare_tts_phonetic_text(payload.text.strip())
    if not phonetic_text:
        raise HTTPException(status_code=400, detail="Boş metin seslendirilemez.")

    communicate = edge_tts.Communicate(
        text=phonetic_text,
        voice=profile["voice"],
        rate=profile["rate"],
        pitch=profile["pitch"],
    )

    audio_chunks = bytearray()
    word_boundaries: List[dict] = []

    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_chunks.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            start_s = chunk["offset"] / 10_000_000.0
            dur_s = chunk["duration"] / 10_000_000.0
            word_boundaries.append({
                "start_s": start_s,
                "end_s": start_s + dur_s,
                "word": chunk.get("text", ""),
            })

    if not audio_chunks:
        raise HTTPException(status_code=502, detail="Nöral ses motoru ses üretemedi.")

    visemes = build_viseme_timeline(payload.text, word_boundaries)
    audio_b64 = base64.b64encode(bytes(audio_chunks)).decode("ascii")

    return {
        "voice_id": payload.voice_id,
        "voice_label": profile["label"],
        "gunes_text": payload.text,
        "phonetic_text": phonetic_text,
        "audio_base64": audio_b64,
        "mime_type": "audio/mpeg",
        "visemes": visemes,
    }

@app.post("/api/v1/chat")
async def api_chat(payload: ChatPayload):
    reply_tr, engine_used = generate_ai_reply_tr(payload.message)
    translated = translate_with_official_engine(reply_tr)
    return {
        "user_message": payload.message,
        "reply_tr": reply_tr,
        "gunes_text": translated["gunes_text"],
        "items": translated["items"],
        "ai_engine": engine_used,
    }