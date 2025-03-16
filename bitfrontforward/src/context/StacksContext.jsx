import { createContext, useContext, useState, useEffect } from 'react';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { StacksTestnet } from '@stacks/network';
import { callReadOnlyFunction, cvToJSON, stringAsciiCV } from '@stacks/transactions';
import { getUserNFTs, getContract } from '../utils/stacksUtils'; // Import the functions
import { addPosition } from '../utils/backendUtils'; // Import the function

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

  // Store user positions in a map for easy access
  const [positionsMap, setPositionsMap] = useState(new Map());
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);

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

  // Fetch user positions whenever the user changes
  useEffect(() => {
    if (stacksUser) {
      fetchUserPositions();

      // Set up interval to refresh positions every 60 seconds when user is logged in
      const positionsInterval = setInterval(fetchUserPositions, 60000);

      return () => clearInterval(positionsInterval);
    } else {
      // Clear positions when user logs out
      setPositionsMap(new Map());
    }
  }, [stacksUser]);

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

  // Function to fetch user's positions
  const fetchUserPositions = async () => {
    if (!stacksUser) return;

    try {
      setIsLoadingPositions(true);
      const userAddress = stacksUser.profile.stxAddress.testnet;

      // Get user's NFTs
      const nfts = await getUserNFTs(userAddress);

      console.log('Fetched user NFTs:', nfts);

      // Create a new positions map
      const newPositionsMap = new Map();

      // Fetch contract details for each NFT
      await Promise.all(
        nfts.map(async (nft) => {
          try {
            const contract = await getContract(nft.contractId);
            if (contract) {
              // Determine if this is a long or short position
              const isLong = contract.longId === nft.tokenId;

              // Create position object with important details
              const position = {
                tokenId: nft.tokenId,
                contractId: nft.contractId,
                isLong,
                positionType: isLong ? 'Long' : 'Short',
                asset: contract.asset,
                status: getContractStatusText(contract.status),
                collateralAmount: contract.collateralAmount,
                premium: contract.premium,
                openPrice: contract.openPrice,
                closePrice: contract.closePrice,
                closingBlock: contract.closingBlock,
                leverage: isLong ? contract.longLeverage : contract.shortLeverage,
                contractDetails: contract
              };

              // if contractstatus is open call backend to add the position
              if (contract.status === 1) {
                try {
                  addPosition(nft.contractId);
                } catch (error) {
                  console.error(`Error adding position for contract ${contract.contractId}:`, error);
                }
              }
              // Add to positions map with tokenId as key
              newPositionsMap.set(nft.tokenId, position);
            }
          } catch (error) {
            console.error(`Error fetching contract details for NFT ${nft.tokenId}:`, error);
          }
        })
      );

      console.log('Fetched user positions:', newPositionsMap);

      setPositionsMap(newPositionsMap);
    } catch (error) {
      console.error("Error fetching user positions:", error);
    } finally {
      setIsLoadingPositions(false);
    }
  };

  // Helper function to convert contract status to text
  const getContractStatusText = (status) => {
    switch (status) {
      case 1: return 'Open';
      case 2: return 'Filled';
      case 3: return 'Closed';
      default: return 'Unknown';
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

        // Fetch positions when user connects
        fetchUserPositions();
      },
      userSession,
      network: 'testnet',
    });
  };

  const disconnectWallet = () => {
    userSession.signUserOut();
    setStacksUser(null);
    setPositionsMap(new Map());
    console.log('Disconnected from Stacks Testnet');
  };

  // Manually trigger position refresh
  const refreshUserPositions = () => {
    return fetchUserPositions();
  };

  // Get all positions as an array
  const getUserPositions = () => {
    return Array.from(positionsMap.values());
  };

  // Get a specific position by tokenId
  const getPositionByTokenId = (tokenId) => {
    return positionsMap.get(tokenId);
  };

  // Get positions by type (Long or Short)
  const getPositionsByType = (isLong) => {
    return Array.from(positionsMap.values()).filter(position => position.isLong === isLong);
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
    // Add prices to the context value
    prices,
    // Add positions-related functions to the context value
    positionsMap,
    getUserPositions,
    getPositionByTokenId,
    getPositionsByType,
    isLoadingPositions,
    refreshUserPositions,
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