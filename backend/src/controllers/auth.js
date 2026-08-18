const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { logAudit } = require('../utils/audit');

const JWT_SECRET = process.env.JWT_SECRET || 'sme_crm_secret_key_change_me_in_production';

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || user.deletedAt) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Audit log
    await logAudit({
      userId: user.id,
      action: 'LOGIN',
      module: 'AUTH',
      newValue: `User logged in: ${user.email}`,
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { 
        role: true,
        employee: {
          include: { team: true }
        }
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        employee: user.employee ? {
          id: user.employee.id,
          phone: user.employee.phone,
          team: user.employee.team ? user.employee.team.name : null,
        } : null
      },
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    if (req.user) {
      await logAudit({
        userId: req.user.id,
        action: 'LOGOUT',
        module: 'AUTH',
        newValue: `User logged out: ${req.user.email}`,
      });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  getMe,
  logout,
};
