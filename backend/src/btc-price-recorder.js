// Script to be run as a cron job
// GETs the latest bitcoin price and stores it
// purges old data or replaces with historical data

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

// Get the directory name properly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DB_FILE = path.join(__dirname, '../data/bitcoinprices.json');
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price';
const COINGECKO_HISTORICAL_API_URL = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart';
const COIN_ID = 'bitcoin';
const CURRENCIES = ['usd', 'eur', 'gbp'];
const RETENTION_HOURS = 24; // Keep data for 24 hours
const INTERVAL_MINUTES = 15; // 15-minute intervals for historical data

/**
 * Fetches current Bitcoin prices from CoinGecko API
 * @returns {Promise<Object>} Price data object
 */
async function fetchBitcoinPrices() {
  try {
    const response = await axios.get(COINGECKO_API_URL, {
      params: {
        ids: COIN_ID,
        vs_currencies: CURRENCIES.join(','),
        include_last_updated_at: true
      },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BTC Price Tracker/1.0'
      }
    });

    return response.data[COIN_ID];
  } catch (error) {
    console.error('Error fetching data from CoinGecko API:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Fetches historical Bitcoin prices for the last 24 hours from CoinGecko API
 * at 15-minute intervals and updates the database
 * @returns {Promise<void>}
 */
async function updateWithHistoricalData() {
  try {
    console.log(`Fetching historical Bitcoin prices for the last ${RETENTION_HOURS} hours at ${INTERVAL_MINUTES}-minute intervals...`);
    
    // Calculate timestamps (in seconds)
    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - (RETENTION_HOURS * 60 * 60);
    
    // Create a new database structure
    const db = { prices: [], last_updated: new Date().toISOString() };
    
    // We need to fetch each currency separately as the API doesn't support multiple vs_currencies for historical data
    const priceData = {};
    
    // Fetch historical data for each currency
    for (const currency of CURRENCIES) {
      console.log(`Fetching historical data for ${currency}...`);
      
      const response = await axios.get(COINGECKO_HISTORICAL_API_URL, {
        params: {
          vs_currency: currency,
          from: oneDayAgo,
          to: now,
          days: 1
        },
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BTC Price Tracker/1.0'
        }
      });
      
      // CoinGecko returns [timestamp, price] pairs
      // Store data by timestamp so we can merge currencies later
      response.data.prices.forEach(([timestamp, price]) => {
        // Create a standardized timestamp key (rounded to the nearest minute)
        const date = new Date(timestamp);
        const minutes = date.getMinutes();
        // Round to nearest INTERVAL_MINUTES
        const roundedMinutes = Math.round(minutes / INTERVAL_MINUTES) * INTERVAL_MINUTES;
        date.setMinutes(roundedMinutes, 0, 0);
        
        const timestampKey = date.getTime().toString();
        
        if (!priceData[timestampKey]) {
          priceData[timestampKey] = {
            timestamp: date.toISOString(),
            prices: {},
            last_updated_at: Math.floor(timestamp / 1000)
          };
        }
        
        priceData[timestampKey].prices[currency] = price;
      });
    }
    
    // Convert the structured data into an array and sort by timestamp
    const entries = Object.values(priceData)
      .filter(entry => {
        // Ensure each entry has all currencies
        return CURRENCIES.every(currency => entry.prices[currency] !== undefined);
      })
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Extract entries at approximately INTERVAL_MINUTES intervals
    const targetEntryCount = (RETENTION_HOURS * 60) / INTERVAL_MINUTES;
    const intervalEntries = [];
    
    // If we have more entries than needed intervals, sample them appropriately
    if (entries.length > targetEntryCount) {
      const step = entries.length / targetEntryCount;
      for (let i = 0; i < entries.length; i += step) {
        intervalEntries.push(entries[Math.floor(i)]);
        if (intervalEntries.length >= targetEntryCount) break;
      }
    } else {
      // Otherwise use all entries
      intervalEntries.push(...entries);
    }
    
    // Set the database prices
    db.prices = intervalEntries;
    
    // Ensure the data directory exists
    const dataDir = path.dirname(DB_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`Created data directory: ${dataDir}`);
    }
    
    // Save the database
    const data = JSON.stringify(db, null, 2);
    fs.writeFileSync(DB_FILE, data, 'utf8');
    
    console.log(`Database updated with ${db.prices.length} historical entries at approximately ${INTERVAL_MINUTES}-minute intervals`);
    console.log(`First entry: ${db.prices[0]?.timestamp}`);
    console.log(`Last entry: ${db.prices[db.prices.length - 1]?.timestamp}`);
    
    // Sample output for the last entry
    const lastEntry = db.prices[db.prices.length - 1];
    if (lastEntry) {
      console.log('Latest Bitcoin prices:');
      console.log(`USD: $${lastEntry.prices.usd}`);
      console.log(`EUR: €${lastEntry.prices.eur}`);
      console.log(`GBP: £${lastEntry.prices.gbp}`);
    }
  } catch (error) {
    console.error('Failed to update database with historical data:', error.message);
    throw error;
  }
}

