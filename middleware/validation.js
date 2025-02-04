// Middleware for form validation
const validateRegistration = (req, res, next) => {
    const { FirstName, LastName, Email, Password, ConfirmPassword, PhoneNumber } = req.body;

    if (!FirstName || !LastName || !Email || !Password || !ConfirmPassword || !PhoneNumber ) {
        return res.status(400).send('All fields are required.');
    }

    if (Password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};


const validateLogin = (req, res, next) => {
    const { Email, Password } = req.body;

    if (!Email || !Password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }
    next();
};

module.exports = {
    validateRegistration,
    validateLogin
};