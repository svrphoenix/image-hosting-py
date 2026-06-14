#!/usr/bin/env bash

# This script is used to start the production environment using Docker Compose.
# It scales the backend service to 10 instances and runs in detached mode.
docker compose -f docker-compose.yml up --scale backend=10 -d --build