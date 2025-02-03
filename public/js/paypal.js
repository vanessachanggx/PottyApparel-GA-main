paypal.Buttons({
    style: {
        shape: "rect",
        layout: "vertical",
        color: "gold",
        label: "paypal"
    },

    createOrder: async function() {
        try {
            const cartProducts = JSON.parse(document.getElementById("cartProducts").value);
            const response = await fetch("/api/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    cart: cartProducts
                }),
            });

            const orderData = await response.json();
            return orderData.id;
        } catch (error) {
            console.error("Error creating order:", error);
            throw error;
        }
    },

    onApprove: async function(data, actions) {
        try {
            const response = await fetch(`/api/orders/${data.orderID}/capture`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                }
            });

            const orderData = await response.json();
            const transaction = orderData.purchase_units[0].payments.captures[0];
            window.location.href = `/checkout/Paypal/${orderData.orderId}/${transaction.id}`;
        } catch (error) {
            console.error("Error processing payment:", error);
            alert("Payment error occurred");
        }
    }
}).render("#paypal-button-container");
