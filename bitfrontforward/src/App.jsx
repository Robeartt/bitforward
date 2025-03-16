import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
} from "react-router-dom";
import { StacksProvider, useStacks } from "./context/StacksContext";
import Overview from "./components/StacksComponents/Overview";
import WalletConnect from "./components/StacksComponents/WalletConnect";
import Positions from "./components/StacksComponents/Positions";
import PositionManagement from "./components/StacksComponents/PositionManagement";
import MarketOverview from "./components/StacksComponents/MarketOverview";
import History from "./components/StacksComponents/History";
import SpeculatePage from "./components/StacksComponents/SpeculateComponents/SpeculatePage";

// Navigation component to handle active route styling
function Navigation() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="flex gap-5 max-sm:mx-0 max-sm:my-2.5">
      <Link
        to="/overview"
        className="px-4 py-1.5 rounded transition-all cursor-pointer border-[none] duration-[0.2s] ease-[ease]"
        style={{
          color: isActive("/overview") ? "#fc6432" : "#8a8d93",
        }}
      >
        Overview
      </Link>
      <Link
        to="/speculate"
        className="px-4 py-1.5 rounded transition-all cursor-pointer border-[none] duration-[0.2s] ease-[ease]"
        style={{
          color: isActive("/speculate") ? "#fc6432" : "#8a8d93",
        }}
      >
        Speculate
      </Link>
      <Link
        to="/premiums"
        className="px-4 py-1.5 rounded transition-all cursor-pointer border-[none] duration-[0.2s] ease-[ease]"
        style={{
          color: isActive("/premiums") ? "#fc6432" : "#8a8d93",
        }}
      >
        Premiums
      </Link>
      <Link
        to="/settings"
        className="px-4 py-1.5 rounded transition-all cursor-pointer border-[none] duration-[0.2s] ease-[ease]"
        style={{
          color: isActive("/settings") ? "#fc6432" : "#8a8d93",
        }}
      >
        Settings
      </Link>
    </div>
  );
}

// Current Price display component
function CurrentPrice() {
  const { prices } = useStacks();

  // Format the USD price with commas for thousands and 2 decimal places
  const formattedPrice = prices.USD.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return (
    <div className="text-sm text-gray-500">
      Current Price: ${formattedPrice} USD
    </div>
  );
}

