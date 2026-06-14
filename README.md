# Image Hosting Service

This project provides a web application for viewing and storing images. Users can upload images and receive direct links to them, which can then be used across social media, blogs, or shared with friends.

## Features

*   **Image Upload**: Upload images in popular formats (.jpg, .png, .gif).
*   **Secure Storage**: Ensures reliable storage of uploaded images.
*   **Direct Links**: Provides convenient direct links to uploaded images.
*   **Image Gallery**: Browse and manage uploaded images.
*   **Image Details**: View detailed information about each image, including file size, type, and upload date.
*   **Responsive Frontend**: User-friendly interface for seamless interaction.

## Technologies Used

The project is built using a modern stack, containerized with Docker Compose for easy setup and deployment.

*   **Backend**: Python (http.server) for API services.
*   **Database**: PostgreSQL for robust data storage.
*   **Web Server**: Nginx for serving static files and acting as a reverse proxy.
*   **Frontend**: HTML, CSS, and JavaScript for a dynamic user interface.
*   **Containerization**: Docker and Docker Compose for managing services.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Make sure you have the following installed:

*   [Docker](https://docs.docker.com/get-docker/)
*   [Docker Compose](https://docs.docker.com/compose/install/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd image-hosting-py
    ```

2.  **Create a `.env` file:**
    Copy the example environment file and fill in your database credentials and any other necessary environment variables.
    ```bash
    cp .env.example .env
    ```
    Edit the `.env` file with your desired configurations.

3.  **Build and run the services:**
    Navigate to the project root directory and run Docker Compose:
    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Builds the images before starting containers.
    *   `-d`: Runs containers in detached mode (in the background).

4.  **Access the application:**
    Once all services are up and running, you can access the application in your web browser:
    *   **Frontend**: `http://localhost`
    *   **Backend API**: `http://localhost/api` (or as configured in Nginx)

## Project Structure

```
.
├── backend/                  # Python backend application
│   ├── utils/                # Utility functions
│   ├── handlers/             # Request handlers
│   ├── app.py                # Main backend application file
│   ├── config.py             # Configuration settings
│   ├── logger.py             # Logging configuration
│   ├── database.py           # Database connection and operations
│   ├── Dockerfile            # Dockerfile for the backend service
│   ├── Dockerfile.dev        # Dockerfile for development environment
│   └── requirements.txt      # Python dependencies
├── db/                       # Database related files
│   ├── migrations/           # SQL migration scripts
│   └── 1-init.sql            # Initial database schema
├── frontend/                 # Frontend static files (HTML, CSS, JS)
│   ├── assets/               # Images, icons, etc.
│   ├── css/                  # Stylesheets
│   ├── js/                   # JavaScript files
│   ├── index.html            # Main landing page
│   ├── upload.html           # Image upload and gallery page
│   └── image_detail.html     # Image detail page
├── scripts/                  # Utility scripts for managing the application
│   ├── run.sh                # Script to start the application in production mode
│   ├── rundev.sh             # Script to start the application in development mode
│   ├── backup.sh             # Script to backup the database
│   ├── restore.sh            # Script to restore the database
│   ├── migration.sh          # Script to apply database migrations
│   └── install_cron.sh       # Script to install cron jobs
├── logs/                     # Directory for application logs
├── images/                   # Directory for uploaded images
├── backups/                  # Directory for database backups
├── Makefile                  # Makefile for common development tasks
├── nginx.conf                # Nginx configuration file
├── docker-compose.yml        # Docker Compose configuration for production
├── docker-compose.dev.yml    # Docker Compose configuration for development
├── .env.example              # Example environment variables
└── .gitignore                # Git ignore file
```

## Scripts

The `scripts/` directory contains utility scripts to manage the application environment.

*   **`scripts/rundev.sh`**:
    Starts the application in development mode using Docker Compose. It utilizes both `docker-compose.yml` and `docker-compose.dev.yml` to include development-specific configurations (e.g., hot-reloading, debugging).
    ```bash
    ./scripts/rundev.sh
    ```

*   **`scripts/run.sh`**:
    Starts the application in production mode using Docker Compose. It scales the backend service to multiple instances (e.g., 10) and runs all services in detached mode.
    ```bash
    ./scripts/run.sh
    ```

*   **`scripts/backup.sh`**:
    Performs a backup of the PostgreSQL database. It connects to the `postgres` Docker container, dumps the specified database, and stores the backup file in the `./backups` directory. It also cleans up old backup files based on a retention policy.
    ```bash
    ./scripts/backup.sh
    ```

*   **`scripts/restore.sh`**:
    Restores a PostgreSQL database from a specified backup file. It connects to the `postgres` Docker container and imports the data from the backup.
    ```bash
    ./scripts/restore.sh <backup_filename.sql>
    ```

*   **`scripts/migration.sh`**:
    Manages database migrations for the PostgreSQL database. It applies SQL migration files located in the `./db/migrations` directory to the `postgres` Docker container. It keeps track of applied migrations in a `migration_history` table within the database.
    ```bash
    ./scripts/migration.sh
    ```

*   **`scripts/install_cron.sh`**:
    Installs a cron job to automatically run the `backup.sh` script daily. It checks if the backup script exists and then adds a cron entry to execute it at a specified time (default: 03:00 AM every day). It also ensures that duplicate cron entries are not created.
    ```bash
    ./scripts/install_cron.sh
    ```

## Usage

*   Open your browser to `http://localhost` to access the main page.
*   Navigate to the upload page to upload new images.
*   View your uploaded images in the gallery.
*   Click on an image to see its details and direct link.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## License

This project is licensed under the MIT License.
