import { createContext, useContext, useState, useEffect } from 'react';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { StacksTestnet } from '@stacks/network';

const StacksContext = createContext();

export function StacksProvider({ children }) {
  const [stacksUser, setStacksUser] = useState(null);
  // Change to StacksTestnet
  const stacksNetwork = new StacksTestnet({
    url: 'https://stacks-node-api.testnet.stacks.co'
  });
  
  // Include store_write permission for contract interactions
  const appConfig = new AppConfig(['store_write']);
  const userSession = new UserSession({ appConfig });

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setStacksUser(userSession.loadUserData());
    }
  }, []);

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
        // Log connection for debugging
        console.log('Connected to Stacks Testnet:', userData.profile.stxAddress.testnet);
      },
      userSession,
      network: stacksNetwork, // Explicitly set network
    });
  };

  const disconnectWallet = () => {
    userSession.signUserOut();
    setStacksUser(null);
    console.log('Disconnected from Stacks Testnet');
  };

  // Add network status check
  useEffect(() => {
    const checkNetwork = async () => {
      try {
        const response = await fetch('https://stacks-node-api.testnet.stacks.co/v2/info');
        const data = await response.json();
        console.log('Connected to Stacks Testnet:', data.network_id);
      } catch (error) {
        console.error('Error connecting to Stacks Testnet:', error);
      }
    };

    checkNetwork();
  }, []);

  const value = {
    stacksUser,
    stacksNetwork,
    connectWallet,
    disconnectWallet,
    userSession,
    // Add helper functions for common operations
    isSignedIn: () => userSession.isUserSignedIn(),
    getAddress: () => stacksUser?.profile?.stxAddress?.testnet || null,
    getNetwork: () => stacksNetwork,
  };

  return (
    <StacksContext.Provider value={value}>
      {children}
    </StacksContext.Provider>
  );
}

export const useStacks = () => useContext(StacksContext);

// Add helper hook for common address access
export const useStacksAddress = () => {
  const { stacksUser } = useStacks();
  return stacksUser?.profile?.stxAddress?.testnet || null;
};