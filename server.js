const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const bodyParser = require('body-parser');
const qrcode = require('qrcode');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

let qrCodeURL = null;
let isClientReady = false;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
        executablePath: '/usr/bin/google-chrome-stable',
        headless: true
    }
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
    isClientReady = true;
    console.log('WhatsApp Web client is ready!');
});

client.on('disconnected', () => {
    isClientReady = false;
    console.log('Client disconnected. Reinitializing...');
    client.initialize();
});

const sendMessage = async (phone, message) => {
    if (!isClientReady) {
        throw new Error('WhatsApp client not ready');
    }
    
    const formattedPhone = phone.replace(/[^0-9]/g, '') + '@c.us';
    try {
        await client.sendMessage(formattedPhone, message);
        console.log(`Message sent to ${phone}`);
    } catch (err) {
        console.error('Error sending message:', err);
        throw err;
    }
};

app.post('/webhook', async (req, res) => {
    console.log('Received webhook:', req.body);

    try {
        if (req.body?.customer?.phone) {
            const customerPhone = req.body.customer.phone;
            const orderId = req.body.id;
            const message = `Thank you for your order #${orderId}! We will process it soon.`;

            await sendMessage(customerPhone, message);
            res.status(200).send('Message sent successfully');
        } else {
            res.status(400).send('Invalid webhook data');
        }
    } catch (error) {
        res.status(500).send('Error processing webhook');
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    client.initialize();
});