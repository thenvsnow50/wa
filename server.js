const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
  authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  console.log('Please scan the QR code with WhatsApp on your phone.');
});

client.on('ready', async () => {
  console.log('WhatsApp client is ready!');
  
  const orderId = 2;
  const customerPhone = '94772415566@c.us';  // Remove the '+' and add '@c.us'
  
  const message = `Thank you for your order! Your order ID is: ${orderId}`;
  
  try {
    await client.sendMessage(customerPhone, message);
    console.log(`Order ID ${orderId} sent to ${customerPhone}`);
  } catch (error) {
    console.error('Error sending message:', error);
  }
});

client.initialize();