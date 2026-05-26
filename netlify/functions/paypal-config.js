const { json } = require('./paypal-utils');

exports.handler = async () => {
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  return json(200, {
    clientId,
    currency: 'EUR',
    environment: process.env.PAYPAL_ENVIRONMENT === 'live' ? 'live' : 'sandbox',
    configured: Boolean(clientId && process.env.PAYPAL_CLIENT_SECRET)
  });
};
