# Groq API client wrapper for the assistant service.
# Handles intent extraction and natural response generation.
# Uses Llama 3.3 70B via Groq's free API.

import os
import json
import logging
from groq import Groq

logger = logging.getLogger("assistant.llm")

# Configure Groq client with API key from environment
_API_KEY = os.environ.get("GROQ_API_KEY", "")
_client = None
_MODEL = "llama-3.3-70b-versatile"

def _get_client():
    global _client
    if _client is None and _API_KEY:
        _client = Groq(api_key=_API_KEY)
    return _client


def extract_intent_entities(message: str, available_specialties: list[str] = None) -> dict:
    """
    Use Groq/Llama to extract intent and entities from a user message.
    Returns: {"intent": "BOOK"|"CANCEL"|"RESCHEDULE"|"GREETING"|"UNKNOWN", "entities": {...}}
    """
    specialties_hint = ""
    if available_specialties:
        specialties_hint = f"\nAvailable specialties in the system: {', '.join(available_specialties)}"

    prompt = f"""You are an intent and entity extractor for a medical appointment booking assistant.

Analyze the user message and return a JSON object with:
- "intent": one of "BOOK", "CANCEL", "RESCHEDULE", "GREETING", "UNKNOWN"
- "entities": an object that may contain:
  - "specialty": the medical specialty mentioned (e.g., "Cardiology", "Dermatology"). Map informal terms like "cardiologist" to "Cardiology", "skin doctor" to "Dermatology", etc. Only set this if the user clearly mentions a specialty or doctor type.
  - "symptoms": a comma-separated string of symptoms if the user describes health issues
  - "doctor_name": the doctor's name if mentioned
  - "date": a date if mentioned (in YYYY-MM-DD format)
  - "time": a time if mentioned
  - "visit_type": "EMERGENCY" if urgent, "FOLLOW_UP" if follow-up, "CONSULTATION" otherwise
  - "urgency_indicators": list of keywords suggesting urgency (e.g., "severe", "sudden", "worsening", "can't breathe", "intense pain")
  - "refuse_suggestion": true if the user is declining or refusing a suggestion
  - "confirmation": "yes" if user is confirming, "no" if user is denying/canceling
  - "navigation": "later" if user wants a later slot, "earlier" if user wants an earlier slot
{specialties_hint}

IMPORTANT RULES:
- Only extract entities that are clearly present in the message
- Do NOT guess or hallucinate entities
- For "Book an appointment" with no specialty mentioned, return intent "BOOK" with empty entities
- For greetings like "hi", "hello", "hey", return intent "GREETING"
- For "yes", "ok", "confirm" return intent "UNKNOWN" with entities {{"confirmation": "yes"}}
- For "no", "cancel", "back" return intent "UNKNOWN" with entities {{"confirmation": "no"}}
- Return ONLY valid JSON, no markdown, no explanation

User message: "{message}"

JSON:"""

    try:
        client = _get_client()
        if not client:
            return {"intent": "UNKNOWN", "entities": {}}
        response = client.chat.completions.create(
            model=_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=300,
        )
        text = response.choices[0].message.content.strip()
        # Clean up markdown code fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        if text.startswith("json"):
            text = text[4:].strip()
        result = json.loads(text)
        logger.info(f"[Groq] message='{message}' | result={result}")
        print(f"[Groq] message='{message}' | result={result}")
        return result
    except Exception as e:
        logger.error(f"[Groq] Error extracting intent: {e}")
        print(f"[Groq] Error: {e}")
        # Fallback: return unknown
        return {"intent": "UNKNOWN", "entities": {}}


