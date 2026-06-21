"""Speech-to-Text service using Groq Whisper (whisper-large-v3-turbo)."""

import os
import logging
from groq import Groq

logger = logging.getLogger("assistant.stt")

_API_KEY = os.environ.get("GROQ_API_KEY", "")
_client = None
_MODEL = "whisper-large-v3-turbo"


def _get_client():
    global _client
    if _client is None and _API_KEY:
        _client = Groq(api_key=_API_KEY)
    return _client


def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """
    Transcribe audio bytes using Groq Whisper.
    Accepts webm, wav, mp3, mp4, ogg, flac formats.
    Returns the transcribed text string.
    """
    client = _get_client()
    if not client:
        raise RuntimeError("Groq API key not configured for transcription.")

    transcription = client.audio.transcriptions.create(
        file=(filename, audio_bytes),
        model=_MODEL,
        response_format="text",
    )

    text = transcription.strip() if isinstance(transcription, str) else str(transcription).strip()
    logger.info(f"Transcribed ({filename}): '{text}'")
    return text
