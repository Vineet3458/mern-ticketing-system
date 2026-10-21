import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const hashOTP = async (otp) => {
  return bcrypt.hash(otp, 10);
};

export const compareOTP = async (candidate, hash) => {
  if (!candidate || !hash) return false;
  return bcrypt.compare(candidate, hash);
};
