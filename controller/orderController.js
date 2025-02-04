const db = require('../db');

exports.generateInvoice = (req, res) => {
    const { orderId } = req.params;
    
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const sql = `
        SELECT oi.orderId, oi.OrderDate, oi.Quantity, oi.Price, oi.Size,
               oi.PaymentMethod, oi.transactionId,
               p.ProductID, p.Name, p.Image
        FROM orderitem oi
        JOIN product p ON oi.ProductID = p.ProductID
        WHERE oi.orderId = ?
    `;

    db.query(sql, [orderId], (error, orderItems) => {
        if (error) {
            console.error('Error retrieving order items:', error);
            return res.status(500).send('Error generating invoice');
        }

        if (orderItems.length > 0) {
            const totalAmount = orderItems.reduce((sum, item) => 
                sum + (Number(item.Price) * Number(item.Quantity)), 0
            );

            res.render('invoice', {
                orderId: orderId,
                transactionId: orderItems[0].transactionId,
                paymentMethod: orderItems[0].PaymentMethod,
                cart: orderItems,
                totalAmount: totalAmount.toFixed(2),
                user: req.session.user,
                orderDate: orderItems[0].OrderDate
            });
        } else {
            res.redirect('/cart');
        }
    });
};

exports.generateInvoice2 = (req, res) => {
    const { orderId } = req.params;
    
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const sql = `
        SELECT oi.orderId, oi.OrderDate, oi.Quantity, oi.Price, oi.Size,
               oi.PaymentMethod, oi.transactionId,
               p.ProductID, p.Name, p.Image
        FROM orderitem oi
        JOIN product p ON oi.ProductID = p.ProductID
        WHERE oi.orderId = ?
    `;

    db.query(sql, [orderId], (error, orderItems) => {
        if (error) {
            console.error('Error retrieving order items:', error);
            return res.status(500).send('Error generating invoice');
        }

        if (orderItems.length > 0) {
            const totalAmount = orderItems.reduce((sum, item) => 
                sum + (Number(item.Price) * Number(item.Quantity)), 0
            );

            res.render('invoice2', {
                orderId: orderId,
                transactionId: orderItems[0].transactionId,
                paymentMethod: orderItems[0].PaymentMethod,
                cart: orderItems,
                totalAmount: totalAmount.toFixed(2),
                user: req.session.user,
                orderDate: orderItems[0].OrderDate
            });
        } else {
            res.redirect('/cart');
        }
    });
};

exports.getOrders = (req, res) => {
    const sql = `
        SELECT DISTINCT oi.orderId, oi.OrderDate, oi.Quantity, oi.Price, oi.Size,
               oi.PaymentMethod, oi.transactionId,
               p.ProductID, p.Name, p.Image,
               u.FirstName, u.LastName, u.Email
        FROM orderitem oi 
        JOIN product p ON oi.ProductID = p.ProductID
        JOIN user u ON oi.UserID = u.UserID 
        ORDER BY oi.OrderDate DESC
    `;

    db.query(sql, (error, results) => {
        if (error) {
            console.error('Error fetching orders:', error);
            req.flash('error', 'Failed to retrieve orders');
            return res.redirect('/adminpage');
        }

        // Group orders by orderId
        const groupedOrders = results.reduce((acc, order) => {
            if (!acc[order.orderId]) {
                acc[order.orderId] = {
                    orderId: order.orderId,
                    OrderDate: order.OrderDate,
                    FirstName: order.FirstName,
                    LastName: order.LastName,
                    Email: order.Email,
                    PaymentMethod: order.PaymentMethod,
                    transactionId: order.transactionId,
                    items: []
                };
            }
            acc[order.orderId].items.push({
                Name: order.Name,
                Image: order.Image,
                Size: order.Size,
                Quantity: order.Quantity,
                Price: order.Price,
                Total: order.Price * order.Quantity
            });
            return acc;
        }, {});

        res.render('viewOrders', { 
            orders: Object.values(groupedOrders),
            messages: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    });
};