def generate_response(step: str, context: dict, conversation_history: list[dict] = None) -> str:
    """
    Use Groq/Llama to generate a natural, human-like response for the current step.
    step: the current dialog step (e.g., "ask_symptoms", "suggest_specialty", "propose_doctor", "confirm", etc.)
    context: dict with relevant info for this step
    conversation_history: list of {"role": "user"|"assistant", "content": "..."} messages
    """
    # ── Steps where the hardcoded fallback MUST be used, LLM must not override ──
    FORCED_FALLBACK_STEPS = {
        "specialty_not_available_external_advice",  # specialty mapped but not in DB → external advice
        "no_specialty_available",                   # specialty mapped but no doctors available
        "symptoms_not_recognized",                   # symptoms not in mapping → show full list
        "confirm_booking", 
        "booking_success",
        "reschedule_success",                
    }
    if step in FORCED_FALLBACK_STEPS:
        return None  # dialog manager will use the hardcoded fallback string
    messages = []

    system_msg = """You are a friendly, warm medical booking assistant. Generate a short, natural response for the current step.

Rules:
- Be conversational and warm, like a helpful receptionist
- Use emojis sparingly (1-2 max per message)
- Keep responses concise (1-3 sentences)
- Do NOT invent medical information
- Do NOT make up doctor names or times — only use what's provided in the context
- Include the specific data provided in the context
- Generate ONLY the assistant's response message. No quotes, no prefix, no explanation."""

    messages.append({"role": "system", "content": system_msg})

    # Add conversation history for context
    if conversation_history:
        for msg in conversation_history[-6:]:
            messages.append({"role": msg["role"], "content": msg["content"]})

    user_prompt = f"Current step: {step}\nContext: {json.dumps(context, default=str)}\n\nGenerate the assistant's response:"
    messages.append({"role": "user", "content": user_prompt})

    try:
        client = _get_client()
        if not client:
            return None
        response = client.chat.completions.create(
            model=_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=200,
        )
        text = response.choices[0].message.content.strip()
        # Remove any quotes wrapping the response
        if text.startswith('"') and text.endswith('"'):
            text = text[1:-1]
        return text
    except Exception as e:
        logger.error(f"[Groq] Error generating response: {e}")
        # Fallback to a generic message
        return None


def generate_preconsultation_summary(conversation_history: list[dict], patient_context: dict) -> str:
    """
    Generate a concise clinical summary for the doctor from the chatbot conversation.
    This replaces the preconsultation form when the appointment is booked via the assistant.

    Args:
        conversation_history: list of {"role": "user"|"assistant", "content": "..."} messages
        patient_context: dict with collected info (symptoms, specialty, triage_level, triage_label, etc.)

    Returns:
        A structured summary string for the doctor, or a fallback summary if LLM is unavailable.
    """
    symptoms = patient_context.get("symptoms", "Not specified")
    specialty = patient_context.get("specialty", "Not specified")
    triage_level = patient_context.get("triage_level", "N/A")
    triage_label = patient_context.get("triage_label", "N/A")
    visit_type = patient_context.get("visit_type", "CONSULTATION")

    # Build the conversation transcript (last 10 messages)
    transcript = ""
    if conversation_history:
        for msg in conversation_history[-10:]:
            role = "Patient" if msg["role"] == "user" else "Assistant"
            transcript += f"{role}: {msg['content']}\n"

    prompt = f"""You are a medical AI assistant. Generate a concise pre-consultation summary for a doctor based on a patient's chatbot conversation.

The summary should be structured as follows:
- **Chief Complaint**: The main reason for the visit (1 sentence)
- **Symptoms Reported**: List of symptoms the patient mentioned
- **Urgency Assessment**: Triage level and reasoning
- **Relevant Context**: Any additional details from the conversation (duration, severity, triggers, etc.)
- **Suggested Focus Areas**: What the doctor should pay attention to during the consultation

Patient Context:
- Symptoms: {symptoms}
- Specialty: {specialty}
- Triage Level: {triage_level} ({triage_label})
- Visit Type: {visit_type}

Conversation Transcript:
{transcript}

RULES:
- Be concise and clinical — this is for the doctor, not the patient
- Do NOT make up symptoms or medical information not mentioned in the conversation
- If information is missing, say "Not discussed" rather than guessing
- Keep it under 200 words
- Use plain text, no markdown

Summary:"""

    try:
        client = _get_client()
        if not client:
            return _build_fallback_summary(patient_context)

        response = client.chat.completions.create(
            model=_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=400,
        )
        text = response.choices[0].message.content.strip()
        if text:
            return text
        return _build_fallback_summary(patient_context)
    except Exception as e:
        logger.error(f"[Groq] Error generating summary: {e}")
        return _build_fallback_summary(patient_context)


