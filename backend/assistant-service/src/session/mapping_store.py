# Stores option (1/2/3) to backend ID mappings per user session
# Use in-memory dict for starter; swap for Redis/DB in production

class MappingStore:
    def __init__(self):
        self._store = {}

    def set_mapping(self, session_id, step, mapping):
        # mapping: { '1': id1, '2': id2, '3': id3 }
        self._store[(session_id, step)] = mapping

    def get_id(self, session_id, step, option):
        return self._store.get((session_id, step), {}).get(option)

    def clear(self, session_id):
        # Remove all mappings for a session
        keys = [k for k in self._store if k[0] == session_id]
        for k in keys:
            del self._store[k]
