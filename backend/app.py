from http.server import HTTPServer

from handlers import ImageAPIServer
from logger import logger
from utils import get_server_info

if __name__ == "__main__":
    PORT = 8000
    server = HTTPServer(("0.0.0.0", PORT), ImageAPIServer)

    hostname, ip_address = get_server_info()

    try:
        logger.info(
            f"Server started: Hostname (Container ID): {hostname}  "
            f"Internal IP: {ip_address}  Port: {PORT}"
        )
        server.serve_forever()
    except Exception as e:
        logger.error(f"Server crashed on host {hostname} ({ip_address}). Details: {e}")