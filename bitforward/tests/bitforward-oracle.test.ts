import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/transactions';

// Get simnet accounts for testing
const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const wallet1 = accounts.get('wallet_1')!;
const wallet2 = accounts.get('wallet_2')!;

/*
 * Tests for the BitForward Oracle contract
 */
describe('bitforward-oracle', () => {
    // Constants for testing
    const usdAsset = 'USD';
    const gbpAsset = 'GBP';
    const eurAsset = 'EUR';
    const btcAsset = 'BTC'; // Unsupported asset
    const usdPrice = 10000000; // 10.0 with 6 decimal places
    const gbpPrice = 8000000;  // 8.0 with 6 decimal places
    const eurPrice = 9000000;  // 9.0 with 6 decimal places
    const zeroPrice = 0;       // Invalid price

    describe('set-price function', () => {
        it('allows owner to set a price for a supported asset', () => {
            // Set price for USD
            const setPriceResult = simnet.callPublicFn('bitforward-oracle', 'set-price', [
                Cl.stringAscii(usdAsset),
                Cl.uint(usdPrice)
            ], deployer);

            // Verify the result is successful
            expect(setPriceResult.result).toBeOk(Cl.bool(true));

            // Get the price to verify it was set correctly
            const getPriceResult = simnet.callReadOnlyFn('bitforward-oracle', 'get-price', [
                Cl.stringAscii(usdAsset)
            ], deployer);

            // Verify we can retrieve the price
            expect(getPriceResult.result).toBeOk(Cl.uint(usdPrice));
        });

        it('prevents non-owners from setting prices', () => {
            // Attempt to set price with a non-owner account
            const setPriceResult = simnet.callPublicFn('bitforward-oracle', 'set-price', [
                Cl.stringAscii(usdAsset),
                Cl.uint(usdPrice)
            ], wallet1);

            // Verify the result is an error with the owner-only error code
            expect(setPriceResult.result).toBeErr(Cl.uint(200)); // err-owner-only
        });

        it('rejects setting price for unsupported assets', () => {
            // Try to set price for an unsupported asset
            const setPriceResult = simnet.callPublicFn('bitforward-oracle', 'set-price', [
                Cl.stringAscii(btcAsset), // Unsupported asset
                Cl.uint(usdPrice)
            ], deployer);

            // Verify we get the appropriate error
            expect(setPriceResult.result).toBeErr(Cl.uint(201)); // err-asset-not-supported
        });

        it('rejects setting price to zero', () => {
            // Try to set a zero price
            const setPriceResult = simnet.callPublicFn('bitforward-oracle', 'set-price', [
                Cl.stringAscii(usdAsset),
                Cl.uint(zeroPrice)
            ], deployer);

            // Verify we get the appropriate error
            expect(setPriceResult.result).toBeErr(Cl.uint(202)); // err-no-value
        });

        it('allows updating an existing price', () => {
            // Set initial price
            simnet.callPublicFn('bitforward-oracle', 'set-price', [
                Cl.stringAscii(usdAsset),
                Cl.uint(usdPrice)
            ], deployer);

            // Update the price
            const newPrice = usdPrice * 2;
            const updateResult = simnet.callPublicFn('bitforward-oracle', 'set-price', [
                Cl.stringAscii(usdAsset),
                Cl.uint(newPrice)
            ], deployer);

            // Verify update was successful
            expect(updateResult.result).toBeOk(Cl.bool(true));

            // Check that the price was actually updated
            const getPriceResult = simnet.callReadOnlyFn('bitforward-oracle', 'get-price', [
                Cl.stringAscii(usdAsset)
            ], deployer);

            expect(getPriceResult.result).toBeOk(Cl.uint(newPrice));
        });
    });

    describe('set-prices batch function', () => {
        it('allows batch updating of multiple prices', () => {
            // Create a list of price updates
            const updates = [
                { asset: usdAsset, price: usdPrice },
                { asset: gbpAsset, price: gbpPrice },
                { asset: eurAsset, price: eurPrice }
            ];

            // Convert to Clarity values
            const clarityUpdates = Cl.list(updates.map(update =>
                Cl.tuple({
                    asset: Cl.stringAscii(update.asset),
                    price: Cl.uint(update.price)
                })
            ));

            // Set prices in batch
            const batchResult = simnet.callPublicFn('bitforward-oracle', 'set-prices', [
                clarityUpdates
            ], deployer);

            // Expect the batch update to succeed with true
            expect(batchResult.result).toBeOk(Cl.bool(true));

            // Verify each price was set correctly
            for (const update of updates) {
                const getPriceResult = simnet.callReadOnlyFn('bitforward-oracle', 'get-price', [
                    Cl.stringAscii(update.asset)
                ], deployer);

                expect(getPriceResult.result).toBeOk(Cl.uint(update.price));
            }
        });

        it('prevents non-owners from batch updating prices', () => {
            // Create a valid price update list
            const updates = [
                { asset: usdAsset, price: usdPrice }
            ];

            // Convert to Clarity values
            const clarityUpdates = Cl.list(updates.map(update =>
                Cl.tuple({
                    asset: Cl.stringAscii(update.asset),
                    price: Cl.uint(update.price)
                })
            ));

            // Attempt batch update as non-owner
            const batchResult = simnet.callPublicFn('bitforward-oracle', 'set-prices', [
                clarityUpdates
            ], wallet1);

            // Verify the batch update fails with owner-only error
            expect(batchResult.result).toBeErr(Cl.uint(200)); // err-owner-only
        });

        it('handles mixed valid and invalid updates in batch', () => {
            // Create a list with both valid and invalid updates
            const updates = [
                { asset: usdAsset, price: usdPrice },             // Valid
                { asset: btcAsset, price: usdPrice },             // Invalid asset
                { asset: gbpAsset, price: zeroPrice },            // Invalid price
                { asset: eurAsset, price: eurPrice }              // Valid
            ];

            // Convert to Clarity values
            const clarityUpdates = Cl.list(updates.map(update =>
                Cl.tuple({
                    asset: Cl.stringAscii(update.asset),
                    price: Cl.uint(update.price)
                })
            ));

            // Set prices in batch
            const batchResult = simnet.callPublicFn('bitforward-oracle', 'set-prices', [
                clarityUpdates
            ], deployer);

            // The batch operation should still succeed overall
            expect(batchResult.result).toBeOk(Cl.bool(true));

            // Check that valid prices were set
            const usdResult = simnet.callReadOnlyFn('bitforward-oracle', 'get-price', [
                Cl.stringAscii(usdAsset)
            ], deployer);
            expect(usdResult.result).toBeOk(Cl.uint(usdPrice));

            // Check that the EUR price was also set
            const eurResult = simnet.callReadOnlyFn('bitforward-oracle', 'get-price', [
                Cl.stringAscii(eurAsset)
            ], deployer);
            expect(eurResult.result).toBeOk(Cl.uint(eurPrice));

            // Verify that invalid entries were not processed
            // BTC should still be unsupported
            const btcResult = simnet.callReadOnlyFn('bitforward-oracle', 'get-price', [
                Cl.stringAscii(btcAsset)
            ], deployer);
            expect(btcResult.result).toBeErr(Cl.uint(201)); // err-asset-not-supported
        });

        it('handles empty batch updates', () => {
            // Create an empty list of updates
            const clarityUpdates = Cl.list([]);

            // Set prices with empty batch
            const batchResult = simnet.callPublicFn('bitforward-oracle', 'set-prices', [
                clarityUpdates
            ], deployer);

            // Should succeed (nothing to update)
            expect(batchResult.result).toBeOk(Cl.bool(true));
        });

        it('processes maximum batch size correctly', () => {
            // Create a list with the maximum number of updates (20)
            const supportedAssets = [usdAsset, gbpAsset, eurAsset];

            const updates = Array.from({ length: 20 }, (_, i) => ({
                asset: supportedAssets[i % supportedAssets.length],
                price: (i + 1) * 1000000
            }));

            // Convert to Clarity values
            const clarityUpdates = Cl.list(updates.map(update =>
                Cl.tuple({
                    asset: Cl.stringAscii(update.asset),
                    price: Cl.uint(update.price)
                })
            ));

            // Set prices in batch
            const batchResult = simnet.callPublicFn('bitforward-oracle', 'set-prices', [
                clarityUpdates
            ], deployer);

            // The batch operation should succeed
            expect(batchResult.result).toBeOk(Cl.bool(true));

            // Verify a sample of prices were set correctly
            const sampleAsset = supportedAssets[0]; // USD
            const expectedPrice = updates.findLast(u => u.asset === sampleAsset)!.price;

            const getPriceResult = simnet.callReadOnlyFn('bitforward-oracle', 'get-price', [
                Cl.stringAscii(sampleAsset)
            ], deployer);

            expect(getPriceResult.result).toBeOk(Cl.uint(expectedPrice));
        });
    });

    describe('get-price function', () => {
        it('returns error for unsupported assets', () => {
            // Try to get price for an unsupported asset
            const getPriceResult = simnet.callReadOnlyFn('bitforward-oracle', 'get-price', [
                Cl.stringAscii('XYZ') // Unsupported asset
            ], deployer);

            // Verify we get the appropriate error
            expect(getPriceResult.result).toBeErr(Cl.uint(201)); // err-asset-not-supported
        });

        it('returns zero for supported assets with no price set', () => {
            // First, make sure there's no price set for the asset
            // This is assuming we started with a clean state

            // Try to get price for a supported asset with no price set
            const getPriceResult = simnet.callReadOnlyFn('bitforward-oracle', 'get-price', [
                Cl.stringAscii(eurAsset) // Assuming this hasn't had a price set yet
            ], deployer);

            // Should return 0 as the default value
            expect(getPriceResult.result).toBeOk(Cl.uint(0));
        });

        it('correctly retrieves prices after they are set', () => {
            // Set a price
            simnet.callPublicFn('bitforward-oracle', 'set-price', [
                Cl.stringAscii(usdAsset),
                Cl.uint(usdPrice)
            ], deployer);

            // Get the price
            const getPriceResult = simnet.callReadOnlyFn('bitforward-oracle', 'get-price', [
                Cl.stringAscii(usdAsset)
            ], deployer);

            // Verify the price is returned correctly
            expect(getPriceResult.result).toBeOk(Cl.uint(usdPrice));
        });
    });
});