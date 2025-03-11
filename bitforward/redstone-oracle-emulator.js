// Redstone Oracle Emulator for Stacks
const { StacksTestnet, StacksMainnet } = require('@stacks/network');
const { makeContractCall, broadcastTransaction, bufferCV, stringAsciiCV, uintCV, standardPrincipalCV } = require('@stacks/transactions');
const BN = require('bn.js');
const axios = require('axios');
const BigNumber = require('bignumber.js');

// Configuration
const PRIVATE_KEY = 'your_private_key_here'; // Replace with oracle provider's private key
const CONTRACT_ADDRESS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Replace with contract address
const CONTRACT_NAME = 'bitforward'; // Replace with deployed contract name
const STACKS_API_URL = 'http://localhost:20443'; // Your local devnet API URL

// Supported currencies
const CURRENCIES = ['USD', 'CAD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD'];

// Function to fetch Bitcoin price from external API (e.g., CoinGecko)
async function fetchBitcoinPrices() {
  try {
    // Using CoinGecko's API for demonstration
    // powershell script:
    // Invoke-RestMethod -Uri "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur" -Method Get

    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'bitcoin',
        vs_currencies: CURRENCIES.map(c => c.toLowerCase()).join(',')
      }
    });
    
    const prices = {};
    for (const currency of CURRENCIES) {
      // Convert to Clarity's fixed-point format (6 decimal places)
      const price = new BigNumber(response.data.bitcoin[currency.toLowerCase()]);
      prices[currency] = price.times(1000000).integerValue().toString();
    }
    
    return prices;
  } catch (error) {
    console.error('Error fetching Bitcoin prices:', error);
    // Use fallback prices for testing if API fails
    // Approximate prices at 3/11/2025
    return {
      USD: '89000000000',
      CAD: '128000000000',
      EUR: '81000000000',
      GBP: '68000000000',
      JPY: '13183974700000',
      CNY: '644000000000',
      AUD: '141000000000',
    };
  }
}

// Function to update prices on the contract
async function updatePrices(prices) {
  const network = new StacksTestnet();
  network.coreApiUrl = STACKS_API_URL;
  
  for (const [currency, price] of Object.entries(prices)) {
    const txOptions = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'update-price-feed',
      functionArgs: [
        stringAsciiCV(currency),
        uintCV(price)
      ],
      senderKey: PRIVATE_KEY,
      validateWithAbi: true,
      network,
      anchorMode: 1, // Any mode
      fee: new BN(10000), // Adjust according to your network
    };
    
    try {
      const transaction = await makeContractCall(txOptions);
      const broadcastResponse = await broadcastTransaction(transaction, network);
      console.log(`Updated ${currency} price to ${BigNumber(price).dividedBy(1000000).toFixed(2)}`);
      console.log('Transaction ID:', broadcastResponse.txid);
    } catch (error) {
      console.error(`Error updating ${currency} price:`, error);
    }
  }
}

// Function to initialize supported currencies (run this only once after contract deployment)
async function initializeCurrencies() {
  const network = new StacksTestnet();
  network.coreApiUrl = STACKS_API_URL;
  
  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'initialize-currencies',
    functionArgs: [],
    senderKey: PRIVATE_KEY,
    validateWithAbi: true,
    network,
    anchorMode: 1,
    fee: new BN(10000),
  };
  
  try {
    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);
    console.log('Currencies initialized');
    console.log('Transaction ID:', broadcastResponse.txid);
  } catch (error) {
    console.error('Error initializing currencies:', error);
  }
}

// Main function to run the oracle emulator
async function runOracleEmulator(intervalMinutes = 5) {
  console.log('Starting Redstone Oracle Emulator for Stacks');
  console.log(`Updating prices every ${intervalMinutes} minutes`);
  
  // Initialize currencies first
  await initializeCurrencies();
  
  // Initial price update
  const prices = await fetchBitcoinPrices();
  await updatePrices(prices);
  
  // Schedule regular updates
  setInterval(async () => {
    const prices = await fetchBitcoinPrices();
    await updatePrices(prices);
  }, intervalMinutes * 60 * 1000);
}

// Start the emulator if this file is run directly
if (require.main === module) {
  runOracleEmulator();
}

module.exports = {
  fetchBitcoinPrices,
  updatePrices,
  initializeCurrencies,
  runOracleEmulator
};