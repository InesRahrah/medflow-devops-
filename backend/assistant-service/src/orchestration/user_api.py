
import requests
import jwt
import datetime
import base64

# JWT config (should be loaded from env/config in production)
_JWT_SECRET_B64 = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970"
_JWT_SECRET = base64.b64decode(_JWT_SECRET_B64)
_JWT_ALGORITHM = "HS256"

def _generate_jwt(user_id, role="ASSISTANT", exp_minutes=60):
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=exp_minutes)
    }
    return jwt.encode(payload, _JWT_SECRET, algorithm=_JWT_ALGORITHM)

def fetch_patient_profile(session, user_id):
    """
    Fetch patient profile by user_id (UUID string).
    Returns user profile dict or None.
    """
    url = f"http://localhost:8080/api/v1/users/me"
    token = _generate_jwt(user_id)
    headers = {
        "Authorization": f"Bearer {token}",
        "X-User-Id": user_id
    }
    try:
        resp = requests.get(url, headers=headers, timeout=5)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"[user_api] fetch_patient_profile error: {e}")
        return None


def list_doctors(session, filters=None, user_id=None):
    """
    List doctors, optionally filtered. user_id is required for JWT auth.
    """
    url = "http://localhost:8080/api/v1/users/doctors"
    params = filters if filters else {}
    headers = {}
    if user_id:
        token = _generate_jwt(user_id)
        headers = {
            "Authorization": f"Bearer {token}",
            "X-User-Id": user_id
        }
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=5)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"[user_api] list_doctors error: {e}")
        return []



def search_doctors(session, specialization=None, gender=None, user_id=None):
    """
    Search doctors by specialization/gender. user_id is required for JWT auth.
    """
    url = "http://localhost:8080/api/v1/users/doctors"
    params = {}
    if specialization:
        params["specialty"] = specialization
    if gender:
        params["gender"] = gender
    headers = {}
    if user_id:
        token = _generate_jwt(user_id)
        headers = {
            "Authorization": f"Bearer {token}",
            "X-User-Id": user_id
        }
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=5)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"[user_api] search_doctors error: {e}")
        return []



def fetch_doctor_profile(session, doctor_id, user_id=None):
    """
    Fetch doctor profile by doctor_id. user_id is required for JWT auth.
    """
    url = f"http://localhost:8080/api/v1/users/doctors/{doctor_id}"
    headers = {}
    if user_id:
        token = _generate_jwt(user_id)
        headers = {
            "Authorization": f"Bearer {token}",
            "X-User-Id": user_id
        }
    try:
        resp = requests.get(url, headers=headers, timeout=5)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"[user_api] fetch_doctor_profile error: {e}")
        return None
