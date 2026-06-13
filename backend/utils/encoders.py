import json
from datetime import datetime
from urllib.parse import urlparse, parse_qsl

class AppJSONEncoder(json.JSONEncoder):
    """
    Custom JSON encoder extended to seamlessly convert native Python datetime
    objects into standardized ISO 8601 string representations.
    """
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)
    

def get_query_params(path: str) -> dict[str, str]:
    """
    Parses a raw request path string and extracts its query string parameters
    into a key-value dictionary mapping.
    """
    return dict(parse_qsl(urlparse(path).query))


def get_int_param(params: dict, key: str, default: int) -> int:
    """
    Safely extracts an integer query value by its dictionary key, validating
    that it is greater than zero. Falls back to a default value on parsing errors.
    """
    try:
        val = int(params[key])
        return val if val > 0 else default
    except (KeyError, ValueError, TypeError):
        return default

def extract_image_filters(params: dict) -> dict:
    """
    Extracts, trims, and cleans specific optional filtering constraints
    from the dictionary of query params, standardizing empty inputs to None.
    """
    return {
        "search": params.get("search", "").strip() or None,
        "file_type": params.get("file_type", "").strip() or None,
        "date_from": params.get("date_from", "").strip() or None,
        "date_to": params.get("date_to", "").strip() or None,
    }