function App() {
  const [isConnected, setIsConnected] = useState(true);
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString(),
  );

  function updateTime() {
    setCurrentTime(new Date().toLocaleTimeString());
  }

  useEffect(() => {
    const timer = setInterval(() => {
      updateTime();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Router>
      <StacksProvider>
        <div className="min-h-screen bg-gray-900 text-white">
          <div className="flex justify-between items-center px-5 py-4 border-b border-solid bg-slate-950 border-b-slate-800 max-sm:flex-col max-sm:gap-2.5 max-sm:text-center">
            <div className="flex gap-2.5 items-center">
              <Link
                to="/"
                className="flex items-center text-2xl max-sm:text-xl"
              >
                <span className="text-orange-500 logo-text">Bit</span>
                <span className="text-slate-50 logo-text">Forward</span>
              </Link>
              { }
              <div className="object-contain ml-0 h-[30px] w-[30px] max-sm:w-6 max-sm:h-6"></div>
            </div>
            <Navigation />
            <div className="flex gap-4 items-center">
              <div className="flex items-center">
                <span
                  style={{
                    color: isConnected ? "#00ff00" : "#ff0000",
                  }}
                >
                  <>
                    {isConnected ? <span>LIVE</span> : null}
                    {!isConnected ? <span>OFFLINE</span> : null}
                  </>
                </span>
              </div>
              <div className="text-neutral-400">{currentTime}</div>
            </div>
          </div>

          <div className="flex gap-5 justify-end items-center px-5 py-2.5 mb-5">
            <CurrentPrice />
            <WalletConnect />
          </div>

          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route
              path="/overview"
              element={
                <main className="container mx-auto py-8 px-4">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="p-6 mb-5 rounded-xl border border-solid backdrop-blur-[10px] bg-slate-950 bg-opacity-50 border-orange-500 border-opacity-20">
                      <div className="mb-6 text-lg font-semibold tracking-wide text-orange-500">
                        <p className="text-orange-500">OVERVIEW</p>
                        <p>
                          <br />
                        </p>
                      </div>
                      <Overview />
                    </div>

                    <div className="p-6 mb-5 rounded-xl border border-solid backdrop-blur-[10px] bg-slate-950 bg-opacity-50 border-orange-500 border-opacity-20">
                      <div className="mb-6 text-lg font-semibold tracking-wide text-orange-500">
                        MARKET SUMMARY
                      </div>
                      <div className="grid gap-6 grid-cols-[1fr_1fr] max-md:grid-cols-[1fr]">
                        <div className="p-5 rounded-lg bg-slate-950 bg-opacity-80">
                          <div className="mb-4 text-sm text-neutral-400">
                            CRYPTOCURRENCY PRICES
                          </div>
                          <div className="flex flex-col gap-4">
                            <div className="flex justify-between">
                              <span className="text-white">BTC/USD</span>
                              <span className="text-green-500">
                                $65,246.82 (+2.6%)
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white">ETH/USD</span>
                              <span className="text-red-600">
                                $3,128.65 (-0.8%)
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white">SOL/USD</span>
                              <span className="text-green-500">
                                $125.32 (+1.4%)
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="p-5 rounded-lg bg-slate-950 bg-opacity-80">
                          <div className="mb-4 text-sm text-neutral-400">
                            CONTRACT STATISTICS
                          </div>
                          <div className="flex flex-col gap-4">
                            <div className="flex justify-between">
                              <span className="text-neutral-400">
                                24h Volume
                              </span>
                              <span className="text-white">$1.2B</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-400">
                                Open Interest
                              </span>
                              <span className="text-white">$842M</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-400">
                                Active Traders
                              </span>
                              <span className="text-white">12,463</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <PositionManagement />
                    <Positions />
                    <History />
                  </div>
                </main>
              }
            />
            <Route path="/speculate" element={<SpeculatePage />} />
            <Route
              path="/premiums"
              element={
                <div className="container mx-auto py-8 px-4">Premiums Page</div>
              }
            />
            <Route
              path="/settings"
              element={
                <div className="container mx-auto py-8 px-4">Settings Page</div>
              }
            />
          </Routes>

          <div className="container mx-auto px-4 pb-8">
            <div className="flex justify-between items-center px-0 py-5 max-md:flex-wrap max-md:gap-5 max-sm:flex-col max-sm:gap-4">
              <div className="text-white max-md:flex-[1_1_calc(50%_-_10px)] max-sm:w-full">
                <div className="mb-1.5 text-sm text-neutral-400">BTC/USD</div>
                <div className="mb-1.5 text-base font-semibold">$65,246.82</div>
                <div className="text-sm text-green-500">+2.6%</div>
              </div>
              <div className="text-white max-md:flex-[1_1_calc(50%_-_10px)] max-sm:w-full">
                <div className="mb-1.5 text-sm text-neutral-400">ETH/USD</div>
                <div className="mb-1.5 text-base font-semibold">$3,128.65</div>
                <div className="text-sm text-red-600">-0.8%</div>
              </div>
              <div className="text-white max-md:flex-[1_1_calc(50%_-_10px)] max-sm:w-full">
                <div className="mb-1.5 text-sm text-neutral-400">EUR/USD</div>
                <div className="mb-1.5 text-base font-semibold">$1.0876</div>
              </div>
              <div className="text-white max-md:flex-[1_1_calc(50%_-_10px)] max-sm:w-full">
                <div className="mb-1.5 text-sm text-neutral-400">
                  Volatility Index
                </div>
                <div className="mb-1.5 text-base font-semibold">27.35</div>
              </div>
            </div>
          </div>
        </div>
      </StacksProvider>
    </Router>
  );
}

export default App;