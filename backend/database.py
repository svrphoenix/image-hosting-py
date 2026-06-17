from contextlib import contextmanager
from typing import List, Dict

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from logger import logger


class ImageRepository:
    """
    Repository class responsible for executing database operations related to images,
    including CRUD actions, statistical aggregations, advanced filtering, and soft-delete features.
    """

    def __init__(self, pool: ConnectionPool):
        """
        Initializes the repository with a database connection pool.
        """
        self.pool = pool

    @contextmanager
    def _cursor(self, dict_rows: bool = False):
        """
        A context manager that yields a database cursor.
        Optionally configures the cursor to return rows as dictionaries.
        Automatically logs any unexpected database errors.
        """
        try:
            with self.pool.connection() as conn:
                kwargs = {"row_factory": dict_row} if dict_rows else {}
                with conn.cursor(**kwargs) as cur:
                    yield cur
        except Exception as err:
            logger.error(f"Database transaction failed: {err}", exc_info=True)
            raise

    def _build_filter_clauses(self, filters: dict) -> tuple[str, list]:
        """
        Dynamically constructs SQL WHERE clauses and arguments based on the provided filters.
        Handles full-text search, file extensions, and ISO date ranges.
        Enforces exclusion of soft-deleted records by default.
        """
        where_clauses = ["deleted_at IS NULL"]
        params = []

        if filters.get("search"):
            where_clauses.append("original_name ILIKE %s")
            params.append(f"%{filters['search']}%")

        if filters.get("file_type") == "jpg":
            where_clauses.append("file_type IN (%s, %s)")
            params.extend(["jpg", "jpeg"])
        elif filters.get("file_type"):
            where_clauses.append("file_type = %s")
            params.append(filters["file_type"])

        if filters.get("date_from"):
            where_clauses.append("upload_time >= %s")
            params.append(filters["date_from"])

        if filters.get("date_to"):
            where_clauses.append("upload_time <= %s")
            end_of_day = f"{filters['date_to']} 23:59:59.999999"
            params.append(end_of_day)

        where_str = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""
        return where_str, params
    
    def create(self, filename: str, original_name: str, size: int, file_type: str, file_hash: str) -> int:
        """
        Inserts a new image metadata record into the database and returns its unique ID.
        """
        with self._cursor() as cur:
            cur.execute(
                """
                INSERT INTO images (filename, original_name, size, file_type, file_hash)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id;
                """,
                (filename, original_name, size, file_type, file_hash),
            )
            image_id = cur.fetchone()[0]
            return image_id

    def get_by_hash(self, file_hash: str) -> dict | None:
        with self._cursor(dict_rows=True) as cur:
            cur.execute(
                """
                SELECT id, filename, original_name, size, file_type, upload_time
                FROM images
                WHERE file_hash = %s
                """,
                (file_hash,),
            )
            return cur.fetchone()

    def get_total_count(self) -> int:
        """
        Retrieves the global count of active (non-deleted) images stored in the database.
        """
        with self._cursor(dict_rows=True) as cur:
            cur.execute(
                """
                SELECT count(*) AS total
                FROM images
                WHERE deleted_at IS NULL;
                """)
            result = cur.fetchone()
            return result["total"] if result else 0

    def get_total_size(self) -> int:
        """
        Calculates the cumulative size (in bytes) of all uploaded images.
        """
        with self._cursor(dict_rows=True) as cur:
            cur.execute(
                """
                SELECT sum(size) AS total_size
                FROM images
                WHERE deleted_at IS NULL;
                """)
            result = cur.fetchone()
            return result["total_size"] if result else 0

    def get_count_types(self) -> List[Dict]:
        """
        Retrieves the distribution of images grouped by their file extension/type.
        """
        with self._cursor(dict_rows=True) as cur:
            cur.execute(
                """
                SELECT
                    CASE
                        WHEN file_type IN ('jpg', 'jpeg') THEN 'jpg'
                        ELSE file_type
                    END AS file_type,
                    count(*)
                FROM images
                WHERE deleted_at IS NULL
                GROUP BY
                    CASE
                        WHEN file_type IN ('jpg', 'jpeg') THEN 'jpg'
                        ELSE file_type
                    END;
                """)

            return cur.fetchall()

    def search_images(self, filters: dict, page: int = 1, limit: int = 10, order: str = "desc") -> List[Dict]:
        """
        Searches, filters, and paginates image records based on complex filtering parameters.
        """
        where_str, params = self._build_filter_clauses(filters)
        direction = "DESC" if order.lower() == "desc" else "ASC"
        offset = (page - 1) * limit

        query = f"""
            SELECT id, filename, original_name, size, file_type, upload_time, views
            FROM images
            {where_str}
            ORDER BY upload_time {direction}
            LIMIT %s OFFSET %s;
        """

        query_params = params + [limit, offset]
        logger.debug(f"Executing search_images. SQL: {query.strip()} | Params: {query_params}")

        with self._cursor(dict_rows=True) as cur:
            cur.execute(query, tuple(query_params))
            return cur.fetchall()

    def count_filtered(self, filters: dict) -> int:
        """
        Calculates the total number of images matching the specified filters.
        Essential for generating accurate pagination controls on the frontend.
        """
        where_str, params = self._build_filter_clauses(filters)
        query = f"SELECT COUNT(*) AS total FROM images {where_str};"
        logger.debug(f"Executing count_filtered. SQL: {query.strip()} | Params: {params}")

        with self._cursor(dict_rows=True) as cur:
            cur.execute(query, tuple(params))
            result = cur.fetchone()
            return result["total"] if result else 0

    def get_popular_images(self, limit: int = 3)-> List[Dict]:
        """
        Retrieves the most viewed images up to the specified limit.
        """
        with self._cursor(dict_rows=True) as cur:
            cur.execute("""
                SELECT id, filename, original_name, views
                FROM images
                WHERE deleted_at IS NULL
                ORDER BY views DESC 
                LIMIT %s;""", (limit,)
            )
            return cur.fetchall()

    def get_by_id(self, image_id: int) -> dict | None:
        """
        Fetches complete metadata for a specific image by its unique ID.
        """
        with self._cursor(dict_rows=True) as cur:
            cur.execute(
                """
                SELECT id, filename, original_name, size, file_type, upload_time
                FROM images
                WHERE id = %s AND deleted_at IS NULL;
                """,
                (image_id,),
            )
            return cur.fetchone()

    def increment_and_get_by_filename(self, filename: str) -> dict | None:
        """
        Atomically increments the view count for an image by its unique filename
        and returns its updated metadata record.
        """
        with self._cursor(dict_rows=True) as cur:
            cur.execute(
                """
                UPDATE images
                SET views = views + 1
                WHERE filename = %s AND deleted_at IS NULL
                    RETURNING id, filename, original_name, size, file_type, upload_time, views;
                """,
                (filename,),
            )
            return cur.fetchone()

    # def delete_by_id(self, image_id: int) -> bool:
    #     """
    #     Deletes an image metadata record using its unique ID. Returns True if successful.
    #     """
    #     with self._cursor(dict_rows=True) as cur:
    #         cur.execute(
    #             """
    #             DELETE
    #             FROM images
    #             WHERE id = %s AND deleted_at IS NULL
    #             RETURNING id;""", (image_id,),
    #         )
    #         return cur.fetchone() is not None
    #
    # def delete_by_filename(self, filename: str) -> bool:
    #     """
    #     Deletes an image metadata record using its unique filename. Returns True if successful.
    #     """
    #     with self._cursor() as cur:
    #         cur.execute(
    #             "DELETE FROM images WHERE filename = %s RETURNING id;",
    #             (filename,),
    #         )
    #         return cur.fetchone() is not None

    def image_stats(self, filename: str) -> dict | None:
        """
        Retrieves specific statistical fields (views, upload time, size) for a targeted image.
        """
        with self._cursor(dict_rows=True) as cur:
            cur.execute(
                """
                SELECT views, upload_time, size 
                FROM images 
                WHERE filename=%s AND deleted_at IS NULL;""", (filename,),
            )
            return cur.fetchone()

    def ping(self) -> bool:
        """
        Pings the database to verify that the connection pool is healthy and active.
        Returns True if successful, False otherwise.
        """
        try:
            with self._cursor() as cur:
                cur.execute("SELECT 1;")
                return True
        except Exception as err:
            logger.error(f"Database ping failed: {err}")
            return False

    def soft_delete(self, filename: str) -> bool:
        """
        Soft deletes an image by setting its deleted_at timestamp to the current time.
        Returns True if the image was successfully moved to trash.
        """
        with self._cursor() as cur:
            cur.execute(
                """
                UPDATE images
                SET deleted_at = NOW()
                WHERE filename = %s
                  AND deleted_at IS NULL RETURNING id;
                """,
                (filename,),
            )
            return cur.fetchone() is not None

    def get_deleted(self, page: int = 1, limit: int = 10) -> List[Dict]:
        """
        Retrieves a paginated list of soft-deleted images from the trash, sorted by deletion time.
        """
        offset = (page - 1) * limit
        with self._cursor(dict_rows=True) as cur:
            cur.execute(
                """
                SELECT id, filename, original_name, size, file_type, upload_time, deleted_at
                FROM images
                WHERE deleted_at IS NOT NULL
                ORDER BY deleted_at DESC
                    LIMIT %s
                OFFSET %s;
                """,
                (limit, offset),
            )
            return cur.fetchall()

    def count_deleted(self) -> int:
        """
        Calculates the total number of soft-deleted images currently sitting in the trash.
        """
        with self._cursor(dict_rows=True) as cur:
            cur.execute("SELECT COUNT(*) AS total FROM images WHERE deleted_at IS NOT NULL;")
            result = cur.fetchone()
            return result["total"] if result else 0

    def restore(self, filename: str) -> bool:
        """
        Restores a soft-deleted image by clearing its deleted_at timestamp.
        Returns True if successful.
        """
        with self._cursor() as cur:
            cur.execute(
                """
                UPDATE images
                SET deleted_at = NULL
                WHERE filename = %s
                  AND deleted_at IS NOT NULL RETURNING id;
                """,
                (filename,),
            )
            return cur.fetchone() is not None

    def purge_deleted(self) -> List[str]:
        """
        Permanently removes all soft-deleted records from the database.
        Returns a list of filenames to be physically deleted from disk storage.
        """
        with self._cursor() as cur:
            cur.execute(
                """
                DELETE
                FROM images
                WHERE deleted_at IS NOT NULL RETURNING filename;
                """
            )
            return [row[0] for row in cur.fetchall()]
