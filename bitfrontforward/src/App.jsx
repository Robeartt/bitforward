import { useState } from "react";
import { StacksProvider } from "./context/StacksContext";
import Overview from "./components/StacksComponents/Overview";
import WalletConnect from "./components/StacksComponents/WalletConnect";

function App() {
  return (
    <StacksProvider>
      <div className="min-h-screen bg-black text-white">
        <nav className="bg-gray-900 shadow-lg p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-x1 font-bold ">BitForward</h1>
            <WalletConnect/>
          </div>
        </nav>

        <main className="container mx-auto py-8 px-4">
          <div className="grid grid-cols-1 gap-6">
            <Overview />
          </div>
        </main>
      </div>
    </StacksProvider>
  );
}

export default App;