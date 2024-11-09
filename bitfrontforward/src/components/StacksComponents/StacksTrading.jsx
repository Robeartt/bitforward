import { useState } from 'react';
import { useStacks } from '../../context/StacksContext';

export function StacksTrading({ tradingPair, amount, price }) {
  const { stacksUser } = useStacks();

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Trade with Stacks</h2>
      
      {stacksUser ? (
        <div className="space-y-4">
          <div className="flex gap-4">
            <button
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Buy with STX
            </button>
            <button
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Sell with STX
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-400">Connect your Stacks wallet to trade</p>
      )}
    </div>
  );
}