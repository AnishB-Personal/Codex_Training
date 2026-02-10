# Message Storage App

A simple containerized web application that stores short messages in MongoDB and retrieves the latest 10 messages.

## Features

- Single-page UI with Send and Retrieve buttons
- Stores messages (max 250 characters) with timestamp format `dd:mm:yyyy hh:mm:ss`
- Retrieves the latest 10 messages, newest first
- Runs locally with Docker Compose

## Prerequisites

- Docker
- Docker Compose

## Run Locally (Single Command)

1. From the project root, start the app:

   ```bash
   docker-compose up --build
   ```

2. Open the app in your browser:

   ```text
   http://localhost:3000
   ```

3. Use the Send and Retrieve buttons to store and view messages.

## Project Structure

- `src/server.js`: Express API + MongoDB integration
- `public/`: Frontend assets (HTML/CSS/JS)
- `docker-compose.yml`: App + MongoDB services
- `Dockerfile`: App container build

## Environment Variables

These can be configured via Docker Compose or a `.env` file:

- `PORT` (default `3000`)
- `MONGODB_URI` (default `mongodb://mongo:27017`)
- `MONGODB_DB` (default `message_app`)
- `MONGODB_COLLECTION` (default `messages`)

## API Endpoints

- `POST /api/messages` with JSON `{ "message": "..." }`
- `GET /api/messages` returns latest 10 messages
- `GET /health` health check
