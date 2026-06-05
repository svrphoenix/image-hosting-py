import logging
import sys
import time
from logging.handlers import RotatingFileHandler

from config import settings

LOG_DIR = settings.logs_dir

logging.Formatter.converter = time.gmtime
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        RotatingFileHandler(f"{LOG_DIR}/app.log", maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8")
    ]
)

logger = logging.getLogger(__name__)