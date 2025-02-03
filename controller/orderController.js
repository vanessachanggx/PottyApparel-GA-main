const db = require('../db');

exports.getOrders = (req, res) => {
    const sql = `SELECT o.OrderID, o.ProductID, p.ProductName, 
                 o.Quantity, o.Price, o.Size, o.OrderDate 
                 FROM orderitem o 
                 JOIN product p ON o.ProductID = p.ProductID 
                 ORDER BY o.OrderDate DESC`;

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

exports.generateInvoice = (req, res) => {
    const { orderId } = req.params;
    
    const sql = `SELECT o.OrderID, p.ProductName, o.Quantity, 
                 o.Price, o.Size, o.OrderDate 
                 FROM orderitem o 
                 JOIN product p ON o.ProductID = p.ProductID 
                 WHERE o.OrderID = ?`;

    db.query(sql, [orderId], (error, results) => {
        if (error) {
            return res.status(500).send('Error generating invoice');
        }

        if (results.length > 0) {
            const totalAmount = results.reduce((sum, item) => 
                sum + (item.Quantity * item.Price), 0);

            res.render('invoice', {
                orderItems: results,
                totalAmount: totalAmount.toFixed(2),
                orderId: orderId,
                orderDate: results[0].OrderDate
            });
        } else {
            res.status(404).send('Order not found');
        }
    });
};
