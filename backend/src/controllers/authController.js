import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'uos_academic_perimeter_super_secret_jwt_key_2025';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINS = 15;

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const identifier = email.trim();
    const normalizedIdentifier = identifier.toLowerCase();
    const possibleEmail = normalizedIdentifier.includes('@')
      ? normalizedIdentifier
      : `${normalizedIdentifier}@uosahiwal.edu.pk`;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedIdentifier },
          { email: possibleEmail },
          { employeeOrRollId: identifier },
          { employeeOrRollId: normalizedIdentifier },
        ],
      },
      include: { department: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    // Check account lockout status
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingMins = Math.ceil((new Date(user.lockedUntil) - new Date()) / (1000 * 60));
      return res.status(423).json({
        success: false,
        code: 'ACCOUNT_LOCKED',
        message: `Account is temporarily locked due to multiple failed login attempts. Try again in ${remainingMins} minute(s).`,
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account has been disabled by administrator.',
      });
    }

    if (user.role === 'STUDENT') {
      return res.status(403).json({
        success: false,
        message: 'Student login is disabled. This portal is strictly restricted to Faculty, HOD, and Administrators.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      const failedAttempts = user.failedAttempts + 1;
      let lockedUntil = null;

      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINS * 60 * 1000);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts, lockedUntil },
      });

      if (lockedUntil) {
        return res.status(423).json({
          success: false,
          code: 'ACCOUNT_LOCKED',
          message: `Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts. Try again in ${LOCKOUT_DURATION_MINS} minutes.`,
        });
      }

      return res.status(401).json({
        success: false,
        message: `Invalid credentials. ${MAX_FAILED_ATTEMPTS - failedAttempts} attempt(s) remaining before lock.`,
      });
    }

    // Reset failed attempts & set last login time
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        email: user.email,
        fullName: user.fullName,
        departmentId: user.departmentId,
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      success: true,
      token,
      mustChangePassword: user.mustChangePassword,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        employeeOrRollId: user.employeeOrRollId,
        role: user.role,
        departmentId: user.departmentId,
        department: user.department?.name || null,
        mustChangePassword: user.mustChangePassword,
        clientIp: req.clientIp,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!user.mustChangePassword && !currentPassword) {
      return res.status(400).json({ success: false, message: 'Current password is required.' });
    }

    if (currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    res.json({
      success: true,
      message: 'Password updated successfully!',
    });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ success: false, message: 'Failed to update password.' });
  }
};

export const getMe = async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      fullName: req.user.fullName,
      email: req.user.email,
      employeeOrRollId: req.user.employeeOrRollId,
      role: req.user.role,
      departmentId: req.user.departmentId,
      department: req.user.department?.name || null,
      mustChangePassword: req.user.mustChangePassword,
      clientIp: req.clientIp,
      isCampusNetwork: req.isCampusNetwork,
    },
  });
};

