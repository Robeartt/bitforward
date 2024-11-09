import { createContext, useContext, useState } from 'react';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { StacksTestnet } from '@stacks/network';

const StacksContext = createContext();

export function StacksProvider({ children }) {
  const [stacksUser, setStacksUser] = useState(null);
  const stacksNetwork = new StacksTestnet();
  
  const appConfig = new AppConfig(['store_write']);
  const userSession = new UserSession({ appConfig });

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
      },
      userSession,
    });
  };

  const disconnectWallet = () => {
    userSession.signUserOut();
    setStacksUser(null);
  };

  // Check for existing session on mount
  useState(() => {
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData();
      setStacksUser(userData);
    }
  }, []);

  return (
    <StacksContext.Provider 
      value={{
        stacksUser,
        stacksNetwork,
        connectWallet,
        disconnectWallet,
        userSession
      }}
    >
      {children}
    </StacksContext.Provider>
  );
}

export const useStacks = () => useContext(StacksContext);