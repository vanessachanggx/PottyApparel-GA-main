const db = require('../db'); 

exports.GetpottyApparels = (req, res) => {
    res.render('pottyApparels'); 
};

exports.renderRegister = (req, res) => {
    // Prevent logged-in users from accessing register page
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('register');
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

exports.renderLogin = (req, res) => {
    // Prevent logged-in users from accessing login page
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('login', { messages: req.flash() });
};

exports.login = (req, res) => {
    const { Email, Password } = req.body;

    if (!Email || !Password) {
        req.flash('error', 'Email and password are required');
        return res.redirect('/login');
    }

    const sql = 'SELECT * FROM user WHERE Email = ? AND Password = SHA1(?)';
    
    db.query(sql, [Email, Password], (err, results) => {
        if (err) {
            req.flash('error', 'Login failed');
            return res.redirect('/login');
        }

        if (results.length === 0) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/login');
        }

        const user = results[0];
        req.session.user = user;

        if (user.role === 'admin') {
            res.redirect('/adminpage');
        } else {
            res.redirect('/');
        }
    });
};

exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect('/login');
};

exports.renderAccount = (req, res) => {
    const userId = req.session.user.UserID;

    // Get orders
    const orderSql = `
        SELECT oi.orderId, oi.OrderDate, oi.Quantity, oi.Price, oi.Size, 
               oi.PaymentMethod, oi.transactionId,
               p.ProductID, p.Name, p.Image
        FROM orderitem oi
        JOIN product p ON oi.ProductID = p.ProductID
        WHERE oi.UserID = ?
        ORDER BY oi.OrderDate DESC
    `;

    // Get user reviews
    const reviewSql = `
        SELECT r.reviewId, r.reviewContent, r.reviewRating, r.reviewImage, 
               r.reviewDate, p.ProductID, p.Name as productName, p.Image as productImage
        FROM reviews r
        JOIN product p ON r.ProductID = p.ProductID
        WHERE r.reviewedByUserId = ?
        ORDER BY r.reviewDate DESC
    `;

    db.query(orderSql, [userId], (err, orderResults) => {
        if (err) {
            req.flash('error', 'Error fetching orders');
            return res.redirect('/');
        }

        db.query(reviewSql, [userId], (reviewErr, reviewResults) => {
            if (reviewErr) {
                req.flash('error', 'Error fetching reviews');
                return res.redirect('/');
            }

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
                orders: Object.values(groupedOrders),
                reviews: reviewResults
            });
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

        res.render('editAccount', { user: results[0] });
    });
};

exports.editAccount = (req, res) => {
    if (!req.session.user) {
        req.flash('error', 'You must be logged in to edit your account.');
        return res.redirect('/login');
    }

    const { FirstName, LastName } = req.body;
    const userId = req.session.user.UserID;
    
    // Handle image upload
    let image = req.body.currentImage; // retrieve current image filename
    if (req.file) {
        image = req.file.filename; // Save only the filename
    }

    const query = `
        UPDATE user 
        SET FirstName = ?, LastName = ?, Image = ? 
        WHERE UserID = ?
    `;

    const params = [FirstName, LastName, image, userId];

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

        // Refresh user session data
        const refreshQuery = `SELECT * FROM user WHERE UserID = ?`;
        db.query(refreshQuery, [userId], (err, results) => {
            if (err || results.length === 0) {
                req.flash('error', 'Unable to fetch updated account details.');
                return res.redirect('/account');
            }

            req.session.user = results[0];
            req.flash('success', 'Account updated successfully.');
            res.redirect('/account');
        });
    });
};

exports.getUser = (req, res) => {
    const UserID = req.params.id;
    const sql = 'SELECT * FROM user WHERE UserID = ?';
    
    db.query(sql, [UserID], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving user');
        }

        if (results.length > 0) {
            res.render('viewUser', { user: results[0] });
        } else {
            req.flash('error', 'User not found');
            res.redirect('/users');
        }
    });
};

exports.getUsers = (req, res) => {
    const sql = 'SELECT * FROM user ORDER BY role DESC, FirstName ASC';
    
    db.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            req.flash('error', 'Error retrieving users');
            return res.redirect('/');
        }

        res.render('viewUsers', { 
            users: results,
            messages: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    });
};

exports.editUserForm = (req, res) => {
    const UserID = req.params.id;
    const sql = 'SELECT * FROM user WHERE UserID = ?';

    db.query(sql, [UserID], (error, results) => {
        if (error) {
            console.error('Error fetching user data:', error.message);
            req.flash('error', 'Unable to retrieve user details');
            return res.redirect('/users');
        }

        if (results.length > 0) {
            res.render('editUser', { 
                user: results[0],
                messages: {
                    error: req.flash('error'),
                    success: req.flash('success')
                }
            });
        } else {
            req.flash('error', 'User not found');
            res.redirect('/users');
        }
    });
};

exports.editUser = (req, res) => {
    const UserID = req.params.id;
    const { FirstName, LastName, Email, PhoneNumber, role } = req.body;

    let Image = req.body.currentImage;
    if (req.file) {
        Image = req.file.filename;
    }

    const query = `
        UPDATE user 
        SET FirstName = ?, LastName = ?, Email = ?, PhoneNumber = ?, 
            Image = ?, role = ? 
        WHERE UserID = ?
    `;

    const params = [FirstName, LastName, Email, PhoneNumber, Image, role, UserID];

    db.query(query, params, (err, result) => {
        if (err) {
            console.error('Error updating user:', err.message);
            req.flash('error', 'Failed to update user details');
            return res.redirect(`/editUser/${UserID}`);
        }

        if (result.affectedRows === 0) {
            req.flash('error', 'No changes were made');
            return res.redirect(`/editUser/${UserID}`);
        }

        req.flash('success', 'User updated successfully');
        res.redirect('/users');
    });
};

exports.deleteUser = (req, res) => {
    const UserID = req.params.id;

    // Prevent self-deletion if user is logged in
    if (req.session.user && req.session.user.UserID === UserID) {
        req.flash('error', 'You cannot delete your own account');
        return res.redirect('/users');
    }

    const sql = 'DELETE FROM user WHERE UserID = ?';
    
    db.query(sql, [UserID], (error, results) => {
        if (error) {
            console.error('Error deleting user:', error);
            req.flash('error', 'Failed to delete user');
            return res.redirect('/users');
        }

        if (results.affectedRows === 0) {
            req.flash('error', 'User not found');
            return res.redirect('/users');
        }

        req.flash('success', 'User deleted successfully');
        res.redirect('/users');
    });
};

exports.addUserForm = (req, res) => {
    res.render('addUser', {
        messages: {
            error: req.flash('error'),
            success: req.flash('success')
        }
    });
};

exports.addUser = (req, res) => {
    const { FirstName, LastName, Email, Password, PhoneNumber, role } = req.body;

    if (!FirstName || !LastName || !Email || !Password || !PhoneNumber || !role) {
        req.flash('error', 'All fields are required');
        return res.redirect('/addUser');
    }

    let Image = null;
    if (req.file) {
        Image = req.file.filename;
    }

    const query = `
        INSERT INTO user (FirstName, LastName, Email, Password, PhoneNumber, Image, role)
        VALUES (?, ?, ?, SHA1(?), ?, ?, ?)
    `;
    
    db.query(query, [FirstName, LastName, Email, Password, PhoneNumber, Image, role], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                req.flash('error', 'Email already exists');
            } else {
                req.flash('error', 'Failed to create user');
            }
            return res.redirect('/addUser');
        }
        
        req.flash('success', 'User created successfully');
        res.redirect('/users');
    });
};
