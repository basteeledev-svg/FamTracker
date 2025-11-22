const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const Joi = require('joi');

// Validation schemas
const updateLocationSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  speed: Joi.number().min(0).max(200).allow(null).optional(), // m/s
  heading: Joi.number().min(0).max(360).allow(null).optional(),
  accuracy: Joi.number().min(0).allow(null).optional(),
  altitude: Joi.number().allow(null).optional(),
  family_id: Joi.number().integer().positive().required(),
});

const historyQuerySchema = Joi.object({
  start_time: Joi.date().iso().optional(),
  end_time: Joi.date().iso().optional(),
  limit: Joi.number().integer().min(1).max(1000).default(100),
});

// POST /api/v1/location - Update user's current location
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { error, value } = updateLocationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { latitude, longitude, speed, heading, accuracy, altitude, family_id } = value;
    const userId = req.user.id;

    // Verify user is a member of this family
    const memberCheck = await db.query(
      'SELECT id FROM family_members WHERE user_id = $1 AND family_id = $2',
      [userId, family_id]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this family' });
    }

    // Insert location with PostGIS geography type
    const result = await db.query(
      `INSERT INTO locations 
        (user_id, family_id, coordinates, latitude, longitude, speed, heading, accuracy, altitude, timestamp)
      VALUES 
        ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $4, $3, $5, $6, $7, $8, NOW())
      RETURNING 
        id, user_id, family_id, latitude, longitude,
        speed, heading, accuracy, altitude, timestamp, matched_speed_limit`,
      [userId, family_id, longitude, latitude, speed, heading, accuracy, altitude]
    );

    const location = result.rows[0];

    // Try to find nearest road segment and speed limit
    let speedLimit = null;
    const roadResult = await db.query(
      `SELECT 
        id, name, speed_limit,
        ST_Distance(geometry, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance
      FROM road_segments
      WHERE ST_DWithin(
        geometry,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        20  -- Within 20 meters
      )
      ORDER BY distance
      LIMIT 1`,
      [longitude, latitude]
    );

    if (roadResult.rows.length > 0) {
      const road = roadResult.rows[0];
      speedLimit = road.speed_limit;

      // Update the location record with matched speed limit
      await db.query(
        'UPDATE locations SET matched_speed_limit = $1, matched_road_id = $2 WHERE id = $3',
        [speedLimit, road.id, location.id]
      );

      location.matched_speed_limit = speedLimit;
      location.matched_road_name = road.name;
      location.road_distance = road.distance;
    }

    res.json({
      success: true,
      location: {
        id: location.id,
        latitude: location.latitude,
        longitude: location.longitude,
        speed: location.speed,
        heading: location.heading,
        accuracy: location.accuracy,
        altitude: location.altitude,
        timestamp: location.timestamp,
        speed_limit: speedLimit,
        road_name: roadResult.rows[0]?.name || null,
      },
    });
  } catch (err) {
    console.error('Error updating location:', err);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// GET /api/v1/location/family/:familyId - Get current locations of all family members
router.get('/family/:familyId', authMiddleware, async (req, res) => {
  try {
    const familyId = parseInt(req.params.familyId);
    const userId = req.user.id;

    // Verify user is a member of this family
    const memberCheck = await db.query(
      'SELECT id FROM family_members WHERE user_id = $1 AND family_id = $2',
      [userId, familyId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this family' });
    }

    // Get latest location for each family member
    const result = await db.query(
      `SELECT DISTINCT ON (l.user_id)
        l.id,
        l.user_id,
        u.name as user_name,
        ST_Y(l.coordinates::geometry) as latitude,
        ST_X(l.coordinates::geometry) as longitude,
        l.speed,
        l.heading,
        l.accuracy,
        l.altitude,
        l.timestamp,
        l.matched_speed_limit,
        fm.is_visible
      FROM locations l
      JOIN users u ON l.user_id = u.id
      JOIN family_members fm ON fm.user_id = l.user_id AND fm.family_id = l.family_id
      WHERE l.family_id = $1
        AND l.timestamp > NOW() - INTERVAL '5 minutes'  -- Only recent locations
        AND fm.is_visible = true  -- Respect privacy settings
      ORDER BY l.user_id, l.timestamp DESC`,
      [familyId]
    );

    const locations = result.rows.map(row => ({
      user_id: row.user_id,
      user_name: row.user_name,
      latitude: row.latitude,
      longitude: row.longitude,
      speed: row.speed,
      heading: row.heading,
      accuracy: row.accuracy,
      altitude: row.altitude,
      timestamp: row.timestamp,
      speed_limit: row.matched_speed_limit,
    }));

    res.json({ locations });
  } catch (err) {
    console.error('Error fetching family locations:', err);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// GET /api/v1/location/history/:userId - Get location history for a user
router.get('/history/:userId', authMiddleware, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId);
    const requestingUserId = req.user.id;

    const { error, value } = historyQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { start_time, end_time, limit } = value;

    // Check if requesting user has permission to view this user's history
    // Either the user is viewing their own history, or they share a family
    const permissionCheck = await db.query(
      `SELECT DISTINCT fm1.family_id
      FROM family_members fm1
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = $1 AND fm2.user_id = $2`,
      [requestingUserId, targetUserId]
    );

    if (permissionCheck.rows.length === 0 && requestingUserId !== targetUserId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Build query with optional time filters
    let query = `
      SELECT 
        id,
        user_id,
        ST_Y(coordinates::geometry) as latitude,
        ST_X(coordinates::geometry) as longitude,
        speed,
        heading,
        accuracy,
        altitude,
        timestamp,
        matched_speed_limit
      FROM locations
      WHERE user_id = $1
    `;

    const params = [targetUserId];
    let paramIndex = 2;

    if (start_time) {
      query += ` AND timestamp >= $${paramIndex}`;
      params.push(start_time);
      paramIndex++;
    }

    if (end_time) {
      query += ` AND timestamp <= $${paramIndex}`;
      params.push(end_time);
      paramIndex++;
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await db.query(query, params);

    const history = result.rows.map(row => ({
      id: row.id,
      latitude: row.latitude,
      longitude: row.longitude,
      speed: row.speed,
      heading: row.heading,
      accuracy: row.accuracy,
      altitude: row.altitude,
      timestamp: row.timestamp,
      speed_limit: row.matched_speed_limit,
    }));

    res.json({ 
      user_id: targetUserId,
      count: history.length,
      history 
    });
  } catch (err) {
    console.error('Error fetching location history:', err);
    res.status(500).json({ error: 'Failed to fetch location history' });
  }
});

// GET /api/v1/location/stats/:userId - Get speed statistics for a user
router.get('/stats/:userId', authMiddleware, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId);
    const requestingUserId = req.user.id;

    // Check permission (same logic as history endpoint)
    const permissionCheck = await db.query(
      `SELECT DISTINCT fm1.family_id
      FROM family_members fm1
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = $1 AND fm2.user_id = $2`,
      [requestingUserId, targetUserId]
    );

    if (permissionCheck.rows.length === 0 && requestingUserId !== targetUserId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Calculate statistics
    const result = await db.query(
      `SELECT 
        COUNT(*) as total_points,
        AVG(speed) as avg_speed,
        MAX(speed) as max_speed,
        COUNT(CASE WHEN speed > matched_speed_limit THEN 1 END) as speeding_count,
        COUNT(CASE WHEN matched_speed_limit IS NOT NULL THEN 1 END) as points_with_limit,
        AVG(CASE WHEN speed > matched_speed_limit THEN speed - matched_speed_limit END) as avg_overspeed
      FROM locations
      WHERE user_id = $1
        AND timestamp > NOW() - INTERVAL '24 hours'
        AND speed IS NOT NULL`,
      [targetUserId]
    );

    const stats = result.rows[0];

    res.json({
      user_id: targetUserId,
      period: '24_hours',
      stats: {
        total_points: parseInt(stats.total_points),
        avg_speed: parseFloat(stats.avg_speed) || 0,
        max_speed: parseFloat(stats.max_speed) || 0,
        speeding_incidents: parseInt(stats.speeding_count),
        points_with_speed_limit: parseInt(stats.points_with_limit),
        avg_overspeed: parseFloat(stats.avg_overspeed) || 0,
      },
    });
  } catch (err) {
    console.error('Error calculating stats:', err);
    res.status(500).json({ error: 'Failed to calculate statistics' });
  }
});

module.exports = router;
