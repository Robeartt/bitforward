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
 * Tests for contract closing functionality in the BitForward contract
 */
describe('bitforward-closing', () => {
    // Constants for testing
    const scalar = 1000000; // 1.0 with 6 decimal places
    const collateralAmount = 10000000; // 10 STX (reduced to avoid insufficient funds)
    const premium = 1000000; // 1 STX (reduced to avoid insufficient funds)
    const usdAsset = 'USD';
    const usdPrice = 10000000; // $10 with 6 decimal places
    const updatedUsdPrice = 12000000; // $12 with 6 decimal places

    // Contract status constants
    const statusFilled = Cl.uint(2);
    const statusClosed = Cl.uint(3);

    // Error codes from the contract
    const errContractNotFound = Cl.uint(113);
    const errCloseBlockNotReached = Cl.uint(103);
    const errInvalidStatus = Cl.uint(117);

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

    // Extract the NFT ID from a position creation result
    const extractNftId = (result: any): number => {
        return Number(result.result.value.value);
    };

    // Get the contract ID from an NFT token URI
    const getContractIdFromNft = (nftId: number): number => {
        const uriResult = simnet.callReadOnlyFn('bitforward-nft', 'get-token-uri', [
            Cl.uint(nftId)
        ], deployer);

        // Extract the contract ID from the token URI
        // Token URI returns the contract ID directly as per the NFT implementation
        return Number(uriResult.result.value.value.value);
    };

    // Setup function to create and fill a position before testing closing
    const setupFilledPosition = (isCreatorLong = true, blocksAhead = 10) => {
        // Create a position
        const closingBlock = simnet.burnBlockHeight + blocksAhead;
        const createResult = simnet.callPublicFn('bitforward', 'create-position', [
            Cl.uint(collateralAmount),
            Cl.uint(closingBlock),
            Cl.bool(isCreatorLong),
            Cl.stringAscii(usdAsset),
            Cl.uint(premium),
            Cl.uint(scalar), // 1x leverage for simplicity
            Cl.uint(scalar)
        ], wallet1);
        const createResult2 = simnet.callPublicFn('bitforward', 'create-position', [
            Cl.uint(collateralAmount),
            Cl.uint(closingBlock),
            Cl.bool(isCreatorLong),
            Cl.stringAscii(usdAsset),
            Cl.uint(premium),
            Cl.uint(scalar), // 1x leverage for simplicity
            Cl.uint(scalar)
        ], wallet1);


        // Get the NFT ID from the creation result
        const creatorNftId = extractNftId(createResult);
        console.log("Creator NFT ID:", creatorNftId);

        // Get the actual contract ID from the NFT token URI
        const contractId = getContractIdFromNft(creatorNftId);
        console.log("Contract ID:", contractId);

        // Take the position
        const takeResult = simnet.callPublicFn('bitforward', 'take-position', [
            Cl.uint(contractId)
        ], wallet2);

        // Verify position was taken successfully
        if (takeResult.result.type !== 7) {
            console.log("Failed to take position:", takeResult.result);
            throw new Error("Failed to set up filled position");
        }

        return contractId;
    };

    describe('close-contract', () => {
        it('rejects closing before closing block when no liquidation', () => {
            // Setup a filled position
            const contractId = setupFilledPosition(true, 20); // 20 blocks ahead
            const contractId2 = setupFilledPosition(false, 20); // 20 blocks ahead

            // Attempt to close the contract early
            const closeResult = simnet.callPublicFn('bitforward', 'close-contract', [
                Cl.uint(contractId)
            ], wallet3); // Any account can attempt to close

            console.log("Close result:", closeResult.result);

            // Verify close failed with close-block-not-reached error
            expect(closeResult.result).toBeErr(errCloseBlockNotReached);
        });

        it('can close contract at closing block', () => {
            // Setup a filled position with closing block = current block + 3
            const contractId = setupFilledPosition(true, 3);
            const contractId2 = setupFilledPosition(false, 20); // 20 blocks ahead
            console.log("Contract ID for closing test:", contractId);

            // Advance the blockchain by mining burn blocks to reach closing block
            simnet.mineEmptyBurnBlocks(10);
            console.log("Burn block height after mining:", simnet.burnBlockHeight);

            // Close the contract
            const closeResult = simnet.callPublicFn('bitforward', 'close-contract', [
                Cl.uint(contractId)
            ], wallet3);

            // Log result if it failed
            if (closeResult.result.type !== 7) {
                console.log("Close contract failed:", closeResult.result);

                // Get contract info to see current state
                const contractInfo = simnet.callReadOnlyFn('bitforward', 'get-contract', [
                    Cl.uint(contractId)
                ], deployer);
                console.log("Contract info:", contractInfo.result);
            }

            // Verify close was successful
            expect(closeResult.result).toBeOk(Cl.bool(true));

            // Check contract status was updated
            const contractInfo = simnet.callReadOnlyFn('bitforward', 'get-contract', [
                Cl.uint(contractId)
            ], deployer);

            // Convert to proper format using JSON
            const contractData = JSON.parse(JSON.stringify(contractInfo.result)) as ContractData;

            // Verify contract status and close price
            expect(contractData).not.toBeNull();
            expect(contractData.value.data['status'].value).toBe('3'); // statusClosed
            expect(contractData.value.data['close-price'].value).toBe(usdPrice.toString());
        });

        it('distributes profits correctly when price stays the same', () => {
            // Setup a filled position with equal long and short leverage
            const contractId = setupFilledPosition(true, 1);

            // Advance to closing block
            simnet.mineEmptyBurnBlock();

            // Close the contract
            const closeResult = simnet.callPublicFn('bitforward', 'close-contract', [
                Cl.uint(contractId)
            ], wallet3);

            // Verify close was successful
            expect(closeResult.result).toBeOk(Cl.bool(true));

            // Get the contract to verify payouts
            const contractInfo = simnet.callReadOnlyFn('bitforward', 'get-contract', [
                Cl.uint(contractId)
            ], deployer);

            // Convert to proper format using JSON
            const contractData = JSON.parse(JSON.stringify(contractInfo.result)) as ContractData;

            // Calculate expected payouts:
            // - Long side gets collateral + premium (after fee)
            // - Short side gets collateral
            // - Fee goes to fee recipient

            const premiumFee = premium * 100 / scalar; // 0.01% fee
            const premiumAfterFee = premium - premiumFee;
            const expectedLongPayout = collateralAmount + premiumAfterFee;
            const expectedShortPayout = collateralAmount;

            // Verify the payouts (with approximate matching due to rounding)
            const longPayout = Number(contractData.value.data['long-payout'].value);
            const shortPayout = Number(contractData.value.data['short-payout'].value);
            const premiumFeeValue = Number(contractData.value.data['premium-fee'].value);

            // Use approximately equal for comparison due to potential rounding differences
            expect(longPayout).toBeCloseTo(expectedLongPayout, -5);
            expect(shortPayout).toBeCloseTo(expectedShortPayout, -5);
            expect(premiumFeeValue).toBeCloseTo(premiumFee, -3);
        });

        it('handles long profit scenario correctly', () => {
            // Setup a filled position with creator as long
            const contractId = setupFilledPosition(true, 1);

            // Update price to simulate price increase (20% up)
            simnet.callPublicFn('bitforward-oracle', 'set-price', [
                Cl.stringAscii(usdAsset),
                Cl.uint(updatedUsdPrice) // 20% higher
            ], deployer);

            // Advance to closing block
            simnet.mineEmptyBurnBlock();

            // Close the contract
            const closeResult = simnet.callPublicFn('bitforward', 'close-contract', [
                Cl.uint(contractId)
            ], wallet3);

            // Verify close was successful
            expect(closeResult.result).toBeOk(Cl.bool(true));

            // Get the contract to verify payouts
            const contractInfo = simnet.callReadOnlyFn('bitforward', 'get-contract', [
                Cl.uint(contractId)
            ], deployer);

            // Convert to proper format using JSON
            const contractData = JSON.parse(JSON.stringify(contractInfo.result)) as ContractData;

            // Calculate expected price movement and payouts
            const priceMovement = (updatedUsdPrice - usdPrice) * scalar / usdPrice; // ~20% in fixed point
            const longProfit = collateralAmount * priceMovement / scalar; // Profit from price movement
            const premiumFee = premium * 100 / scalar; // 0.01% fee
            const premiumAfterFee = premium - premiumFee;

            const expectedLongPayout = collateralAmount + longProfit + premiumAfterFee;
            const totalPool = collateralAmount * 2; // Both collaterals
            const expectedShortPayout = totalPool - expectedLongPayout;

            // Verify the payouts (with approximate matching due to rounding)
            const longPayout = Number(contractData.value.data['long-payout'].value);
            const shortPayout = Number(contractData.value.data['short-payout'].value);

            // Use approximately equal for comparison due to potential rounding differences
            expect(longPayout).toBeCloseTo(expectedLongPayout, -5);
            expect(shortPayout).toBeCloseTo(expectedShortPayout, -5);
        });

        it('handles short profit scenario correctly', () => {
            // Setup a filled position with creator as short
            const contractId = setupFilledPosition(false, 1);

            // Update price to simulate price decrease (20% down)
            const decreasedPrice = usdPrice * 8 / 10; // 20% lower
            simnet.callPublicFn('bitforward-oracle', 'set-price', [
                Cl.stringAscii(usdAsset),
                Cl.uint(decreasedPrice)
            ], deployer);

            // Advance to closing block
            simnet.mineEmptyBurnBlock();

            // Close the contract
            const closeResult = simnet.callPublicFn('bitforward', 'close-contract', [
                Cl.uint(contractId)
            ], wallet3);

            // Verify close was successful
            expect(closeResult.result).toBeOk(Cl.bool(true));

            // Get the contract to verify payouts
            const contractInfo = simnet.callReadOnlyFn('bitforward', 'get-contract', [
                Cl.uint(contractId)
            ], deployer);

            // Convert to proper format using JSON
            const contractData = JSON.parse(JSON.stringify(contractInfo.result)) as ContractData;

            // Calculate expected price movement and payouts
            const priceMovement = (decreasedPrice - usdPrice) * scalar / usdPrice; // -20% in fixed point
            // Long side loses money, short side profits
            const longLoss = collateralAmount * (-priceMovement) / scalar; // Loss from price movement
            const premiumFee = premium * 100 / scalar; // 0.01% fee
            const premiumAfterFee = premium - premiumFee;

            // Long gets collateral - loss + premium (after fee)
            const expectedLongPayout = collateralAmount - longLoss + premiumAfterFee;
            const totalPool = collateralAmount * 2; // Both collaterals
            const expectedShortPayout = totalPool - expectedLongPayout;

            // Verify the payouts (with approximate matching due to rounding)
            const longPayout = Number(contractData.value.data['long-payout'].value);
            const shortPayout = Number(contractData.value.data['short-payout'].value);

            // Use approximately equal for comparison due to potential rounding differences
            expect(longPayout).toBeCloseTo(expectedLongPayout, -5);
            expect(shortPayout).toBeCloseTo(expectedShortPayout, -5);
        });

        it('closes contract early if long position would be liquidated', () => {
            // Setup a filled position with higher leverage
            const closingBlock = simnet.burnBlockHeight + 20; // Far in the future
            const longLeverage = 5 * scalar; // 5x leverage

            // Create a long position with 5x leverage
            const createResult = simnet.callPublicFn('bitforward', 'create-position', [
                Cl.uint(collateralAmount),
                Cl.uint(closingBlock),
                Cl.bool(true), // Long
                Cl.stringAscii(usdAsset),
                Cl.uint(premium),
                Cl.uint(longLeverage), // 5x leverage
                Cl.uint(scalar) // 1x for short
            ], wallet1);

            // Get the NFT ID and then the contract ID
            const creatorNftId = extractNftId(createResult);
            const contractId = getContractIdFromNft(creatorNftId);

            // Take the position
            simnet.callPublicFn('bitforward', 'take-position', [
                Cl.uint(contractId)
            ], wallet2);

            // Update price to cause liquidation (down by >20%)
            // With 5x leverage, a ~20% drop would liquidate the long position
            const liquidationPrice = usdPrice * 75 / 100; // 25% down
            simnet.callPublicFn('bitforward-oracle', 'set-price', [
                Cl.stringAscii(usdAsset),
                Cl.uint(liquidationPrice)
            ], deployer);

            // Attempt to close the contract before closing block
            const closeResult = simnet.callPublicFn('bitforward', 'close-contract', [
                Cl.uint(contractId)
            ], wallet3);

            // Verify close was successful due to liquidation condition
            expect(closeResult.result).toBeOk(Cl.bool(true));

            // Verify contract was closed
            const contractInfo = simnet.callReadOnlyFn('bitforward', 'get-contract', [
                Cl.uint(contractId)
            ], deployer);

            // Convert to proper format using JSON
            const contractData = JSON.parse(JSON.stringify(contractInfo.result)) as ContractData;

            // Verify contract status
            expect(contractData).not.toBeNull();
            expect(contractData.value.data['status'].value).toBe('3'); // statusClosed

            // Verify the short side received most of the pool
            const shortPayout = Number(contractData.value.data['short-payout'].value);
            const longPayout = Number(contractData.value.data['long-payout'].value);

            // Short should have significantly more than long due to liquidation
            expect(shortPayout).toBeGreaterThan(longPayout);
        });

        it('rejects closing a non-existent contract', () => {
            // Attempt to close a non-existent contract
            const nonExistentId = 999;
            const closeResult = simnet.callPublicFn('bitforward', 'close-contract', [
                Cl.uint(nonExistentId)
            ], wallet3);

            // Verify close failed with contract-not-found error
            expect(closeResult.result).toBeErr(errContractNotFound);
        });

        it('rejects closing a contract that is not filled', () => {
            // Create a position but don't fill it
            const closingBlock = simnet.burnBlockHeight + 10;
            const createResult = simnet.callPublicFn('bitforward', 'create-position', [
                Cl.uint(collateralAmount),
                Cl.uint(closingBlock),
                Cl.bool(true),
                Cl.stringAscii(usdAsset),
                Cl.uint(premium),
                Cl.uint(scalar),
                Cl.uint(scalar)
            ], wallet1);

            // Get the NFT ID and then the contract ID
            const creatorNftId = extractNftId(createResult);
            const contractId = getContractIdFromNft(creatorNftId);

            // Advance to closing block
            simnet.mineEmptyBurnBlocks(10);

            // Attempt to close the unfilled contract
            const closeResult = simnet.callPublicFn('bitforward', 'close-contract', [
                Cl.uint(contractId)
            ], wallet3);

            // Verify close failed with invalid-status error
            expect(closeResult.result).toBeErr(errInvalidStatus);
        });

        it('rejects closing an already closed contract', () => {
            // Setup a filled position
            const contractId = setupFilledPosition(true, 1);

            // Advance to closing block
            simnet.mineEmptyBurnBlock();

            // Close the contract
            simnet.callPublicFn('bitforward', 'close-contract', [
                Cl.uint(contractId)
            ], wallet3);

            // Attempt to close it again
            const closeAgainResult = simnet.callPublicFn('bitforward', 'close-contract', [
                Cl.uint(contractId)
            ], wallet3);

            // Verify second close failed with invalid-status error
            expect(closeAgainResult.result).toBeErr(errInvalidStatus);
        });
    });
});