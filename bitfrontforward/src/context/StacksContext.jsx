import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AppConfig,
  UserSession,
  showConnect,
} from "@stacks/connect";
import { StacksMocknet } from "@stacks/network";

const StacksContext = createContext();

export function useStacks() {
  return useContext(StacksContext);
}

export function StacksProvider({ children }) {
  const [userData, setUserData] = useState(undefined);
  const [stacksNetwork] = useState(new StacksMocknet());
  
  const appConfig = new AppConfig(["store_write"]);
  const userSession = new UserSession({ appConfig });

  useEffect(() => {
    if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then((userData) => {
        setUserData(userData);
      });
    } else if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
  }, []);

  const connectWallet = () => {
    showConnect({
      appDetails: {
        name: "Crypto Trading App",
        icon: "https://your-icon-url.png",
      },
      onFinish: () => window.location.reload(),
      userSession,
    });
  };

  const disconnectWallet = () => {
    userSession.signUserOut();
    setUserData(undefined);
  };

  const value = {
    stacksUser: userData,
    stacksNetwork,
    connectWallet,
    disconnectWallet,
    userSession
  };

  return (
    <StacksContext.Provider value={value}>
      {children}
    </StacksContext.Provider>
  );
}