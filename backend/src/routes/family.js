const express = require('express');
const Joi = require('joi');
const crypto = require('crypto');
const { query } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// All family routes require authentication
router.use(authMiddleware);

// Validation schemas
const createFamilySchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
});

const joinFamilySchema = Joi.object({
  inviteCode: Joi.string().length(9).required(),
});

// Generate random invite code
const generateInviteCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase() + crypto.randomInt(0, 9);
};

// POST /api/v1/family/create
router.post('/create', async (req, res) => {
  try {
    const { error, value } = createFamilySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: error.details[0].message,
      });
    }

    const { name } = value;
    const inviteCode = generateInviteCode();

    // Create family group
    const familyResult = await query(
      `INSERT INTO family_groups (name, invite_code, created_by, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, name, invite_code, created_by, created_at`,
      [name, inviteCode, req.user.id]
    );

    const family = familyResult.rows[0];

    // Add creator as admin
    await query(
      `INSERT INTO family_members (family_id, user_id, role, joined_at)
       VALUES ($1, $2, 'admin', NOW())`,
      [family.id, req.user.id]
    );

    res.status(201).json({
      family: {
        id: family.id,
        name: family.name,
        inviteCode: family.invite_code,
        createdBy: family.created_by,
        createdAt: family.created_at,
        role: 'admin',
      },
    });
  } catch (err) {
    console.error('Create family error:', err);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create family group',
    });
  }
});

// POST /api/v1/family/join
router.post('/join', async (req, res) => {
  try {
    const { error, value } = joinFamilySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: error.details[0].message,
      });
    }

    const { inviteCode } = value;

    // Find family by invite code
    const familyResult = await query(
      'SELECT id, name FROM family_groups WHERE invite_code = $1',
      [inviteCode]
    );

    if (familyResult.rows.length === 0) {
      return res.status(404).json({
        error: 'INVALID_CODE',
        message: 'Invalid invite code',
      });
    }

    const family = familyResult.rows[0];

    // Check if already a member
    const existingMember = await query(
      'SELECT id FROM family_members WHERE family_id = $1 AND user_id = $2',
      [family.id, req.user.id]
    );

    if (existingMember.rows.length > 0) {
      return res.status(409).json({
        error: 'ALREADY_MEMBER',
        message: 'You are already a member of this family',
      });
    }

    // Add user to family
    await query(
      `INSERT INTO family_members (family_id, user_id, role, joined_at)
       VALUES ($1, $2, 'member', NOW())`,
      [family.id, req.user.id]
    );

    res.status(201).json({
      family: {
        id: family.id,
        name: family.name,
        role: 'member',
      },
    });
  } catch (err) {
    console.error('Join family error:', err);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to join family group',
    });
  }
});

// GET /api/v1/family/list
router.get('/list', async (req, res) => {
  try {
    const result = await query(
      `SELECT fg.id, fg.name, fg.invite_code, fg.created_at, fm.role
       FROM family_groups fg
       JOIN family_members fm ON fg.id = fm.family_id
       WHERE fm.user_id = $1
       ORDER BY fg.created_at DESC`,
      [req.user.id]
    );

    res.json({ families: result.rows });
  } catch (err) {
    console.error('List families error:', err);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to list families',
    });
  }
});

// GET /api/v1/family/:familyId/members
router.get('/:familyId/members', async (req, res) => {
  try {
    const { familyId } = req.params;

    // Verify user is a member
    const memberCheck = await query(
      'SELECT id FROM family_members WHERE family_id = $1 AND user_id = $2',
      [familyId, req.user.id]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You are not a member of this family',
      });
    }

    // Get all family members
    const result = await query(
      `SELECT u.id, u.name, u.email, u.avatar_url, fm.role, fm.is_visible, fm.joined_at
       FROM users u
       JOIN family_members fm ON u.id = fm.user_id
       WHERE fm.family_id = $1
       ORDER BY fm.joined_at ASC`,
      [familyId]
    );

    res.json({ members: result.rows });
  } catch (err) {
    console.error('Get members error:', err);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to get family members',
    });
  }
});

// PATCH /api/v1/family/:familyId/visibility
router.patch('/:familyId/visibility', async (req, res) => {
  try {
    const { familyId } = req.params;
    const { isVisible } = req.body;

    if (typeof isVisible !== 'boolean') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'isVisible must be a boolean',
      });
    }

    // Update visibility
    await query(
      `UPDATE family_members 
       SET is_visible = $1 
       WHERE family_id = $2 AND user_id = $3`,
      [isVisible, familyId, req.user.id]
    );

    res.json({ success: true, isVisible });
  } catch (err) {
    console.error('Update visibility error:', err);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to update visibility',
    });
  }
});

module.exports = router;
