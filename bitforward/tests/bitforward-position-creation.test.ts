import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/transactions';

// Get simnet accounts for testing
const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const wallet1 = accounts.get('wallet_1')!;

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
 * Tests for position creation functionality in the BitForward contract
 */
describe('bitforward-position-creation', () => {
    // Constants for testing
    const scalar = 1000000; // 1.0 with 6 decimal places
    const collateralAmount = 1000000000; // 1000 STX
    const premium = 10000000; // 10 STX
    const usdAsset = 'USD';
    const eurAsset = 'EUR';
    const usdPrice = 10000000; // $10 with 6 decimal places
    const invalidAsset = 'XYZ';

    // Contract status constants
    const statusOpen = Cl.uint(1);

    // Error codes from the contract
    const errNoValue = Cl.uint(102);
    const errCloseBlockInPast = Cl.uint(104);
    const errAssetNotSupported = Cl.uint(110);
    const errInvalidLeverage = Cl.uint(111);

    // Set up test environment before each test
    beforeEach(() => {

        // Set up oracle with initial prices
        simnet.callPublicFn('bitforward-oracle', 'set-price', [
            Cl.stringAscii(usdAsset),
            Cl.uint(usdPrice)
        ], deployer);

        // Set up oracle with EUR price
        simnet.callPublicFn('bitforward-oracle', 'set-price', [
            Cl.stringAscii(eurAsset),
            Cl.uint(usdPrice) // Same as USD for simplicity
        ], deployer);

        // Approve the bitforward contract to create NFTs
        simnet.callPublicFn('bitforward-nft', 'set-approved-contract', [
            Cl.principal('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.bitforward'),
            Cl.bool(true)
        ], deployer);
    });

    // Helper function to create a closing block in the future
    const getFutureBlock = (blocksAhead: number): number => {
        return simnet.burnBlockHeight + blocksAhead;
    };

    describe('create-position', () => {
        it('creates a long position with valid parameters', () => {
            const closingBlock = getFutureBlock(10);

            // Create a long position
            const createResult = simnet.callPublicFn('bitforward', 'create-position', [
                Cl.uint(collateralAmount), // 1000 STX collateral
                Cl.uint(closingBlock),
                Cl.bool(true), // Long position
                Cl.stringAscii(usdAsset),
                Cl.uint(premium),
                Cl.uint(scalar), // 1x long leverage
                Cl.uint(scalar)  // 1x short leverage
            ], wallet1);

            // Verify position creation was successful and returned position ID
            expect(createResult.result).toBeOk(Cl.uint(1)); // First position ID

            // Verify position details
            const contractInfo = simnet.callReadOnlyFn('bitforward', 'get-contract', [
                Cl.uint(1)  // Contract ID 
            ], deployer);

            // Convert to proper format using JSON
            const contractData = JSON.parse(JSON.stringify(contractInfo.result)) as ContractData;

            // Now verify the contract fields with the correct nested structure
            expect(contractData).not.toBeNull();

            // Verify the contract data exists with expected structure
            expect(contractData.value.data).toBeDefined();

            // Verify critical fields with the correct structure
            expect(contractData.value.data['collateral-amount'].value).toBe('1000000000');
            expect(contractData.value.data['premium'].value).toBe('10000000');
            expect(contractData.value.data['asset'].data).toBe('USD');
            expect(contractData.value.data['status'].value).toBe('1'); // statusOpen
            expect(contractData.value.data['long-id'].value).toBe('1'); // Position ID 1
            expect(contractData.value.data['short-id'].value).toBe('0'); // Not created yet
        });

        it('creates a short position with valid parameters', () => {
            const closingBlock = getFutureBlock(10);

            // Create a short position
            const createResult = simnet.callPublicFn('bitforward', 'create-position', [
                Cl.uint(collateralAmount), // 1000 STX collateral
                Cl.uint(closingBlock),
                Cl.bool(false), // Short position
                Cl.stringAscii(usdAsset),
                Cl.uint(premium),
                Cl.uint(scalar), // 1x long leverage
                Cl.uint(scalar)  // 1x short leverage
            ], wallet1);

            // Verify position creation was successful and returned position ID
            expect(createResult.result).toBeOk(Cl.uint(1)); // First position ID

            // Verify position details
            const contractInfo = simnet.callReadOnlyFn('bitforward', 'get-contract', [
                Cl.uint(1)  // Contract ID
            ], deployer);

            // Convert to proper format using JSON
            const contractData = JSON.parse(JSON.stringify(contractInfo.result)) as ContractData;

            // Now verify the contract fields with the correct nested structure
            expect(contractData).not.toBeNull();

            // Verify the contract data exists with expected structure
            expect(contractData.value.data).toBeDefined();

            // Verify critical fields with the correct structure
            expect(contractData.value.data['collateral-amount'].value).toBe('1000000000');
            expect(contractData.value.data['premium'].value).toBe('10000000');
            expect(contractData.value.data['asset'].data).toBe('USD');
            expect(contractData.value.data['status'].value).toBe('1'); // statusOpen
            expect(contractData.value.data['long-id'].value).toBe('0'); // Not created yet
            expect(contractData.value.data['short-id'].value).toBe('1'); // Position ID 1
        });

        it('rejects position creation with zero collateral', () => {
            const closingBlock = getFutureBlock(10);

            // Attempt to create position with zero collateral
            const createResult = simnet.callPublicFn('bitforward', 'create-position', [
                Cl.uint(0), // Zero collateral
                Cl.uint(closingBlock),
                Cl.bool(true),
                Cl.stringAscii(usdAsset),
                Cl.uint(premium),
                Cl.uint(scalar),
                Cl.uint(scalar)
            ], wallet1);

            // Verify creation failed with no-value error
            expect(createResult.result).toBeErr(errNoValue);
        });

        it('rejects position creation with zero premium', () => {
            const closingBlock = getFutureBlock(10);

            // Attempt to create position with zero premium
            const createResult = simnet.callPublicFn('bitforward', 'create-position', [
                Cl.uint(collateralAmount),
                Cl.uint(closingBlock),
                Cl.bool(true),
                Cl.stringAscii(usdAsset),
                Cl.uint(0), // Zero premium
                Cl.uint(scalar),
                Cl.uint(scalar)
            ], wallet1);

            // Verify creation failed with no-value error
            expect(createResult.result).toBeErr(errNoValue);
        });

        it('rejects position creation with closing block in the past', () => {
            // Use a block height in the past
            const pastBlock = Math.max(0, simnet.burnBlockHeight - 5);

            // Attempt to create position with past block
            const createResult = simnet.callPublicFn('bitforward', 'create-position', [
                Cl.uint(collateralAmount),
                Cl.uint(pastBlock),
                Cl.bool(true),
                Cl.stringAscii(usdAsset),
                Cl.uint(premium),
                Cl.uint(scalar),
                Cl.uint(scalar)
            ], wallet1);

            // Verify creation failed with close-block-in-past error
            expect(createResult.result).toBeErr(errCloseBlockInPast);
        });

        it('rejects position creation with unsupported asset', () => {
            const closingBlock = getFutureBlock(10);

            // Attempt to create position with unsupported asset
            const createResult = simnet.callPublicFn('bitforward', 'create-position', [
                Cl.uint(collateralAmount),
                Cl.uint(closingBlock),
                Cl.bool(true),
                Cl.stringAscii(invalidAsset), // Unsupported asset
                Cl.uint(premium),
                Cl.uint(scalar),
                Cl.uint(scalar)
            ], wallet1);

            // Verify creation failed with asset-not-supported error
            expect(createResult.result).toBeErr(errAssetNotSupported);
        });

        it('rejects position creation with invalid leverage', () => {
            const closingBlock = getFutureBlock(10);
            const invalidLeverage = scalar / 2; // 0.5x leverage (invalid, below 1.0)

            // Attempt to create position with invalid long leverage
            const createResult1 = simnet.callPublicFn('bitforward', 'create-position', [
                Cl.uint(collateralAmount),
                Cl.uint(closingBlock),
                Cl.bool(true),
                Cl.stringAscii(usdAsset),
                Cl.uint(premium),
                Cl.uint(invalidLeverage), // Invalid long leverage
                Cl.uint(scalar)
            ], wallet1);

            // Verify creation failed with invalid-leverage error
            expect(createResult1.result).toBeErr(errInvalidLeverage);

            // Attempt to create position with invalid short leverage
            const createResult2 = simnet.callPublicFn('bitforward', 'create-position', [
                Cl.uint(collateralAmount),
                Cl.uint(closingBlock),
                Cl.bool(true),
                Cl.stringAscii(usdAsset),
                Cl.uint(premium),
                Cl.uint(scalar),
                Cl.uint(invalidLeverage) // Invalid short leverage
            ], wallet1);

            // Verify creation failed with invalid-leverage error
            expect(createResult2.result).toBeErr(errInvalidLeverage);
        });

        it('creates a position with higher leverage', () => {
            const closingBlock = getFutureBlock(10);
            const longLeverage = 3 * scalar; // 3x leverage
            const shortLeverage = 2 * scalar; // 2x leverage

            // Create position with higher leverage
            const createResult = simnet.callPublicFn('bitforward', 'create-position', [
                Cl.uint(collateralAmount),
                Cl.uint(closingBlock),
                Cl.bool(true),
                Cl.stringAscii(usdAsset),
                Cl.uint(premium),
                Cl.uint(longLeverage),
                Cl.uint(shortLeverage)
            ], wallet1);

            // Verify position creation was successful
            expect(createResult.result).toBeOk(Cl.uint(1));

            // Verify leverage values were set correctly
            const contractInfo = simnet.callReadOnlyFn('bitforward', 'get-contract', [
                Cl.uint(1)
            ], deployer);

            // Convert to proper format using JSON
            const contractData = JSON.parse(JSON.stringify(contractInfo.result)) as ContractData;

            // Verify leverage values with the correct nested structure
            expect(contractData).not.toBeNull();
            expect(contractData.value.data['long-leverage'].value).toBe((longLeverage).toString());
            expect(contractData.value.data['short-leverage'].value).toBe((shortLeverage).toString());
        });

        it('creates multiple positions with incrementing contract IDs', () => {
            const closingBlock = getFutureBlock(10);

            // Create first position
            const createResult1 = simnet.callPublicFn('bitforward', 'create-position', [
                Cl.uint(collateralAmount),
                Cl.uint(closingBlock),
                Cl.bool(true),
                Cl.stringAscii(usdAsset),
                Cl.uint(premium),
                Cl.uint(scalar),
                Cl.uint(scalar)
            ], wallet1);

            expect(createResult1.result).toBeOk(Cl.uint(1)); // First contract ID

            // Create second position
            const createResult2 = simnet.callPublicFn('bitforward', 'create-position', [
                Cl.uint(collateralAmount),
                Cl.uint(closingBlock),
                Cl.bool(false),
                Cl.stringAscii(usdAsset),
                Cl.uint(premium),
                Cl.uint(scalar),
                Cl.uint(scalar)
            ], wallet1);

            expect(createResult2.result).toBeOk(Cl.uint(2)); // Second contract ID
        });
    });
});