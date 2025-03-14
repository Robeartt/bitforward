import { NETWORK } from './config.js';

class BlockHeightCache {
  constructor(ttlSeconds = 10) {
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
    if (blockHeightCache.isValid()) {
      return blockHeightCache.height;
    }

    const networkUrl = "https://stacks-node-api.testnet.stacks.co";
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

      // Get current positions from storage
      const positions = this.storage.getPositions();

      // Filter positions that need to be closed
      const positionsToClose = positions.filter(
        position => position.closingBlock <= currentBlock
      );

      if (positionsToClose.length === 0) return;

      console.log(`Found ${positionsToClose.length} positions to close at block ${currentBlock}`);

      // Get current price before processing any positions
      let closePrice;
      try {
        closePrice = await this.contract.getPrice();
        console.log(`Current price for closing positions: ${closePrice}`);
      } catch (error) {
        console.error('Error getting close price:', error);
        return; // Don't proceed if we can't get the price
      }

      // Create a set to track which positions have been processed
      const processedAddresses = new Set();
      
      // Update positions array by removing closed positions
      const updatedPositions = positions.filter(
        position => position.closingBlock > currentBlock
      );
      
      // Close positions and update history
      for (const position of positionsToClose) {
        // Skip if we've already processed this position (as part of a matched pair)
        if (processedAddresses.has(position.address)) {
          continue;
        }

        try {
          console.log(`Attempting to close position for ${position.address}`);
          const closeResult = await this.contract.closePosition(position.address);

          // Add to history with additional metadata
          const historyEntry = {
            ...position,
            closedAt: Date.now(),
            closedAtBlock: currentBlock,
            closeTransaction: closeResult,
            closePrice: closePrice,
            status: 'closed'
          };
          
          this.storage.addToHistory(historyEntry);
          processedAddresses.add(position.address);

          // If this position had a match, add it to history without trying to close it
          if (position.matched) {
            const matchedPosition = positionsToClose.find(p => p.address === position.matched);
            if (matchedPosition) {
              const matchedHistoryEntry = {
                ...matchedPosition,
                closedAt: Date.now(),
                closedAtBlock: currentBlock,
                closeTransaction: closeResult, // Same transaction as it's closed together
                closePrice: closePrice,
                status: 'closed'
              };
              this.storage.addToHistory(matchedHistoryEntry);
              processedAddresses.add(matchedPosition.address);
            }
          }
          
          console.log(`Successfully closed position for ${position.address}`);
          hasChanges = true;
        } catch (error) {
          console.error(`Failed to close position for ${position.address}:`, error);
          // Add the position back if closing failed
          updatedPositions.push(position);
          // If this was a matched position, add back the match as well
          if (position.matched) {
            const matchedPosition = positionsToClose.find(p => p.address === position.matched);
            if (matchedPosition) {
              updatedPositions.push(matchedPosition);
            }
          }
        }
      }

      // Update storage with remaining positions
      this.storage.setPositions(updatedPositions);

      if (hasChanges) {
        await this.storage.persist();
      }
    } catch (error) {
      console.error('Error in position monitoring:', error);
    }
  }

  start(intervalSeconds = 15) {
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