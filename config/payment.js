const dotenv = require('dotenv');
dotenv.config()
const stripe = require('stripe')(process.env.Publishable_key);
module.exports = stripe;
