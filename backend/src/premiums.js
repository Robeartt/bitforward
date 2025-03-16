// simple-volatility-calculator.js
// A simple function to calculate Bitcoin price volatility over a fixed 24-hour period

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name properly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Bitcoin price database
const DB_FILE = path.join(__dirname, '../data/bitcoinprices.json');

// Fixed time window for volatility calculation (24 hours)
const VOLATILITY_HOURS = 24;

/**
 * Calculates Bitcoin price volatility for a specific currency over a 24-hour period
 * 
 * @param {String} currency Currency code ('usd', 'eur', or 'gbp')
 * @returns {Number|null} Daily volatility as a percentage, or null if calculation fails
 */
function calculateVolatility(currency) {
  try {
    // Validate currency
    const validCurrencies = ['usd', 'eur', 'gbp'];
    currency = currency.toLowerCase();

    if (!validCurrencies.includes(currency)) {
      console.error(`Invalid currency: ${currency}. Supported currencies are: ${validCurrencies.join(', ')}`);
      return null;
    }

    // Load database
    if (!fs.existsSync(DB_FILE)) {
      console.error(`Database file not found at ${DB_FILE}`);
      return null;
    }

    const data = fs.readFileSync(DB_FILE, 'utf8');
    const db = JSON.parse(data);

    if (!db.prices || db.prices.length < 2) {
      console.error('Insufficient price data for volatility calculation');
      return null;
    }

    // Get data for the 24-hour period
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - VOLATILITY_HOURS * 60 * 60 * 1000);

    const recentPrices = db.prices
      .filter(entry => new Date(entry.timestamp) >= cutoffTime)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map(entry => entry.prices[currency]);

    if (recentPrices.length < 2) {
      console.error(`Not enough data points in the last ${VOLATILITY_HOURS} hours to calculate volatility`);
      return null;
    }

    // Calculate percentage changes between consecutive prices
    const priceChanges = [];
    for (let i = 1; i < recentPrices.length; i++) {
      const previousPrice = recentPrices[i - 1];
      const currentPrice = recentPrices[i];
      const percentageChange = ((currentPrice - previousPrice) / previousPrice) * 100;
      priceChanges.push(percentageChange);
    }

    // Calculate standard deviation of percentage changes
    const mean = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    const squaredDiffs = priceChanges.map(change => Math.pow(change - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / squaredDiffs.length;
    const stdDev = Math.sqrt(variance);

    // Calculate daily volatility (no need to annualize)
    const timePerSample = VOLATILITY_HOURS / recentPrices.length;
    const samplesPerDay = 24 / timePerSample;
    const dailyVolatility = stdDev * Math.sqrt(samplesPerDay);

    return parseFloat(dailyVolatility.toFixed(2));
  } catch (error) {
    console.error('Error calculating volatility:', error.message);
    return null;
  }
}

console.log(calculateVolatility("usd"));

export default calculateVolatility;