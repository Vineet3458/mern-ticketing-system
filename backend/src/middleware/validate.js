import { ApiError } from '../utils/ApiError.js';

// Usage: router.post('/', validate(joiSchema), controller)
export const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
  if (error) {
    return next(ApiError.badRequest('Validation failed',
      error.details.map((d) => ({ field: d.path.join('.'), message: d.message }))));
  }
  req[source] = value;
  next();
};
