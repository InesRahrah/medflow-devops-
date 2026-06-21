# Hybrid Dialog Manager:groq(llma) AI for understanding + structured flow for booking logic.
# Gemini handles: intent extraction, entity extraction, natural response generation.
# Code handles: booking flow steps, API calls, state management, validation.

from email import message
from html import entities

from src.conversation import gemini_client, conversation_history
from src.conversation.intent_extractor import IntentExtractor
from src.session.mapping_store import MappingStore
from src.orchestration import appointment_api, user_api
from src.orchestration.specialty_api import fetch_specialties
import logging
import os
import datetime

logger = logging.getLogger("assistant.dialog")
logging.basicConfig(level=logging.INFO)

# In-memory state store (replace with Redis/DB for prod)
_user_states = {}
_mapping_store = MappingStore()

# Check if Gemini is available
_USE_LLM = bool(os.environ.get("GROQ_API_KEY", ""))


class DialogManager:
    SYMPTOM_SPECIALTY_MAP = {
        "chest pain": ["Cardiology"],
        "palpitations": ["Cardiology"],
        "unstable blood pressure": ["Cardiology", "Nephrology"],
        "fainting": ["Cardiology", "Neurology"],
        "shortness of breath": ["Pulmonology", "Cardiology"],
        "cough": ["Pulmonology"],
        "wheezing": ["Pulmonology"],
        "headache": ["Neurology"],
        "dizziness": ["Neurology", "ENT"],
        "vertigo": ["ENT", "Neurology"],
        "seizures": ["Neurology"],
        "numbness": ["Neurology"],
        "tingling": ["Neurology"],
        "loss of balance": ["Neurology"],
        "memory problems": ["Neurology"],
        "fever": ["General Medicine", "Infectious Diseases"],
        "chills": ["Infectious Diseases"],
        "fatigue": ["General Medicine", "Endocrinology"],
        "night sweats": ["Infectious Diseases", "Oncology"],
        "abdominal pain": ["Gastroenterology"],
        "nausea": ["Gastroenterology"],
        "vomiting": ["Gastroenterology"],
        "diarrhea": ["Gastroenterology"],
        "constipation": ["Gastroenterology"],
        "bloating": ["Gastroenterology"],
        "blood in stool": ["Gastroenterology"],
        "back pain": ["Orthopedics"],
        "joint pain": ["Rheumatology"],
        "muscle pain": ["Rheumatology"],
        "joint swelling": ["Rheumatology"],
        "skin rash": ["Dermatology"],
        "itching": ["Dermatology"],
        "skin lesions": ["Dermatology"],
        "acne": ["Dermatology"],
        "vision problems": ["Ophthalmology"],
        "eye pain": ["Ophthalmology"],
        "ear pain": ["ENT"],
        "hearing loss": ["ENT"],
        "sore throat": ["ENT"],
        "nasal congestion": ["ENT"],
        "frequent urination": ["Urology", "Endocrinology"],
        "painful urination": ["Urology"],
        "blood in urine": ["Urology", "Nephrology"],
        "pelvic pain": ["Gynecology", "Urology"],
        "anxiety": ["Psychiatry"],
        "depression": ["Psychiatry"],
        "sleep problems": ["Psychiatry", "Neurology"],
    }
    _specialties_cache = None

    def __init__(self):
        self.rules_extractor = IntentExtractor()  # Keep as fallback

    def _get_specialties(self):
        if DialogManager._specialties_cache is None:
            specialties = fetch_specialties()
            backend_to_display = {}
            for s in specialties:
                display = s.strip().capitalize() if s else s
                backend_to_display[s] = display
            DialogManager._specialties_cache = backend_to_display
        return DialogManager._specialties_cache

    def _get_specialty_list(self):
        """Get flat list of display specialty names."""
        backend_to_display = self._get_specialties()
        return [backend_to_display[b] for b in backend_to_display]

    def _extract_intent(self, message: str) -> dict:
        """Extract intent and entities — uses Groq/Llama if available, falls back to rules."""
        if _USE_LLM:
            try:
                specialties = self._get_specialty_list()
                result = gemini_client.extract_intent_entities(message, specialties)
                if result and result.get("intent"):
                    return result
            except Exception as e:
                logger.warning(f"LLM extraction failed, falling back to rules: {e}")
        # Fallback to rules-based
        return self.rules_extractor.extract_intent_entities(message)

    def _generate_reply(self, step: str, context: dict, user_id: str, fallback: str) -> str:
        """Generate a natural reply using Groq/Llama, with a hardcoded fallback."""
        if _USE_LLM:
            try:
                history = conversation_history.get_history(user_id)
                reply = gemini_client.generate_response(step, context, history)
                if reply:
                    return reply
            except Exception as e:
                logger.warning(f"Gemini response failed, using fallback: {e}")
        return fallback

    def _reply(self, user_id: str, message: str, reply: str) -> str:
        """Record both user message and assistant reply in history, then return reply."""
        conversation_history.add_message(user_id, "user", message)
        conversation_history.add_message(user_id, "assistant", reply)
        return reply

    def handle_message(self, user_id: str, message: str) -> str:
        logger.info(f"user_id={user_id}, message='{message}'")

        # Load or initialize user state
        state = _user_states.get(user_id, {"current_flow": None, "step": None, "collected": {}})

        # Extract intent/entities (Gemini or rules)
        result = self._extract_intent(message)
        intent = result.get("intent")
        entities = result.get("entities", {})

        # Handle greetings
        if intent == "GREETING" or (not state["current_flow"] and message.strip().lower() in ("hi", "hello", "hey")):
            patient_profile = user_api.fetch_patient_profile({"user_id": user_id}, user_id)
            name = patient_profile.get("firstName") if patient_profile else None
            ctx = {"patient_name": name}
            fallback = f"Hi {name}! 👋\n\nHow can I help you today?" if name else "Hi there! 👋\n\nHow can I help you today?"
            reply = self._generate_reply("greeting", ctx, user_id, fallback)
            return self._reply(user_id, message, reply)

        # Handle confirmation/navigation entities when in a flow
        if state.get("current_flow") and entities.get("confirmation"):
            if entities["confirmation"] == "yes":
                entities["_confirm"] = True
            elif entities["confirmation"] == "no":
                entities["_deny"] = True
        if state.get("current_flow") and entities.get("navigation"):
            if entities["navigation"] == "later":
                entities["_later"] = True
            elif entities["navigation"] == "earlier":
                entities["_earlier"] = True

        # ── Active flow routing (takes priority over intent detection) ──
        if state.get("current_flow") == "cancel" and intent != "CANCEL":
            return self._handle_cancel_flow(user_id, message, state, entities)

        if state.get("current_flow") == "book" and intent not in ("BOOK", "CANCEL", "RESCHEDULE", "GREETING"):
            return self._handle_book_flow(user_id, message, state, entities)

        if state.get("current_flow") == "reschedule" and intent != "RESCHEDULE":
            return self._handle_reschedule_flow(user_id, message, state, entities)

        # ── Intent routing ──
        if intent == "BOOK":
            if state.get("current_flow") == "book":
                print(f"[DialogManager] BOOK intent but flow already active — merging entities")
                if entities.get("symptoms") and "symptoms" not in state.get("collected", {}):
                    state.setdefault("collected", {})["symptoms"] = entities["symptoms"]
                    state["step"] = "symptoms"
                if entities.get("visit_type") and "visit_type" not in state.get("collected", {}):
                    state.setdefault("collected", {})["visit_type"] = entities["visit_type"]
                if entities.get("specialty"):
                    backend_to_display = self._get_specialties()
                    valid_specialties = {v.lower().strip() for v in backend_to_display.values()}
                    if entities["specialty"].lower().strip() in valid_specialties:
                        if "specialty" not in state.get("collected", {}):
                            state["collected"]["specialty"] = entities["specialty"]
                _user_states[user_id] = state
            else:
                print(f"[DialogManager] New flow detected: {intent}")
                state = {"current_flow": "book", "step": None, "collected": {}}
                if entities.get("specialty"):
                    backend_to_display = self._get_specialties()
                    valid_specialties = {v.lower().strip() for v in backend_to_display.values()}
                    if entities["specialty"].lower().strip() in valid_specialties:
                        state["collected"]["specialty"] = entities["specialty"]
                if entities.get("symptoms"):
                    state["collected"]["symptoms"] = entities["symptoms"]
                if entities.get("visit_type"):
                    state["collected"]["visit_type"] = entities["visit_type"]
                _user_states[user_id] = state

            if entities.get("specialty"):
                backend_to_display = self._get_specialties()
                valid_specialties = {v.lower().strip() for v in backend_to_display.values()}
                extracted = entities["specialty"].lower().strip()
                if extracted in valid_specialties:
                    state["collected"]["specialty"] = entities["specialty"]
                else:
                    logger.warning(f"[GUARD] LLM returned invalid specialty '{entities['specialty']}' — ignoring")

            if entities.get("symptoms"):
                state["collected"]["symptoms"] = entities["symptoms"]
            if entities.get("visit_type"):
                state["collected"]["visit_type"] = entities["visit_type"]

            _user_states[user_id] = state

        elif intent in ("CANCEL", "RESCHEDULE") and state.get("current_flow") == "book" and state.get("step") == "doctor_slot_proposal":
            entities["_later"] = True

        elif intent == "CANCEL":
            if state.get("current_flow") == "cancel":
                pass
            else:
                state = {"current_flow": "cancel", "step": None, "collected": {}}
                _user_states[user_id] = state
            return self._handle_cancel_flow(user_id, message, state, entities)

        elif intent == "RESCHEDULE":
            if state.get("current_flow") == "reschedule":
                pass
            else:
                state = {"current_flow": "reschedule", "step": None, "collected": {}}
                _user_states[user_id] = state
            return self._handle_reschedule_flow(user_id, message, state, entities)

        else:
            if entities.get("specialty") and "specialty" not in state.get("collected", {}):
                state.setdefault("collected", {})["specialty"] = entities["specialty"]
            if entities.get("symptoms") and "symptoms" not in state.get("collected", {}):
                state.setdefault("collected", {})["symptoms"] = entities["symptoms"]
            if entities.get("refuse_suggestion"):
                state.setdefault("collected", {})["_refuse"] = True

        # ── BOOK FLOW ──
        if state.get("current_flow") == "book":
            return self._handle_book_flow(user_id, message, state, entities)

        # Fallback
        reply = self._generate_reply("fallback", {"message": message}, user_id,
            "I'm here to help you book, reschedule, or cancel an appointment. Just let me know what you need! 😊")
        return self._reply(user_id, message, reply)
        

        # =====================
        # BOOK FLOW (step-by-step with Gemini responses)
        # =====================
        if state.get("current_flow") == "book":
            return self._handle_book_flow(user_id, message, state, entities)

        # Fallback
        reply = self._generate_reply("fallback", {"message": message}, user_id,
            "I'm here to help you book, reschedule, or cancel an appointment. Just let me know what you need! 😊")
        return self._reply(user_id, message, reply)


    def _handle_book_flow(self, user_id: str, message: str, state: dict, entities: dict) -> str:
        collected = state["collected"]
        # ── Step 0: Collect symptoms / specialty ──
        if "symptoms" not in collected and "specialty" not in collected:
            if entities.get("specialty"):
                collected["specialty"] = entities["specialty"]
                state["step"] = None
                _user_states[user_id] = state
                # fall through
            else:
                # First time → ask
                if state.get("step") != "symptoms":
                    state["step"] = "symptoms"
                    _user_states[user_id] = state
                    reply = self._generate_reply("ask_symptoms", {}, user_id,
                        "What symptoms are you experiencing, or which specialty do you need? 😊")
                    return self._reply(user_id, message, reply)

                # User replied with symptoms
                if entities.get("specialty"):
                    collected["specialty"] = entities["specialty"]
                    state["step"] = None
                    _user_states[user_id] = state
                elif message.strip():
                    if "symptoms" not in collected:
                        collected["symptoms"] = message.strip()
                        state["step"] = None
                        _user_states[user_id] = state
                   
                    logger.info(f"[DEBUG FLOW] symptoms stored: '{collected['symptoms']}'")
                    suggested = self._suggest_specialties(collected["symptoms"])
                    logger.info(f"[DEBUG FLOW] suggested by mapping: {suggested}")
    
                    backend_to_display = self._get_specialties()
                    logger.info(f"[DEBUG FLOW] specialties in DB: {list(backend_to_display.values())}")
    
                    specialties_display_normalized = {
                        d.lower().strip(): d for d in backend_to_display.values()
                    }
                    available = [
                        specialties_display_normalized[s.lower().strip()]
                        for s in suggested
                        if s.lower().strip() in specialties_display_normalized
                    ]
                    logger.info(f"[DEBUG FLOW] available (intersection): {available}")
                    logger.info(f"[DEBUG FLOW] → branch taken: {'available' if available else 'suggested' if suggested else 'else'}")

                    # Suggest specialties from symptoms
                    suggested = self._suggest_specialties(collected["symptoms"])
                    backend_to_display = self._get_specialties()
                    specialties_display_normalized = {
                        d.lower().strip(): d for d in backend_to_display.values()
                    }
                    available = [
                        specialties_display_normalized[s.lower().strip()]
                        for s in suggested
                        if s.lower().strip() in specialties_display_normalized
                    ]

                    logger.info(f"[DEBUG] Symptoms: {collected['symptoms']}")
                    logger.info(f"[DEBUG] Suggested: {suggested} | Available in DB: {available}")

                    if available:
                        state["step"] = "suggested_specialty"
                        state["suggested_specialties"] = available
                        _user_states[user_id] = state
                        ctx = {"symptoms": collected["symptoms"], "suggestions": available}
                        fallback = (
                            f"Based on your symptoms, I recommend: {', '.join(available)}.\n\n"
                            f"Would you like to choose one, or type 'all' to see every specialty?"
                        )
                        reply = self._generate_reply("suggest_specialty", ctx, user_id, fallback)
                        return self._reply(user_id, message, reply)

                    elif suggested:
                        # ⚠️ Mapped to a specialty but NOT available in our system
                        # → Tell the patient what they need AND advise them to seek it externally
                        not_available = suggested
                        state["step"] = "symptoms"
                        state["suggested_specialties_external"] = not_available
                        _user_states[user_id] = state

                        if len(not_available) == 1:
                            advice = f"a {not_available[0]} specialist"
                        else:
                            advice = f"a specialist in {' or '.join(not_available)}"

                        fallback = (
                            f"Based on your symptoms, you would need {advice}. "
                            f"Unfortunately, we don't have that specialty available in our network at the moment. 😔\n\n"
                            f"We recommend consulting {advice} at a nearby clinic or hospital.\n\n"
                            f"That said, if you'd like, I can help you book with one of our available specialties instead — "
                            f"would you like to see what we have?"
                        )
                        reply = self._generate_reply(
                            "specialty_not_available_external_advice",
                            {
                                "symptoms": collected["symptoms"],
                                "recommended_specialties": not_available,
                                "advice": f"seek {advice} outside our network",
                            },
                            user_id,
                            fallback,
                        )
                        return self._reply(user_id, message, reply)

                    else:
                    # ❌ Not recognized → show full list
                        state["step"] = None
                    _user_states[user_id] = state
                    fallback = (
                        "I wasn't able to match your symptoms to a specialty. "
                        "Let me show you all available specialties."
                    )
                    reply = self._generate_reply("symptoms_not_recognized", {}, user_id, fallback)
                    return self._reply(user_id, message, reply)
                else:
                    reply = self._generate_reply("ask_symptoms_retry", {}, user_id,
                        "Could you describe your symptoms or tell me which specialty you need?")
                    return self._reply(user_id, message, reply)

        # ── Handle symptoms already merged by entity extraction ──
        elif "symptoms" in collected and "specialty" not in collected and state.get("step") == "symptoms":
            # ── Patient wants to see available specialties ──
            user_input = message.strip().lower()
            wants_to_see = (
                entities.get("_confirm") or
                entities.get("confirmation") == "yes" or
                any(phrase in user_input for phrase in [
                    "yes", "sure", "ok", "okay", "show", "see", "what you have",
                    "available", "list", "what do you have", "i would", "let me see",
                    "go ahead", "proceed", "why not", "please"
                ])
            )

            if wants_to_see:
                collected.pop("symptoms", None)  # clear symptoms so Step 1 runs
                state["step"] = None
                _user_states[user_id] = state
        # Fall through to Step 1 (manual specialty list)
        
            else:
                suggested = self._suggest_specialties(collected["symptoms"])
                backend_to_display = self._get_specialties()
                specialties_display_normalized = {
                    d.lower().strip(): d for d in backend_to_display.values()
                }
                available = [
                    specialties_display_normalized[s.lower().strip()]
                    for s in suggested
                    if s.lower().strip() in specialties_display_normalized
                ]

                logger.info(f"[DEBUG FLOW] symptoms from entity merge: '{collected['symptoms']}'")
                logger.info(f"[DEBUG FLOW] suggested: {suggested} | available: {available}")

                if available:
                    state["step"] = "suggested_specialty"
                    state["suggested_specialties"] = available
                    _user_states[user_id] = state
                    ctx = {"symptoms": collected["symptoms"], "suggestions": available}
                    fallback = (
                        f"Based on your symptoms, I recommend: {', '.join(available)}.\n\n"
                        f"Would you like to choose one, or type 'all' to see every specialty?"
                    )
                    reply = self._generate_reply("suggest_specialty", ctx, user_id, fallback)
                    return self._reply(user_id, message, reply)

                elif suggested:
                    not_available = suggested
                    state["step"] = "symptoms"
                    state["suggested_specialties_external"] = not_available
                    _user_states[user_id] = state

                    if len(not_available) == 1:
                        advice = f"a {not_available[0]} specialist"
                    else:
                        advice = f"a specialist in {' or '.join(not_available)}"

                    fallback = (
                        f"Based on your symptoms, you would need {advice}. "
                        f"Unfortunately, we don't have that specialty available in our network at the moment. 😔\n\n"
                        f"We recommend consulting {advice} at a nearby clinic or hospital.\n\n"
                        f"That said, if you'd like, I can help you book with one of our available specialties instead — "
                        f"would you like to see what we have?"
                    )
                    reply = self._generate_reply(
                        "specialty_not_available_external_advice",
                        {
                            "symptoms": collected["symptoms"],
                            "recommended_specialties": not_available,
                            "advice": f"seek {advice} outside our network",
                        },
                        user_id,
                        fallback,
                    )
                    return self._reply(user_id, message, reply)

                else:
                    state["step"] = None
                    _user_states[user_id] = state
                    fallback = (
                        "I wasn't able to match your symptoms to a specialty. "
                        "Let me show you all available specialties."
                    )
                    reply = self._generate_reply("symptoms_not_recognized", {}, user_id, fallback)
                    return self._reply(user_id, message, reply)

        

        # ── Handle suggested_specialty response ──
        if state.get("step") == "suggested_specialty":
            suggestions = state.get("suggested_specialties", [])

            if entities.get("refuse_suggestion") or collected.get("_refuse"):
                collected.pop("_refuse", None)
                collected.pop("symptoms", None)
                collected.pop("specialty", None)
                state["step"] = "symptoms"
                _user_states[user_id] = state
                reply = self._generate_reply("refuse_suggestion", {}, user_id,
                    "No problem! Let's try again — what symptoms are you having?")
                return self._reply(user_id, message, reply)

            if entities.get("specialty"):
                collected["specialty"] = entities["specialty"]
                state["step"] = None
                _user_states[user_id] = state
            else:
                user_input = message.strip().lower()
                matched = False
                for s in suggestions:
                    if user_input == s.lower() or user_input in s.lower():
                        collected["specialty"] = s
                        state["step"] = None
                        _user_states[user_id] = state
                        matched = True
                        break
                if not matched:
                    if "all" in user_input or "available" in user_input:
                        state["step"] = None
                        _user_states[user_id] = state
                        # fall through to specialty list
                    else:
                        reply = self._generate_reply("suggest_specialty_retry", {"suggestions": suggestions}, user_id,
                            f"Please pick one of: {', '.join(suggestions)}, or type 'all' to see all specialties.")
                        return self._reply(user_id, message, reply)

        # ── Step 1: Manual specialty selection ──
        if "specialty" not in collected:
            if entities.get("specialty"):
                collected["specialty"] = entities["specialty"]
                state["step"] = None
                _user_states[user_id] = state
            else:
                backend_to_display = self._get_specialties()
                specialties_display = list(backend_to_display.values())
                specialty_backend_map = {v.lower(): k for k, v in backend_to_display.items()}
                specialty_map = {str(i): s for i, s in enumerate(specialties_display, 1)}

                if state.get("step") != "specialty":
                    state["step"] = "specialty"
                    _user_states[user_id] = state
                    ctx = {"specialties": specialties_display}
                    fallback = "Which specialty do you need?\n" + "\n".join(
                        f"{i}) {s}" for i, s in enumerate(specialties_display, 1))
                    reply = self._generate_reply("ask_specialty", ctx, user_id, fallback)
                    return self._reply(user_id, message, reply)

                user_input = message.strip()
                if user_input in specialty_map:
                    display_name = specialty_map[user_input]
                    collected["specialty"] = specialty_backend_map.get(display_name.lower(), display_name)
                elif user_input:
                    collected["specialty"] = specialty_backend_map.get(user_input.lower(), user_input)
                else:
                    reply = self._generate_reply("ask_specialty_retry", {}, user_id,
                        "Please reply with the number or name of the specialty.")
                    return self._reply(user_id, message, reply)
                state["step"] = None
                _user_states[user_id] = state
                
            # ── Guard: Ensure specialty is valid before continuing ──
            if not collected.get("specialty"):
                state["step"] = "symptoms"
                _user_states[user_id] = state
                reply = self._generate_reply("ask_symptoms", {}, user_id,
                    "Could you tell me your symptoms or which specialty you need? 😊")
                return self._reply(user_id, message, reply)

        # ── Step 2: Doctor & slot proposal ──
        if "doctor_id" not in collected or "slot_time" not in collected:
            import datetime

            if state.get("step") == "doctor_slot_proposal":
                if entities.get("_confirm") or entities.get("confirmation") == "yes":
                    state["step"] = "None" 
                    _user_states[user_id] = state
                elif entities.get("_later") or entities.get("navigation") == "later":
                    return self._handle_later_slot(user_id, message, state)
                elif entities.get("_earlier") or entities.get("navigation") == "earlier":
                    return self._handle_earlier_slot(user_id, message, state)
                elif entities.get("_deny") or entities.get("confirmation") == "no":
                    return self._handle_later_slot(user_id, message, state)

            state["step"] = "doctor_slot_proposal"
            try:
                logger.info(f"[DEBUG] Searching doctors with specialty: '{collected['specialty']}'")
                doctors = user_api.search_doctors({"user_id": user_id}, specialization=collected["specialty"])
            except Exception as e:
                logger.error(f"Doctor API error: {e}")
                reply = self._generate_reply("doctor_api_error", {"error": str(e)}, user_id,
                    "Sorry, I can't reach the doctor list right now. Please try again in a moment.")
                return self._reply(user_id, message, reply)

            if not doctors:
                collected.pop("specialty", None)
                state["step"] = None
                _user_states[user_id] = state
                reply = self._generate_reply("no_doctors", {"specialty": collected.get("specialty", "that specialty")}, user_id,
                    "I couldn't find any doctors for that specialty. Would you like to try a different one?")
                return self._reply(user_id, message, reply)

            def doctor_sort_key(d):
                return (
                    not d.get("isverifiedByAdmin", False),
                    -(d.get("yearsOfExperience") or 0),
                    d.get("consultationFee") or float('inf')
                )
            doctors_sorted = sorted(doctors, key=doctor_sort_key)


            today = datetime.date.today()
            now = datetime.datetime.now()
            best_doctor = None
            best_slot = None
            for d in doctors_sorted:
                for offset in range(0, 14):
                    date_obj = today + datetime.timedelta(days=offset)
                    date_str = date_obj.isoformat()
                    slots = appointment_api.list_slots_for_doctor({"user_id": user_id}, d["id"], date_str)
                    # Only consider slots that are in the future
                    available_slots = []
                    for slot in slots:
                        slot_dt = datetime.datetime.strptime(f"{date_str} {slot}", "%Y-%m-%d %H:%M")
                        if slot_dt > now:
                            available_slots.append(slot)
                    if available_slots:
                        best_doctor = d
                        best_slot = {"date": date_str, "time": available_slots[0]}
                        break
                if best_doctor:
                    break

            if not best_doctor or not best_slot:
                collected.pop("specialty", None)
                state["step"] = None
                _user_states[user_id] = state
                reply = self._generate_reply("no_slots", {}, user_id,
                    "Sorry, no available slots in the next 2 weeks. Would you like to try another specialty?")
                return self._reply(user_id, message, reply)

            collected["doctor_id"] = best_doctor["id"]
            collected["doctor_name"] = f"{best_doctor.get('firstName','')} {best_doctor.get('lastName','')}".strip()
            collected["date"] = best_slot["date"]
            collected["slot_time"] = best_slot["time"]
            _user_states[user_id] = state

            ctx = {
                "doctor_name": collected["doctor_name"],
                "verified": best_doctor.get("isverifiedByAdmin", False),
                "experience": best_doctor.get("yearsOfExperience", "?"),
                "fee": best_doctor.get("consultationFee", "?"),
                "date": collected["date"],
                "time": collected["slot_time"],
                "specialty": collected.get("specialty", ""),
            }
            fallback = (
                f"I found Dr. {collected['doctor_name']} for you! "
                f"({'Verified' if best_doctor.get('isverifiedByAdmin') else 'Not yet verified'}, "
                f"{best_doctor.get('yearsOfExperience','?')} years experience, "
                f"fee: {best_doctor.get('consultationFee','?')})\n\n"
                f"Soonest slot: {collected['date']} at {collected['slot_time']}\n\n"
                f"Would you like to book this? (yes / later / earlier)"
            )
            reply = self._generate_reply("propose_doctor", ctx, user_id, fallback)
            return self._reply(user_id, message, reply)

        # ── Step 3: Confirmation ──

        if not collected.get("confirmed"):
            # Detect and answer common questions before confirmation
            question = message.strip().lower()
            answered = False
            ctx = {
                "doctor_name": collected.get("doctor_name", "the doctor"),
                "specialty": collected.get("specialty", ""),
                "date": collected.get("date", ""),
                "time": collected.get("slot_time", ""),
                "fee": None
            }
            # Try to get fee if available
            if "fee" in collected:
                ctx["fee"] = collected["fee"]
            elif "doctor_id" in collected:
                # Try to fetch doctor profile for fee
                try:
                    doctor = user_api.fetch_doctor_profile({}, collected["doctor_id"])
                    if doctor and "consultationFee" in doctor:
                        ctx["fee"] = doctor["consultationFee"]
                        collected["fee"] = doctor["consultationFee"]
                except Exception:
                    pass

            # Simple keyword-based question detection
            if any(q in question for q in ["how much", "fee", "price", "cost"]):
                fee = ctx["fee"] if ctx["fee"] is not None else "unknown"
                reply = f"The consultation fee is {fee} DZD. Would you like to book this appointment? (yes/no)"
                state["step"] = "confirm"
                _user_states[user_id] = state
                answered = True
            elif any(q in question for q in ["who is the doctor", "doctor name", "which doctor", "who's the doctor"]):
                reply = f"The doctor is Dr. {ctx['doctor_name']}. Would you like to book this appointment? (yes/no)"
                state["step"] = "confirm"
                _user_states[user_id] = state
                answered = True
            elif any(q in question for q in ["when", "what time", "what date", "which day"]):
                reply = f"The appointment is on {ctx['date']} at {ctx['time']}. Would you like to book this appointment? (yes/no)"
                state["step"] = "confirm"
                _user_states[user_id] = state
                answered = True
            elif any(q in question for q in ["what specialty", "which specialty"]):
                reply = f"The specialty is {ctx['specialty']}. Would you like to book this appointment? (yes/no)"
                state["step"] = "confirm"
                _user_states[user_id] = state
                answered = True

            if answered:
                return self._reply(user_id, message, reply)

            # Only confirm on explicit yes/no
            if state.get("step") != "confirm":
                state["step"] = "confirm"
                _user_states[user_id] = state
                fallback = (
                    f"Ready to book: Dr. {ctx['doctor_name']}, "
                    f"{ctx['specialty']}, on {ctx['date']} at {ctx['time']}.\n\n"
                    f"Shall I confirm this? (yes/no)"
                )
                reply = self._generate_reply("confirm_booking", ctx, user_id, fallback)
                return self._reply(user_id, message, reply)

            if entities.get("_deny") or entities.get("confirmation") == "no":
                state = {"current_flow": None, "step": None, "collected": {}}
                _user_states[user_id] = state
                reply = self._generate_reply("booking_cancelled", {}, user_id,
                    "Booking cancelled. Let me know if you'd like to start over! 😊")
                return self._reply(user_id, message, reply)
            elif entities.get("_confirm") or entities.get("confirmation") == "yes":
                collected["confirmed"] = True
                _user_states[user_id] = state
            else:
                reply = self._generate_reply("confirm_retry", {}, user_id,
                    "Please confirm with 'yes' to book, or 'no' to cancel.")
                return self._reply(user_id, message, reply)

        # ── Step 4: Book appointment via API ──
        try:
            logger.info(f"Booking appointment for user {user_id}")
            date_str = collected.get("date")
            time_str = collected.get("slot_time")
            if date_str and time_str:
                scheduled_at = f"{date_str}T{time_str}:00"
            else:
                raise Exception("Missing date or time for appointment.")

            patient_profile = user_api.fetch_patient_profile({"user_id": user_id}, user_id)
            patient_uuid = patient_profile.get("id") if patient_profile else None
            if not patient_uuid:
                raise Exception("Could not fetch patient UUID.")

            # Generate AI Summary for the appointment
            history = conversation_history.get_history(user_id)
            patient_context = {
                "symptoms": collected.get("symptoms", "Not specified"),
                "specialty": collected.get("specialty", "Not specified"),
                "visit_type": collected.get("visit_type", "CONSULTATION"),
            }
            ai_summary = gemini_client.generate_preconsultation_summary(history, patient_context)

            payload = {
                "appointment": {
                    "idPatient": patient_uuid,
                    "idDoctor": collected.get("doctor_id"),
                    "scheduledAt": scheduled_at,
                    "type": collected.get("visit_type", "CONSULTATION"),
                    "status": "PENDING_DOCTOR_CONFIRMATION",
                    "aiSummary": ai_summary
                },
                "createdByRole": "PATIENT"
            }
            result = appointment_api.create_appointment({"user_id": user_id}, payload)
            # Log the result for debugging
            logger.info(f"[DEBUG] Appointment API result: {result}")
            # Check for error or missing appointment
            if not result or (isinstance(result, dict) and result.get("error")):
                error_msg = result.get("message") if isinstance(result, dict) and result.get("message") else "Booking failed — no response from server."
                raise Exception(error_msg)
        except Exception as e:
            logger.error(f"Booking error: {e}")
            state = {"current_flow": None, "step": None, "collected": {}}
            _user_states[user_id] = state
            reply = self._generate_reply("booking_error", {"error": str(e)}, user_id,
                f"Sorry, the booking failed: {e}\nPlease try again later.")
            return self._reply(user_id, message, reply)

        # ── Success ──
        ctx = {
            "doctor_name": collected.get("doctor_name"),
            "specialty": collected.get("specialty"),
            "date": collected.get("date"),
            "time": collected.get("slot_time"),
        }
        state = {"current_flow": None, "step": None, "collected": {}}
        _user_states[user_id] = state
        reply = self._generate_reply("booking_success", ctx, user_id,
            f"Your appointment with Dr. {ctx['doctor_name']} on {ctx['date']} at {ctx['time']} has been submitted! "
            f"It's pending doctor confirmation. 🎉")
        return self._reply(user_id, message, reply)

     # def _suggest_specialties(self, symptoms_text: str) -> list:
     #    """Suggest specialties based on symptoms using the mapping table. Supports multiple symptoms, exact match only."""
        # Split input on commas and slashes, trim and lowercase
       # user_symptoms = [s.strip().lower() for s in symptoms_text.replace("/", ",").split(",") if s.strip()]
       # suggested = []
        #for us in user_symptoms:
        #    for key, specs in self.SYMPTOM_SPECIALTY_MAP.items():
        #        if key == us:
        #            suggested.extend(specs)
        #return list(dict.fromkeys(suggested))
        

    def _suggest_specialties(self, symptoms_text: str) -> list:
        """
        Suggère des spécialités basées sur les symptômes.
        Supporte le matching partiel (ex: 'j'ai mal à la tête' → 'headache').
        """
        user_symptoms = [
            s.strip().lower()
            for s in symptoms_text.replace("/", ",").split(",")
            if s.strip()
        ]
        all_words = symptoms_text.lower().split()
        suggested = []
        for key, specs in self.SYMPTOM_SPECIALTY_MAP.items():
            key_lower = key.lower()
            # Match exact sur symptôme complet
            if key_lower in user_symptoms:
                suggested.extend(specs)
                continue
            # Match partiel : le symptôme-clé est contenu dans le texte du patient
            if key_lower in symptoms_text.lower():
                suggested.extend(specs)
                continue
            # Match par mots-clés : tous les mots du symptôme-clé présents dans le texte
            key_words = key_lower.split()
            if len(key_words) > 1 and all(w in all_words for w in key_words):
                suggested.extend(specs)
        return list(dict.fromkeys(suggested))  # dédoublonner en gardant l'ordre

    def _handle_later_slot(self, user_id: str, message: str, state: dict) -> str:
        """Move to the next available later slot (same day first, then future days)."""
        import datetime
        collected = state["collected"]
        cur_date_str = collected["date"]
        cur_time = collected["slot_time"]
        cur_date = datetime.datetime.strptime(cur_date_str, "%Y-%m-%d").date()

        # First: check remaining slots on the SAME day (after current time)
        same_day_slots = appointment_api.list_slots_for_doctor({"user_id": user_id}, collected["doctor_id"], cur_date_str)
        later_slots = [s for s in same_day_slots if s > cur_time]
        if later_slots:
            collected["date"] = cur_date_str
            collected["slot_time"] = later_slots[0]
            _user_states[user_id] = state
            ctx = {"doctor_name": collected["doctor_name"], "date": cur_date_str, "time": later_slots[0]}
            fallback = f"How about Dr. {collected['doctor_name']} on {cur_date_str} at {later_slots[0]} instead? (yes/later/earlier)"
            reply = self._generate_reply("propose_later_slot", ctx, user_id, fallback)
            return self._reply(user_id, message, reply)

        # Then: check future days
        for offset in range(1, 15):
            date_str = (cur_date + datetime.timedelta(days=offset)).isoformat()
            slots = appointment_api.list_slots_for_doctor({"user_id": user_id}, collected["doctor_id"], date_str)
            if slots:
                collected["date"] = date_str
                collected["slot_time"] = slots[0]
                _user_states[user_id] = state
                ctx = {"doctor_name": collected["doctor_name"], "date": date_str, "time": slots[0]}
                fallback = f"Next available: Dr. {collected['doctor_name']} on {date_str} at {slots[0]}. Accept? (yes/later/earlier)"
                reply = self._generate_reply("propose_later_slot", ctx, user_id, fallback)
                return self._reply(user_id, message, reply)

        # No later slots found — offer to try a different doctor/specialty
        collected.pop("doctor_id", None)
        collected.pop("doctor_name", None)
        collected.pop("slot_time", None)
        collected.pop("date", None)
        state["step"] = None
        _user_states[user_id] = state
        reply = self._generate_reply("no_later_slots", {"specialty": collected.get("specialty", "")}, user_id,
            "Sorry, no later slots available in the next 2 weeks. Would you like to try a different doctor or specialty?")
        return self._reply(user_id, message, reply)

    def _handle_earlier_slot(self, user_id: str, message: str, state: dict) -> str:
        """Move to the previous available earlier slot (same day first, then past days)."""
        import datetime
        collected = state["collected"]
        cur_date_str = collected["date"]
        cur_time = collected["slot_time"]
        cur_date = datetime.datetime.strptime(cur_date_str, "%Y-%m-%d").date()
        today = datetime.date.today()

        # First: check earlier slots on the SAME day (before current time)
        same_day_slots = appointment_api.list_slots_for_doctor({"user_id": user_id}, collected["doctor_id"], cur_date_str)
        earlier_slots = [s for s in same_day_slots if s < cur_time]
        if earlier_slots:
            collected["date"] = cur_date_str
            collected["slot_time"] = earlier_slots[-1]  # latest of the earlier slots
            _user_states[user_id] = state
            ctx = {"doctor_name": collected["doctor_name"], "date": cur_date_str, "time": earlier_slots[-1]}
            fallback = f"How about Dr. {collected['doctor_name']} on {cur_date_str} at {earlier_slots[-1]} instead? (yes/later/earlier)"
            reply = self._generate_reply("propose_earlier_slot", ctx, user_id, fallback)
            return self._reply(user_id, message, reply)

        # Then: check past days (down to today)
        for offset in range(1, 15):
            check_date = cur_date - datetime.timedelta(days=offset)
            if check_date < today:
                break
            date_str = check_date.isoformat()
            slots = appointment_api.list_slots_for_doctor({"user_id": user_id}, collected["doctor_id"], date_str)
            if slots:
                collected["date"] = date_str
                collected["slot_time"] = slots[-1]  # latest slot on the earlier day
                _user_states[user_id] = state
                ctx = {"doctor_name": collected["doctor_name"], "date": date_str, "time": slots[-1]}
                fallback = f"Earlier slot: Dr. {collected['doctor_name']} on {date_str} at {slots[-1]}. Accept? (yes/later/earlier)"
                reply = self._generate_reply("propose_earlier_slot", ctx, user_id, fallback)
                return self._reply(user_id, message, reply)
        reply = self._generate_reply("no_earlier_slots", {}, user_id,
            "Sorry, no earlier slots available.")
        return self._reply(user_id, message, reply)
    
    
    def _handle_cancel_flow(self, user_id: str, message: str, state: dict, entities: dict) -> str:
    
        collected = state.setdefault("collected", {})

        # ── Step 1: Fetch upcoming appointments ──
        if state.get("step") is None:
            try:
                appointments = appointment_api.list_appointments_by_patient({"user_id": user_id})
                upcoming = [
                    appt for appt in (appointments or [])
                    if appt.get("status", "").lower() == "scheduled"
                ]
            except Exception as e:
                logger.error(f"Cancel flow — fetch error: {e}")
                state = {"current_flow": None, "step": None, "collected": {}}
                _user_states[user_id] = state
                return self._reply(user_id, message,
                    "Sorry, I couldn't retrieve your appointments. Please try again later.")

            if not upcoming:
                state = {"current_flow": None, "step": None, "collected": {}}
                _user_states[user_id] = state
                return self._reply(user_id, message,
                    "You don't have any upcoming appointments to cancel.")

            # Build doctor → appointments map
            doctors = {}
            for appt in upcoming:
                doctor_id = appt.get("idDoctor")
                doctor_name = appt.get("doctorName") or appt.get("doctor_name")
                if not doctor_name:
                   try:
                        profile = user_api.fetch_doctor_profile({"user_id": user_id}, doctor_id)
                        if profile:
                            first = profile.get("firstName", "")
                            last = profile.get("lastName", "")
                            doctor_name = f"{first} {last}".strip() or "Unknown Doctor"
                   except Exception:
                        doctor_name = "Unknown Doctor"
                doctors.setdefault(doctor_name, []).append(appt)

            state["step"] = "choose_doctor"
            state["appointments"] = doctors
            _user_states[user_id] = state

            doctor_list = ", ".join(doctors.keys())
            return self._reply(user_id, message,
                f"You have upcoming appointments with: {doctor_list}.\n\n"
                f"Which doctor's appointment would you like to cancel?")

        # ── Step 2: Match doctor by name ──
        if state.get("step") == "choose_doctor":
            doctors = state.get("appointments", {})
            user_input = message.strip().lower()
            
            # ── Handle contextual questions about appointments ──
            is_question = any(q in user_input for q in [
                "when", "what time", "what date", "which day", "how many",
                "tell me more", "details", "info", "information", "show me",
                "list", "what appointment", "which appointment"
            ])
            if is_question and not entities.get("doctor_name"):
                # Build a summary of all upcoming appointments
                summary_lines = []
                for doctor_name, appts in doctors.items():
                    for appt in appts:
                        scheduled_at = appt.get("scheduledAt", "Unknown time")
                        status = appt.get("status", "")
                        summary_lines.append(f"• Dr. {doctor_name} — {scheduled_at} ({status})")
                summary = "\n".join(summary_lines)
                return self._reply(user_id, message,
                    f"Here are your upcoming appointments:\n{summary}\n\n"
                    f"Which doctor's appointment would you like to cancel?")

            # Try to match from LLM-extracted doctor_name entity first
            extracted_name = entities.get("doctor_name", "")

            matched_doctor = None
            for doctor_name in doctors:
                name_lower = doctor_name.lower()
                if (extracted_name and extracted_name.lower() in name_lower) or \
                   (user_input in name_lower) or \
                   (name_lower in user_input):
                    matched_doctor = doctor_name
                    break

            if not matched_doctor:
                doctor_list = ", ".join(doctors.keys())
                return self._reply(user_id, message,
                    f"I couldn't match that to a doctor. Your upcoming appointments are with: {doctor_list}.\n"
                    f"Please type the doctor's name.")

            appts = doctors[matched_doctor]

           # If only one appointment → go straight to confirm
            if len(appts) == 1:
                appt = appts[0]
                collected["appointment_id"] = appt["id"]
                collected["doctor_name"] = matched_doctor
                collected["scheduled_at"] = appt.get("scheduledAt", "")

                # Check late cancel
                try:
                    appt_dt = datetime.datetime.fromisoformat(
                        collected["scheduled_at"].replace("Z", ""))
                    hours_until = (appt_dt - datetime.datetime.now()).total_seconds() / 3600
                    collected["is_late_cancel"] = hours_until < 24
                    collected["hours_until"] = round(hours_until, 1)
                except Exception:
                    collected["is_late_cancel"] = False

                state["step"] = "cancel_confirm"
                _user_states[user_id] = state

                late_warning = (
                    "\n\n⚠️ This is a late cancellation (less than 24h). A penalty may be applied."
                    if collected["is_late_cancel"] else ""
                )
                return self._reply(user_id, message,
                    f"Are you sure you want to cancel your appointment with Dr. {matched_doctor} "
                    f"on {collected['scheduled_at']}?{late_warning}\n\n(yes/no)")

            # Multiple appointments → let patient choose
            state["step"] = "choose_appt"
            state["chosen_doctor"] = matched_doctor
            state["doctor_appts"] = appts
            _user_states[user_id] = state

            listing = "\n".join([f"{i+1}) {a['scheduledAt']}" for i, a in enumerate(appts)])
            return self._reply(user_id, message,
                f"You have multiple appointments with Dr. {matched_doctor}:\n{listing}\n\n"
                f"Please reply with the number of the appointment to cancel.")

        # ── Step 3: Choose appointment number (multiple) ──
        if state.get("step") == "choose_appt":
            try:
                idx = int(message.strip()) - 1
                appt = state["doctor_appts"][idx]
            except (ValueError, IndexError):
                return self._reply(user_id, message,
                    "Invalid choice. Please reply with the number of the appointment.")

            collected["appointment_id"] = appt["id"]
            collected["doctor_name"] = state["chosen_doctor"]
            collected["scheduled_at"] = appt.get("scheduledAt", "")

            try:
                appt_dt = datetime.datetime.fromisoformat(
                collected["scheduled_at"].replace("Z", ""))
                hours_until = (appt_dt - datetime.datetime.now()).total_seconds() / 3600
                collected["is_late_cancel"] = hours_until < 24
                collected["hours_until"] = round(hours_until, 1)
            except Exception:
                collected["is_late_cancel"] = False

            state["step"] = "cancel_confirm"
            _user_states[user_id] = state

            late_warning = (
                "\n\n⚠️ This is a late cancellation (less than 24h). A penalty may be applied."
                if collected["is_late_cancel"] else ""
            )
            return self._reply(user_id, message,
                f"Are you sure you want to cancel your appointment with Dr. {collected['doctor_name']} "
                f"on {collected['scheduled_at']}?{late_warning}\n\n(yes/no)")

        # ── Step 4: Confirm cancellation ──
        if state.get("step") == "cancel_confirm":
            if entities.get("_deny") or entities.get("confirmation") == "no":
                state = {"current_flow": None, "step": None, "collected": {}}
                _user_states[user_id] = state
                return self._reply(user_id, message,
                    "No problem! Your appointment has not been cancelled. 😊")

            elif entities.get("_confirm") or entities.get("confirmation") == "yes":
                # Cancel immediately without asking for reason
                appointment_id = collected["appointment_id"]
                try:
                    result = appointment_api.cancel_appointment(
                        {"user_id": user_id}, appointment_id)
                    if not result:
                        raise Exception("No response from server.")
                    penalty_note = (
                        "\n\n⚠️ Because this was a late cancellation, a penalty has been recorded."
                        if collected.get("is_late_cancel") else ""
                    )
                    doctor_name = collected.get("doctor_name", "your doctor")
                    scheduled_at = collected.get("scheduled_at", "")
                    state = {"current_flow": None, "step": None, "collected": {}}
                    _user_states[user_id] = state
                    return self._reply(user_id, message,
                        f"Your appointment with Dr. {doctor_name} on {scheduled_at} has been cancelled.{penalty_note}"
                        f"has been successfully cancelled.{penalty_note} 🗓️")
                except Exception as e:
                    logger.error(f"Cancellation error: {e}")
                    state = {"current_flow": None, "step": None, "collected": {}}
                    _user_states[user_id] = state
                    return self._reply(user_id, message,
                        f"Sorry, I couldn't cancel your appointment due to an error: {e}\nPlease try again later.")
            else:
                return self._reply(user_id, message,
                    "Please confirm cancellation with 'yes' or 'no'.")

    def _handle_reschedule_flow(self, user_id: str, message: str, state: dict, entities: dict) -> str:
        collected = state.setdefault("collected", {})

        # ── Step 1: Fetch upcoming appointments ──
        if state.get("step") is None:
            try:
                appointments = appointment_api.list_appointments_by_patient({"user_id": user_id})
                upcoming = [
                    appt for appt in (appointments or [])
                    if appt.get("status", "").lower() == "scheduled"
                ]
            except Exception as e:
                logger.error(f"Reschedule flow — fetch error: {e}")
                state = {"current_flow": None, "step": None, "collected": {}}
                _user_states[user_id] = state
                return self._reply(user_id, message,
                    "Sorry, I couldn't retrieve your appointments. Please try again later.")

            if not upcoming:
                state = {"current_flow": None, "step": None, "collected": {}}
                _user_states[user_id] = state
                return self._reply(user_id, message,
                    "You don't have any upcoming appointments to reschedule.")

            # Build doctor → appointments map
            doctors = {}
            for appt in upcoming:
                doctor_id = appt.get("idDoctor")
                doctor_name = appt.get("doctorName") or appt.get("doctor_name")
                if not doctor_name:
                    try:
                        profile = user_api.fetch_doctor_profile({"user_id": user_id}, doctor_id)
                        if profile:
                            first = profile.get("firstName", "")
                            last = profile.get("lastName", "")
                            doctor_name = f"{first} {last}".strip() or "Unknown Doctor"
                    except Exception:
                        doctor_name = "Unknown Doctor"
                doctors.setdefault(doctor_name, []).append(appt)

            state["step"] = "choose_doctor"
            state["appointments"] = doctors
            _user_states[user_id] = state

            doctor_list = ", ".join(doctors.keys())
            return self._reply(user_id, message,
                f"You have upcoming appointments with: {doctor_list}.\n\n"
                f"Which doctor's appointment would you like to reschedule?")

        # ── Step 2: Match doctor by name ──
        if state.get("step") == "choose_doctor":
            doctors = state.get("appointments", {})
            user_input = message.strip().lower()
            
            # Try to match from LLM-extracted doctor_name entity first
            extracted_name = entities.get("doctor_name", "")

            matched_doctor = None
            for doctor_name in doctors:
                name_lower = doctor_name.lower()
                if (extracted_name and extracted_name.lower() in name_lower) or \
                   (user_input in name_lower) or \
                   (name_lower in user_input):
                    matched_doctor = doctor_name
                    break

            if not matched_doctor:
                doctor_list = ", ".join(doctors.keys())
                return self._reply(user_id, message,
                    f"I couldn't match that to a doctor. Your upcoming appointments are with: {doctor_list}.\n"
                    f"Please type the doctor's name.")

            appts = doctors[matched_doctor]

            if len(appts) == 1:
                appt = appts[0]
                collected["appointment_id"] = appt["id"]
                collected["doctor_id"] = appt["idDoctor"]
                collected["doctor_name"] = matched_doctor
                collected["current_scheduled_at"] = appt.get("scheduledAt", "")
                collected["ai_summary"] = appt.get("aiSummary", "")
                
                state["step"] = "propose_new_slots"
                _user_states[user_id] = state
                # Fall through to propose slots
            else:
                state["step"] = "choose_appt"
                state["chosen_doctor"] = matched_doctor
                state["doctor_appts"] = appts
                _user_states[user_id] = state

                listing = "\n".join([f"{i+1}) {a['scheduledAt']}" for i, a in enumerate(appts)])
                return self._reply(user_id, message,
                    f"You have multiple appointments with Dr. {matched_doctor}:\n{listing}\n\n"
                    f"Please reply with the number of the appointment to reschedule.")

        # ── Step 3: Choose appointment number (multiple) ──
        if state.get("step") == "choose_appt":
            try:
                idx = int(message.strip()) - 1
                appt = state["doctor_appts"][idx]
            except (ValueError, IndexError):
                return self._reply(user_id, message,
                    "Invalid choice. Please reply with the number of the appointment.")

            collected["appointment_id"] = appt["id"]
            collected["doctor_id"] = appt["idDoctor"]
            collected["doctor_name"] = state["chosen_doctor"]
            collected["current_scheduled_at"] = appt.get("scheduledAt", "")
            collected["ai_summary"] = appt.get("aiSummary", "")
            
            state["step"] = "propose_new_slots"
            _user_states[user_id] = state
            # Fall through

        # ── Step 4: Propose new slots ──
        if state.get("step") == "propose_new_slots":
            # Handle confirmation/navigation from entities
            if entities.get("_confirm") or entities.get("confirmation") == "yes":
                state["step"] = "get_reason"
                _user_states[user_id] = state
                return self._reply(user_id, message,
                    "Could you please tell me why you're rescheduling? (e.g., 'Work conflict', 'Feeling better', or just type 'none')")
            
            elif entities.get("_deny") or entities.get("confirmation") == "no":
                # Patient refused the proposed slot
                return self._handle_later_slot(user_id, message, state)

            elif entities.get("_later") or entities.get("navigation") == "later":
                return self._handle_later_slot(user_id, message, state)
            
            elif entities.get("_earlier") or entities.get("navigation") == "earlier":
                return self._handle_earlier_slot(user_id, message, state)

            # If we don't have a proposed slot yet, find the soonest one
            if "slot_time" not in collected:
                import datetime
                today = datetime.date.today()
                now = datetime.datetime.now()
                best_slot = None
                
                for offset in range(0, 14):
                    date_obj = today + datetime.timedelta(days=offset)
                    date_str = date_obj.isoformat()
                    slots = appointment_api.list_slots_for_doctor({"user_id": user_id}, collected["doctor_id"], date_str)
                    
                    available_slots = []
                    for slot in slots:
                        slot_dt = datetime.datetime.strptime(f"{date_str} {slot}", "%Y-%m-%d %H:%M")
                        # Don't propose the same slot or past slots
                        if slot_dt > now and f"{date_str}T{slot}:00" != collected["current_scheduled_at"]:
                            available_slots.append(slot)
                    
                    if available_slots:
                        best_slot = {"date": date_str, "time": available_slots[0]}
                        break
                
                if not best_slot:
                    state = {"current_flow": None, "step": None, "collected": {}}
                    _user_states[user_id] = state
                    return self._reply(user_id, message,
                        f"I couldn't find any other available slots for Dr. {collected['doctor_name']} in the next 2 weeks. "
                        "Please try again later or contact the clinic.")

                collected["date"] = best_slot["date"]
                collected["slot_time"] = best_slot["time"]
                _user_states[user_id] = state
                
                ctx = {
                    "doctor_name": collected["doctor_name"],
                    "date": collected["date"],
                    "time": collected["slot_time"]
                }
                fallback = (
                    f"Dr. {collected['doctor_name']} is available on {collected['date']} at {collected['slot_time']}.\n"
                    f"Would you like to move your appointment to this time? (yes / later / earlier)"
                )
                reply = self._generate_reply("propose_reschedule_slot", ctx, user_id, fallback)
                return self._reply(user_id, message, reply)

        # ── Step 5: Get reason and finalize ──
        if state.get("step") == "get_reason":
            reason = message.strip()
            if reason.lower() in ("none", "no reason", "n/a", "no"):
                reason = "Patient requested reschedule via assistant."
            
            collected["reason"] = reason
            new_scheduled_at = f"{collected['date']}T{collected['slot_time']}:00"
            
            # Generate updated AI Summary
            updated_summary = gemini_client.generate_reschedule_summary(
                collected.get("ai_summary", ""),
                reason,
                "", # we could ask for new symptoms but let's keep it simple for now
                collected.get("current_scheduled_at", ""),
                collected["date"],
                collected["slot_time"]
            )

            try:
                result = appointment_api.postpone_appointment(
                    {"user_id": user_id},
                    collected["appointment_id"],
                    new_scheduled_at,
                    reason=reason,
                    updated_ai_summary=updated_summary
                )
                
                if not result:
                    raise Exception("No response from appointment service.")

                state = {"current_flow": None, "step": None, "collected": {}}
                _user_states[user_id] = state
                
                ctx = {
                    "doctor_name": collected["doctor_name"],
                    "date": collected["date"],
                    "time": collected["slot_time"]
                }
                fallback = (
                    f"Great! Your request to reschedule your appointment with Dr. {collected['doctor_name']} "
                    f"to {collected['date']} at {collected['slot_time']} has been sent to the doctor for approval. 🗓️"
                )
                reply = self._generate_reply("reschedule_success", ctx, user_id, fallback)
                return self._reply(user_id, message, reply)

            except Exception as e:
                logger.error(f"Reschedule error: {e}")
                state = {"current_flow": None, "step": None, "collected": {}}
                _user_states[user_id] = state
                return self._reply(user_id, message,
                    f"Sorry, I couldn't process your reschedule request: {e}\nPlease try again later.")

        return self._reply(user_id, message, "I'm not sure how to help with that right now.")

                

        