/**
 * Loads existing database or creates a new one if it doesn't exist
 * @returns {Object} Database object
 */
function loadDatabase() {
  try {
    // Ensure the data directory exists
    const dataDir = path.dirname(DB_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`Created data directory: ${dataDir}`);
    }
    
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    } else {
      console.log(`Database file not found. Creating new database at ${DB_FILE}`);
      return { prices: [] };
    }
  } catch (error) {
    console.error('Error loading database:', error.message);
    return { prices: [] };
  }
}

/**
 * Saves data to the database file
 * @param {Object} db Database object
 */
function saveDatabase(db) {
  try {
    const data = JSON.stringify(db, null, 2);
    fs.writeFileSync(DB_FILE, data, 'utf8');
    console.log('Data successfully saved to database');
  } catch (error) {
    console.error('Error saving database:', error.message);
    throw error;
  }
}

/**
 * Purges entries older than the retention period
 * @param {Object} db Database object
 * @returns {Object} Purged database object
 */
function purgeOldData(db) {
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - RETENTION_HOURS * 60 * 60 * 1000);
  
  const originalCount = db.prices.length;
  db.prices = db.prices.filter(entry => {
    const entryDate = new Date(entry.timestamp);
    return entryDate >= cutoffTime;
  });
  
  const removedCount = originalCount - db.prices.length;
  if (removedCount > 0) {
    console.log(`Purged ${removedCount} entries older than ${RETENTION_HOURS} hours`);
  } else {
    console.log(`No entries older than ${RETENTION_HOURS} hours found`);
  }
  
  return db;
}

/**
 * Main function - fetches and stores the latest Bitcoin price data
 */
async function main() {
  try {
    console.log('Fetching latest Bitcoin prices...');
    
    // Fetch current prices
    const priceData = await fetchBitcoinPrices();
    
    // Create entry with timestamp
    const entry = {
      timestamp: new Date().toISOString(),
      prices: {
        usd: priceData.usd,
        eur: priceData.eur,
        gbp: priceData.gbp
      },
      last_updated_at: priceData.last_updated_at
    };
    
    // Load database
    let db = loadDatabase();
    
    // Add new entry
    db.prices.push(entry);
    
    // Purge old data
    db = purgeOldData(db);
    
    // Save updated database
    saveDatabase(db);
    
    console.log(`Bitcoin prices recorded at ${entry.timestamp}:`);
    console.log(`USD: $${entry.prices.usd}`);
    console.log(`EUR: €${entry.prices.eur}`);
    console.log(`GBP: £${entry.prices.gbp}`);
    console.log(`Database now contains ${db.prices.length} entries within the last ${RETENTION_HOURS} hours`);
  } catch (error) {
    console.error('Bitcoin price tracking failed:', error.message);
    process.exit(1);
  }
}

// Execute main function or updateWithHistoricalData function
// Uncomment the one you want to use
main();
//updateWithHistoricalData();