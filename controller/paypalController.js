const PAYPAL_CLIENT_ID = "ATQQuSzP7fhPQBdI857o6No3EjYfFdblxq0No5LNnSonJRQwjPq_n3DUOK80Qdqve0PtrEvnGjuOcwcB";
const PAYPAL_CLIENT_SECRET = "EL76NowvANXm1PVeAmoTuSG7R1Fbnk1ftjXaoM9o2VzThOxFVX3OJfZJ9ZbR3AZSkk4xILFaYXxiDLFr";
const BASE = "https://api-m.sandbox.paypal.com";

async function generateAccessToken() {
    const BASE64_ENCODED_CLIENT_ID_AND_SECRET = Buffer.from(
        `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
    ).toString("base64");

    const request = await fetch(
        "https://api-m.sandbox.paypal.com/v1/oauth2/token",
        {
            method: "POST",
            headers: {
                Authorization: `Basic ${BASE64_ENCODED_CLIENT_ID_AND_SECRET}`,
            },
            body: new URLSearchParams({
                grant_type: "client_credentials",
                response_type: "id_token",
                intent: "sdk_init",
            }),
        }
    );
    const json = await request.json();
    return json.access_token;
}

const createOrder = async (cart) => {
    const processed_items = cart.map(item => ({
        name: item.ProductName,
        description: item.Description,
        unit_amount: {
            currency_code: "SGD",
            value: Number(item.Price).toFixed(2),
        },
        quantity: item.Quantity.toString(),
        size: item.Size
    }));

    let total_amount = cart.reduce((sum, item) => 
        sum + (item.Price * item.Quantity), 0).toFixed(2);

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
                        value: total_amount,
                    },
                },
            },
        }],
    };

    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        method: "POST",
        body: JSON.stringify(payload),
    });

    return handleResponse(response);
};

exports.createOrderHandler = async (req, res) => {
    try {
        const { cart } = req.body;
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
        const accessToken = await generateAccessToken();
        const url = `${BASE}/v2/checkout/orders/${orderID}/capture`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const jsonResponse = await handleResponse(response);
        res.status(response.status).json(jsonResponse);

    } catch (error) {
        console.error("Failed to capture order:", error);
        res.status(500).json({ error: "Failed to capture order." });
    }
};

