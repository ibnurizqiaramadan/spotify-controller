# Logs Directory

This directory contains authentication logs written by the application.

## Log Files

Log files are automatically created with the following naming pattern:
```
auth-YYYY-MM-DD.log
```

Example: `auth-2026-01-16.log`

## Log Format

Each log entry is a JSON object with the following structure:
```json
{
  "timestamp": "2026-01-16T23:32:13.025Z",
  "level": "info",
  "service": "auth",
  "message": "Initializing NextAuth configuration",
  "data": { ... }
}
```

## Log Levels

- `info`: General information about authentication flow
- `error`: Error messages and exceptions

## Accessing Logs

### Local Development
Logs are written to `./logs/auth-YYYY-MM-DD.log` in the project root.

### Production (Docker/Open Runtime)
Logs are written to `/app/logs/auth-YYYY-MM-DD.log` (or equivalent path based on working directory).

To view logs in Docker:
```bash
docker exec -it <container-id> cat /app/logs/auth-2026-01-16.log
```

Or copy logs from container:
```bash
docker cp <container-id>:/app/logs/auth-2026-01-16.log ./logs/
```

## Log Rotation

Logs are automatically rotated daily. Each day gets its own log file.

## Note

Log files (*.log) are ignored by git via `.gitignore` to prevent committing sensitive information.
