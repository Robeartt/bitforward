import { StacksProvider } from './context/StacksContext';
import { StacksTrading } from './components/StacksComponents/StacksTrading';
import WalletConnect from './components/StacksComponents/WalletConnect';
// Import your existing components
import YourTradingInterface from './components/YourTradingInterface';

function App() {
  // Your existing state management
  const [tradingPair, setTradingPair] = useState('BTC-USD');
  const [amount, setAmount] = useState(0);
  const [price, setPrice] = useState(0);

  return (
    <StacksProvider>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-lg p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">Your Trading App</h1>
            <WalletConnect />
          </div>
        </nav>

        <main className="container mx-auto py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Your existing trading interface */}
            <div className="lg:col-span-2">
              <YourTradingInterface
                onPairChange={setTradingPair}
                onAmountChange={setAmount}
                onPriceChange={setPrice}
              />
            </div>
            
            {/* Stacks trading panel */}
            <div className="lg:col-span-1">
              <StacksTrading
                tradingPair={tradingPair}
                amount={amount}
                price={price}
              />
            </div>
          </div>
        </main>
      </div>
    </StacksProvider>
  );
}

export default App;