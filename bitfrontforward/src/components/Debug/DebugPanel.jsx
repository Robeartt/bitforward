import React, { useState } from 'react';
import { useStacks } from '../../context/StacksContext';
import { openContractCall } from "@stacks/connect";
import { uintCV } from "@stacks/transactions";

export default function DebugPanel() {
  const { stacksUser, stacksNetwork } = useStacks();
  const [amount, setAmount] = useState('');
  const [closeAt, setCloseAt] = useState('');
  const [price, setPrice] = useState('');

  const handleOpenPosition = async () => {
    try {
      const amountInMicroSTX = Number(amount) * 1000000; // Convert STX to microSTX
      
      const options = {
        contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
        contractName: "bitforward",
        functionName: "open-position",
        functionArgs: [
          uintCV(amountInMicroSTX),
          uintCV(Number(closeAt))
        ],
        network: stacksNetwork,
        appDetails: {
          name: "BitForward Debug",
          icon: "https://placeholder.com/icon.png",
        },
        onFinish: ({ txId }) => {
          console.log("Transaction:", txId);
        },
      };

      await openContractCall(options);
    } catch (error) {
      console.error("Error opening position:", error);
    }
  };

  const handleSetPrice = async () => {
    try {
      const priceInMicroSTX = Number(price) * 1000000; // Convert STX to microSTX
      
      const options = {
        contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
        contractName: "bitforward",
        functionName: "set-price",
        functionArgs: [uintCV(priceInMicroSTX)],
        network: stacksNetwork,
        appDetails: {
          name: "BitForward Debug",
          icon: "https://placeholder.com/icon.png",
        },
        onFinish: ({ txId }) => {
          console.log("Price set transaction:", txId);
        },
      };

      await openContractCall(options);
    } catch (error) {
      console.error("Error setting price:", error);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 p-4 border-t border-gray-800">
      <div className="max-w-4xl mx-auto">
        <h3 className="text-white text-lg mb-4">Debug Panel</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-gray-400 mb-2">Open Position</p>
            <input
              type="number"
              placeholder="Amount in STX"
              className="w-full p-2 rounded bg-gray-800 text-white mb-2"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input
              type="number"
              placeholder="Close at block"
              className="w-full p-2 rounded bg-gray-800 text-white mb-2"
              value={closeAt}
              onChange={(e) => setCloseAt(e.target.value)}
            />
            <button
              onClick={handleOpenPosition}
              className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Open Position
            </button>
          </div>

          <div>
            <p className="text-gray-400 mb-2">Set Price</p>
            <input
              type="number"
              placeholder="Price in STX"
              className="w-full p-2 rounded bg-gray-800 text-white mb-2"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <button
              onClick={handleSetPrice}
              className="w-full p-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Set Price
            </button>
          </div>

          <div>
            <p className="text-gray-400 mb-2">Current Connection</p>
            <div className="text-white">
              {stacksUser ? (
                <>
                  <p>Connected Address:</p>
                  <p className="text-sm text-gray-400">{stacksUser.profile.stxAddress.testnet}</p>
                </>
              ) : (
                <p>Not connected</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}