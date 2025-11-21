# FamTracker API Documentation

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### POST /auth/register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST /auth/login
Login to existing account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Family Management

#### POST /family/create
Create a new family group.

**Request:**
```json
{
  "name": "Smith Family"
}
```

**Response:**
```json
{
  "family": {
    "id": 1,
    "name": "Smith Family",
    "inviteCode": "ABC123XYZ",
    "createdBy": 1
  }
}
```

#### POST /family/join
Join a family group using invite code.

**Request:**
```json
{
  "inviteCode": "ABC123XYZ"
}
```

**Response:**
```json
{
  "family": {
    "id": 1,
    "name": "Smith Family"
  },
  "role": "member"
}
```

#### GET /family/:familyId/members
Get all members of a family group.

**Response:**
```json
{
  "members": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "isVisible": true,
      "lastSeen": "2025-11-21T10:30:00Z"
    }
  ]
}
```

### Location Tracking

#### POST /location/update
Update user's current location.

**Request:**
```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "altitude": 10.5,
  "accuracy": 5.0,
  "speed": 25.5,
  "heading": 180.0,
  "timestamp": "2025-11-21T10:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "speedLimit": 35,
  "roadName": "Market Street"
}
```

#### GET /location/family/:familyId
Get current locations of all visible family members.

**Response:**
```json
{
  "locations": [
    {
      "userId": 1,
      "name": "John Doe",
      "latitude": 37.7749,
      "longitude": -122.4194,
      "speed": 25.5,
      "speedLimit": 35,
      "timestamp": "2025-11-21T10:30:00Z",
      "accuracy": 5.0
    }
  ]
}
```

#### GET /location/history/:userId
Get location history for a specific user.

**Query Parameters:**
- `from`: ISO timestamp (default: 24 hours ago)
- `to`: ISO timestamp (default: now)
- `limit`: Number of points (default: 1000)

**Response:**
```json
{
  "history": [
    {
      "latitude": 37.7749,
      "longitude": -122.4194,
      "speed": 25.5,
      "timestamp": "2025-11-21T10:30:00Z"
    }
  ],
  "count": 150
}
```

### Speed Limits

#### GET /speed/lookup
Get speed limit for a specific location.

**Query Parameters:**
- `lat`: Latitude
- `lon`: Longitude

**Response:**
```json
{
  "speedLimit": 35,
  "roadName": "Market Street",
  "roadType": "primary",
  "distance": 5.2,
  "unit": "mph"
}
```

## WebSocket Events

### Client → Server

#### join-family
Join a family room for real-time updates.
```javascript
socket.emit('join-family', familyId);
```

#### location-update
Send location update to family.
```javascript
socket.emit('location-update', {
  userId: 1,
  familyId: 1,
  location: {
    latitude: 37.7749,
    longitude: -122.4194,
    speed: 25.5
  },
  timestamp: '2025-11-21T10:30:00Z'
});
```

### Server → Client

#### family-location
Receive family member's location update.
```javascript
socket.on('family-location', (data) => {
  // data = { userId, location, speed, timestamp }
});
```

#### member-online
Family member came online.
```javascript
socket.on('member-online', (data) => {
  // data = { userId, name }
});
```

#### member-offline
Family member went offline.
```javascript
socket.on('member-offline', (data) => {
  // data = { userId }
});
```

## Error Responses

All errors follow this format:
```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes
- `UNAUTHORIZED`: Missing or invalid token
- `VALIDATION_ERROR`: Invalid request data
- `NOT_FOUND`: Resource not found
- `FORBIDDEN`: Insufficient permissions
- `RATE_LIMIT`: Too many requests

## Rate Limiting

- 100 requests per minute per IP
- Location updates: 1 per second per user
- WebSocket connections: 5 per user
