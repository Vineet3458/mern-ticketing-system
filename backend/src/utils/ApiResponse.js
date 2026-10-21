// Consistent response shape: { success, message, data, meta }
export const sendResponse = (res, statusCode, message, data = null, meta) => {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
};
