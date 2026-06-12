#!/usr/bin/env bash

ENV_FILE=".env"
MIGRATIONS_DIR="./db/migrations"
CONTAINER_NAME="postgres"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: File $ENV_FILE not found!"
    exit 1
fi

get_env_var() {
    local var_name=$1
    grep -E "^${var_name}=" "$ENV_FILE" | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

DB_USER=$(get_env_var "DB_USER")
[ -z "$DB_USER" ] && DB_USER=$(get_env_var "POSTGRES_USER")

DB_NAME=$(get_env_var "DB_NAME")
[ -z "$DB_NAME" ] && DB_NAME=$(get_env_var "POSTGRES_DB")

if [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
    echo "Error: Could not find DB_USER or DB_NAME in $ENV_FILE"
    exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Error: Container '${CONTAINER_NAME}' is not running!"
    exit 1
fi

if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "Error: Directory $MIGRATIONS_DIR does not exist!"
    exit 1
fi

echo "Checking migration history table..."
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "
CREATE TABLE IF NOT EXISTS migration_history (
    id SERIAL PRIMARY KEY,
    migration_name TEXT UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);" > /dev/null

if [ $? -ne 0 ]; then
    echo "Error: Failed to connect to the database or create the history table."
    exit 1
fi

success_count=0

for file in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
    [ -e "$file" ] || continue

    filename=$(basename "$file")

    is_applied=$(docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c \
        "SELECT 1 FROM migration_history WHERE migration_name='$filename';")

    if [ "$is_applied" = "1" ]; then
        echo "Skipping: $filename (already applied)"
    else
        echo "Applying migration: $filename ..."
        (cat "$file"; echo "INSERT INTO migration_history (migration_name) VALUES ('$filename');") | \
        docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" --set ON_ERROR_STOP=1 > /dev/null

        if [ $? -eq 0 ]; then
            echo "Success: $filename"
            ((success_count++))
        else
            echo "ERROR: Failed to apply $filename. Stopping execution!"
            exit 1
        fi
    fi
done

echo "=== Migrations completed! New files applied: $success_count ==="