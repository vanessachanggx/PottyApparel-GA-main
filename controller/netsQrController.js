const axios = require("axios");
const db = require('../db');

exports.generateQrCode = async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const userId = req.session.user.UserID;

    try {
        // Get cart items and total
        const cartQuery = `
            SELECT p.ProductID, p.Name, p.Image, c.Price, c.Quantity, c.Size
            FROM cart c
            JOIN product p ON c.ProductID = p.ProductID
            WHERE c.UserID = ?
        `;

        db.query(cartQuery, [userId], async (error, cartItems) => {
            if (error) {
                console.error('Error retrieving cart items:', error);
                return res.status(500).send('Error retrieving cart items');
            }

            if (!cartItems || cartItems.length === 0) {
                return res.redirect('/cart');
            }

            const totalAmount = cartItems.reduce((sum, item) => 
                sum + (Number(item.Price) * Number(item.Quantity)), 0
            );

            const requestBody = {
                txn_id: "sandbox_nets|m|8ff8e5b6-d43e-4786-8ac5-7accf8c5bd9b",
                amt_in_dollars: totalAmount.toFixed(2),
                notify_mobile: 0,
            };

            const response = await axios.post(
                `https://sandbox.nets.openapipaas.com/api/v1/common/payments/nets-qr/request`,
                requestBody,
                {
                    headers: {
                        "api-key": process.env.API_KEY,
                        "project-id": process.env.PROJECT_ID,
                    },
                }
            );

            const qrData = response.data.result.data;

            if (qrData.response_code === "00" && qrData.txn_status === 1 && qrData.qr_code) {
                const txnRetrievalRef = qrData.txn_retrieval_ref;
                const webhookUrl = `https://sandbox.nets.openapipaas.com/api/v1/common/payments/nets/webhook`;

                res.render("netsQr", {
                    cart: cartItems,
                    total: totalAmount.toFixed(2),
                    title: "Scan to Pay",
                    qrCodeUrl: `data:image/png;base64,${qrData.qr_code}`,
                    txnRetrievalRef: txnRetrievalRef,
                    networkCode: qrData.network_status,
                    timer: 300,
                    webhookUrl: webhookUrl,
                    apiKey: process.env.API_KEY,
                    projectId: process.env.PROJECT_ID,
                    user: req.session.user
                });
            } else {
                res.render("netsQrFail", {
                    title: "Error",
                    responseCode: qrData.response_code || "N.A.",
                    instructions: qrData.network_status === 0 ? qrData.instruction : "",
                    errorMsg: qrData.network_status !== 0 ? "Frontend Error Message" : "",
                });
            }
        });
    } catch (error) {
        console.error("Error in generateQrCode:", error.message);
        res.redirect("/nets-qr/fail");
    }
};