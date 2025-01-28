paypal.Buttons({
    style: {
        shape: "rect",
        layout: "vertical",
        color: "gold",
        label: "paypal",
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
            if (!orderData.id) {
                throw new Error("Failed to create order");
            }
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
            
            // Redirect to a success page instead of the invoice directly
            window.location.href = `/order-success?orderId=${orderData.id}`;
        } catch (error) {
            console.error("Error processing payment:", error);
            alert("Payment error occurred");
        }
    }
    ,

    onError: function(err) {
        console.error("PayPal Error:", err);
        alert("There was an error with PayPal. Please try again.");
    }
}).render("#paypal-button-container");
