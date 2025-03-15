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


    async createPosition(amount, closingBlock, isLong, asset, premium, longLeverage, shortLeverage, sender) {
        const functionName = "create-position";
        try {
            const transaction = await makeContractCall({
                contractAddress: this.contractAddress,
                contractName: this.contractName,
                functionName,
                functionArgs: [
                    uintCV(amount),
                    uintCV(closingBlock),
                    isLong ? trueCV() : falseCV(),
                    stringAsciiCV(asset),
                    intCV(premium),
                    uintCV(longLeverage),
                    uintCV(shortLeverage)
                ],
                senderAddress: sender,
                network: this.network,
                anchorMode: AnchorMode.ANY,
                postConditionMode: PostConditionMode.Allow,
                fee: 200n
            });

            const broadcastResponse = await broadcastTransaction({
                transaction,
                network: this.network,
            });
            return broadcastResponse;
        } catch (error) {
            console.error("Error creating position:", error);
            throw error;
        }
    }

    async takePosition(contractId, sender) {
        const functionName = "take-position";
        try {
            const transaction = await makeContractCall({
                contractAddress: this.contractAddress,
                contractName: this.contractName,
                functionName,
                functionArgs: [uintCV(contractId)],
                senderAddress: sender,
                network: this.network,
                anchorMode: AnchorMode.ANY,
                postConditionMode: PostConditionMode.Allow,
                fee: 200n
            });

            const broadcastResponse = await broadcastTransaction({
                transaction,
                network: this.network,
            });
            return broadcastResponse;
        } catch (error) {
            console.error("Error taking position:", error);
            throw error;
        }
    }

    async isContractStopped() {
        const functionName = "get-is-stopped";
        try {
            const response = await fetchCallReadOnlyFunction({
                contractAddress: this.contractAddress,
                contractName: this.contractName,
                functionName,
                functionArgs: [],
                validateWithAbi: true,
                network: this.network,
                senderAddress: CONTRACT_ADDRESS.split('.')[0],
            });
            return response.value;
        } catch (error) {
            console.error("Error checking if contract is stopped:", error);
            throw error;
        }
    }

    async stopContract() {
        if (!CONTRACT_OWNER_KEY) {
            throw new Error("Contract owner private key not configured");
        }

        const functionName = "stop-contract";
        try {
            const transaction = await makeContractCall({
                contractAddress: this.contractAddress,
                contractName: this.contractName,
                functionName,
                functionArgs: [],
                validateWithAbi: true,
                senderKey: CONTRACT_OWNER_KEY,
                network: this.network,
                anchorMode: AnchorMode.ANY,
                fee: 200n
            });

            const broadcastResponse = await broadcastTransaction({
                transaction,
                network: this.network,
            });
            return broadcastResponse;
        } catch (error) {
            console.error("Error stopping contract:", error);
            throw error;
        }
    }
}