import { StacksTestnet } from "@stacks/network";
import {
    callReadOnlyFunction,
    cvToJSON,
    uintCV,
    boolCV,
    stringAsciiCV,
    intCV,
    principalCV,
    PostConditionMode,
    createAssetInfo,
    makeContractCall,
    broadcastTransaction,
    Cl,
    Pc
} from "@stacks/transactions";
import { openContractCall } from "@stacks/connect";

// Define the default Stacks network
const DEFAULT_NETWORK = new StacksTestnet();

// Constants
const BITFORWARD_CONTRACT_ADDRESS = "ST1QBZR0Z3BMY6TCEQ8KABEK000HKGVW0XBTK3X9A";
const BITFORWARD_CONTRACT_NAME = "bitforward";
const BITFORWARD_NFT_CONTRACT_NAME = "bitforward-nft";
const STACKS_API_BASE = "https://stacks-node-api.testnet.stacks.co";

// sBTC token information
const SBTC_CONTRACT_ADDRESS = "ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT";
const SBTC_CONTRACT_NAME = "sbtc-token";
const SBTC_TOKEN_NAME = "sbtc";

/**
 * Get the current Bitcoin burn block height from Stacks API
 * @returns {Promise<number>} Current burn block height
 */
export const getBurnBlockHeight = async () => {
    try {
        const response = await fetch(`${STACKS_API_BASE}/v2/info`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.burn_block_height;
    } catch (error) {
        console.error("Error fetching burn block height:", error);
        throw error;
    }
};
/**
 * Get contract details by ID
 * @param {number} contractId - Contract ID
 * @returns {Promise<Object>} Contract details
 */
export const getContract = async (contractId) => {
    try {
        const response = await callReadOnlyFunction({
            contractAddress: BITFORWARD_CONTRACT_ADDRESS,
            contractName: BITFORWARD_CONTRACT_NAME,
            functionName: "get-contract",
            functionArgs: [uintCV(contractId)],
            network: DEFAULT_NETWORK,
            senderAddress: BITFORWARD_CONTRACT_ADDRESS
        });

        const contractData = cvToJSON(response);

        // Check if the contract exists
        if (!contractData.value || !contractData.value.value) {
            return null;
        }

        // Now correctly extract values from the nested structure
        const contractFields = contractData.value.value;

        // Parse and return contract data
        return {
            collateralAmount: parseInt(contractFields["collateral-amount"].value),
            premium: parseInt(contractFields.premium.value),
            openPrice: parseInt(contractFields["open-price"].value),
            closePrice: parseInt(contractFields["close-price"].value),
            closingBlock: parseInt(contractFields["closing-block"].value),
            asset: contractFields.asset.value,
            longLeverage: parseInt(contractFields["long-leverage"].value),
            shortLeverage: parseInt(contractFields["short-leverage"].value),
            status: parseInt(contractFields.status.value),
            longId: parseInt(contractFields["long-id"].value),
            shortId: parseInt(contractFields["short-id"].value),
            longPayout: parseInt(contractFields["long-payout"].value),
            shortPayout: parseInt(contractFields["short-payout"].value)
        };
    } catch (error) {
        console.error("Error fetching contract:", error);
        throw error;
    }
};

/**
 * Create a new position with proper sBTC post-conditions
 * @param {Object} stacksNetwork - Stacks network
 * @param {Object} options - Position options
 * @param {number} options.amount - Amount in micro units (satoshis)
 * @param {number} options.closingBlock - Closing block height
 * @param {boolean} options.isLong - True for long position, false for short
 * @param {string} options.asset - Asset code (3-letter)
 * @param {number} options.premium - Premium amount (can be negative)
 * @param {number} options.longLeverage - Long position leverage (scaled by 100000000)
 * @param {number} options.shortLeverage - Short position leverage (scaled by 100000000)
 * @param {string} options.senderAddress - Address of the transaction sender
 * @param {Function} options.onFinish - Callback on success
 * @param {Function} options.onCancel - Callback on cancel
 * @returns {Promise<void>}
 */
export const createPosition = async (stacksNetwork, options) => {
    const {
        amount,
        closingBlock,
        isLong,
        asset,
        premium,
        longLeverage,
        shortLeverage,
        senderAddress,
        onFinish,
        onCancel
    } = options;

    console.log("Creating position with parameters:", {
        amount,
        closingBlock,
        isLong,
        asset,
        premium,
        longLeverage,
        shortLeverage,
        senderAddress
    });

    try {
        // Create post-condition using Pc helper
        const postCondition = Pc.principal(senderAddress)
            .willSendLte(BigInt(amount))
            .ft(
                `${SBTC_CONTRACT_ADDRESS}.${SBTC_CONTRACT_NAME}`,
                SBTC_TOKEN_NAME
            );

        // Contract call options with explicit ALLOW mode
        const contractOptions = {
            contractAddress: BITFORWARD_CONTRACT_ADDRESS,
            contractName: BITFORWARD_CONTRACT_NAME,
            functionName: "create-position",
            functionArgs: [
                uintCV(amount),
                uintCV(closingBlock),
                boolCV(isLong),
                stringAsciiCV(asset),
                intCV(premium),
                uintCV(longLeverage),
                uintCV(shortLeverage)
            ],
            network: stacksNetwork || DEFAULT_NETWORK,
            postConditions: [postCondition],
            postConditionMode: PostConditionMode.Allow,
            onFinish,
            onCancel
        };

        // Use openContractCall to maintain backward compatibility
        return await openContractCall(contractOptions);
    } catch (error) {
        console.error("Error creating position:", error);
        if (onCancel) onCancel(error);
        throw error;
    }
};

/**
 * Take an existing position (counterparty)
 * @param {Object} stacksNetwork - Stacks network
 * @param {Object} options - Options
 * @param {number} options.contractId - Contract ID to take
 * @param {string} options.senderAddress - Address of the transaction sender
 * @param {Function} options.onFinish - Callback on success
 * @param {Function} options.onCancel - Callback on cancel
 * @returns {Promise<void>}
 */
export const takePosition = async (stacksNetwork, options) => {
    const {
        contractId,
        senderAddress,
        onFinish,
        onCancel
    } = options;

    // First get the contract details to find out the amount
    try {
        const contract = await getContract(contractId);
        if (!contract) {
            throw new Error("Contract not found");
        }

        // Create post-condition using Pc helper
        const postCondition = Pc.principal(senderAddress)
            .willSendLte(BigInt(contract.collateralAmount))
            .ft(
                `${SBTC_CONTRACT_ADDRESS}.${SBTC_CONTRACT_NAME}`,
                SBTC_TOKEN_NAME
            );

        // Contract call options with explicit ALLOW mode
        const contractOptions = {
            contractAddress: BITFORWARD_CONTRACT_ADDRESS,
            contractName: BITFORWARD_CONTRACT_NAME,
            functionName: "take-position",
            functionArgs: [
                uintCV(contractId)
            ],
            network: stacksNetwork || DEFAULT_NETWORK,
            postConditions: [postCondition],
            postConditionMode: PostConditionMode.Allow,
            onFinish,
            onCancel
        };

        return await openContractCall(contractOptions);
    } catch (error) {
        console.error("Error in takePosition:", error);
        if (onCancel) onCancel(error);
        throw error;
    }
};

/**
 * Close an existing contract
 * @param {Object} stacksNetwork - Stacks network
 * @param {Object} options - Options
 * @param {number} options.contractId - Contract ID to close
 * @param {Function} options.onFinish - Callback on success
 * @param {Function} options.onCancel - Callback on cancel
 * @returns {Promise<void>}
 */
export const closeContract = async (stacksNetwork, options) => {
    const {
        contractId,
        onFinish,
        onCancel
    } = options;

    try {
        // Contract call options with explicit ALLOW mode
        const contractOptions = {
            contractAddress: BITFORWARD_CONTRACT_ADDRESS,
            contractName: BITFORWARD_CONTRACT_NAME,
            functionName: "close-contract",
            functionArgs: [
                uintCV(contractId)
            ],
            network: stacksNetwork || DEFAULT_NETWORK,
            postConditions: [], // No post-conditions needed for closing
            postConditionMode: PostConditionMode.ALLOW,
            onFinish,
            onCancel
        };

        return await openContractCall(contractOptions);
    } catch (error) {
        console.error("Error in closeContract:", error);
        if (onCancel) onCancel(error);
        throw error;
    }
};

/**
 * Get NFT token URI
 * @param {number} tokenId - NFT token ID
 * @returns {Promise<string|null>} Token URI or null if not found
 */
export const getTokenUri = async (tokenId) => {
    try {
        const response = await callReadOnlyFunction({
            contractAddress: BITFORWARD_CONTRACT_ADDRESS,
            contractName: BITFORWARD_NFT_CONTRACT_NAME,
            functionName: "get-token-uri",
            functionArgs: [uintCV(tokenId)],
            network: DEFAULT_NETWORK,
            senderAddress: BITFORWARD_CONTRACT_ADDRESS
        });

        const tokenData = cvToJSON(response);

        // Parse the returned data structure
        if (tokenData.value && tokenData.value.value) {
            return tokenData.value.value;
        }
        return null;
    } catch (error) {
        console.error("Error fetching token URI:", error);
        throw error;
    }
};

/**
 * Get NFT token owner
 * @param {number} tokenId - NFT token ID
 * @returns {Promise<string|null>} Owner principal string or null if not found
 */
export const getTokenOwner = async (tokenId) => {
    try {
        const response = await callReadOnlyFunction({
            contractAddress: BITFORWARD_CONTRACT_ADDRESS,
            contractName: BITFORWARD_NFT_CONTRACT_NAME,
            functionName: "get-owner",
            functionArgs: [uintCV(tokenId)],
            network: DEFAULT_NETWORK,
            senderAddress: BITFORWARD_CONTRACT_ADDRESS
        });

        const ownerData = cvToJSON(response);

        // Parse the returned data structure
        if (ownerData.value && ownerData.value.value) {
            return ownerData.value.value;
        }
        return null;
    } catch (error) {
        console.error("Error fetching token owner:", error);
        throw error;
    }
};

/**
 * Get all NFTs owned by a user from the bitforward-nft contract using the Stacks API
 * @param {string} userAddress - Stacks address of the user
 * @returns {Promise<Array<{tokenId: number, contractId: number}>>} Array of NFT tokens
 */
export const getUserNFTs = async (userAddress) => {
    try {
        if (!userAddress) {
            console.error("getUserNFTs: No user address provided");
            return [];
        }

        // Format the asset identifier for the NFTs we want
        const assetIdentifier = `${BITFORWARD_CONTRACT_ADDRESS}.${BITFORWARD_NFT_CONTRACT_NAME}::bitforward-contracts`;

        // Query the Stacks API for NFTs owned by this address
        const apiUrl = `${STACKS_API_BASE}/extended/v1/tokens/nft/holdings`;
        const params = new URLSearchParams({
            principal: userAddress,
            asset_identifiers: assetIdentifier,
            limit: 200, // Increase limit to get more tokens at once
            offset: 0,
            unanchored: false,
            tx_metadata: false
        });

        const response = await fetch(`${apiUrl}?${params.toString()}`);

        console.log("getUserNFTs response:", response);

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();

        console.log("getUserNFTs data:", data);

        // Map to our required format
        const userNFTs = await Promise.all(
            data.results.map(async (nft) => {
                // Parse token ID from the 'repr' field
                const tokenId = parseInt(nft.value.repr.replace('u', ''));

                // Get contract ID from token URI
                const uriResponse = await callReadOnlyFunction({
                    contractAddress: BITFORWARD_CONTRACT_ADDRESS,
                    contractName: BITFORWARD_NFT_CONTRACT_NAME,
                    functionName: "get-token-uri",
                    functionArgs: [uintCV(tokenId)],
                    network: DEFAULT_NETWORK,
                    senderAddress: BITFORWARD_CONTRACT_ADDRESS
                });

                // Use cvToJSON to parse the response
                const uriData = cvToJSON(uriResponse);

                // Based on the provided structure, extract the contract ID
                // The path to the value is value.value.value
                const contractId = parseInt(uriData.value.value.value);

                return {
                    tokenId,
                    contractId
                };
            })
        );

        return userNFTs;
    } catch (error) {
        console.error("Error fetching user NFTs:", error);
        return [];
    }
};
