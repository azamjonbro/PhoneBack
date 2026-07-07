const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied: Admin role required' });
  }
};

const checkPermission = (permission) => {
  return (req, res, next) => {
    if (req.user && (req.user.role === 'Admin' || req.user.permissions.includes(permission))) {
      next();
    } else {
      res.status(403).json({ success: false, message: `Access denied: Permission '${permission}' required` });
    }
  };
};

module.exports = { adminOnly, checkPermission };
