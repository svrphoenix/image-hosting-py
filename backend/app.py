from http.server import HTTPServer

from handlers.image import ImageAPIServer
from logger import logger

if __name__ == "__main__":

    server = HTTPServer(("0.0.0.0", 8000), ImageAPIServer)
    try:
        logger.info("Success: Server started on port 8000...")
        server.serve_forever()
    except Exception as e:
        logger.error(f"Error: server crashed. Details: {e}")