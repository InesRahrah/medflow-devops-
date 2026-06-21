# Extracts intent and entities from user messages (rules-based or LLM).


import re

class IntentExtractor:
    def extract_intent_entities(self, message: str) -> dict:
        """
        Rule-based extraction of intent and entities from user message.
        Returns: {'intent': ..., 'entities': {...}}
        """
        msg = message.lower()
        intent = None
        entities = {}

        # Intent detection (prioritize cancel/reschedule before booking)
        if any(word in msg for word in ["cancel", "delete", "remove"]):
            intent = "CANCEL"
        elif any(word in msg for word in ["reschedule", "postpone", "move", "change"]):
            intent = "RESCHEDULE"
        elif any(word in msg for word in ["book", "schedule", "appointment", "see", "need", "want"]):
            intent = "BOOK"

        # Emergency detection
        if any(word in msg for word in ["asap", "urgent", "immediately", "emergency"]):
            entities["type"] = "EMERGENCY"

        # Urgency indicator words (help the triage system assess severity)
        urgency_words = ["severe", "intense", "sudden", "worsening", "unbearable",
                         "can't breathe", "cannot breathe", "sharp pain", "very painful",
                         "getting worse", "extreme", "critical", "terrible"]
        found_urgency = [w for w in urgency_words if w in msg]
        if found_urgency:
            entities["urgency_indicators"] = found_urgency
            if not entities.get("type"):
                entities["type"] = "EMERGENCY"

        # Symptom extraction (very basic: look for 'have a' or 'with' ...)
        m = re.search(r"have a ([a-z ]+?)[\.,]", msg)
        if m:
            entities["symptoms"] = m.group(1).strip()
        else:
            m = re.search(r"with ([a-z ]+?)[\.,]", msg)
            if m:
                entities["symptoms"] = m.group(1).strip()

        # Expanded specialty extraction: match both specialty names and types (e.g., 'cardiology', 'cardiologist')
        specialty_keywords = [
            ("cardiology", ["cardiology", "cardiologist"]),
            ("dermatology", ["dermatology", "dermatologist"]),
            ("general medicine", ["general medicine", "general practitioner", "gp"]),
            ("pediatrics", ["pediatrics", "pediatrician"]),
            ("neurology", ["neurology", "neurologist"]),
            ("orthopedics", ["orthopedics", "orthopedic"]),
            ("dentistry", ["dentistry", "dentist"]),
            ("psychiatry", ["psychiatry", "psychiatrist"]),
            ("pulmonology", ["pulmonology", "pulmonologist"]),
            ("gastroenterology", ["gastroenterology", "gastroenterologist"]),
            ("rheumatology", ["rheumatology", "rheumatologist"]),
            ("endocrinology", ["endocrinology", "endocrinologist"]),
            ("urology", ["urology", "urologist"]),
            ("gynecology", ["gynecology", "gynecologist"]),
            ("nephrology", ["nephrology", "nephrologist"]),
            ("infectious diseases", ["infectious diseases", "infectious disease specialist"]),
            ("oncology", ["oncology", "oncologist"]),
            ("ophthalmology", ["ophthalmology", "ophthalmologist"]),
            ("ent", ["ent", "ear nose throat", "otolaryngologist"]),
            ("dermatology", ["dermatology", "dermatologist"]),
        ]
        for backend_name, keywords in specialty_keywords:
            for kw in keywords:
                # Use word boundary matching to avoid false positives (e.g., "ent" in "appointment")
                if re.search(r'\b' + re.escape(kw) + r'\b', msg):
                    entities["specialty"] = backend_name.capitalize()
                    break
        # Detect negative/decline/refusal for suggestions
        if any(word in msg for word in ["don't want", "do not want", "no thanks", "none of these", "not interested", "refuse", "something else", "another one", "different one"]):
            entities["refuse_suggestion"] = True

        # Doctor name extraction (e.g., 'Dr. Smith')
        m = re.search(r"dr\.\s*([a-z]+)", msg)
        if m:
            entities["doctor_name"] = m.group(1).capitalize()

        # Follow-up detection
        if "follow-up" in msg or "follow up" in msg:
            entities["visit_type"] = "FOLLOW_UP"
        elif "consultation" in msg:
            entities["visit_type"] = "CONSULTATION"
            
            

        print(f"[IntentExtractor] message='{message}' | detected intent='{intent}' | entities={entities}")
        return {"intent": intent, "entities": entities}
