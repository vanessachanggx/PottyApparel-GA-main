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

exports.generateInvoice = (req, res) => {
    const { orderId } = req.params;
    
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const userId = req.session.user.UserID;
    
    // Get cart items for invoice
    const sql = `
        SELECT ProductId, Name, Image, Price, Size, Quantity 
        FROM cart WHERE UserID = ?
    `;
    
    db.query(sql, [userId], (error, cartResults) => {
        if (error) {
            console.error('Database error:', error);
            return res.status(500).send('Error generating invoice');
        }

        const totalAmount = cartResults.reduce((sum, item) => 
            sum + (Number(item.Price) * item.Quantity), 0
        );

        // Create order record
        const orderSql = `
            INSERT INTO \`order\` (UserID, Quantity, TotalAmount) 
            VALUES (?, ?, ?)
        `;

        db.query(orderSql, [userId, cartResults.length, totalAmount], (orderError, orderResult) => {
            if (orderError) {
                console.error('Error creating order:', orderError);
                return res.status(500).send('Error creating order');
            }

            const newOrderId = orderResult.insertId;

            // Insert order items
            const orderItemValues = cartResults.map(item => [
                newOrderId,
                item.ProductId,
                item.Quantity,
                item.Price
            ]);

            const orderItemSql = `
                INSERT INTO orderitem (OrderID, ProductID, Quantity, Price)
                VALUES ?
            `;

            db.query(orderItemSql, [orderItemValues], (itemError) => {
                if (itemError) {
                    console.error('Error creating order items:', itemError);
                    return res.status(500).send('Error creating order items');
                }

                // Clear cart after successful order
                const clearCartSql = `DELETE FROM cart WHERE UserID = ?`;
                db.query(clearCartSql, [userId]);

                // Add paymentMethod when rendering
                res.render('invoice', {
                    orderId: newOrderId,
                    cart: cartResults,
                    totalAmount: totalAmount,
                    user: req.session.user,
                    paymentMethod: 'PayPal' // Add default payment method or get it from your payment processing logic
                });
            });
        });
    });
};

exports.handleOrderSuccess = (req, res) => {
    const { orderId } = req.query;
    // Redirect to invoice page
    res.redirect(`/invoice/${orderId}`);
};

