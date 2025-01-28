const PAYPAL_CLIENT_ID = "ATQQuSzP7fhPQBdI857o6No3EjYfFdblxq0No5LNnSonJRQwjPq_n3DUOK80Qdqve0PtrEvnGjuOcwcB";
const PAYPAL_CLIENT_SECRET = "EL76NowvANXm1PVeAmoTuSG7R1Fbnk1ftjXaoM9o2VzThOxFVX3OJfZJ9ZbR3AZSkk4xILFaYXxiDLFr";
const BASE = "https://api-m.sandbox.paypal.com";

async function generateAccessToken() {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
    
    try {
        const response = await fetch(`${BASE}/v1/oauth2/token`, {
            method: "POST",
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
        });

        if (!response.ok) {
            throw new Error(`Failed to generate token: ${response.status}`);
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error("Failed to generate Access Token:", error);
        throw error;
    }
}

async function handleResponse(response) {
    try {
        const jsonResponse = await response.json();
        return {
            jsonResponse,
            httpStatusCode: response.status,
        };
    } catch (err) {
        const errorMessage = await response.text();
        throw new Error(errorMessage);
    }
}

async function createOrder(cart) {
    if (!Array.isArray(cart) || cart.length === 0) {
        throw new Error("Invalid cart data");
    }

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
    if (!orderID) {
        throw new Error("Order ID is required");
    }

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

        const { jsonResponse, httpStatusCode } = await createOrder(cart);
        res.status(httpStatusCode).json(jsonResponse);
    } catch (error) {
        console.error("Failed to create order:", error);
        res.status(500).json({ error: "Failed to create order." });
    }
};

exports.captureOrderHandler = async (req, res) => {
    try {
        const { orderID } = req.params;
        if (!orderID) {
            return res.status(400).json({ error: "Order ID is required" });
        }

        const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
        res.status(httpStatusCode).json(jsonResponse);
    } catch (error) {
        console.error("Failed to capture order:", error);
        res.status(500).json({ error: "Failed to capture order." });
    }
};
