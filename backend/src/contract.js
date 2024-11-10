import txPkg from "@stacks/transactions";
const {
    principalCV,
    uintCV,
    fetchCallReadOnlyFunction,
    makeContractCall,
    AnchorMode,
    PostConditionMode,
    broadcastTransaction,
} = txPkg;

import {
    CONTRACT_ADDRESS,
    CONTRACT_NAME,
    CONTRACT_OWNER_KEY,
} from "./config.js";

export class BitForwardContract {
    constructor() {
        this.contractAddress = CONTRACT_ADDRESS;
        this.contractName = CONTRACT_NAME;
    }

    async getPosition(address) {
        const functionName = "get-position";
        try {
            const response = await fetchCallReadOnlyFunction({
                contractAddress: this.contractAddress,
                contractName: this.contractName,
                functionName,
                functionArgs: [principalCV(address)],
                validateWithAbi: true,
                network: "devnet",
                senderAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
            });
            console.log(response);
            console.log(response.value.value);
            return response;
        } catch (error) {
            console.error("Error getting position:", error);
            throw error;
        }
    }

    async getPrice() {
        const functionName = "get-price";
        try {
            const response = await fetchCallReadOnlyFunction({
                contractAddress: this.contractAddress,
                contractName: this.contractName,
                functionName,
                functionArgs: [],
                validateWithAbi: true,
                network: "devnet",
                senderAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
            });
            return parseInt(response.value);
        } catch (error) {
            console.error("Error getting price:", error);
            throw error;
        }
    }

    async setPrice(newPrice) {
        if (!CONTRACT_OWNER_KEY) {
            throw new Error("Contract owner private key not configured");
        }

        const functionName = "set-price";
        try {
            const transaction = await makeContractCall({
                contractAddress: this.contractAddress,
                contractName: this.contractName,
                functionName,
                functionArgs: [uintCV(newPrice)],
                validateWithAbi: true,
                senderKey: CONTRACT_OWNER_KEY,
                network: "devnet",
                anchorMode: AnchorMode.ANY,
                fee: 200n
            });

            const broadcastResponse = await broadcastTransaction({
                transaction,
                network: "devnet",
            });
            return broadcastResponse;
        } catch (error) {
            console.error("Error setting price:", error);
            throw error;
        }
    }

    async closePosition(positionAddress) {
        const functionName = "close-position";
        try {
            const transaction = await makeContractCall({
                contractAddress: this.contractAddress,
                contractName: this.contractName,
                functionName,
                functionArgs: [principalCV(positionAddress)],
                senderKey: CONTRACT_OWNER_KEY,
                network: "devnet",
                anchorMode: AnchorMode.ANY,
                postConditionMode: PostConditionMode.Allow,
                fee: 200n
            });

            const broadcastResponse = await broadcastTransaction({
                transaction,
                network: "devnet",
            });
            return broadcastResponse;
        } catch (error) {
            console.error("Error closing position:", error);
            throw error;
        }
    }
}