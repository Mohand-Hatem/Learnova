import axios from "axios";
import Env from "../config/handelEnv.js";

export const getToken = async () => {
  try {
    const res = await axios.post("https://accept.paymob.com/api/auth/tokens", {
      api_key: Env.PAYMOB_API_KEY.trim(),
    });

    console.log("TOKEN:", res.data.token);
    return res.data.token;
  } catch (err) {
    console.log("PAYMOB ERROR:", err.response?.data);
    throw err;
  }
};

export const createOrder = async (token, amount) => {
  const { data } = await axios.post(
    "https://accept.paymob.com/api/ecommerce/orders",
    {
      auth_token: token,
      delivery_needed: false,
      amount_cents: amount * 100,
      currency: "EGP",
      items: [],
    },
  );

  return data;
};

export const createPaymentKey = async (token, orderId, amount, user) => {
  const { data } = await axios.post(
    "https://accept.paymob.com/api/acceptance/payment_keys",
    {
      auth_token: token,
      amount_cents: amount * 100,
      expiration: 3600,
      order_id: orderId,

      billing_data: {
        first_name: user.name.en,
        last_name: "User",
        email: user.email,
        phone_number: "01000000000",
        city: "Cairo",
        country: "EG",
        street: "NA",
        building: "NA",
        floor: "NA",
        apartment: "NA",
        postal_code: "NA",
        shipping_method: "NA",
      },

      currency: "EGP",
      integration_id: Env.PAYMOB_INTEGRATION_ID,
    },
  );

  return data.token;
};

export const getCheckoutUrl = (paymentToken) => {
  return `https://accept.paymob.com/api/acceptance/iframes/${Env.PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`;
};
