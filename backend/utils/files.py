import os

from config import settings
from logger import logger

IMAGES_DIR = settings.images_dir

def save_image(filename: str, data: bytes):
    os.makedirs(IMAGES_DIR, exist_ok=True)
    with open(os.path.join(IMAGES_DIR, filename), "wb") as f:
        f.write(data)
        
def image_exists(filename) -> bool:
    return os.path.exists(os.path.join(IMAGES_DIR, filename))


def delete_image(filename) -> bool:
    file_path = os.path.join(IMAGES_DIR, filename)

    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.debug(f"File {filename} successfully deleted from disk.")
        else:
            logger.debug(f"File {filename} was not found on disk, skipping deleting.")
        return True

    except Exception as e:
        logger.debug(f"Critical error while deleting file {filename}: {e}")
        return False