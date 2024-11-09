import { useState } from "react";
import { StacksProvider } from './context/StacksContext.jsx';
import Overview from "./components/StacksComponents/Overview.jsx";
import { StacksTrading } from "./components/StacksComponents/StacksTrading.jsx";
import WalletConnect from "./components/StacksComponents/WalletConnect.jsx";

function App() {
  const [tradingPair] = useState('STX-USD');
  const [amount] = useState(0);
  const [price] = useState(0);

  return (
    <StacksProvider>
      <div className="min-h-screen bg-black text-white">
        <nav className="bg-gray-900 shadow-lg p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">BitForward</h1>
            <WalletConnect />
          </div>
        </nav>

        <main className="container mx-auto py-8 px-4">
          <div className="grid grid-cols-1 gap-6">
            <Overview />
            <StacksTrading
              tradingPair={tradingPair}
              amount={amount}
              price={price}
            />
          </div>
        </main>
      </div>
    </StacksProvider>
  );
}

export default App;