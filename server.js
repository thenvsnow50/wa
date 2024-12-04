const express = require('express');
const { Client } = require('whatsapp-web.js');
const bodyParser = require('body-parser');
const qrcode = require('qrcode');
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
    // Generate the QR code as an image and send it to the web page
    qrcode.toDataURL(qr, (err, url) => {
      if (err) {
        console.error('Error generating QR code:', err);
      } else {
        // Serve the QR code when requested
        app.get('/qr', (req, res) => {
          res.send(`<img src="${url}" alt="Scan this QR code to log in to WhatsApp">`);
        });
        console.log('QR Code generated, visit /qr to scan');
      }
    });
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
  console.log('Received webhook:', req.body);

  if (req.body && req.body.customer && req.body.customer.phone) {
    const customerPhone = req.body.customer.phone;
    const orderId = req.body.id;
    const message = `Thank you for your order #${orderId}! We will process it soon.`;
    sendMessage(customerPhone, message);
  }

  res.status(200).send('Webhook received');
});

// Serve a default response for /qr in case it's not generated yet
app.get('/qr', (req, res) => {
  res.send('<p>QR code is being generated. Please wait...</p>');
});

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
