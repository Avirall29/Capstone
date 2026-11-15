import { validationResult } from 'express-validator';

/** Rejects with 400 and the first validation message (shown directly in the apps). */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }
  next();
};

export const isObjectId = (v) => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);
