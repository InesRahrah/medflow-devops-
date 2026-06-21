# Assistant Service

AI-powered conversational assistant for MedFlow — handles medical appointment booking, rescheduling, cancellation, and voice interaction via a FastAPI backend.

## Tech Stack

- **Python 3.10+** / **FastAPI** / **Uvicorn**
- **Groq API** — Llama 3.3 70B for intent extraction & natural language responses
- **Groq Whisper** (`whisper-large-v3-turbo`) — speech-to-text for voice chat
- **Browser SpeechSynthesis** — text-to-speech on the frontend (no backend TTS needed)

## Project Structure

```
assistant-service/
├── app.py                          # FastAPI entry point & endpoints
├── requirements.txt                # Python dependencies
├── services/
│   ├── __init__.py
│   └── transcription.py            # Groq Whisper STT client
├── src/
│   ├── conversation/
│   │   ├── dialog_manager_hybrid.py # Core dialog engine (book/cancel/reschedule flows)
│   │   ├── gemini_client.py         # Groq/Llama client for NLU & response generation
│   │   ├── intent_extractor.py      # Rules-based fallback intent extraction
│   │   ├── conversation_history.py  # Per-user conversation memory
│   │   ├── prompts.py               # Prompt templates
│   │   └── system_prompt.txt        # System prompt for LLM
│   ├── orchestration/
│   │   ├── appointment_api.py       # Appointment service API client
│   │   ├── specialty_api.py         # Specialty listing API client
│   │   └── user_api.py              # User/doctor profile API client
│   └── session/
│       └── mapping_store.py         # Secure option mapping per session
├── models/
├── routes/
├── utils/
└── tests/
```

## API Endpoints

### `POST /conversation/message`
Text-based chat endpoint.

**Headers:** `X-User-Id` (patient auth ID)
**Body:** `{ "message": "I want to book an appointment" }`
**Response:** `{ "reply": "Sure! What symptoms are you experiencing?" }`

### `POST /conversation/voice`
Voice chat endpoint — accepts audio, transcribes, and responds.

**Headers:** `X-User-Id` (patient auth ID)
**Body:** Multipart form with `audio` file (webm/wav/mp3/ogg/flac, max 25MB)
**Response:** `{ "transcription": "I have a headache", "reply": "Based on your symptoms..." }`

## Key Features

### Conversational Flows
- **Book** — symptom collection → specialty suggestion → doctor & slot proposal (urgency-aware triage) → confirmation → booking with AI summary
- **Cancel** — lists upcoming scheduled appointments → doctor/appointment selection → confirmation → cancellation
- **Reschedule** — lists upcoming appointments → selection → reason capture → new slot proposal → symptom update option → AI summary addendum → confirmation

### Intelligent Triage (ESI-based)
Symptoms are mapped to triage levels 1–5 (Emergency Severity Index):
- **Level 1–2** (life-threatening/emergent): Earliest available slot
- **Level 3** (urgent): First available slot, same/next day
- **Level 4–5** (less/non-urgent): Later slots preserved for urgent patients

### Voice Chat (STT + TTS)
- **Speech-to-Text**: Groq Whisper transcribes patient audio
- **Text-to-Speech**: Browser-native `speechSynthesis` reads assistant replies (frontend)
- Supports `audio/webm;codecs=opus` (MediaRecorder), wav, mp3, ogg, flac

### AI Summaries
- Pre-consultation summaries generated for doctors on booking
- Reschedule addendums appended when appointments are rescheduled
- Uses conversation history + collected entities

### Safety & Privacy
- No internal IDs exposed to users — mapped to numbered options per session
- Patient ID injected from auth headers only
- Double-booking prevention via slot conflict detection
- All destructive actions require explicit user confirmation

## Environment Variables

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Groq API key (used for Llama LLM + Whisper STT) |

## Setup & Run

```bash
# Install dependencies
pip install -r requirements.txt

# Run with auto-reload
uvicorn app:app --reload --port 8000
```

## Dependencies

Defined in `requirements.txt`:
- `fastapi` — web framework
- `uvicorn` — ASGI server
- `groq` — Groq API client (Llama + Whisper)
- `python-dotenv` — environment variable loading
- `python-multipart` — file upload support (voice endpoint)
- `PyJWT` — JWT token handling

## Integration

Communicates with:
- **user-service** (port 8080) — patient/doctor profiles, doctor search
- **appointment-service** (port 8081) — appointments, slots, booking, cancellation, rescheduling
