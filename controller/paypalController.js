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
        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error("Failed to generate Access Token:", error);
        throw error;
    }
}

exports.createOrderHandler = async (req, res) => {
    try {
        const { cart } = req.body;
        const accessToken = await generateAccessToken();
        const url = `${BASE}/v2/checkout/orders`;
        
        const total = cart.reduce((sum, item) => 
            sum + (Number(item.Price) * Number(item.Quantity)), 0
        );

        const payload = {
            intent: "CAPTURE",
            purchase_units: [{
                amount: {
                    currency_code: "SGD",
                    value: total.toFixed(2)
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

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Failed to create order:", error);
        res.status(500).json({ error: "Failed to create order." });
    }
};

exports.captureOrderHandler = async (req, res) => {
    try {
        const { orderID } = req.params;
        const accessToken = await generateAccessToken();
        const url = `${BASE}/v2/checkout/orders/${orderID}/capture`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            }
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Failed to capture order:", error);
        res.status(500).json({ error: "Failed to capture order." });
    }
};
