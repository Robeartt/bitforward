// services/positionService.js
import { openContractCall } from '@stacks/connect';
import { uintCV } from '@stacks/transactions/dist/clarity';
import { 
  fetchPositionData, 
  fetchCurrentPrice, 
  calculatePositionStats 
} from '../utils/stacksUtils';

class PositionService {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  // Fetch positions from both Stacks and our backend
  async getAllPositions(stacksAddress) {
    try {
      // Fetch from Stacks
      const stacksPositions = await fetchAllPositions(stacksAddress);
      
      // Fetch from our backend
      const response = await fetch(`${this.baseUrl}/positions`);
      const backendPositions = await response.json();
      
      // Merge positions and remove duplicates based on unique identifiers
      const mergedPositions = [...stacksPositions, ...backendPositions].reduce((acc, position) => {
        const key = position.address + position.openBlock;
        acc[key] = position;
        return acc;
      }, {});

      return Object.values(mergedPositions);
    } catch (error) {
      console.error('Error fetching all positions:', error);
      throw error;
    }
  }

  // Create position in both Stacks and our backend
  async createPosition(stacksUser, stacksNetwork, amount, closeAt) {
    try {
      const amountInMicroSTX = Number(amount) * 1000000;
      
      // First, create position in Stacks
      const options = {
        contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
        contractName: "bitforward",
        functionName: "open-position",
        functionArgs: [
          uintCV(amountInMicroSTX),
          uintCV(Number(closeAt))
        ],
        network: stacksNetwork,
        postConditions: [],
      };

      const txResult = await openContractCall(options);

      // Then, create position in our backend
      const response = await fetch(`${this.baseUrl}/position/new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: stacksUser.profile.stxAddress.testnet,
          amount: amountInMicroSTX,
          closingBlock: closeAt,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create position in backend');
      }

      return txResult;
    } catch (error) {
      console.error('Error creating position:', error);
      throw error;
    }
  }

  // Set price in both systems
  async setPrice(price, contract) {
    try {
      // Set price in backend
      const response = await fetch(`${this.baseUrl}/price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ price }),
      });

      if (!response.ok) {
        throw new Error('Failed to set price in backend');
      }

      // Set price in Stacks (assuming you have a contract method for this)
      const stacksPrice = await contract.setPrice(price);

      return {
        backendTxId: await response.json(),
        stacksTxId: stacksPrice,
      };
    } catch (error) {
      console.error('Error setting price:', error);
      throw error;
    }
  }

  // Get position history
  async getPositionHistory() {
    try {
      const response = await fetch(`${this.baseUrl}/positions/history`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching position history:', error);
      throw error;
    }
  }
}

export const positionService = new PositionService();