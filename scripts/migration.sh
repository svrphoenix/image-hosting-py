#!/usr/bin/env bash

# This script manages database migrations for the PostgreSQL database.
# It applies SQL migration files located in the './db/migrations' directory
# to the 'postgres' Docker container. It keeps track of applied migrations
# in a 'migration_history' table within the database.

set -euo pipefail
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"
MIGRATIONS_DIR="${PROJECT_ROOT}/db/migrations"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: File $ENV_FILE not found!"
    exit 1
fi

# Function to get environment variables from the .env file
get_env_var() {
    local var_name=$1
grep -E "^[[:space:]]*${var_name}=" "${ENV_FILE}" | cut -d'=' -f2- | tr -d "'\"\r "
}

# Get database user and name from .env
CONTAINER_NAME=$(get_env_var "DB_CONTAINER_NAME")
DB_USER=$(get_env_var "DB_USER")
[ -z "$DB_USER" ] && DB_USER=$(get_env_var "POSTGRES_USER")

DB_NAME=$(get_env_var "DB_NAME")
[ -z "$DB_NAME" ] && DB_NAME=$(get_env_var "POSTGRES_DB")

# Validate DB_USER and DB_NAME
if [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
    echo "Error: Could not find DB_USER or DB_NAME in $ENV_FILE"
    exit 1
fi

# Check if the PostgreSQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Error: Container '${CONTAINER_NAME}' is not running!"
    exit 1
fi

# Check if the migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "Error: Directory $MIGRATIONS_DIR does not exist!"
    exit 1
fi

echo "Checking migration history table..."
# Create migration_history table if it doesn't exist
if ! docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "
CREATE TABLE IF NOT EXISTS migration_history (
    id SERIAL PRIMARY KEY,
    migration_name TEXT UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);" > /dev/null; 
then
    echo "Error: Failed to connect to the database or create the history table." >&2
    exit 1
fi

success_count=0

# Iterate through SQL migration files in sorted order
for file in "$MIGRATIONS_DIR"/*.sql; do
    [ -e "$file" ] || continue # Skip if file does not exist (e.g., if glob returns nothing)

    filename=$(basename "$file")

    # Check if migration has already been applied
    is_applied=$(docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c \
        "SELECT 1 FROM migration_history WHERE migration_name='$filename';")

    if [ "$is_applied" = "1" ]; then
        echo "Skipping: $filename (already applied)"
    else
        echo "Applying migration: $filename ..."
        # Apply migration and record it in migration_history
        if ! (cat "$file"; echo "INSERT INTO migration_history (migration_name) VALUES ('$filename');") | \
                docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" --set ON_ERROR_STOP=1 > /dev/null; then
                echo "ERROR: Failed to apply $filename. Stopping execution!" >&2
                exit 1
        fi

        echo "Success: $filename"
        ((success_count++))
    fi
done

echo "=== Migrations completed! New files applied: $success_count ==="