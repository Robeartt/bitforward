import { useState } from 'react';
import { useStacks } from '../../context/StacksContext';

export default function PriceSetter({ onPriceSet }) {
  const { stacksUser, stacksNetwork } = useStacks();
  const [price, setPrice] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSetPrice = async () => {

    if (Number(price) <= 0) {
        alert('Price must be greater than 0');
        return;
    }

    setIsSubmitting(true);

    const priceInMicroSTX = Number(price) * 1000000;
        
    // Call the backend API first
    try {
      const response = await fetch('http://localhost:3001/api/price', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ price: priceInMicroSTX })
      });
      
      if (!response.ok) {
          console.log(response);
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update price');
      }
  } catch (error) {
      console.error('Backend update failed:', error);
      //alert('Failed to update price in backend. Please try again.');
  } finally {
      setIsSubmitting(false);
  }
};

  // If user is not contract owner, don't show the price setter
  if (!stacksUser) {
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
              disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </div>
            <button
              onClick={handleSetPrice}
              disabled={!price || Number(price) <= 0 || isSubmitting}
              className={`w-full px-4 py-2 rounded ${
                price && Number(price) > 0 && !isSubmitting
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              } flex items-center justify-center`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                'Set Price'
              )}
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
          disabled={isSubmitting}
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