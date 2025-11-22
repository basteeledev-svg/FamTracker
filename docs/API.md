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

#### POST /location
Update user's current location.

**Authentication Required:** Yes

**Request:**
```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "altitude": 10.5,
  "accuracy": 5.0,
  "speed": 15.6,
  "heading": 90.0,
  "family_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "location": {
    "id": 123,
    "latitude": 37.7749,
    "longitude": -122.4194,
    "speed": 15.6,
    "heading": 90,
    "accuracy": 5.0,
    "altitude": 10.5,
    "timestamp": "2025-11-22T01:18:57.051Z",
    "speed_limit": 35,
    "road_name": "Market Street"
  }
}
```

**Notes:**
- Speed is in meters per second (m/s)
- Heading is in degrees (0-360)
- Accuracy is in meters
- If no nearby road is found within 20 meters, `speed_limit` and `road_name` will be null

#### GET /location/family/:familyId
Get current locations of all visible family members.

**Authentication Required:** Yes

**Response:**
```json
{
  "locations": [
    {
      "user_id": 1,
      "user_name": "John Doe",
      "latitude": 37.7749,
      "longitude": -122.4194,
      "speed": 15.6,
      "heading": 90,
      "accuracy": 5.0,
      "altitude": 10.5,
      "timestamp": "2025-11-22T01:18:57.051Z",
      "speed_limit": 35
    }
  ]
}
```

**Notes:**
- Only returns locations from the last 5 minutes
- Only includes users with `is_visible = true`
- Requester must be a member of the family

#### GET /location/history/:userId
Get location history for a specific user.

**Authentication Required:** Yes

**Query Parameters:**
- `start_time`: ISO 8601 timestamp (optional)
- `end_time`: ISO 8601 timestamp (optional)
- `limit`: Number of points (default: 100, max: 1000)

**Response:**
```json
{
  "user_id": 2,
  "count": 150,
  "history": [
    {
      "id": 123,
      "latitude": 37.7749,
      "longitude": -122.4194,
      "speed": 15.6,
      "heading": 90,
      "accuracy": 5.0,
      "altitude": 10.5,
      "timestamp": "2025-11-22T01:18:57.051Z",
      "speed_limit": 35
    }
  ]
}
```

**Notes:**
- Requester must be in same family as target user, or be the target user
- Results are ordered by timestamp DESC (newest first)

#### GET /location/stats/:userId
Get speed statistics for a user.

**Authentication Required:** Yes

**Response:**
```json
{
  "user_id": 2,
  "period": "24_hours",
  "stats": {
    "total_points": 1542,
    "avg_speed": 12.3,
    "max_speed": 28.5,
    "speeding_incidents": 3,
    "points_with_speed_limit": 1204,
    "avg_overspeed": 2.1
  }
}
```

**Notes:**
- Statistics are for the last 24 hours
- `speeding_incidents`: Number of location points where speed > speed_limit
- `avg_overspeed`: Average amount over speed limit when speeding (m/s)
- Requester must be in same family as target user, or be the target user

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
