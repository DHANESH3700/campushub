const AuditLog = require('../models/AuditLog');

async function audit(req, action, entity, entityId, meta = {}) {
  try {
    await AuditLog.create({
      actor: req.user?._id,
      action,
      entity,
      entityId,
      meta,
      ip: req.ip
    });
  } catch {
    // audit should not break the request
  }
}

module.exports = { audit };
