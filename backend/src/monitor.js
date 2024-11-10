import { NETWORK } from './config.js';

class BlockHeightCache {
  constructor(ttlSeconds = 10) { // Reduced to 10 seconds for 1-minute blocks
    this.height = null;
    this.lastUpdate = null;
    this.ttlSeconds = ttlSeconds;
  }

  isValid() {
    if (!this.height || !this.lastUpdate) return false;
    const age = (Date.now() - this.lastUpdate) / 1000;
    return age < this.ttlSeconds;
  }

  update(height) {
    this.height = height;
    this.lastUpdate = Date.now();
  }
}

const blockHeightCache = new BlockHeightCache();

export async function getCurrentBlockHeight() {
  try {
    // Return cached value if valid
    if (blockHeightCache.isValid()) {
      return blockHeightCache.height;
    }

    const networkUrl = NETWORK.url;
    const infoUrl = `${networkUrl}/v2/info`;
    
    const response = await fetch(infoUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    blockHeightCache.update(data.stacks_tip_height);
    return data.stacks_tip_height;
  } catch (error) {
    console.error('Error fetching block height:', error);
    // If we have a cached value, return it even if expired
    if (blockHeightCache.height !== null) {
      console.log('Using expired cached block height due to error');
      return blockHeightCache.height;
    }
    throw error;
  }
}

export class PositionMonitor {
  constructor(storage, contract) {
    this.storage = storage;
    this.contract = contract;
    this.interval = null;
    this.lastCheckedBlock = null;
  }

  async checkAndClosePositions() {
    try {
      const currentBlock = await getCurrentBlockHeight();
      
      // Skip if we've already checked this block
      if (this.lastCheckedBlock === currentBlock) {
        return;
      }
      
      this.lastCheckedBlock = currentBlock;
      let hasChanges = false;

      // Filter positions that need to be closed
      const positionsToClose = this.storage.positions.filter(
        position => position.position.closing_block <= currentBlock
      );

      if (positionsToClose.length === 0) return;

      console.log(`Found ${positionsToClose.length} positions to close at block ${currentBlock}`);

      // Update positions array
      this.storage.positions = this.storage.positions.filter(
        position => position.position.closing_block > currentBlock
      );

      // Close positions and update history
      for (const position of positionsToClose) {
        try {
          console.log(`Attempting to close position for ${position.address}`);
          const closeResult = await this.contract.closePosition(
            position.address,
            process.env.CONTRACT_OWNER_KEY
          );

          this.storage.addToHistory({
            ...position,
            closedAt: Date.now(),
            closedAtBlock: currentBlock,
            closeTransaction: closeResult,
          });
          
          console.log(`Successfully closed position for ${position.address}`);
          hasChanges = true;
        } catch (error) {
          console.error(`Failed to close position for ${position.address}:`, error);
          // Add back to positions if closing failed
          this.storage.addPosition(position);
        }
      }

      if (hasChanges) {
        this.storage.isDirty = true;
        await this.storage.persist();
      }
    } catch (error) {
      console.error('Error in position monitoring:', error);
    }
  }

  start(intervalSeconds = 15) { // Check every 15 seconds for 1-minute blocks
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.interval = setInterval(() => this.checkAndClosePositions(), intervalSeconds * 1000);
    console.log(`Position monitor started, checking every ${intervalSeconds} seconds`);
    
    // Do an immediate check when starting
    this.checkAndClosePositions();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('Position monitor stopped');
    }
  }
}