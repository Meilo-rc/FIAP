const {
  getAccessToken,
  json,
  parseJsonBody,
  paypalBaseUrl
} = require('./paypal-utils');

exports.handler = async event => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    const { orderID } = parseJsonBody(event);
    if (!orderID) {
      return json(400, { error: 'Missing PayPal order ID' });
    }

    const accessToken = await getAccessToken();
    const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (!response.ok) {
      return json(response.status, { error: 'PayPal capture failed', details: data });
    }

    return json(200, {
      id: data.id,
      status: data.status,
      payer: data.payer || null,
      captures: data.purchase_units?.flatMap(unit => unit.payments?.captures || []) || []
    });
  } catch (error) {
    return json(400, { error: error.message });
  }
};
