#!/usr/bin/env bash

docker compose -f docker-compose.yml up --scale backend=10 -d --build
