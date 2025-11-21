# FamTracker

Family location sharing app with GPS tracking, speed monitoring, and speed limit comparison.

## Features

- 🗺️ Real-time location sharing between family members
- 🚗 GPS speed tracking with street speed limit comparison
- 📊 Historical speed data and route visualization
- 🔒 Privacy-focused with family-only sharing
- 📱 Cross-platform (iOS & Android)
- 🔋 Battery-optimized background tracking

## Project Structure

```
FamTracker/
├── backend/          # Node.js API server
├── mobile/           # React Native mobile app
├── docker/           # Docker configurations
└── docs/             # Documentation
```

## Tech Stack

### Backend
- Node.js + Express
- PostgreSQL + PostGIS (geospatial data)
- Socket.io (real-time location updates)
- Redis (caching)
- Docker

### Mobile
- React Native
- React Navigation
- react-native-maps (OSM tiles)
- react-native-background-geolocation
- Socket.io client

### Data Sources
- OpenStreetMap (maps & speed limits)
- GPS/GNSS (location tracking)

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- React Native development environment
- iOS/Android development tools

### Backend Setup

```bash
cd backend
npm install
docker-compose up -d
npm run dev
```

### Mobile Setup

```bash
cd mobile
npm install
npx react-native run-ios
# or
npx react-native run-android
```

## Server Requirements

**Minimum:**
- 2 CPU cores
- 4 GB RAM
- 120 GB storage
- Ubuntu 20.04+ or similar

## Supported Devices

Tested on:
- iPhone 16 (iOS 18+)
- iPhone 12 (iOS 15+)
- Samsung Galaxy S23 (Android 13+)

## Privacy & Security

- End-to-end location sharing within family groups only
- JWT-based authentication
- Automatic data deletion after 30 days
- Optional pause/invisible mode
- No third-party tracking

## License

MIT License - Personal/Family Use

## Development Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for detailed development plan.
