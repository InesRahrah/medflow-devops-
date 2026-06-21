# In-memory conversation history store (replace with Redis/DB for prod)

_conversation_histories = {}

MAX_HISTORY = 20  # Keep last 20 messages per user


def get_history(user_id: str) -> list:
    """Get conversation history for a user."""
    return _conversation_histories.get(user_id, [])


def add_message(user_id: str, role: str, content: str):
    """Add a message to the conversation history. role: 'user' or 'assistant'."""
    if user_id not in _conversation_histories:
        _conversation_histories[user_id] = []
    _conversation_histories[user_id].append({"role": role, "content": content})
    # Trim to keep only last N messages
    if len(_conversation_histories[user_id]) > MAX_HISTORY:
        _conversation_histories[user_id] = _conversation_histories[user_id][-MAX_HISTORY:]


def clear_history(user_id: str):
    """Clear conversation history for a user."""
    _conversation_histories.pop(user_id, None)
