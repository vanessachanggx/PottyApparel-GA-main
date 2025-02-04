// Middleware to check if user is logged in
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    req.flash('error', 'Please log in to view this resource');
    res.redirect('/login');
};

// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    req.flash('error', 'Access denied. Admin privileges required.');
    res.redirect('/401');
};

// Middleware to check if user is logged in and a regular user
const checkUser = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'user') {
        return next();
    }
    req.flash('error', 'This function is for regular users only.');
    res.redirect('/401');
};

module.exports = {
    checkAuthenticated,
    checkAdmin,
    checkUser
};
