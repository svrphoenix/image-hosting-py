import logging
import sys
import time
from logging.handlers import RotatingFileHandler
from pathlib import Path

from config import settings

logs_dir = Path(settings.logs_dir)
logs_dir.mkdir(exist_ok=True, parents=True)
log_file = logs_dir / "app.log"

logging.Formatter.converter = time.gmtime
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        RotatingFileHandler(
            filename=log_file,
            maxBytes=5 * 1024 * 1024,
            backupCount=3,
            encoding="utf-8"
        )
    ]
)

logger = logging.getLogger(__name__)