const PAYPAL_API = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com'
};

const ALLOWED_PRICES = {
  '13×18 cm': { seul: 20, cadre: 40 },
  '21×29,7 cm': { seul: 35, cadre: 60 },
  '29,7×42 cm': { seul: 50, cadre: 80 }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}

function paypalBaseUrl() {
  const environment = process.env.PAYPAL_ENVIRONMENT === 'live' ? 'live' : 'sandbox';
  return PAYPAL_API[environment];
}

function requirePayPalConfig() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('PayPal is not configured');
  }
  return { clientId, clientSecret };
}

async function getAccessToken() {
  const { clientId, clientSecret } = requirePayPalConfig();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error(`PayPal token request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

function parseJsonBody(event) {
  try {
    return JSON.parse(event.body || '{}');
  } catch (error) {
    throw new Error('Invalid JSON body');
  }
}

function expectedPrice(item) {
  const prices = ALLOWED_PRICES[item.format];
  if (!prices) return null;
  const withFrame = String(item.encadrement || '').toLowerCase().startsWith('encadrement');
  return withFrame ? prices.cadre : prices.seul;
}

function validateCart(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Le panier est vide');
  }

  const normalized = items.map(item => {
    const price = expectedPrice(item);
    const submittedPrice = Number(item.prix);
    if (!price || submittedPrice !== price) {
      throw new Error('Le panier contient un prix invalide');
    }

    return {
      title: String(item.titre || 'Tirage Contrastes').slice(0, 120),
      format: String(item.format || '').slice(0, 40),
      framing: String(item.encadrement || 'Tirage Fine Art seul').slice(0, 160),
      price
    };
  });

  const total = normalized.reduce((sum, item) => sum + item.price, 0);
  return { items: normalized, total };
}

module.exports = {
  json,
  parseJsonBody,
  paypalBaseUrl,
  getAccessToken,
  validateCart
};
