require('dotenv').config();
const { Client, PrivateKey } = require('@hashgraph/sdk');

const client = Client.forTestnet(); // Use .forMainnet() if on mainnet

const accountId = process.env.HEDERA_ACCOUNT_ID;
const privateKeyStr = process.env.HEDERA_PRIVATE_KEY;

if (!accountId || !privateKeyStr) {
  throw new Error('Hedera credentials must be set in .env');
}

// Parse the private key using PrivateKey
const privateKey = PrivateKey.fromString(privateKeyStr);

// Set the operator
client.setOperator(accountId, privateKey);

module.exports = { client };