#!/usr/bin/env bash

set -euo pipefail
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$(cd "${SCRIPT_DIR}/.." && pwd)/.env"

if [ ! -f "${ENV_FILE}" ]; then
    echo "ERR: .env file not found at ${ENV_FILE}" >&2
    exit 1
fi

get_env_var() {
    local var_name="$1"
    grep "^${var_name}=" "${ENV_FILE}" | cut -d'=' -f2- | tr -d "'\""
}

DB_USER=$(get_env_var "DB_USER")
DB_NAME=$(get_env_var "DB_NAME")
BACKUP_DIR="./backups"
CONTAINER_NAME="postgres"

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <backup_filename.sql>" >&2
    exit 1
fi

filename="$1"
full_path="${BACKUP_DIR}/${filename}"

if [ ! -f "${full_path}" ]; then
    echo "Error: Backup file not found at ${full_path}" >&2
    exit 1
fi

docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" < "${full_path}"

echo "Success: Database restored from '${full_path}'"