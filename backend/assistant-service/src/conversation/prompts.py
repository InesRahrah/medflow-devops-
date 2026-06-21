# Prompt templates for each conversation step

SPECIALTY_SUGGESTIONS = """
Which specialty do you need?
1) General practitioner
2) Dermatologist
3) Other (type your answer)
"""

DOCTOR_SUGGESTIONS = """
Here are three doctors and their next available times:
1) {doctor1} — {specialty1} — {time1}
2) {doctor2} — {specialty2} — {time2}
3) {doctor3} — {specialty3} — {time3}
Which one would you like?
"""

SLOT_SUGGESTIONS = """
Here are three available slots:
1) {slot1}
2) {slot2}
3) {slot3}
Which time works for you?
"""

CONFIRMATION = """
You chose Dr. {doctor}, {specialty}, on {date_time} ({visit_type}). Shall I book this appointment?"
"""
