# Image Hosting Service

A web application for uploading, storing, and sharing images. Users can upload images and get direct links to share on social media, blogs, or with friends.

## Features

- **Image Upload** — upload images in popular formats (`.jpg`, `.png`, `.gif`)
- **Image Gallery** — browse and manage all uploaded images with pagination
- **Image Details** — view file size, type, upload date, and view count
- **Direct Links** — copy a direct URL to any uploaded image with one click
- **Trash / Soft Delete** — deleted images go to a recoverable trash bin
- **Responsive UI** — built with Next.js for a fast, seamless experience

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript |
| **Backend** | Python (`http.server`) |
| **Database** | PostgreSQL |
| **Web Server** | Nginx (reverse proxy) |
| **Containerization** | Docker & Docker Compose |

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repository-url>
   cd image-hosting-py
   ```

2. **Create a `.env` file:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your database credentials and configuration.

3. **Build and run:**
   ```bash
   docker-compose up --build -d
   ```

4. **Open the app:**
   - Frontend: `http://localhost`
   - API: `http://localhost/api`

### Development Mode

```bash
./scripts/rundev.sh
```

Uses `docker-compose.dev.yml` with hot-reload enabled for both frontend and backend.

## Project Structure

```
.
├── backend/                    # Python backend
│   ├── handlers/               # Request handlers
│   ├── utils/                  # Utility functions
│   ├── app.py                  # Entry point
│   ├── config.py               # Configuration
│   ├── database.py             # DB connection & queries
│   ├── logger.py               # Logging setup
│   ├── Dockerfile
│   └── requirements.txt
├── db/
│   ├── migrations/             # SQL migration scripts
│   └── 1-init.sql              # Initial schema
├── frontend/                   # Next.js frontend
│   ├── app/
│   │   ├── components/         # Reusable React components
│   │   ├── image-detail/       # Image detail page
│   │   ├── upload/             # Upload & gallery page
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout
│   │   ├── lib.ts              # API helpers & utilities
│   │   ├── page.tsx            # Home page
│   │   └── types.ts            # TypeScript types
│   ├── public/                 # Static assets
│   ├── next.config.js          # Next.js config (API proxy)
│   ├── Dockerfile
│   └── package.json
├── frontend-archive/           # Previous plain HTML/CSS/JS version (reference)
├── scripts/
│   ├── run.sh                  # Start in production mode
│   ├── rundev.sh               # Start in development mode
│   ├── backup.sh               # Backup PostgreSQL database
│   ├── restore.sh              # Restore database from backup
│   ├── migration.sh            # Apply DB migrations
│   └── install_cron.sh         # Install daily backup cron job
├── nginx.conf                  # Nginx configuration
├── docker-compose.yml          # Production compose file
├── docker-compose.dev.yml      # Development compose file
└── .env.example                # Environment variables template
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
# PostgreSQL
DB_CONTAINER_NAME=
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=

# Upload limits
MAX_FILE_SIZE_MB=
ALLOWED_FILE_TYPES=

# Directories
IMAGES_DIR=
LOGS_DIR=
```

## Scripts

| Script | Description |
|---|---|
| `scripts/run.sh` | Start all services in production mode |
| `scripts/rundev.sh` | Start in development mode with hot-reload |
| `scripts/backup.sh` | Dump PostgreSQL database to `./backups/` |
| `scripts/restore.sh <file>` | Restore database from a backup file |
| `scripts/migration.sh` | Apply pending SQL migrations from `./db/migrations/` |
| `scripts/install_cron.sh` | Install a daily cron job for automatic backups |

## License

This project is licensed under the MIT License.
