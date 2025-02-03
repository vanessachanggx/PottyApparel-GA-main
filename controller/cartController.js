const db = require('../db'); // Ensure db.js exports the correct MySQL connection

exports.getCart = (req, res) => {
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

            res.render('cart', { cart: results, totalAmount: totalAmount, msg: "" });
        } else {
            res.render('cart', { cart: [], totalAmount: 0, msg: "No products in cart" });
        }
    });
};


exports.addToCartForm = (req, res) => {
    // Retrieve the values from the form data
    const { ProductID, Name, Price, Size, quantity, Image } = req.body;
    const userId = req.session.user ? req.session.user.UserID : null;

    // Log the data being received
    console.log('Received form data:', { ProductID, Name, Price, Size, quantity, Image });
    console.log('User ID from session:', userId);

    // Check if user is logged in
    if (!userId) {
        req.flash('error', 'You must be logged in to view your account.');
        return res.redirect('/login');
    }

    // Ensure that all required fields are provided
    if (!ProductID || !Name || !Price || !Size || !quantity || !Image) {
        console.error('Missing required fields');
        return res.status(400).send('Missing required fields.');
    }

    // Prepare the SQL query
    const sql = `INSERT INTO cart (UserID, ProductID, Name, Price, Size, Quantity, Image) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;

    // Log the SQL query and data being passed
    console.log('Executing SQL query:', sql);
    console.log('Data for insertion:', [userId, ProductID, Name, Price, Size, quantity, Image]);

    // Run the database query
    db.query(sql, [userId, ProductID, Name, Price, Size, quantity, Image], (err, result) => {
        if (err) {
            console.error('Database query error:', err); // Log the error
            return res.status(500).send('An error occurred while adding to the cart.');
        }

        // Log successful insertion
        console.log('Item added to cart:', result);

        // Redirect to the cart page after successful insertion
        res.redirect('/cart');
    });
};

exports.removeFromCart = (req, res) => {
    const ProductID = req.params.id; // Ensure this matches the URL parameter
    console.log('Product ID:', ProductID); // Check if ID is coming through

    const UserID = req.session.user ? req.session.user.UserID : null;
    if (!UserID) {
        req.flash('error', 'You must be logged in to manage your cart.');
        return res.redirect('/login');
    }

    const sql = 'DELETE FROM cart WHERE ProductID = ? AND UserID = ?';
    db.query(sql, [ProductID, UserID], (error, results) => {
        if (error) {
            console.error("Error deleting product from cart:", error);
            return res.status(500).send('Error deleting product from cart');
        }

        if (results.affectedRows === 0) {
            req.flash('error', 'Product not found in cart or you do not have permission to remove it.');
            return res.redirect('/cart');
        }

        req.flash('success', 'Product removed from cart.');
        return res.redirect('/cart');
    });
};

exports.updateCartProduct = (req, res) => {
    const ProductID = req.params.id;  // Get ProductID from the URL parameter
    const { Quantity } = req.body;    // Get the Quantity from the form submission

    const UserID = req.session.user ? req.session.user.UserID : null;

    if (!UserID) {
        // Redirect to login if user is not logged in
        req.flash('error', 'You must be logged in to update your cart.');
        return res.redirect('/login');
    }

    const updateCartQuery = `
        UPDATE cart 
        SET Quantity = ? 
        WHERE ProductID = ? AND UserID = ?`;

    // Log the query for debugging
    console.log('Executing SQL:', updateCartQuery, 'with parameters:', [Quantity, ProductID, UserID]);

    db.query(updateCartQuery, [Quantity, ProductID, UserID], (err, updateResult) => {
        if (err) {
            console.error("Error updating cart:", err);
            req.flash('error', 'An error occurred while updating the cart.');
            return res.redirect('/cart');
        }

        // Check if the update was successful
        if (updateResult.affectedRows === 0) {
            req.flash('error', 'No product found to update in your cart.');
        } else {
            req.flash('success', 'Cart updated successfully.');
        }

        // Redirect to the cart page
        res.redirect('/cart');
    });
};

exports.checkout = (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).redirect('/login');
    }

    const { orderId, transactionId } = req.params;
    if (!orderId || !transactionId) {
        return res.status(400).send('Missing order or transaction ID');
    }

    // Rest of your checkout logic...
    const UserID = req.session.user.userId;
    console.log(UserID);

    const sql = `
        SELECT p.ProductID, p.Name, p.Description, p.Image, p.Price, c.Quantity, c.Size
        FROM product p
        JOIN cart c ON p.ProductID = c.ProductID
        WHERE c.UserID = ?;
    `;

    db.query(sql, [UserID], (error, cartItems) => {
        if (error) {
            console.error('Error retrieving cart items:', error);
            return res.status(500).send('Error retrieving cart items');
        }

        if (!cartItems || cartItems.length === 0) {
            return res.status(404).send('Your cart is empty');
        }

        let totalAmount = cartItems.reduce((sum, item) => 
            sum + (item.Quantity * item.Price), 0);

        const orderDate = new Date();
        
        // Begin transaction
        db.beginTransaction(err => {
            if (err) {
                console.error('Error starting transaction:', err);
                return res.status(500).send('Error processing order');
            }

            const createOrderSql = `
                INSERT INTO orders (UserID, TotalAmount, OrderDate, Status)
                VALUES (?, ?, ?, 'Completed');
            `;

            db.query(createOrderSql, [UserID, totalAmount, orderDate], (orderError, orderResult) => {
                if (orderError) {
                    return db.rollback(() => {
                        console.error('Error creating order:', orderError);
                        res.status(500).send('Error creating order');
                    });
                }

                const orderItemsSql = `
                    INSERT INTO orderitem (ProductID, Quantity, Price, Size, OrderDate)
                    VALUES (?, ?, ?, ?, ?);
                `;

                // Create order items
                Promise.all(cartItems.map(item => 
                    new Promise((resolve, reject) => {
                        db.query(orderItemsSql, [
                            item.ProductID,
                            item.Quantity,
                            item.Price,
                            item.Size,
                            orderDate
                        ], (itemError) => {
                            if (itemError) reject(itemError);
                            else resolve();
                        });
                    })
                ))
                .then(() => {
                    // Only clear cart after successful order creation
                    const orderDate = new Date();
                    db.query(createOrderSql, [UserID, totalAmount, orderDate], (orderError, orderResult) => {
                        if (orderError) {
                            return db.rollback(() => {
                                res.status(500).send('Error creating order');
                            });
                        }
                        // Continue with order items creation

                                            db.commit(err => {
                            if (err) {
                                return db.rollback(() => {
                                    console.error('Error committing transaction:', err);
                                    res.status(500).send('Error processing order');
                                });
                            }

                            res.render('invoice', {
                                cart_items: cartItems,
                                totalAmount: totalAmount.toFixed(2),
                                userId: UserID,
                                orderDate: orderDate,
                                paymentMethod: paymentMethod,
                                orderId: orderId,
                                transactionId: transactionId
                            });
                        });
                    });
                })
                .catch(error => {
                    db.rollback(() => {
                        console.error('Error creating order items:', error);
                        res.status(500).send('Error creating order items');
                    });
                });
            });
        });
    });
};
