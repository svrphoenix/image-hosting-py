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
    get_int_param,
    extract_image_filters
)

IMAGES_DIR = settings.images_dir

class ImageAPIServer(BaseHandler):
    """
    HTTP Request Handler that routes and processes incoming API requests
    for image management, uploads, deletions, and metrics tracking.
    """
    def setup(self):
        """
        Prepares the handler environment by binding the repository
        to the server's shared database connection pool.
        """
        super().setup()
        pool = self.server.db_pool
        self.repo = ImageRepository(pool)

    def _get_routes(self):
        """
        Defines the centralized routing table containing HTTP methods,
        regex URL patterns, and their corresponding internal handler methods.
        """
        return [
            ("GET", r"^/health(check)?/?$", self.handle_health),
            ("GET", r"^/images/?$", self.handle_images),
            ("GET", r"^/images/popular/?$", self.handle_popular_images),
            ("GET", r"^/images/(?P<filename>[^/]+)/?$", self.handle_image_detail),
            ("GET", r"^/stats/?$", self.handle_stats),
            ("GET", r"^/images/(?P<filename>[^/]+)/stats/?$", self.handle_image_stats),
            ("POST", r"^/upload/?$", self.handle_upload),
            ("DELETE", r"^/images/(?P<filename>[^/]+)/?$", self.handle_delete)
        ]

    def _dispatch(self, http_method: str):
        """
        Matches the request path against the routing rules and executes
        the designated method or returns a 404 error if no pattern matches.
        """
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
        """
        Extracts the client's IP address, accounting for potential reverse proxies
        by prioritizing the 'X-Real-IP' header wrapper.
        """
        real_ip = self.headers.get('X-Real-IP')

        if real_ip:
            return real_ip.strip()
        
        return self.client_address[0]

    def handle_images(self):
        """
        Retrieves a filtered, paginated list of images along with total page data
        and serializes it into a JSON response.
        """
        params = get_query_params(self.path)
        page = get_int_param(params, 'page', default=1)
        limit = get_int_param(params, 'limit', default=8)
        sort_order = params.get('order', 'desc')

        filters = extract_image_filters(params)

        images = self.repo.search_images(filters, page, limit, sort_order)
        total_items = self.repo.count_filtered(filters)
        total_pages = math.ceil(total_items / limit) if total_items > 0 else 1

        self._send_json(200, {
            "items": images,
            "pagination": {
                "total": total_items,
                "pages": total_pages,
                "current_page": page,
                "limit": limit
            }
        })

    def handle_image_detail(self, filename: str):
        """
        Fetches comprehensive data for a single image, triggering an atomic
        increment of its views counter on success.
        """
        image = self.repo.increment_and_get_by_filename(filename)

        if not image:
            logger.error(f"Image {filename} not found.")
            self._send_error(404, "Image not found")
            return

        self._send_json(200, image)

    def handle_upload(self):
        """
        Validates multipart form payloads, checks file headers/signatures using PIL,
        enforces max size ceilings, dumps the image payload to disk, and indexes it in the DB.
        """
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
        """
        Removes an image entry from the database and permanently deletes
        the associated binary file from storage.
        """
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

    def handle_stats(self):
        """
        Compiles and serves generalized dashboard statistics including total file count,
        aggregate storage payload weight, and distribution types.
        """
        total_images = self.repo.get_total_count()
        total_size = self.repo.get_total_size()
        types_count = self.repo.get_count_types()

        response_data = {
            "total_images": total_images,
            "total_size": total_size,
            "types_count": types_count
        }

        self._send_json(200, response_data)

    def handle_image_stats(self, filename: str):
        """
        Returns standalone usage and storage analytics for a designated isolated file resource.
        """
        image_stats = self.repo.image_stats(filename)
        if not image_stats:
            logger.error(f"Image {filename} not found.")
            self._send_error(404, "Image not found")
            return

        self._send_json(200, image_stats)

    def handle_popular_images(self):
        """
        Serves an array containing metadata profiles for the most-visited image records.
        """
        params = get_query_params(self.path)
        limit = get_int_param(params, 'limit', default=3)
        top_images = self.repo.get_popular_images(limit)
        self._send_json(200, top_images)

    def handle_health(self):
        """
        Performs a system health check by verifying database connectivity.
        Returns HTTP 200 if healthy, or HTTP 500 if the database is unreachable.
        """
        db_alive = self.repo.ping()

        if db_alive:
            self._send_json(200, {
                "status": "healthy",
                "database": "connected"
            })
        else:
            logger.critical("Health check failed: Database is unreachable.")
            self._send_json(500, {
                "status": "unhealthy",
                "database": "disconnected"
            })