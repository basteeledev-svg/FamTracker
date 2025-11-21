# FamTracker Port Configuration

To avoid conflicts with other services running on your machine, FamTracker uses non-standard ports:

## Port Mappings

| Service | Host Port | Container Port | Purpose |
|---------|-----------|----------------|---------|
| PostgreSQL + PostGIS | **5433** | 5432 | Database |
| Redis | **6380** | 6379 | Cache |
| API Server | **3100** | 3000 | REST API |
| WebSocket | **3101** | 3001 | Real-time location updates |

## Usage

### From Mobile App
Connect to:
- API: `http://your-server:3100/api/v1`
- WebSocket: `ws://your-server:3101`

### From Backend (within Docker)
Services communicate internally using container ports:
- PostgreSQL: `postgres:5432`
- Redis: `redis:6379`

### Local Development
When running backend outside Docker:
- Database: `localhost:5433`
- Redis: `localhost:6380`

## Checking for Conflicts

Before starting, verify ports are available:

```bash
# Check if ports are in use
lsof -i :5433  # PostgreSQL
lsof -i :6380  # Redis
lsof -i :3100  # API
lsof -i :3101  # WebSocket

# Or use netstat
netstat -an | grep -E '5433|6380|3100|3101'
```

## Changing Ports

If you need different ports, edit:
1. `docker/docker-compose.yml` - Update port mappings
2. `backend/.env` - Update connection settings
3. Mobile app config - Update API endpoints

## Production Deployment

For production with Nginx reverse proxy:
- Public HTTPS: `443` → API/WebSocket
- Internal services remain on custom ports
- Nginx handles SSL termination and routing
