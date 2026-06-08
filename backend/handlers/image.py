import math
import re
import uuid
from urllib.parse import urlparse

import cgi
from PIL import Image, UnidentifiedImageError

from config import settings
from database import ImageRepository
from handlers import BaseHandler
from logger import logger
from utils import (
    get_query_params,
    validate_size,
    validate_extension,
    save_image,
    delete_image,
    get_int_param
)

IMAGES_DIR = settings.images_dir

class ImageAPIServer(BaseHandler):
    def setup(self):
        super().setup()
        pool = self.server.db_pool
        self.repo = ImageRepository(pool)

    def _get_routes(self):
        return [
            ("GET", r"^/images/?$", self.handle_images),
            ("GET", r"^/images/(?P<filename>[^/]+)$", self.handle_image_detail),
            ("POST", r"^/upload/?$", self.handle_upload),
            ("DELETE", r"^/images/(?P<filename>[^/]+)$", self.handle_delete)
        ]

    def _dispatch(self, http_method: str):
        logger.debug(f"Received {http_method} request for {self.path}")
        path = urlparse(self.path).path

        for method, pattern, handler in self._get_routes():
            if method == http_method:
                match = re.match(pattern, path)
                if match:
                    return handler(**match.groupdict())

        logger.warning(f"Route {http_method} {path} not found")
        self._send_error(404, f"Route {http_method} {path} not found")
        return None

    def do_GET(self):
        self._dispatch("GET")

    def do_POST(self):
        self._dispatch("POST")

    def do_DELETE(self):
        self._dispatch("DELETE")

    def get_client_ip(self):
        real_ip = self.headers.get('X-Real-IP')

        if real_ip:
            return real_ip.strip()
        
        return self.client_address[0]

    def handle_images(self):
        params = get_query_params(self.path)
        page = get_int_param(params, 'page', default=1)
        limit = get_int_param(params, 'limit', default=8)
        sort_order = params.get('order', 'desc')

        images = self.repo.list(
            page=page,
            limit=limit,
            direction=sort_order
        )

        total_items = self.repo.count()
        total_pages = math.ceil(total_items / limit) if total_items > 0 else 1
        response_data = {
            "items": images,
            "pagination": {
                "total": total_items,
                "pages": total_pages,
                "current_page": page,
                "limit": limit
            }
        }

        self._send_json(200, response_data)

    def handle_image_detail(self, filename: str):
        image = self.repo.get_by_filename(filename)

        if not image:
            logger.error(f"Image {filename} not found.")
            self._send_error(404, "Image not found")
            return

        self._send_json(200, image)

    def handle_upload(self):
        client_ip = self.get_client_ip()
        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            logger.error("Expected multipart/form-data for upload.")
            self._send_error(400, "Expected multipart/form-data")
            return

        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={"REQUEST_METHOD": "POST"},
        )

        if "file" not in form:
            logger.error("Missing 'file' field in form data.")
            self._send_error(400, "No file provided")
            return

        file_item = form["file"]
        if not file_item.filename:
            logger.error("Uploaded file has no filename.")
            self._send_error(400, "No file provided")
            return

        original_name: str = file_item.filename

        if not validate_extension(original_name):
            logger.error(f"Unsupported file format ({original_name}).")
            self._send_error(400, f"Invalid file type. Allowed: {settings.allowed_file_types}")
            return

        try:
            with Image.open(file_item.file) as img:
                file_item.file.seek(0)
                img.verify()
        except (UnidentifiedImageError, ValueError, TypeError) as err:
            logger.error(f"Image validation failed for {original_name}. Details: {err}")
            self._send_error(400, "Invalid image format. The file is corrupted or not a valid image.")
            return

        file_item.file.seek(0)
        data: bytes = file_item.file.read()

        if not validate_size(len(data)):
            logger.error(
                f"File {original_name} is too large. Exceeds limit of {settings.max_file_size_mb} MB.")
            self._send_error(413, f"File too large. Max: {settings.max_file_size_mb} MB")
            return

        ext = original_name.split(".")[-1].lower()
        filename = f"{uuid.uuid4()}.{ext}"

        try:
            save_image(filename, data)
            image_id = self.repo.create(
                filename=filename,
                original_name=original_name,
                size=len(data),
                file_type=ext
            )
            logger.info(f"Image {original_name} uploaded from IP {client_ip}.")

            self._send_json(201, {
                "id": image_id,
                "filename": filename,
                "url": f"/images/{filename}"}
            )
        except Exception as err:
            logger.error(f"Critical failure while saving image {original_name}. Details: {err}")
            delete_image(filename)
            self._send_error(400, f"Error: {err}")

    def handle_delete(self, filename: str):
        client_ip = self.get_client_ip()
        # delete in DB
        deleted = self.repo.delete_by_filename(filename)
        if not deleted:
            logger.error(f"Attempt to delete non-existing image ({filename}).")
            self._send_error(404, "Image not found in database")
            return

        # delete in filesystem
        if not delete_image(filename):
            logger.error(f"Failed to delete file {filename} from storage.")
            self._send_error(500, "Internal server error: failed to delete file in storage")
            return

        logger.info(f"Image {filename} deleted from IP {client_ip}.")
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

