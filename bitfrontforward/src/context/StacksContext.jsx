import { createContext, useContext, useState, useEffect } from 'react';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { StacksDevnet } from '@stacks/network';

const StacksContext = createContext();

export function StacksProvider({ children }) {
  const [stacksUser, setStacksUser] = useState(null);
  const stacksNetwork = new StacksDevnet();
  
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
      },
      userSession,
    });
  };

  const disconnectWallet = () => {
    userSession.signUserOut();
    setStacksUser(null);
  };

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