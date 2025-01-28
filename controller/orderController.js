const db = require('../db'); // Ensure db.js exports the correct MySQL connection

exports.getCheckOut = (req, res) => {
    if (!req.session.user) {
        req.flash('error', 'You must be logged in to view your account.');
        return res.redirect('/login');
    }

    const userId = req.session.user.UserID; 
    console.log('User ID from session: ', userId);

    const sql = `
        SELECT ProductId, Name, Image, Price, Size, Quantity 
        FROM cart
    `;

    db.query(sql, [userId], (error, results) => {
        if (error) {
            console.error('Database error:', error);
            return res.status(500).send('Error retrieving products');
        }

        if (results.length > 0) {
            console.log('All products:', results);

            let totalAmount = results.reduce((sum, item) => sum + item.Price * item.Quantity, 0);

            res.render('checkout', { cart: results, totalAmount: totalAmount, msg: "" });
        } else {
            res.render('checkout', { cart: [], totalAmount: 0, msg: "No products in cart" });
        }
    });
};

