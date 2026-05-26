const {
  getAccessToken,
  json,
  parseJsonBody,
  paypalBaseUrl,
  validateCart
} = require('./paypal-utils');

exports.handler = async event => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    const body = parseJsonBody(event);
    const { items, total } = validateCart(body.items);
    const accessToken = await getAccessToken();

    const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            description: 'Commande de tirages Contrastes',
            amount: {
              currency_code: 'EUR',
              value: total.toFixed(2),
              breakdown: {
                item_total: {
                  currency_code: 'EUR',
                  value: total.toFixed(2)
                }
              }
            },
            items: items.map(item => ({
              name: `${item.title} - ${item.format}`.slice(0, 127),
              description: item.framing,
              quantity: '1',
              category: 'PHYSICAL_GOODS',
              unit_amount: {
                currency_code: 'EUR',
                value: item.price.toFixed(2)
              }
            }))
          }
        ],
        application_context: {
          brand_name: 'CONTRASTES',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW'
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return json(response.status, { error: 'PayPal order creation failed', details: data });
    }

    return json(200, { id: data.id });
  } catch (error) {
    return json(400, { error: error.message });
  }
};
