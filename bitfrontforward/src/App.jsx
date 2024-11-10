import { useState } from "react";
import { StacksProvider } from "./context/StacksContext";
import Overview from "./components/StacksComponents/Overview";
import WalletConnect from "./components/StacksComponents/WalletConnect";
import Positions from "./components/StacksComponents/Positions";
import PositionManagement from "./components/StacksComponents/PositionManagement";
import MarketOverview from "./components/StacksComponents/MarketOverview";
import History from "./components/StacksComponents/History";

function App() {
  return (
    <StacksProvider>
      <div className="min-h-screen bg-black text-white">
        <nav className="bg-gray-900 shadow-lg p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold tracking-tight">
              <span className="text-green-500">Bit</span>
              <span className="text-white">Forward</span>
            </h1>
            <WalletConnect />
          </div>
          <MarketOverview />
        </nav>

        <main className="container mx-auto py-8 px-4">
          <div className="grid grid-cols-1 gap-6">
            <Overview />
            <PositionManagement />
            <Positions />
            <History />
          </div>
        </main>
      </div>
    </StacksProvider>
  );
}

export default App;