import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/transactions';

// Get simnet accounts for testing
const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const wallet1 = accounts.get('wallet_1')!;
const wallet2 = accounts.get('wallet_2')!;
const wallet3 = accounts.get('wallet_3')!;

// Define a proper interface for the contract data
interface ContractData {
    'collateral-amount': any;
    'premium': any;
    'premium-fee': any;
    'open-price': any;
    'close-price': any;
    'closing-block': any;
    'asset': any;
    'long-leverage': any;
    'short-leverage': any;
    'status': any;
    'long-id': any;
    'short-id': any;
    'long-payout': any;
    'short-payout': any;
}

// Define an interface for the close result
interface CloseResult {
    'long-payout': number;
    'short-payout': number;
    'premium-fee': number;
}

/*
 * Integration tests for the BitForward contract
 */
describe('bitforward-integration', () => {
    // Constants for testing
    const scalar = 1000000; // 1.0 with 6 decimal places
    const scalar2x = 2 * scalar; // 2.0 with 6 decimal places
    const collateralAmount = 1000000000; // 1000 STX
    const premium = 10000000; // 10 STX
    const usdAsset = 'USD';
    const usdPrice = 10000000; // $10 with 6 decimal places
    const updatedUsdPrice = 12000000; // $12 with 6 decimal places

    // Helper to extract a number from the result
    const extractNumberFromResult = (result: any): number => {
        // Convert result to string and parse
        return parseInt(JSON.stringify(result).replace(/[^0-9]/g, ''));
    };

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

    it('completes full contract lifecycle with long profit', () => {
        // 1. Setup the oracle with initial price
        simnet.callPublicFn('bitforward-oracle', 'set-price', [
            Cl.stringAscii(usdAsset),
            Cl.uint(usdPrice)
        ], deployer);

        // 2. Create a long position
        const closingBlock = simnet.burnBlockHeight + 5;
        const createResult = simnet.callPublicFn('bitforward', 'create-position', [
            Cl.uint(collateralAmount),
            Cl.uint(closingBlock),
            Cl.bool(true), // Long position
            Cl.stringAscii(usdAsset),
            Cl.uint(premium),
            Cl.uint(scalar2x), // 2x leverage
            Cl.uint(scalar)   // 1x leverage for short
        ], wallet1);

        const contractId = extractNumberFromResult(createResult.result);
        const longPositionId = 1;

        // 3. Take the short side of the position
        const takeResult = simnet.callPublicFn('bitforward', 'take-position', [
            Cl.uint(contractId)
        ], wallet2);

        const shortPositionId = extractNumberFromResult(takeResult.result);

        // 4. Verify both positions are correctly registered
        let contractInfo = simnet.callReadOnlyFn('bitforward', 'get-contract', [
            Cl.uint(contractId)
        ], deployer);

        // Convert to proper format using JSON
        let contractData = JSON.parse(JSON.stringify(contractInfo.result)) as ContractData;

        // Verify contract status and position IDs
        expect(contractData).not.toBeNull();
        expect(contractData['status']).toEqual(2); // statusFilled
        expect(contractData['long-id']).toEqual(longPositionId);
        expect(contractData['short-id']).toEqual(shortPositionId);

        // 5. Update price to create profit for long position
        simnet.callPublicFn('bitforward-oracle', 'set-price', [
            Cl.stringAscii(usdAsset),
            Cl.uint(updatedUsdPrice) // 20% higher
        ], deployer);

        // 6. Advance to closing block
        for (let i = 0; i < 5; i++) {
            simnet.mineBlock([]);
        }

        // 7. Close the contract
        const closeResult = simnet.callPublicFn('bitforward', 'close-contract', [
            Cl.uint(contractId)
        ], wallet3);

        // 8. Verify contract was closed successfully
        expect(closeResult.result).toBeOk(expect.anything());

        // 9. Verify final contract state
        contractInfo = simnet.callReadOnlyFn('bitforward', 'get-contract', [
            Cl.uint(contractId)
        ], deployer);

        contractData = JSON.parse(JSON.stringify(contractInfo.result)) as ContractData;
        expect(contractData).not.toBeNull();
        expect(contractData['status']).toEqual(3); // statusClosed
        expect(contractData['close-price']).toEqual(updatedUsdPrice);

        // 10. Verify payouts
        const closeResultData = JSON.parse(JSON.stringify(closeResult.result)) as CloseResult;
        const longPayout = closeResultData['long-payout'];
        const shortPayout = closeResultData['short-payout'];

        // Long should have profit due to price increase and 2x leverage
        expect(longPayout).toBeGreaterThan(collateralAmount + premium);

        // Total pool equals 2 * collateralAmount
        expect(longPayout + shortPayout).toBeCloseTo(collateralAmount * 2, -3);
    });

    it('completes full contract lifecycle with short profit', () => {
        // 1. Setup the oracle with initial price
        simnet.callPublicFn('bitforward-oracle', 'set-price', [
            Cl.stringAscii(usdAsset),
            Cl.uint(usdPrice)
        ], deployer);

        // 2. Create a short position
        const closingBlock = simnet.burnBlockHeight + 5;
        const createResult = simnet.callPublicFn('bitforward', 'create-position', [
            Cl.uint(collateralAmount),
            Cl.uint(closingBlock),
            Cl.bool(false), // Short position
            Cl.stringAscii(usdAsset),
            Cl.uint(premium),
            Cl.uint(scalar),   // 1x leverage for long
            Cl.uint(scalar2x)  // 2x leverage for short
        ], wallet1);

        const contractId = extractNumberFromResult(createResult.result);
        const shortPositionId = 1;

        // 3. Take the long side of the position
        const takeResult = simnet.callPublicFn('bitforward', 'take-position', [
            Cl.uint(contractId)
        ], wallet2);

        const longPositionId = extractNumberFromResult(takeResult.result);

        // 4. Verify both positions are correctly registered
        let contractInfo = simnet.callReadOnlyFn('bitforward', 'get-contract', [
            Cl.uint(contractId)
        ], deployer);

        // Convert to proper format using JSON
        let contractData = JSON.parse(JSON.stringify(contractInfo.result)) as ContractData;

        // Verify contract status and position IDs
        expect(contractData).not.toBeNull();
        expect(contractData['status']).toEqual(2); // statusFilled
        expect(contractData['long-id']).toEqual(longPositionId);
        expect(contractData['short-id']).toEqual(shortPositionId);

        // 5. Update price to create profit for short position
        const decreasedPrice = usdPrice * 8 / 10; // 20% down
        simnet.callPublicFn('bitforward-oracle', 'set-price', [
            Cl.stringAscii(usdAsset),
            Cl.uint(decreasedPrice)
        ], deployer);

        // 6. Advance to closing block
        for (let i = 0; i < 5; i++) {
            simnet.mineBlock([]);
        }

        // 7. Close the contract
        const closeResult = simnet.callPublicFn('bitforward', 'close-contract', [
            Cl.uint(contractId)
        ], wallet3);

        // 8. Verify contract was closed successfully
        expect(closeResult.result).toBeOk(expect.anything());

        // 9. Verify final contract state
        contractInfo = simnet.callReadOnlyFn('bitforward', 'get-contract', [
            Cl.uint(contractId)
        ], deployer);

        contractData = JSON.parse(JSON.stringify(contractInfo.result)) as ContractData;
        expect(contractData).not.toBeNull();
        expect(contractData['status']).toEqual(3); // statusClosed
        expect(contractData['close-price']).toEqual(decreasedPrice);

        // 10. Verify payouts
        const closeResultData = JSON.parse(JSON.stringify(closeResult.result)) as CloseResult;
        const longPayout = closeResultData['long-payout'];
        const shortPayout = closeResultData['short-payout'];

        // Short should have profit due to price decrease and 2x leverage
        expect(shortPayout).toBeGreaterThan(collateralAmount);

        // Premium should still go to the long side
        expect(longPayout).toBeLessThan(collateralAmount + premium);

        // Total pool equals 2 * collateralAmount
        expect(longPayout + shortPayout).toBeCloseTo(collateralAmount * 2, -3);
    });

    it('handles liquidation scenario correctly', () => {
        // 1. Setup the oracle with initial price
        simnet.callPublicFn('bitforward-oracle', 'set-price', [
            Cl.stringAscii(usdAsset),
            Cl.uint(usdPrice)
        ], deployer);

        // 2. Create a position with high leverage
        const highLeverage = 10 * scalar; // 10x leverage
        const closingBlock = simnet.burnBlockHeight + 20; // Far in the future

        const createResult = simnet.callPublicFn('bitforward', 'create-position', [
            Cl.uint(collateralAmount),
            Cl.uint(closingBlock),
            Cl.bool(true), // Long position
            Cl.stringAscii(usdAsset),
            Cl.uint(premium),
            Cl.uint(highLeverage), // 10x leverage for long
            Cl.uint(scalar)        // 1x leverage for short
        ], wallet1);

        const contractId = extractNumberFromResult(createResult.result);

        // 3. Take the short side of the position
        simnet.callPublicFn('bitforward', 'take-position', [
            Cl.uint(contractId)
        ], wallet2);

        // 4. Update price to trigger liquidation (down by >10%)
        // With 10x leverage, a 10% drop would exceed the liquidation threshold
        const liquidationPrice = usdPrice * 85 / 100; // 15% down
        simnet.callPublicFn('bitforward-oracle', 'set-price', [
            Cl.stringAscii(usdAsset),
            Cl.uint(liquidationPrice)
        ], deployer);

        // 5. Close the contract (should succeed due to liquidation condition)
        const closeResult = simnet.callPublicFn('bitforward', 'close-contract', [
            Cl.uint(contractId)
        ], wallet3);

        // 6. Verify contract was closed successfully
        expect(closeResult.result).toBeOk(expect.anything());

        // 7. Verify final contract state
        const contractInfo = simnet.callReadOnlyFn('bitforward', 'get-contract', [
            Cl.uint(contractId)
        ], deployer);

        const contractData = JSON.parse(JSON.stringify(contractInfo.result)) as ContractData;
        expect(contractData).not.toBeNull();
        expect(contractData['status']).toEqual(3); // statusClosed
        expect(contractData['close-price']).toEqual(liquidationPrice);

        // 8. Verify short position gets most of the pool due to liquidation
        const closeResultData = JSON.parse(JSON.stringify(closeResult.result)) as CloseResult;
        const longPayout = closeResultData['long-payout'];
        const shortPayout = closeResultData['short-payout'];

        // Long should lose most of their stake due to liquidation
        expect(longPayout).toBeLessThan(collateralAmount / 2);

        // Short should get most of the pool
        expect(shortPayout).toBeGreaterThan(collateralAmount * 3 / 2);
    });
});