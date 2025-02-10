const db = require('../db');

exports.getSalesReport = (req, res) => {
    // Query for monthly sales
    const monthlySalesQuery = `
        SELECT 
            DATE_FORMAT(OrderDate, '%Y-%m') as month,
            CAST(SUM(Price * Quantity) AS DECIMAL(10,2)) as totalSales,
            SUM(Quantity) as totalQuantity
        FROM orderitem
        GROUP BY DATE_FORMAT(OrderDate, '%Y-%m')
        ORDER BY month DESC
    `;

    // Query for best selling items
    const bestSellingQuery = `
        SELECT 
            p.Name,
            p.Image,
            SUM(oi.Quantity) as totalQuantitySold,
            CAST(SUM(oi.Price * oi.Quantity) AS DECIMAL(10,2)) as totalRevenue
        FROM orderitem oi
        JOIN product p ON oi.ProductID = p.ProductID
        GROUP BY p.ProductID, p.Name
        ORDER BY totalQuantitySold DESC
        LIMIT 5
    `;

    db.query(monthlySalesQuery, (error, monthlySales) => {
        if (error) {
            console.error('Error fetching monthly sales:', error);
            return res.status(500).send('Error generating sales report');
        }

        db.query(bestSellingQuery, (error, bestSellers) => {
            if (error) {
                console.error('Error fetching best sellers:', error);
                return res.status(500).send('Error generating sales report');
            }

            // Convert string values to numbers
            monthlySales = monthlySales.map(sale => ({
                ...sale,
                totalSales: Number(sale.totalSales),
                totalQuantity: Number(sale.totalQuantity)
            }));

            bestSellers = bestSellers.map(seller => ({
                ...seller,
                totalRevenue: Number(seller.totalRevenue),
                totalQuantitySold: Number(seller.totalQuantitySold)
            }));

            res.render('sales', {
                monthlySales: monthlySales,
                bestSellers: bestSellers,
                currentMonth: new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
            });
        });
    });
};
