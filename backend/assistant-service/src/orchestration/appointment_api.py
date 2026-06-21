def list_slots_for_doctor(session, doctor_id, date):
    """
    Fetch available slots for a doctor on a specific date.
    Args:
        session: dict, user/session context (not used here but for API consistency)
        doctor_id: str or UUID
        date: str (YYYY-MM-DD) or datetime.date
    Returns:
        List of slot time strings (e.g., ["09:00", "09:30", ...])
    """
    import requests
    from datetime import date as dt_date
    if isinstance(date, dt_date):
        date_str = date.isoformat()
    else:
        date_str = str(date)
    url = f"http://localhost:8081/api/v1/doctors/{doctor_id}/available-slots"
    try:
        resp = requests.get(url, params={"date": date_str}, timeout=5)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"[appointment_api] list_slots_for_doctor error: {e}")
        return []
def create_appointment(session, data):

    import requests
    try:
        url = "http://localhost:8081/appointments"
        resp = requests.post(url, json=data, timeout=5)
        try:
            resp.raise_for_status()
        except requests.HTTPError as e:
            if resp.status_code == 409:
                # Slot was taken by another patient (double-booking prevented)
                print(f"[appointment_api] Slot conflict (409): {resp.text}")
                return {"error": "slot_conflict", "message": "This time slot was just booked by another patient. Please select a different time."}
            print(f"[appointment_api] create_appointment error: {e}")
            print(f"[appointment_api] Response status: {resp.status_code}")
            print(f"[appointment_api] Response body: {resp.text}")
            return None
        return resp.json()
    except Exception as e:
        print(f"[appointment_api] create_appointment error: {e}")
        return None

def cancel_appointment(session, appointment_id):
    import requests
    try:
        url = f"http://localhost:8081/appointments/{appointment_id}/cancel-request"
        resp = requests.patch(url, json={"requestedBy": "PATIENT"}, timeout=5)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"[appointment_api] cancel_appointment error: {e}")
        return None

def postpone_appointment(session, appointment_id, new_scheduled_at, reason=None, updated_ai_summary=None):
    import requests
    try:
        url = f"http://localhost:8081/appointments/{appointment_id}/patient-postpone"
        payload = {"newScheduledAt": new_scheduled_at}
        if reason:
            payload["reason"] = reason
        if updated_ai_summary:
            payload["updatedAiSummary"] = updated_ai_summary
        resp = requests.patch(url, json=payload, timeout=5)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"[appointment_api] postpone_appointment error: {e}")
        return None

def list_appointments_by_patient(session):
    import requests
    from src.orchestration.user_api import _generate_jwt
    try:
        patient_id = session.get('patient_uuid') or session.get('user_id', '')
        url = f"http://localhost:8081/api/v1/patients/{patient_id}/appointments"
        token = _generate_jwt(str(patient_id))
        headers = {
            "Authorization": f"Bearer {token}",
            "X-User-Id": str(patient_id),
        }
        resp = requests.get(url, headers=headers, timeout=5)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"[appointment_api] list_appointments_by_patient error: {e}")
        return []

def fetch_appointment_by_id(session, appointment_id):
    import requests
    try:
        url = f"http://localhost:8081/appointments/{appointment_id}"
        resp = requests.get(url, timeout=5)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"[appointment_api] fetch_appointment_by_id error: {e}")
        return None
