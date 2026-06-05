from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row

from config import settings


class ImageRepository:
    
    @contextmanager
    def _cursor(self, dict_rows: bool = False):
        with psycopg.connect(
           host=settings.db_host,
            port=settings.db_port,
            dbname=settings.db_name,
            user=settings.db_user,
            password=settings.db_password, 
        ) as conn:
            kwargs = {"row_factory": dict_row} if dict_rows else {}
            with conn.cursor(**kwargs) as cur:
                yield cur
    
    
    def create(self, filename: str, original_name: str, size: int, file_type: str) -> int:
        with self._cursor() as cur:
            cur.execute(
                """
                INSERT INTO images (filename, original_name, size, file_type)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                (filename, original_name, size, file_type),
            )
            image_id = cur.fetchone()[0]
            return image_id

    def count(self) -> int:
        with self._cursor(dict_rows=True) as cur:
            cur.execute(
                """
                SELECT count(*) AS total
                FROM images
                """)
            result = cur.fetchone()
            return result["total"] if result else 0


    def list(self, page: int = 1, limit: int = 10, direction: str = "desc") -> list[dict]:
        with self._cursor(dict_rows=True) as cur:
            offset = (page - 1) * limit
            direction = "DESC" if direction.lower() == "desc" else "ASC"
            
            cur.execute(
                f"""
                SELECT id, filename, original_name, size, file_type, upload_time
                FROM images
                ORDER BY upload_time {direction}
                LIMIT %s OFFSET %s""",
                (limit, offset)
            )
            return cur.fetchall()

    def get_by_id(self, image_id: int) -> dict | None:
        with self._cursor(dict_rows=True) as cur:
            cur.execute(
                """
                SELECT id, filename, original_name, size, file_type, upload_time
                FROM images
                WHERE id = %s
                """,
                (image_id,),
            )
            return cur.fetchone()

    def get_by_filename(self, filename: str) -> dict | None:
        with self._cursor(dict_rows=True) as cur:
            cur.execute(
                """
                SELECT id, filename, original_name, size, file_type, upload_time
                FROM images
                WHERE filename = %s
                """,
                (filename,),
            )
            return cur.fetchone()

    def delete_by_id(self, image_id: int) -> None:
        with self._cursor(dict_rows=True) as cur:
            cur.execute(
                """
                DELETE
                FROM images
                WHERE id = %s
                RETURNING id""", (image_id,),
            )
            return cur.fetchone() is not None

    def delete_by_filename(self, filename: str) -> bool:
        with self._cursor() as cur:
            cur.execute(
                "DELETE FROM images WHERE filename = %s RETURNING id",
                (filename,),
            )
            return cur.fetchone() is not None