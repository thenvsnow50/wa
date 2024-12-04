const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const bodyParser = require('body-parser');
const qrcode = require('qrcode');
const fs = require('fs');

// Initialize Express
const app = express();

// Body parser middleware for JSON
app.use(bodyParser.json());

// Store the QR code globally
let qrCodeURL = null;

// Set up WhatsApp Web.js client with session persistence
const client = new Client({
  authStrategy: new LocalAuth(),
});

// Serve the QR code at the '/qr' endpoint
app.get('/qr', (req, res) => {
  if (qrCodeURL) {
    res.send(`<img src="${qrCodeURL}" alt="Scan this QR code to log in to WhatsApp">`);
  } else {
    res.send('QR code not generated yet. Please wait or restart the service.');
  }
});

// Generate and store the QR code when requested
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

// Handle authentication events
client.on('ready', () => {
  console.log('WhatsApp Web client is ready!');
});

// Function to send a WhatsApp message
const sendMessage = (phone, message) => {
  const formattedPhone = phone.replace(/[^0-9]/g, '') + '@c.us'; // Ensure correct phone number format
  client.sendMessage(formattedPhone, message)
    .then(() => console.log(`Message sent to ${phone}`))
    .catch(err => console.error('Error sending message: ', err));
};

// Webhook endpoint to handle Shopify events
app.post('/webhook', (req, res) => {
  console.log('Received webhook:', req.body);

  if (req.body && req.body.customer && req.body.customer.phone) {
    const customerPhone = req.body.customer.phone;
    const orderId = req.body.id;
    const message = `Thank you for your order #${orderId}! We will process it soon.`;

    sendMessage(customerPhone, message);
  }

  res.status(200).send('Webhook received');
});

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  client.initialize(); // Initialize WhatsApp client here
});
