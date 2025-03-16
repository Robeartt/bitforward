import { createContext, useContext, useState, useEffect } from 'react';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { StacksTestnet } from '@stacks/network';
import { callReadOnlyFunction, cvToJSON, stringAsciiCV } from '@stacks/transactions';

const StacksContext = createContext();

export function StacksProvider({ children }) {
  const [stacksUser, setStacksUser] = useState(null);
  const stacksNetwork = new StacksTestnet();
  const appConfig = new AppConfig(['store_write']);
  const userSession = new UserSession({ appConfig });

  // Add prices state
  const [prices, setPrices] = useState({
    USD: 0,
    EUR: 0,
    GBP: 0
  });

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setStacksUser(userSession.loadUserData());
    }

    // Fetch initial prices
    fetchPrices();

    // Set up interval to fetch prices every 30 seconds
    const priceInterval = setInterval(fetchPrices, 30000);

    return () => clearInterval(priceInterval);
  }, []);

  // Function to fetch prices from oracle
  const fetchPrices = async () => {
    try {
      const assets = ['USD', 'EUR', 'GBP'];
      const newPrices = {};

      for (const asset of assets) {
        const priceResponse = await callReadOnlyFunction({
          contractAddress: "ST1QBZR0Z3BMY6TCEQ8KABEK000HKGVW0XBTK3X9A",
          contractName: "bitforward-oracle",
          functionName: "get-price",
          functionArgs: [stringAsciiCV(asset)],
          network: 'testnet',
          senderAddress: 'ST1QBZR0Z3BMY6TCEQ8KABEK000HKGVW0XBTK3X9A',
        });

        const priceData = cvToJSON(priceResponse);

        // Descale by 8 scalar (divide by 100,000,000)
        const rawPrice = parseInt(priceData.value.value);
        const descaledPrice = rawPrice / 100000000;

        newPrices[asset] = descaledPrice;
      }

      setPrices(newPrices);
    } catch (error) {
      console.error("Error fetching prices:", error);
    }
  };

  const connectWallet = () => {
    showConnect({
      appDetails: {
        name: 'BitForward Trading',
        icon: 'https://placeholder.com/icon.png',
      },
      redirectTo: '/',
      onFinish: () => {
        const userData = userSession.loadUserData();
        setStacksUser(userData);
        console.log('Connected to Stacks Testnet:', userData.profile.stxAddress.testnet);
      },
      userSession,
      network: 'testnet',
    });
  };

  const disconnectWallet = () => {
    userSession.signUserOut();
    setStacksUser(null);
    console.log('Disconnected from Stacks Testnet');
  };

  const value = {
    stacksUser,
    stacksNetwork,
    connectWallet,
    disconnectWallet,
    userSession,
    isSignedIn: () => userSession.isUserSignedIn(),
    getAddress: () => stacksUser?.profile?.stxAddress?.testnet || null,
    getNetwork: () => stacksNetwork,
    // Add prices to the context value (now they're descaled by 8 scalar)
    prices
  };

  return (
    <StacksContext.Provider value={value}>
      {children}
    </StacksContext.Provider>
  );
}

export const useStacks = () => useContext(StacksContext);

export const useStacksAddress = () => {
  const { stacksUser } = useStacks();
  return stacksUser?.profile?.stxAddress?.testnet || null;
};