def _build_fallback_summary(patient_context: dict) -> str:
    """Build a structured summary when LLM is unavailable."""
    symptoms = patient_context.get("symptoms", "Not specified")
    specialty = patient_context.get("specialty", "Not specified")
    triage_level = patient_context.get("triage_level", "N/A")
    triage_label = patient_context.get("triage_label", "N/A")
    visit_type = patient_context.get("visit_type", "CONSULTATION")

    return (
        f"Chief Complaint: Patient requested a {specialty} appointment.\n"
        f"Symptoms Reported: {symptoms}\n"
        f"Urgency Assessment: Triage Level {triage_level} ({triage_label})\n"
        f"Visit Type: {visit_type}\n"
        f"Note: This summary was auto-generated from the patient's chatbot conversation."
    )


def generate_reschedule_summary(previous_ai_summary: str, reason: str, new_symptoms: str,
                                 original_date: str, new_date: str, new_time: str) -> str:
    """
    Generate an updated aiSummary for a rescheduled appointment.
    Combines the previous summary with the reschedule reason and any new symptoms.
    """
    previous_section = previous_ai_summary.strip() if previous_ai_summary else "No previous summary available."

    prompt = f"""You are a medical AI assistant. A patient is rescheduling an appointment. Generate an updated pre-consultation summary for the doctor.

PREVIOUS SUMMARY:
{previous_section}

RESCHEDULE INFORMATION:
- Original appointment date: {original_date}
- New requested date: {new_date} at {new_time}
- Reason for rescheduling: {reason}
- New/worsened symptoms: {new_symptoms if new_symptoms else "None reported"}

Generate an updated summary structured as:
- **Previous Summary**: Keep the original summary intact
- **Reschedule Update**: Date change and reason
- **Symptom Update**: Any new or worsened symptoms (if applicable)
- **Updated Urgency Notes**: If symptoms worsened, note the increased concern

RULES:
- Preserve all information from the previous summary
- Clearly mark the reschedule update section
- If symptoms worsened, highlight this for the doctor
- Be concise and clinical
- Use plain text, no markdown
- Keep it under 300 words

Updated Summary:"""

    try:
        client = _get_client()
        if not client:
            return _build_fallback_reschedule_summary(previous_ai_summary, reason, new_symptoms,
                                                       original_date, new_date, new_time)

        response = client.chat.completions.create(
            model=_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=500,
        )
        text = response.choices[0].message.content.strip()
        if text:
            return text
        return _build_fallback_reschedule_summary(previous_ai_summary, reason, new_symptoms,
                                                   original_date, new_date, new_time)
    except Exception as e:
        logger.error(f"[Groq] Error generating reschedule summary: {e}")
        return _build_fallback_reschedule_summary(previous_ai_summary, reason, new_symptoms,
                                                   original_date, new_date, new_time)


def _build_fallback_reschedule_summary(previous_ai_summary: str, reason: str, new_symptoms: str,
                                        original_date: str, new_date: str, new_time: str) -> str:
    """Build a reschedule summary when LLM is unavailable."""
    parts = []
    if previous_ai_summary:
        parts.append(f"PREVIOUS SUMMARY:\n{previous_ai_summary.strip()}")
    parts.append(
        f"\n[RESCHEDULE UPDATE]\n"
        f"Rescheduled from {original_date} to {new_date} at {new_time}.\n"
        f"Reason: {reason}"
    )
    if new_symptoms:
        parts.append(f"New/worsened symptoms: {new_symptoms}")
    return "\n".join(parts)
