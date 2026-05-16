Docker usage and troubleshooting

Build and run (detached):
```bash
cd "C:\Users\prajw\OneDrive\Desktop\miniprojectt"
docker compose up --build -d
```

Show status:
```bash
docker compose ps
```

Tail logs:
```bash
docker compose logs -f --tail 200 app
```

Rebuild from scratch if something changed:
```bash
docker compose build --no-cache
docker compose up -d
```

Notes & troubleshooting:
- The `app` service will connect to MongoDB if `MONGO_URI` is set; `docker-compose.yml` includes a `mongo` service and sets `MONGO_URI=mongodb://mongo:27017/miniproject` automatically.
- Data persistence:
  - App file-store persists `backend/data` to the host via bind mount `./backend/data:/app/backend/data`.
  - MongoDB data persisted on a Docker volume `mongo_data`.
- If you run into Windows OneDrive file locking issues, move the project outside OneDrive to `C:\projects\miniprojectt` and re-run commands.
- Port conflicts:
  - App: 5000 (host). Change `docker-compose.yml` port mapping if needed.
  - MongoDB: 27017 (host). If you already have local Mongo, remove the `27017:27017` mapping or stop local Mongo.

If the build or runtime fails, paste the output of these commands here:
- `docker compose ps`
- `docker compose logs --tail 200 app`
- `docker compose build --no-cache`

I can then produce a targeted fix or patch.
