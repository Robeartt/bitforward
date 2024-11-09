import express from 'express';
import { BitForwardContract } from './contract.js';

const app = express();
app.use(express.json());

const bitForward = new BitForwardContract();

// Get position for an address
app.get('/api/position/:address', async (req, res) => {
  try {
    const position = await bitForward.getPosition(req.params.address);
    res.json({ position });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set price (contract owner only)
app.post('/api/price', async (req, res) => {
  try {
    const { price } = req.body;
    if (!price) {
      return res.status(400).json({ error: 'Price is required' });
    }
    const result = await bitForward.setPrice(price);
    res.json({ txId: result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Close position
app.post('/api/position/close', async (req, res) => {
  try {
    const { positionAddress, senderKey } = req.body;
    if (!positionAddress || !senderKey) {
      return res.status(400).json({ error: 'Position address and sender key are required' });
    }
    const result = await bitForward.closePosition(positionAddress, senderKey);
    res.json({ txId: result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Network: ${process.env.NETWORK}`);
  console.log(`Contract Address: ${process.env.CONTRACT_ADDRESS}`);
});