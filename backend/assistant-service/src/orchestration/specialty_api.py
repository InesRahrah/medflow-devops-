import requests

def fetch_specialties():
    try:
        url = "http://localhost:8080/api/v1/users/specialties"
        resp = requests.get(url, timeout=5)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"[user_api] fetch_specialties error: {e}")
        return []
