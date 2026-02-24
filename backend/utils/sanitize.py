import bleach

def sanitize(value: str) -> str:
    if not value:
        return value
    return bleach.clean(value, tags=[], strip=True).strip()

def sanitize_dict(data: dict) -> dict:
    return {
        k: sanitize(v) if isinstance(v, str) else v
        for k, v in data.items()
    }