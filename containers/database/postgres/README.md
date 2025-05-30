# Docker PostgreSQL Setup

This folder contains Docker configuration for running PostgreSQL 16 for the Dozu API service.

## Files

- `Dockerfile`: PostgreSQL 16 Alpine image configuration
- `docker-compose.yml`: Docker Compose configuration with PostgreSQL service
- `.env`: Environment variables for PostgreSQL configuration

## Configuration

The PostgreSQL instance is configured with:

- **Database**: dozu
- **Username**: dozu-user
- **Password**: 123456
- **Host Port**: 5434 (mapped to container port 5432)
- **Container Port**: 5432 (internal PostgreSQL port)

## Volume Storage

Data is stored in the named volume `postgresql_16_dev_data` which maps to `/var/lib/postgresql/data` inside the container.

These values are loaded from the local `.env` file with fallback defaults.

## Available Commands

### Start PostgreSQL container

```bash
npm run docker:up:db:postgres
```

### Stop PostgreSQL container

```bash
npm run docker:down:db:postgres
```

### Build the PostgreSQL image

```bash
npm run docker:build:db:postgres
```

### View PostgreSQL logs

```bash
npm run docker:logs:db:postgres
```

### Restart PostgreSQL container

```bash
npm run docker:restart:db:postgres
```

### Clean up (remove containers and volumes)

```bash
npm run docker:clean:db:postgres
```

## Connection Details

To connect to the PostgreSQL database from your application or external tools, use:

For connection string:

```
postgres://dozu:123456@localhost:5434/dozu
```

## Notes

- The PostgreSQL data is persisted in a Docker volume named `postgresql_16_dev_data`
- The container includes a health check to ensure PostgreSQL is ready
- Init scripts can be placed in `init-scripts/` folder and will be executed on first startup
- The container runs on a custom network `dozu-network` for better isolation
- Port 5434 is exposed on the host to avoid conflicts with local PostgreSQL installations
- Environment variables are loaded from the local `.env` file with fallback defaults
