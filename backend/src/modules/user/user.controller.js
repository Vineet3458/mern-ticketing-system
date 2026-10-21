import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { User } from '../../database/index.js';
import { ROLES } from '../../constants/index.js';

export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');
  return sendResponse(res, 200, 'User profile retrieved', {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');

  if (name) user.name = name.trim();
  if (phone) user.phone = phone.trim();
  await user.save();

  return sendResponse(res, 200, 'Profile updated successfully', {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  });
});

export const listUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 50 } = req.query;
  const filter = {};

  if (role) {
    filter.role = role;
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter)
      .select('name email phone role isVerified createdAt lastLoginAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  return sendResponse(res, 200, 'Users retrieved', users, {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
  });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!Object.values(ROLES).includes(role)) {
    throw ApiError.badRequest(`Invalid role. Valid roles are: ${Object.values(ROLES).join(', ')}`);
  }

  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  user.role = role;
  await user.save();

  return sendResponse(res, 200, `User role updated to ${role}`, {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});
