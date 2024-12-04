const express = require('express');
const { Client } = require('whatsapp-web.js');
const bodyParser = require('body-parser');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

// Initialize express
const app = express();

// Body parser middleware for JSON
app.use(bodyParser.json());

// Set up WhatsApp Web.js client
const client = new Client();

// Path for QR code generation
const sessionFilePath = './session.json';

// Load session data if exists
if (fs.existsSync(sessionFilePath)) {
  const sessionData = require(sessionFilePath);
  client.initialize(sessionData);
} else {
  client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Scan this QR code to log in to WhatsApp');
  });
}

// Save session data when logged in
client.on('authenticated', (session) => {
  fs.writeFileSync(sessionFilePath, JSON.stringify(session));
  console.log('WhatsApp Web client authenticated');
});

// Send WhatsApp message
const sendMessage = (phone, message) => {
  const formattedPhone = phone.replace(/[^0-9]/g, '') + '@c.us'; // Ensure correct phone number format
  client.sendMessage(formattedPhone, message)
    .then(() => console.log(`Message sent to ${phone}`))
    .catch(err => console.error('Error sending message: ', err));
};

// Webhook endpoint to handle Shopify events
app.post('/webhook', (req, res) => {
  // Log the incoming webhook data (for debugging purposes)
  console.log('Received webhook:', req.body);

  // Example: Check for a new order event (adjust depending on the webhook event you want to handle)
  if (req.body && req.body.customer && req.body.customer.phone) {
    const customerPhone = req.body.customer.phone;
    const orderId = req.body.id;
    
    // Prepare your message (customize this message)
    const message = `Thank you for your order #${orderId}! We will process it soon.`;

    // Send the message to the customer via WhatsApp
    sendMessage(customerPhone, message);
  }

  // Respond to Shopify to acknowledge receipt of the webhook
  res.status(200).send('Webhook received');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
