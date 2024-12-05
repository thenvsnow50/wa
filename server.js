const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const bodyParser = require('body-parser');
const qrcode = require('qrcode');

const app = express();
app.use(bodyParser.json());

let qrCodeURL = null;
let isClientReady = false;
let messageQueue = [];

console.log('Starting WhatsApp client initialization...');

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
        headless: true
    }
});

client.on('loading_screen', (percent, message) => {
    console.log('LOADING WHATSAPP:', percent, message);
});

client.on('auth_failure', () => {
    console.log('AUTHENTICATION FAILED - Retrying...');
    client.initialize();
});

const processMessageQueue = async () => {
    while (messageQueue.length > 0) {
        const { phone, message } = messageQueue[0];
        try {
            const formattedPhone = phone.replace(/[^0-9]/g, '') + '@c.us';
            await client.sendMessage(formattedPhone, message);
            console.log(`✅ Message sent successfully to ${phone}`);
            messageQueue.shift();
        } catch (err) {
            console.log(`⚠️ Retry sending message to ${phone}:`, err.message);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
};

client.on('qr', (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error('Error generating QR code:', err);
        } else {
            qrCodeURL = url;
            console.log('🔄 New QR Code generated. Visit /qr to scan.');
        }
    });
});

client.on('ready', () => {
    isClientReady = true;
    console.log('🚀 WhatsApp Web client is ready!');
    processMessageQueue();
});

client.on('authenticated', () => {
    console.log('🔐 WhatsApp client authenticated successfully!');
});

client.on('disconnected', () => {
    isClientReady = false;
    console.log('📵 Client disconnected. Reinitializing...');
    client.initialize();
});

app.get('/qr', (req, res) => {
    if (qrCodeURL) {
        res.send(`<img src="${qrCodeURL}" alt="Scan this QR code to log in to WhatsApp">`);
    } else {
        res.send('QR code not generated yet. Please wait.');
    }
});

app.post('/webhook', async (req, res) => {
    console.log('📦 Received webhook:', req.body);
    try {
        if (req.body?.customer?.phone) {
            const customerPhone = req.body.customer.phone;
            const orderNumber = `#${req.body.order_number}`;
            const currency = req.body.currency;
            const customerName = req.body.customer.first_name;
            
            let orderDetails = '';
            req.body.line_items.forEach(item => {
                orderDetails += `\n- ${item.title} (${item.variant_title})`;
                orderDetails += `\n  Quantity: ${item.quantity}`;
                orderDetails += `\n  Price: ${currency} ${parseFloat(item.price).toFixed(2)}\n`;
            });
            
            const message = `Hi ${customerName}! Thank you for your order ${orderNumber}.\n\nOrder Details:${orderDetails}\nTotal Amount: ${currency} ${parseFloat(req.body.total_price).toFixed(2)}\n\nWe will process your order soon.`;

            if (isClientReady) {
                const formattedPhone = customerPhone.replace(/[^0-9]/g, '') + '@c.us';
                await client.sendMessage(formattedPhone, message);
                console.log(`✅ Message sent to ${customerPhone}`);
            } else {
                messageQueue.push({ phone: customerPhone, message });
                console.log(`📝 Message queued for ${customerPhone}`);
            }
            
            res.status(200).send('Message handled successfully');
        } else {
            res.status(400).send('Invalid webhook data');
        }
    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).send('Error processing webhook');
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🌐 Server is running on port ${PORT}`);
    client.initialize();
});