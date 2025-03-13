import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/transactions';

// Get simnet accounts for testing
const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const wallet1 = accounts.get('wallet_1')!;
const wallet2 = accounts.get('wallet_2')!;
const wallet3 = accounts.get('wallet_3')!;

// Define a proper interface for the contract data with nested structure
interface ContractData {
    value: {
        data: {
            'collateral-amount': { type: number, value: string };
            'premium': { type: number, value: string };
            'premium-fee': { type: number, value: string };
            'open-price': { type: number, value: string };
            'close-price': { type: number, value: string };
            'closing-block': { type: number, value: string };
            'asset': { type: number, data: string };
            'long-leverage': { type: number, value: string };
            'short-leverage': { type: number, value: string };
            'status': { type: number, value: string };
            'long-id': { type: number, value: string };
            'short-id': { type: number, value: string };
            'long-payout': { type: number, value: string };
            'short-payout': { type: number, value: string };
        }
    }
}

/*
 * Tests for position taking functionality in the BitForward contract
 */
describe('bitforward-position-taking', () => {
    // Constants for testing
    const scalar = 1000000; // 1.0 with 6 decimal places
    const collateralAmount = 1000000000; // 1000 STX
    const premium = 10000000; // 10 STX
    const usdAsset = 'USD';
    const usdPrice = 10000000; // $10 with 6 decimal places

    // Contract status constants
    const statusOpen = Cl.uint(1);
    const statusFilled = Cl.uint(2);

    // Error codes from the contract
    const errContractNotFound = Cl.uint(113);
    const errAlreadyHasCounterparty = Cl.uint(106);

    // Set up test environment before each test
    beforeEach(() => {
        // Set up oracle with initial prices
        simnet.callPublicFn('bitforward-oracle', 'set-price', [
            Cl.stringAscii(usdAsset),
            Cl.uint(usdPrice)
        ], deployer);

        // Approve the bitforward contract to create NFTs
        simnet.callPublicFn('bitforward-nft', 'set-approved-contract', [
            Cl.principal('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.bitforward'),
            Cl.bool(true)
        ], deployer);
    });

    // Setup function to create a position before testing taking it
    const setupOpenPosition = (isLong = true) => {
        const closingBlock = simnet.burnBlockHeight + 10;
        return simnet.callPublicFn('bitforward', 'create-position', [
            Cl.uint(collateralAmount),
            Cl.uint(closingBlock),
            Cl.bool(isLong),
            Cl.stringAscii(usdAsset),
            Cl.uint(premium),
            Cl.uint(scalar), // 1x leverage
            Cl.uint(scalar)  // 1x leverage
        ], wallet1);
    };

    // Helper to extract a number from the result
    const extractNumberFromResult = (result: any): number => {
        // For result of type { type: 7, value: { type: 1, value: 1n } }
        // This accesses the inner numeric value and converts it to a number
        return Number(result.value.value);
    };

    describe('take-position', () => {
        it('takes an open long position', () => {
            // Create a long position
            const createResult = setupOpenPosition(true);
            // Extract contract ID number from the result
            const contractId = extractNumberFromResult(createResult.result);

            // Take the position (should be a short position)
            const takeResult = simnet.callPublicFn('bitforward', 'take-position', [
                Cl.uint(contractId)
            ], wallet2);

            // Verify taking was successful and returned position ID
            expect(takeResult.result).toBeOk(Cl.uint(2)); // Second position ID

            // Verify contract status was updated
            const contractInfo = simnet.callReadOnlyFn('bitforward', 'get-contract', [
                Cl.uint(contractId)
            ], deployer);

            // Convert to proper format using JSON
            const contractData = JSON.parse(JSON.stringify(contractInfo.result)) as ContractData;

            // Now verify the contract fields with the correct nested structure
            expect(contractData).not.toBeNull();

            // Verify the contract data exists with expected structure
            expect(contractData.value.data).toBeDefined();

            // Verify critical fields with the correct structure
            expect(contractData.value.data['status'].value).toBe('2'); // statusFilled
            expect(contractData.value.data['long-id'].value).toBe('1'); // First position
            expect(contractData.value.data['short-id'].value).toBe('2'); // Second position
        });

        it('takes an open short position', () => {
            // Create a short position
            const createResult = setupOpenPosition(false);
            // Extract contract ID number from the result
            const contractId = extractNumberFromResult(createResult.result);

            // Take the position (should be a long position)
            const takeResult = simnet.callPublicFn('bitforward', 'take-position', [
                Cl.uint(contractId)
            ], wallet2);

            // Verify taking was successful and returned position ID
            expect(takeResult.result).toBeOk(Cl.uint(2)); // Second position ID

            // Verify contract status was updated
            const contractInfo = simnet.callReadOnlyFn('bitforward', 'get-contract', [
                Cl.uint(contractId)
            ], deployer);

            // Convert to proper format using JSON
            const contractData = JSON.parse(JSON.stringify(contractInfo.result)) as ContractData;

            // Now verify the contract fields with the correct nested structure
            expect(contractData).not.toBeNull();

            // Verify the contract data exists with expected structure
            expect(contractData.value.data).toBeDefined();

            // Verify critical fields with the correct structure
            expect(contractData.value.data['status'].value).toBe('2'); // statusFilled
            expect(contractData.value.data['long-id'].value).toBe('2'); // Second position
            expect(contractData.value.data['short-id'].value).toBe('1'); // First position
        });

        it('rejects taking a non-existent position', () => {
            // Attempt to take a non-existent position
            const nonExistentId = 999;
            const takeResult = simnet.callPublicFn('bitforward', 'take-position', [
                Cl.uint(nonExistentId)
            ], wallet2);

            // Verify take failed with contract-not-found error
            expect(takeResult.result).toBeErr(errContractNotFound);
        });

        it('rejects taking an already filled position', () => {
            // Create a position
            const createResult = setupOpenPosition(true);
            // Extract contract ID number from the result
            const contractId = extractNumberFromResult(createResult.result);

            // Take the position once (succeeds)
            simnet.callPublicFn('bitforward', 'take-position', [
                Cl.uint(contractId)
            ], wallet2);

            // Attempt to take it again
            const takeAgainResult = simnet.callPublicFn('bitforward', 'take-position', [
                Cl.uint(contractId)
            ], wallet3);

            // Verify second take failed with already-has-counterparty error
            expect(takeAgainResult.result).toBeErr(errAlreadyHasCounterparty);
        });

        it('allows different users to take different positions', () => {
            // Create first position (long)
            const createResult1 = setupOpenPosition(true);
            const contractId1 = extractNumberFromResult(createResult1.result);

            // Create second position (short)
            const createResult2 = setupOpenPosition(false);
            const contractId2 = extractNumberFromResult(createResult2.result);

            // Take first position with wallet2
            const takeResult1 = simnet.callPublicFn('bitforward', 'take-position', [
                Cl.uint(contractId1)
            ], wallet2);

            expect(takeResult1.result).toBeOk(Cl.uint(3)); // Position ID 3

            // Take second position with wallet3
            const takeResult2 = simnet.callPublicFn('bitforward', 'take-position', [
                Cl.uint(contractId2)
            ], wallet3);

            expect(takeResult2.result).toBeOk(Cl.uint(4)); // Position ID 4

            // Verify both contracts are filled
            const contractInfo1 = simnet.callReadOnlyFn('bitforward', 'get-contract', [
                Cl.uint(contractId1)
            ], deployer);

            const contractData1 = JSON.parse(JSON.stringify(contractInfo1.result)) as ContractData;
            expect(contractData1).not.toBeNull();
            expect(contractData1.value.data).toBeDefined();
            expect(contractData1.value.data['status'].value).toBe('2'); // statusFilled

            const contractInfo2 = simnet.callReadOnlyFn('bitforward', 'get-contract', [
                Cl.uint(contractId2)
            ], deployer);

            const contractData2 = JSON.parse(JSON.stringify(contractInfo2.result)) as ContractData;
            expect(contractData2).not.toBeNull();
            expect(contractData2.value.data).toBeDefined();
            expect(contractData2.value.data['status'].value).toBe('2'); // statusFilled
        });

        it('verifies NFT ownership is correctly assigned', () => {
            // Create a long position
            const createResult = setupOpenPosition(true);
            const contractId = extractNumberFromResult(createResult.result);
            const longPositionId = 1;

            // Take the position with wallet2
            const takeResult = simnet.callPublicFn('bitforward', 'take-position', [
                Cl.uint(contractId)
            ], wallet2);

            const shortPositionId = extractNumberFromResult(takeResult.result);

            // Verify NFT ownership of long position (wallet1)
            const longOwnerResult = simnet.callReadOnlyFn('bitforward-nft', 'get-owner', [
                Cl.uint(longPositionId)
            ], deployer);

            // Directly check if the owner is wallet1
            expect(longOwnerResult.result).toBeOk(Cl.some(Cl.principal(wallet1)));

            // Verify NFT ownership of short position (wallet2)
            const shortOwnerResult = simnet.callReadOnlyFn('bitforward-nft', 'get-owner', [
                Cl.uint(shortPositionId)
            ], deployer);

            // Directly check if the owner is wallet2
            expect(shortOwnerResult.result).toBeOk(Cl.some(Cl.principal(wallet2)));
        });
    });
});