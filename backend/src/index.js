import express from 'express';
import cors from 'cors';
import { BitForwardContract } from './contract.js';
import { storage } from './storage.js';
import { PositionMonitor } from './monitor.js';
import { createRoutes } from './routes.js';

const app = express();

app.use(cors());
app.use(express.json());

const bitForward = new BitForwardContract();
const monitor = new PositionMonitor(storage, bitForward);

app.use('/api', createRoutes(storage, bitForward));

const PERSIST_INTERVAL = 5 * 60 * 1000; // 5 minutes
setInterval(() => storage.persist(), PERSIST_INTERVAL);

async function handleShutdown() {
  console.log('Shutting down, persisting data...');
  monitor.stop();
  try {
    await storage.persist();
    process.exit(0);
  } catch (error) {
    console.error('Error persisting data during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

// Initialize the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Network: ${process.env.NETWORK}`);
  console.log(`Contract Address: ${process.env.CONTRACT_ADDRESS}`);
  
  await storage.initialize();
  monitor.start();
});