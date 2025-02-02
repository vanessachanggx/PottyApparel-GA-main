const db = require('../db');

const PAYPAL_CLIENT_ID = "ATQQuSzP7fhPQBdI857o6No3EjYfFdblxq0No5LNnSonJRQwjPq_n3DUOK80Qdqve0PtrEvnGjuOcwcB";
const PAYPAL_CLIENT_SECRET = "EL76NowvANXm1PVeAmoTuSG7R1Fbnk1ftjXaoM9o2VzThOxFVX3OJfZJ9ZbR3AZSkk4xILFaYXxiDLFr";
const BASE = "https://api-m.sandbox.paypal.com";

async function generateAccessToken() {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
    
    const response = await fetch(`${BASE}/v1/oauth2/token`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
    });

    const data = await response.json();
    return data.access_token;
}

async function handleResponse(response) {
    const jsonResponse = await response.json();
    return {
        jsonResponse,
        httpStatusCode: response.status,
    };
}

async function createOrder(cart) {
    const processed_items = cart.map(item => ({
        name: item.Name,
        description: `Size: ${item.Size}`,
        quantity: item.Quantity.toString(),
        unit_amount: {
            currency_code: "SGD",
            value: Number(item.Price).toFixed(2)
        }
    }));

    const total_amount = cart.reduce((sum, item) => 
        sum + (Number(item.Price) * Number(item.Quantity)), 0
    ).toFixed(2);

    const accessToken = await generateAccessToken();
    const url = `${BASE}/v2/checkout/orders`;
    
    const payload = {
        intent: "CAPTURE",
        purchase_units: [{
            items: processed_items,
            amount: {
                currency_code: "SGD",
                value: total_amount,
                breakdown: {
                    item_total: {
                        currency_code: "SGD",
                        value: total_amount
                    }
                }
            }
        }]
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload)
    });

    return handleResponse(response);
}

async function captureOrder(orderID) {
    const accessToken = await generateAccessToken();
    const url = `${BASE}/v2/checkout/orders/${orderID}/capture`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        }
    });

    return handleResponse(response);
}

exports.createOrderHandler = async (req, res) => {
    try {
        const { cart } = req.body;
        if (!cart || !Array.isArray(cart)) {
            return res.status(400).json({ error: "Invalid cart data" });
        }

        const { jsonResponse } = await createOrder(cart);
        res.json(jsonResponse);
    } catch (error) {
        console.error("Failed to create order:", error);
        res.status(500).json({ error: "Failed to create order." });
    }
};

exports.captureOrderHandler = async (req, res) => {
    try {
        const { orderID } = req.params;
        const { jsonResponse } = await captureOrder(orderID);

        // Get transaction details
        const transaction = jsonResponse.purchase_units[0].payments.captures[0];
        
        // Insert order items into database
        const cart = await new Promise((resolve, reject) => {
            db.query('SELECT * FROM cart WHERE UserID = ?', [req.session.user.UserID], (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });

        // Insert each cart item as an order item
        const orderItemValues = cart.map(item => [
            item.ProductID,
            item.Quantity,
            item.Price,
            item.Size
        ]);

        if (orderItemValues.length > 0) {
            await new Promise((resolve, reject) => {
                db.query(
                    'INSERT INTO orderitem (ProductID, Quantity, Price, Size) VALUES ?',
                    [orderItemValues],
                    (error) => {
                        if (error) reject(error);
                        else resolve();
                    }
                );
            });
        }

        // Clear cart after successful order creation
        await new Promise((resolve, reject) => {
            db.query('DELETE FROM cart WHERE UserID = ?', [req.session.user.UserID], (error) => {
                if (error) reject(error);
                else resolve();
            });
        });

        res.json(jsonResponse);
    } catch (error) {
        console.error("Failed to capture order:", error);
        res.status(500).json({ error: "Failed to capture order." });
    }
};
