from dotenv import load_dotenv
load_dotenv()  # Load .env file automatically

from fastapi import FastAPI, Request, UploadFile, File, Header
from fastapi.responses import JSONResponse
from src.conversation.dialog_manager_hybrid import DialogManager
from services.transcription import transcribe_audio
from fastapi.middleware.cors import CORSMiddleware
import logging

logger = logging.getLogger("assistant.api")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


dialog_manager = DialogManager()

@app.post("/conversation/message")
async def conversation_message(request: Request):
    print("[API] /conversation/message endpoint called")
    data = await request.json()
    print(f"[API] Incoming data: {data}")
    message = data.get("message", "")
    user_id = request.headers.get("X-User-Id", "demo-user")  # Use a dummy ID if not provided
    print(f"[API] user_id: {user_id}, message: {message}")
    reply = dialog_manager.handle_message(user_id, message)
    print(f"[API] Reply: {reply}")
    return {"reply": reply}


ALLOWED_AUDIO_PREFIXES = (
    "audio/webm", "audio/wav", "audio/mpeg", "audio/mp3",
    "audio/mp4", "audio/ogg", "audio/flac", "audio/x-wav",
    "video/webm",  # browsers sometimes send webm as video/webm
)
MAX_AUDIO_SIZE = 25 * 1024 * 1024  # 25 MB (Groq Whisper limit)


@app.post("/conversation/voice")
async def conversation_voice(
    audio: UploadFile = File(...),
    x_user_id: str = Header("demo-user", alias="X-User-Id"),
):
    """
    Combined voice-chat endpoint:
    1. Accepts audio file (webm/wav/mp3/ogg) via multipart form
    2. Transcribes using Groq Whisper
    3. Runs transcription through dialog manager
    4. Returns { transcription, reply }
    """
    try:
        # Validate content type (browsers may append codecs, e.g. "audio/webm;codecs=opus")
        content_type = audio.content_type or ""
        logger.info(f"[VoiceChat] Received audio: type={content_type}, filename={audio.filename}")
        if not any(content_type.startswith(prefix) for prefix in ALLOWED_AUDIO_PREFIXES):
            logger.warning(f"Rejected audio type: {content_type}")
            return JSONResponse(status_code=415, content={"error": f"Unsupported audio format: {content_type}. Use webm, wav, mp3, ogg, or flac."})

        # Read and validate size
        audio_bytes = await audio.read()
        logger.info(f"[VoiceChat] Audio size: {len(audio_bytes)} bytes")
        if len(audio_bytes) > MAX_AUDIO_SIZE:
            return JSONResponse(status_code=413, content={"error": "Audio file too large. Maximum 25 MB."})
        if len(audio_bytes) == 0:
            return JSONResponse(status_code=400, content={"error": "Empty audio file."})

        # Transcribe
        try:
            transcription = transcribe_audio(audio_bytes, filename=audio.filename or "audio.webm")
        except Exception as e:
            logger.error(f"Transcription error: {e}", exc_info=True)
            return JSONResponse(status_code=502, content={"error": "Failed to transcribe audio. Please try again."})

        if not transcription or not transcription.strip():
            return JSONResponse(status_code=422, content={"error": "Could not understand the audio. Please try again."})

        logger.info(f"[VoiceChat] user={x_user_id}, transcription='{transcription}'")

        # Run through dialog manager (same as text chat)
        reply = dialog_manager.handle_message(x_user_id, transcription)
        logger.info(f"[VoiceChat] reply='{reply}'")

        return {
            "transcription": transcription,
            "reply": reply,
        }
    except Exception as e:
        logger.error(f"[VoiceChat] Unexpected error: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": "Internal server error processing voice message."})
