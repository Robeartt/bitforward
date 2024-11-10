import { useState } from 'react';
import { boolCV, uintCV } from '@stacks/transactions/dist/clarity';
import { makeStandardSTXPostCondition, FungibleConditionCode } from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';
import PriceSetter from './PriceSetter';
import { useStacks } from '../../context/StacksContext';

export default function Overview() {
  const { stacksUser, stacksNetwork } = useStacks();
  const [showCreatePosition, setShowCreatePosition] = useState(false);
  const [amount, setAmount] = useState('');
  const [closeAt, setCloseAt] = useState('');
  const [positionType, setPositionType] = useState('long');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionId, setTransactionId] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(0);

  const handleCreatePosition = async () => {
    if (!stacksUser) {
      alert('Please connect your wallet first');
      return;
    }

    if (!amount || !closeAt) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setIsSubmitting(true);

      const amountInMicroSTX = Number(amount) * 1000000;
      
      if (amountInMicroSTX <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      if (Number(closeAt) <= 0) {
        throw new Error('Invalid closing block height');
      }

      const postConditions = [
        makeStandardSTXPostCondition(
          stacksUser.profile.stxAddress.testnet,
          FungibleConditionCode.Greater,
          0
        )
      ];

      const options = {
        contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
        contractName: "bitforward",
        functionName: "open-position",
        functionArgs: [
          uintCV(amountInMicroSTX),
          uintCV(Number(closeAt)),
          boolCV(positionType === 'long')
        ],
        network: stacksNetwork,
        postConditions,
        onFinish: async ({ txId }) => {
          console.log('Transaction:', txId);
          setTransactionId(txId);
          
          try {
            setShowCreatePosition(false);
            setAmount('');
            setCloseAt('');
            setPositionType('long');
          
            try {
              const response = await fetch('http://localhost:3001/api/position/new', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ address: stacksUser.profile.stxAddress.testnet }),
              });

              console.log('send!')
          
              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
              }
          
              const data = await response.json();
              return data;
            } catch (error) {
              console.error('Error fetching new position:', error);
              throw error;
            }
          } catch (error) {
            console.error('Error refreshing positions:', error);
          }
        },
        onCancel: () => {
          console.log('Transaction canceled by user');
          setIsSubmitting(false);
        }
      };

      await openContractCall(options);
    } catch (error) {
      console.error('Error creating position:', error);
      alert('Failed to create position: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!stacksUser) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <h3 className="text-xl font-semibold mb-4">Welcome to BitForward</h3>
          <p className="text-gray-400 text-center">
            Connect your Stacks wallet to view and create positions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create New Position Section */}
      <div className="bg-gray-900 rounded-lg shadow-lg overflow-hidden relative">
        <button
          onClick={() => setShowCreatePosition(!showCreatePosition)}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-6 w-6 transform transition-transform ${showCreatePosition ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
            <h2 className="text-lg font-bold">Create New Position</h2>
          </div>
          <div className="text-sm text-gray-400">
            {showCreatePosition ? 'Click to collapse' : 'Click to expand'}
          </div>
        </button>

        {showCreatePosition && (
          <div className="p-6 bg-gray-900">
            <div className="max-w-2xl mx-auto">
              {/* Position Type Selection */}
              <div className="mb-8">
                <label className="block text-gray-400 mb-3 text-lg">Position Type</label>
                <div className="flex gap-8 justify-center">
                  <label className="flex items-center space-x-3 cursor-pointer bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors">
                    <input
                      type="radio"
                      value="long"
                      checked={positionType === 'long'}
                      onChange={(e) => setPositionType(e.target.value)}
                      className="form-radio h-5 w-5 text-green-500"
                      disabled={isSubmitting}
                    />
                    <div>
                      <span className="text-white text-lg ml-2">Long</span>
                      <p className="text-gray-400 text-sm mt-1">Profit from price increases</p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors">
                    <input
                      type="radio"
                      value="hedge"
                      checked={positionType === 'hedge'}
                      onChange={(e) => setPositionType(e.target.value)}
                      className="form-radio h-5 w-5 text-blue-500"
                      disabled={isSubmitting}
                    />
                    <div>
                      <span className="text-white text-lg ml-2">Hedge</span>
                      <p className="text-gray-400 text-sm mt-1">Protect against price decreases</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Amount and Block Height */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-gray-400 mb-2 text-lg">Amount (STX)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-lg"
                    placeholder="Enter amount"
                    disabled={isSubmitting}
                  />
                  <p className="text-gray-500 text-sm mt-1">Position size in STX</p>
                </div>

                <div>
                  <label className="block text-gray-400 mb-2 text-lg">Close at Block Height</label>
                  <input
                    type="number"
                    value={closeAt}
                    onChange={(e) => setCloseAt(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-lg"
                    placeholder="Enter block height"
                    disabled={isSubmitting}
                  />
                  <p className="text-gray-500 text-sm mt-1">Position will auto-close at this block</p>
                </div>
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreatePosition}
                disabled={isSubmitting || !amount || !closeAt}
                className={`w-full ${
                  isSubmitting || !amount || !closeAt
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white px-6 py-4 rounded-lg transition-colors flex items-center justify-center text-lg font-medium`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  'Create Position'
                )}
              </button>
            </div>
          </div>
        )}

        {/* PriceSetter */}
        <div className="absolute bottom-6 right-6">
          <PriceSetter 
            currentPrice={currentPrice}
            onPriceSet={(newPrice) => {
              setCurrentPrice(newPrice);
            }}
          />
        </div>
      </div>
    </div>
  );
}