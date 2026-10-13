const asyncHandler = require('../utils/asyncHandler');
const { answer } = require('../services/assistantService');
const AppError = require('../utils/AppError');

const ask = asyncHandler(async (req, res) => {
  if (!req.body.message) throw new AppError('Message required', 400);
  const result = await answer(req.user, req.body.message);
  res.json({ success: true, ...result });
});

module.exports = { ask };
