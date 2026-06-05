import json
from datetime import datetime
from urllib.parse import urlparse, parse_qsl

class AppJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)
    

def get_query_params(path: str) -> dict[str, str]:
    return dict(parse_qsl(urlparse(path).query))


def get_int_param(params: dict, key: str, default: int) -> int:
    try:
        val = int(params[key])
        return val if val > 0 else default
    except (KeyError, ValueError, TypeError):
        return default