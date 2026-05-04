# Animal Feeder App

A full-stack farm operations dashboard built with React, Vite, Express, and MongoDB.

## Features

- Overview panel for livestock, daily feed usage, feeder status, and alerts
- Real-time feeder monitoring with status, feed level, battery, and network health
- Feed consumption graph based on feed logs
- Livestock feeding records stored in MongoDB
- Alerts and notifications for feeder and usage issues
- Control panel for starting/stopping feeders and updating schedules
- Reports and analytics summary cards
- User registration and login
- System health monitoring dashboard

## Tech Stack

- Frontend: React, Vite
- Backend: Node.js, Express
- Database: MongoDB, Mongoose

## Project Structure

```text
package.json
vite.config.js
backend/
  package.json
  server.js
  config/
  controllers/
  middleware/
  models/
  routes/
frontend/
  index.html
  src/
```

## Setup

1. Install dependencies from the project root:

```bash
npm install
```

2. Make sure MongoDB is running locally.

3. Check the backend environment file at `backend/.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017/miniproject
JWT_SECRET=abc123
PORT=5000
```

## Run

Start both frontend and backend from the project root:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## API Endpoints

- `GET /api/animals`
- `POST /api/animals`
- `GET /api/feeders`
- `POST /api/feeders`
- `PATCH /api/feeders/:id`
- `GET /api/feeds`
- `POST /api/feeds`
- `POST /api/auth/register`
- `POST /api/auth/login`

## Notes

- Vite is configured to proxy `/api` requests to the backend.
- The current frontend dashboard reads and writes real data through the API.
- If `npm run dev` fails in the backend folder, use the root command instead, since the root script launches both apps together.

## Screenshots

Add screenshots here after capturing the dashboard in your browser:

- Overview panel
- Feeder monitoring
- Feeding records and alerts
- Control panel and user management

## Troubleshooting

- If the frontend shows a blank page or 404, make sure you are starting the app from the project root with `npm run dev`.
- If the backend does not start, confirm that MongoDB is running locally and that `backend/.env` contains a valid `MONGO_URI`.
- If a feeder or animal does not appear after saving, refresh the dashboard or check the browser console for API errors.