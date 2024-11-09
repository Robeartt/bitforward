import txPkg from '@stacks/transactions';
const {
  contractPrincipalCV,
  uintCV,
  callReadOnlyFunction,
  makeContractCall,
  AnchorMode,
  PostConditionMode,
  broadcastTransaction,
  makeSTXPostCondition,
  FungibleConditionCode,
} = txPkg;
  
  import { CONTRACT_ADDRESS, CONTRACT_NAME, NETWORK, CONTRACT_OWNER_KEY } from './config.js';
  
  export class BitForwardContract {
    constructor() {
      this.contractAddress = CONTRACT_ADDRESS;
      this.contractName = CONTRACT_NAME;
      this.network = NETWORK;
    }
  
    async getPosition(address) {
      const functionName = 'get-position';
      try {
        const response = await callReadOnlyFunction({
          contractAddress: this.contractAddress,
          contractName: this.contractName,
          functionName,
          functionArgs: [contractPrincipalCV(address)],
          network: this.network,
        });
        return response;
      } catch (error) {
        console.error('Error getting position:', error);
        throw error;
      }
    }
  
    async setPrice(newPrice) {
      if (!CONTRACT_OWNER_KEY) {
        throw new Error('Contract owner private key not configured');
      }
  
      const functionName = 'set-price';
      try {
        const transaction = await makeContractCall({
          contractAddress: this.contractAddress,
          contractName: this.contractName,
          functionName,
          functionArgs: [uintCV(newPrice)],
          senderKey: CONTRACT_OWNER_KEY,
          network: this.network,
          anchorMode: AnchorMode.ANY,
          postConditionMode: PostConditionMode.Allow,
        });
  
        const broadcastResponse = await broadcastTransaction(transaction, this.network);
        return broadcastResponse;
      } catch (error) {
        console.error('Error setting price:', error);
        throw error;
      }
    }
  
    async closePosition(positionAddress, senderKey) {
      const functionName = 'close-position';
      try {
        const transaction = await makeContractCall({
          contractAddress: this.contractAddress,
          contractName: this.contractName,
          functionName,
          functionArgs: [contractPrincipalCV(positionAddress)],
          senderKey,
          network: this.network,
          anchorMode: AnchorMode.ANY,
          postConditionMode: PostConditionMode.Allow,
        });
  
        const broadcastResponse = await broadcastTransaction(transaction, this.network);
        return broadcastResponse;
      } catch (error) {
        console.error('Error closing position:', error);
        throw error;
      }
    }
  }