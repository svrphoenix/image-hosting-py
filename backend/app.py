from http.server import ThreadingHTTPServer

from psycopg_pool import ConnectionPool

from config import settings
from handlers import ImageAPIServer
from logger import logger
from utils import get_server_info

if __name__ == "__main__":
    PORT = 8000

    conninfo = (
        f"host={settings.db_host} "
        f"port={settings.db_port} "
        f"dbname={settings.db_name} "
        f"user={settings.db_user} "
        f"password={settings.db_password}"
    )
    db_pool = ConnectionPool(conninfo, min_size=1, max_size=10, open=True)
    server = ThreadingHTTPServer(("0.0.0.0", PORT), ImageAPIServer)
    server.db_pool = db_pool
    hostname, ip_address = get_server_info()

    try:
        logger.info(
            f"Server started: Hostname (Container ID): {hostname}  "
            f"Internal IP: {ip_address}  Port: {PORT}"
        )
        server.serve_forever()
    except Exception as e:
        logger.error(f"Server crashed on host {hostname} ({ip_address}). Details: {e}")
    finally:
        logger.info("Closing database connection pool...")
        db_pool.close()