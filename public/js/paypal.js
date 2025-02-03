paypal.Buttons({
    createOrder: async function(data, actions) {
        try {
            const response = await fetch("/api/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    cart: cart_items,
                }),
            });
            
            const orderData = await response.json();
            return orderData.id;
        } catch (error) {
            console.error("Error creating PayPal order:", error);
        }
    },

    onApprove: async function(data, actions) {
        try {
            const response = await fetch(`/api/orders/${data.orderID}/capture`, {
                method: "POST",
            });
            
            const captureData = await response.json();
            // Include both orderID and transactionID in redirect
            window.location.href = `/checkout/paypal/${captureData.id}/${captureData.purchase_units[0].payments.captures[0].id}`;
        } catch (error) {
            console.error("Error capturing PayPal order:", error);
        }
    }
}).render('#paypal-button-container');
