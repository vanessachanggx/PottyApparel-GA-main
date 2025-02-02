const db = require('../db');

exports.getmyOrders = (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const sql = `
        SELECT oi.OrderItemID, p.Name, p.Image, p.Price, oi.Quantity, oi.Size
        FROM orderitem oi
        JOIN product p ON p.ProductID = oi.ProductID
        ORDER BY oi.OrderItemID DESC
    `;

    db.query(sql, (error, results) => {
        if (error) {
            return res.status(500).send('Error retrieving orders');
        }

        if (results.length > 0) {
            const totalAmount = results.reduce((sum, item) => 
                sum + (item.Price * item.Quantity), 0
            );

            res.render('viewOrders', { 
                orders: results, 
                totalAmount: totalAmount, 
                msg: "" 
            });
        } else {
            res.render('viewOrders', { msg: "No orders" });
        }
    });
};

exports.getOrders = (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/401');
    }

    const sql = `
        SELECT oi.OrderItemID, p.Name, p.Image, p.Price, oi.Quantity, oi.Size
        FROM orderitem oi
        JOIN product p ON p.ProductID = oi.ProductID
        ORDER BY oi.OrderItemID DESC
    `;

    db.query(sql, (error, results) => {
        if (error) {
            return res.status(500).send('Error retrieving orders');
        }

        if (results.length > 0) {
            const totalAmount = results.reduce((sum, item) => 
                sum + (item.Price * item.Quantity), 0
            );

            res.render('viewOrders', { 
                orders: results, 
                totalAmount: totalAmount, 
                msg: "" 
            });
        } else {
            res.render('viewOrders', { msg: "No orders" });
        }
    });
};
