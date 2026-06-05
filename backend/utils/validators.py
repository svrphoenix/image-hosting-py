from config import settings


def validate_extension(filename: str) -> bool:
    ext = filename.split(".")[-1].lower()
    return ext in settings.allowed_file_types


def validate_size(size_bytes: int) -> bool:
    return size_bytes <= settings.max_file_size_mb * 1024 * 1024