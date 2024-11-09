import { StacksMocknet } from "@stacks/network";
import { callReadOnlyFunction, cvToValue } from "@stacks/transactions";

const network = new StacksMocknet();
const contractAddress = "YOUR_CONTRACT_ADDRESS"; // Replace with your contract address
const contractName = "bitforward";

export async function fetchPositionData(userAddress) {
  try {
    const position = await callReadOnlyFunction({
      contractAddress,
      contractName,
      functionName: 'get-position',
      functionArgs: [userAddress],
      network,
    });

    return cvToValue(position);
  } catch (error) {
    console.error('Error fetching position:', error);
    throw error;
  }
}

export async function fetchCurrentPrice() {
  try {
    const price = await callReadOnlyFunction({
      contractAddress,
      contractName,
      functionName: 'get-price',
      functionArgs: [],
      network,
    });

    return cvToValue(price);
  } catch (error) {
    console.error('Error fetching price:', error);
    throw error;
  }
}

export function calculatePositionStats(position, currentPrice) {
  const openPrice = position.open_price;
  const amount = position.amount;
  const isLong = position.long;
  
  // Calculate gains/losses
  const priceDiff = isLong ? 
    currentPrice - openPrice : 
    openPrice - currentPrice;
  
  const gains = (priceDiff * amount) / openPrice;
  const gainsPercentage = (priceDiff * 100) / openPrice;

  return {
    gains,
    gainsPercentage,
    elapsed: calculateElapsedBlocks(position.open_block),
    remainingBlocks: position.closing_block - position.open_block,
  };
}

function calculateElapsedBlocks(openBlock) {
  // You might want to fetch current block height here
  const currentBlock = 'CURRENT_BLOCK_HEIGHT'; // Need to implement
  return currentBlock - openBlock;
}

export function formatSTX(amount) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount / 1000000); // Convert microSTX to STX
}