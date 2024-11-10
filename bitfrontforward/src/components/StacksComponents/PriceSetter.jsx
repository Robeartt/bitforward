import { useState } from 'react';
import { useStacks } from '../../context/StacksContext';

export default function PriceSetter({ onPriceSet }) {
  const { stacksUser, stacksNetwork } = useStacks();
  const [price, setPrice] = useState('');
  const [premium, setPremium] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSetPrice = async () => {
    if (Number(price) <= 0) {
      alert('Price must be greater than 0');
      return;
    }

    if (Number(premium) < 0) {
      alert('Premium cannot be negative');
      return;
    }

    setIsSubmitting(true);

    const priceInMicroSTX = Number(price) * 1000000;
    const premiumInMicroSTX = Number(premium) * 1000000;
        
    try {
      const response = await fetch('http://localhost:3001/api/price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          price: priceInMicroSTX,
          premium: premiumInMicroSTX
        })
      });
      
      if (!response.ok) {
        console.log(response);
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update price');
      }

      // Clear inputs on success
      setPrice('');
      setPremium('');
      setIsOpen(false);
    } catch (error) {
      console.error('Backend update failed:', error);
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
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg w-96">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl text-white font-semibold">Market Settings</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white text-lg"
              disabled={isSubmitting}
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-gray-300 text-md mb-2 font-medium">
                Market Price (STX)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="0.000001"
                  step="0.000001"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white text-lg"
                  placeholder="Enter price"
                  disabled={isSubmitting}
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  STX
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                Set the current market price for all positions
              </p>
            </div>

            <div>
              <label className="block text-gray-300 text-md mb-2 font-medium">
                Base Premium (STX)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={premium}
                  onChange={(e) => setPremium(e.target.value)}
                  min="0"
                  step="0.000001"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white text-lg"
                  placeholder="Enter premium"
                  disabled={isSubmitting}
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  STX
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                Minimum premium required for new positions
              </p>
            </div>

            <div className="flex flex-col space-y-4">
              <button
                onClick={handleSetPrice}
                disabled={!price || Number(price) <= 0 || Number(premium) < 0 || isSubmitting}
                className={`w-full px-6 py-3 rounded-lg text-lg font-medium ${
                  price && Number(price) > 0 && Number(premium) >= 0 && !isSubmitting
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                } flex items-center justify-center`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                    Updating Market...
                  </>
                ) : (
                  'Update Market'
                )}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                className="w-full px-6 py-3 rounded-lg text-lg font-medium bg-gray-700 hover:bg-gray-600 text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Admin Account</h4>
            <p className="text-xs text-gray-400">
              {stacksUser.profile.stxAddress.testnet}
            </p>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white rounded-lg p-4 shadow-lg flex items-center space-x-2 text-lg font-medium"
          title="Market Settings"
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
          <span>Market Settings</span>
        </button>
      )}
    </div>
  );
}