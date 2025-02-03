const db = require('../db'); 

exports.GetpottyApparels = (req, res) => {
    res.render('pottyApparels'); 
};

exports.renderRegister = (req, res) => {
    res.render('register')
};

exports.register = (req, res) => {
    console.log(req.body);  // Log the form data
    const { FirstName, LastName, Email, Password, ConfirmPassword, PhoneNumber, role } = req.body;

    // Validate input fields
    if (!Email) {
        return res.status(400).send('Email is required.');
    }
    if (!Password || !ConfirmPassword) {
        return res.status(400).send('Password and Confirm Password are required.');
    }

    // Check if passwords match
    if (Password !== ConfirmPassword) {
        return res.status(400).send('Passwords do not match.');
    }

    // Handle file upload
    let Image;
    if (req.file) {
        Image = req.file.filename; // Save only the filename
    } else {
        Image = null;
    }

    // Use the role from the request body or default to 'user'
    const userRole = role || 'user';  // Default to 'user' if no role is provided

    // SQL query to insert the new user
    const query = `
        INSERT INTO user (FirstName, LastName, Email, Password, PhoneNumber, Image, role)
        VALUES (?, ?, ?, SHA1(?), ?, ?, ?)
    `;
    
    // Execute the query
    db.query(query, [FirstName, LastName, Email, Password, PhoneNumber, Image, userRole], (err, result) => {
        if (err) {
            console.error('Error inserting user:', err.message);
            return res.status(500).send('Error registering user.');
        }
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    });
};

// Render Login Page
exports.renderLogin = (req, res) => {
    res.render('login');  // Ensure you have a `login.ejs` or equivalent template
};

exports.login = (req, res) => {
    const { Email, Password } = req.body; 

    // SQL query to find the user by email and password (hashed)
    const sql = 'SELECT * FROM user WHERE Email = ? AND Password = SHA1(?)'; 
    db.query(sql, [Email, Password], (err, results) => { 
        if (err) {
            console.error("Database error: ", err);  // Log the error
            return res.status(500).send('Error during login process.');
        }

        console.log("Results from database: ", results);  // Debugging - Check the query result

        if (results.length > 0) {
            // Successful login, store user session
            req.session.user = results[0];
            console.log("User session object: ", req.session.user);  // Debugging - Check the session object

            req.flash('success', 'Login successful!');

            // Check user role and redirect accordingly
            if (req.session.user.role === 'user') {
                res.redirect('/');  // Redirect to home page for normal users
            } else if (req.session.user.role === 'admin') {
                res.redirect('/adminpage');  // Redirect to admin page for admin users
            } else {
                req.flash('error', 'Unknown user role.');
                res.redirect('/login');  // In case the role is unexpected
            }
        } else {
            // Invalid credentials
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
    });
};

exports.renderAccount = (req, res) => {
    if (!req.session.user) {
        req.flash('error', 'You must be logged in to view your account.');
        return res.redirect('/login');
    }

    const userId = req.session.user.UserID;

    // Get user orders with product details
    const orderSql = `
        SELECT oi.orderId, oi.OrderDate, oi.Quantity, oi.Price, oi.Size, 
               oi.PaymentMethod, oi.transactionId,
               p.ProductID, p.Name, p.Image
        FROM orderitem oi
        JOIN product p ON oi.ProductID = p.ProductID
        WHERE oi.UserID = ?
        ORDER BY oi.OrderDate DESC
    `;

    db.query(orderSql, [userId], (err, orderResults) => {
        if (err) {
            console.error('Error fetching orders:', err);
            return res.status(500).send('Error fetching orders.');
        }

        // Group orders by orderId
        const groupedOrders = orderResults.reduce((acc, order) => {
            if (!acc[order.orderId]) {
                acc[order.orderId] = {
                    orderId: order.orderId,
                    orderDate: order.OrderDate,
                    transactionId: order.transactionId,
                    paymentMethod: order.PaymentMethod,
                    items: [],
                    totalAmount: 0
                };
            }
            acc[order.orderId].items.push(order);
            acc[order.orderId].totalAmount += order.Price * order.Quantity;
            return acc;
        }, {});

        res.render('account', {
            user: req.session.user,
            orders: Object.values(groupedOrders)
        });
    });
};

exports.renderEditAccount = (req, res) => {
    if (!req.session.user) {
        req.flash('error', 'You must be logged in to edit your account.');
        return res.redirect('/login');
    }

    const userId = req.session.user.UserID;

    db.query('SELECT * FROM user WHERE UserID = ?', [userId], (err, results) => {
        if (err || results.length === 0) {
            console.error('Error fetching user data:', err ? err.message : 'User not found');
            req.flash('error', 'Unable to retrieve user details.');
            return res.redirect('/account');
        }

        // Pass user data to the view
        res.render('editAccount', { user: results[0] });
    });
};

exports.editAccount = (req, res) => {
    if (!req.session.user) {
        req.flash('error', 'You must be logged in to edit your account.');
        return res.redirect('/login');
    }

    const { FirstName, LastName, Email, PhoneNumber } = req.body; // Match form names
    const image = req.file ? req.file.filename : req.session.user.Image; // Use uploaded file or existing image
    const userId = req.session.user.UserID;

    const query = `
        UPDATE user 
        SET FirstName = ?, LastName = ?, Email = ?, PhoneNumber = ?, Image = ? 
        WHERE UserID = ?
    `;

    const params = [FirstName, LastName, Email, PhoneNumber, image, userId];

    db.query(query, params, (err, result) => {
        if (err) {
            console.error('Error updating user data:', err.message);
            req.flash('error', 'An error occurred while updating your account.');
            return res.redirect('/account');
        }

        if (result.affectedRows === 0) {
            req.flash('error', 'No changes were made. Please check the data.');
            return res.redirect('/account');
        }

        const refreshQuery = `SELECT * FROM user WHERE UserID = ?`;
        db.query(refreshQuery, [userId], (err, results) => {
            if (err) {
                console.error('Error fetching updated user data:', err.message);
                req.flash('error', 'Unable to fetch updated account details.');
                return res.redirect('/account');
            }

            if (results.length === 0) {
                req.flash('error', 'User not found.');
                return res.redirect('/account');
            }

            req.session.user = results[0]; // Update session with new user data
            req.flash('success', 'Account updated successfully.');
            res.redirect('/account');
        });
    });
};
