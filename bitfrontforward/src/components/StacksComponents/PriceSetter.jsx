import { useState } from 'react';
import { useStacks } from '../../context/StacksContext';
import { openContractCall } from '@stacks/connect';
import { uintCV } from '@stacks/transactions';

export default function PriceSetter() {
  const { stacksUser, stacksNetwork } = useStacks();
  const [price, setPrice] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Contract owner address should match the one that deployed the contract
  const CONTRACT_ADDRESS = 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5';
  const CONTRACT_NAME = 'bitforward';
  const CONTRACT_OWNER = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Set this to your contract owner address

  const handleSetPrice = async () => {
    if (!stacksUser) {
      alert('Please connect your wallet first');
      return;
    }

    // Check if the connected user is the contract owner
    if (stacksUser.profile.stxAddress.testnet !== CONTRACT_OWNER) {
      alert('Only contract owner can set price');
      return;
    }

    // Validate price is greater than 0 (matching err-no-value check)
    if (Number(price) <= 0) {
      alert('Price must be greater than 0');
      return;
    }

    try {
      const priceInMicroSTX = Number(price) * 1000000; // Convert STX to microSTX
      
      const options = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: "set-price",
        functionArgs: [
          uintCV(priceInMicroSTX)
        ],
        network: stacksNetwork,
        onFinish: ({ txId }) => {
          console.log('Price set transaction:', txId);
          alert('Price update initiated! Transaction ID: ' + txId);
          setPrice('');
          setIsOpen(false);
        },
      };

      await openContractCall(options);
    } catch (error) {
      console.error('Error setting price:', error);
      if (error.message.includes('err-owner-only')) {
        alert('Only contract owner can set price');
      } else if (error.message.includes('err-no-value')) {
        alert('Price must be greater than 0');
      } else {
        alert('Failed to set price: ' + error.message);
      }
    }
  };

  // If user is not contract owner, don't show the price setter
  if (!stacksUser || stacksUser.profile.stxAddress.testnet !== CONTRACT_OWNER) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4">
      {isOpen ? (
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg w-64">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold">Set Price (Admin Only)</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">
                New Price (STX)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="0.000001"
                step="0.000001"
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                placeholder="Enter price in STX"
              />
            </div>
            <button
              onClick={handleSetPrice}
              disabled={!price || Number(price) <= 0}
              className={`w-full px-4 py-2 rounded ${
                price && Number(price) > 0
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              Set Price
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Current wallet: {stacksUser.profile.stxAddress.testnet.slice(0, 6)}...{stacksUser.profile.stxAddress.testnet.slice(-4)}
          </p>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white rounded-full p-3 shadow-lg flex items-center space-x-2"
          title="Set Price (Admin Only)"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
      )}
    </div>
  );
}