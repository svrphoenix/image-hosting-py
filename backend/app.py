import json
from http.server import BaseHTTPRequestHandler, HTTPServer


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.rstrip("/") or "/"

        if path == "/":
            body = json.dumps({"status": "ok", "message": "Image hosting API"}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)
            return

        self.send_error(404, "Not Found")


if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", 8002), Handler)
    print("Server started on http://127.0.0.1:8002")
    server.serve_forever()
