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

exports.getOrders = (req, res) => {
    const sql = `
        SELECT o.OrderID, o.ProductID, p.ProductName, 
               o.Quantity, o.Price, o.Size, o.OrderDate,
               o.PaymentMethod, o.transactionId
        FROM orderitem o 
        JOIN product p ON o.ProductID = p.ProductID 
        ORDER BY o.OrderDate DESC
    `;

    db.query(sql, (error, results) => {
        if (error) {
            return res.status(500).send('Error retrieving orders');
        }

        if (results.length > 0) {
            const totalAmount = results.reduce((sum, order) => 
                sum + (order.Quantity * order.Price), 0);

            res.render('viewOrders', { 
                orders: results, 
                totalAmount: totalAmount.toFixed(2)
            });
        } else {
            res.render('viewOrders', { 
                orders: [], 
                totalAmount: 0,
                message: "No orders found" 
            });
        }
    });
};
