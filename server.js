const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const bodyParser = require('body-parser');
const qrcode = require('qrcode');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

let qrCodeURL = null;

const client = new Client({
    authStrategy: new LocalAuth(),
});

app.get('/qr', (req, res) => {
    if (qrCodeURL) {
        res.send(`<img src="${qrCodeURL}" alt="Scan this QR code to log in to WhatsApp">`);
    } else {
        res.send('QR code not generated yet. Please wait or restart the service.');
    }
});

client.on('qr', (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error('Error generating QR code:', err);
        } else {
            qrCodeURL = url;
            console.log('QR Code generated. Visit /qr to scan.');
        }
    });
});

client.on('ready', () => {
    console.log('WhatsApp Web client is ready!');
});

const sendMessage = (phone, message) => {
    const formattedPhone = phone.replace(/[^0-9]/g, '') + '@c.us';
    client.sendMessage(formattedPhone, message)
        .then(() => console.log(`Message sent to ${phone}`))
        .catch(err => console.error('Error sending message: ', err));
};

app.post('/webhook', (req, res) => {
    console.log('Received webhook:', req.body);
    if (req.body && req.body.customer && req.body.customer.phone) {
        const customerPhone = req.body.customer.phone;
        const orderNumber = `#${req.body.order_number}`;
        const customerName = req.body.customer.first_name || 'Valued Customer';
        const currency = req.body.currency || 'LKR';

        let orderDetails = '';
        let totalAmount = 0;

        // Process each line item
        req.body.line_items.forEach(item => {
            const price = parseFloat(item.price);
            const lineTotal = price * item.quantity;
            totalAmount += lineTotal;

            orderDetails += `\nProduct: ${item.title}`;
            if (item.variant_title) {
                orderDetails += `\nColor: ${item.variant_title}`;
            }
            orderDetails += `\nQuantity: ${item.quantity}`;
            orderDetails += `\nPrice: ${currency} ${price.toFixed(2)}`;
            orderDetails += `\nSubtotal: ${currency} ${lineTotal.toFixed(2)}`;
            orderDetails += '\n-----------------';
        });

        const message = `Dear ${customerName},

Thank you for your Order ${orderNumber}!

Order Details:
-----------------${orderDetails}
Total Amount: ${currency} ${totalAmount.toFixed(2)}

We will process your order soon.
Have a great day! 🕯️`;

        sendMessage(customerPhone, message);
    }
    res.status(200).send('Webhook received');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    client.initialize();
});