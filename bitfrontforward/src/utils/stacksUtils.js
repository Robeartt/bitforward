import { StacksTestnet } from '@stacks/network';
import { callReadOnlyFunction, cvToJSON } from '@stacks/transactions';
import { principalCV, contractPrincipalCV } from '@stacks/transactions';

const CONTRACT_ADDRESS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const CONTRACT_NAME = 'devnet';

export const fetchPositionData = async (address) => {
  try {
    const network = new StacksTestnet();
    
    // Read position data from contract
    const positionResponse = await callReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'get-position',
      functionArgs: [principalCV(address)],
      network,
    });

    const position = cvToJSON(positionResponse);

    // If no position exists, return null
    if (!position || position.value === null) {
      return null;
    }

    // Parse the position data
    return {
      owner: position.value.owner.value,
      amount: parseInt(position.value.amount.value),
      openPrice: parseInt(position.value.open_price.value),
      openBlock: parseInt(position.value.open_block.value),
      closingBlock: parseInt(position.value.closing_block.value),
      long: position.value.long.value,
      matched: position.value.matched?.value || null,
      settled: position.value.settled?.value || false
    };
  } catch (error) {
    console.error('Error fetching position data:', error);
    return null;
  }
};

export const fetchCurrentPrice = async () => {
  try {
    const network = new StacksTestnet();
    
    // Read current price from contract
    const priceResponse = await callReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'get-current-price',
      functionArgs: [],
      network,
    });

    const priceData = cvToJSON(priceResponse);
    return parseInt(priceData.value);
  } catch (error) {
    console.error('Error fetching current price:', error);
    return 0;
  }
};

export const getCurrentBlock = async () => {
  try {
    const response = await fetch('https://stacks-node-api.testnet.stacks.co/extended/v1/block');
    const data = await response.json();
    return data.height;
  } catch (error) {
    console.error('Error fetching current block:', error);
    return 0;
  }
};

export const calculatePositionStats = async (position, currentPrice) => {
  try {
    const currentBlock = await getCurrentBlock();
    
    // Calculate elapsed blocks
    const elapsed = currentBlock - position.openBlock;
    
    // Calculate gains
    let gains = 0;
    let gainsPercentage = 0;
    
    if (position.long) {
      // For long positions, gain when price goes up
      gains = ((currentPrice - position.openPrice) * position.amount) / position.openPrice;
      gainsPercentage = ((currentPrice - position.openPrice) / position.openPrice) * 100;
    } else {
      // For short positions, gain when price goes down
      gains = ((position.openPrice - currentPrice) * position.amount) / position.openPrice;
      gainsPercentage = ((position.openPrice - currentPrice) / position.openPrice) * 100;
    }

    return {
      gains,
      gainsPercentage,
      elapsed,
      remainingBlocks: position.closingBlock - currentBlock,
      isActive: currentBlock < position.closingBlock
    };
  } catch (error) {
    console.error('Error calculating position stats:', error);
    return {
      gains: 0,
      gainsPercentage: 0,
      elapsed: 0,
      remainingBlocks: 0,
      isActive: false
    };
  }
};

export const formatSTX = (amount) => {
  const stx = amount / 1000000; // Convert from micro-STX to STX
  return stx.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  });
};

export const fetchAllPositions = async (address) => {
  try {
    const network = new StacksTestnet();
    
    // Read all positions for an address
    const positionsResponse = await callReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'get-all-positions',
      functionArgs: [principalCV(address)],
      network,
    });

    const positions = cvToJSON(positionsResponse);
    
    if (!positions || !positions.value.length) {
      return [];
    }

    // Parse each position
    return positions.value.map(pos => ({
      owner: pos.value.owner.value,
      amount: parseInt(pos.value.amount.value),
      openPrice: parseInt(pos.value.open_price.value),
      openBlock: parseInt(pos.value.open_block.value),
      closingBlock: parseInt(pos.value.closing_block.value),
      long: pos.value.long.value,
      matched: pos.value.matched?.value || null,
      settled: pos.value.settled?.value || false
    }));
  } catch (error) {
    console.error('Error fetching all positions:', error);
    return [];
  }
};

export const watchTransaction = async (txId) => {
  try {
    const response = await fetch(
      `https://stacks-node-api.testnet.stacks.co/extended/v1/tx/${txId}`
    );
    const data = await response.json();
    return {
      status: data.tx_status,
      success: data.tx_status === 'success',
      blockHeight: data.block_height,
      burnBlockTime: data.burn_block_time,
    };
  } catch (error) {
    console.error('Error watching transaction:', error);
    return {
      status: 'error',
      success: false,
      blockHeight: 0,
      burnBlockTime: 0,
    };
  }
};

export const calculateProfitLoss = (position, currentPrice) => {
  if (!position || !currentPrice) return { profit: 0, profitPercentage: 0 };

  const initialValue = position.amount;
  let currentValue;

  if (position.long) {
    currentValue = (position.amount * currentPrice) / position.openPrice;
  } else {
    currentValue = (position.amount * (2 * position.openPrice - currentPrice)) / position.openPrice;
  }

  const profit = currentValue - initialValue;
  const profitPercentage = (profit / initialValue) * 100;

  return {
    profit,
    profitPercentage,
  };
};

export const estimateFees = async (amount) => {
  try {
    // Estimate fees based on current network conditions
    const response = await fetch('https://stacks-node-api.testnet.stacks.co/v2/fees/transfer');
    const feeEstimate = await response.json();
    
    // Calculate fee based on transaction size and amount
    const baseFee = parseInt(feeEstimate.estimated_cost);
    const scaledFee = Math.ceil(baseFee * (1 + (amount / 1000000) * 0.001)); // Scale fee with transaction size
    
    return scaledFee;
  } catch (error) {
    console.error('Error estimating fees:', error);
    return 0;
  }
};