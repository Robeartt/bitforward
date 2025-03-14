import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/transactions';
import { BitForwardUtils, ERRORS, STATUS_OPEN, STATUS_FILLED, STATUS_CLOSED, SCALAR } from './utils/bitforward-test-utils';

// Initialize the BitForward test utilities
const utils = new BitForwardUtils(simnet);

// Get simnet accounts for testing
const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const wallet1 = accounts.get('wallet_1')!;
const wallet2 = accounts.get('wallet_2')!;
const wallet3 = accounts.get('wallet_3')!;

/*
 * Comprehensive Tests for position taking in BitForward contract
 * Using the BitForwardUtils helper functions with better error reporting
 */
describe('bitforward-position-taking-extended', () => {
    // Set up test environment before each test
    beforeEach(async () => {
        await utils.initialize();
    });

    describe('take-position success cases', () => {
        it('takes an open long position', async () => {
            // Create a long position
            const createResult = utils.createPosition(
                wallet1,
                1, // 1 sBTC collateral
                true, // Long position
                'USD',
                0.1, // 0.1 sBTC premium
                1,
                1
            );

            // Check if the result is OK (successful)
            expect(createResult.result).toBeOk(expect.anything());

            // Get the position ID from the result
            const creatorPositionId = utils.getPositionId(createResult);
            expect(creatorPositionId).toBeGreaterThan(0);

            // Get token URI to find the contract ID
            const nftResult = simnet.callReadOnlyFn(
                'bitforward-nft',
                'get-token-uri',
                [Cl.uint(creatorPositionId)],
                deployer
            );

            expect(nftResult.result).toBeOk(expect.anything());
            const contractId = utils.extractNumber(nftResult.result.value.value);
            expect(contractId).toBeGreaterThan(0);

            // Take the position (which should be a short position)
            const takeResult = utils.takePosition(wallet2, contractId);

            // Check if the result is OK (successful)
            expect(takeResult.result).toBeOk(expect.anything());

            // Get the taker's position ID
            const takerPositionId = utils.getPositionId(takeResult);
            expect(takerPositionId).toBeGreaterThan(0);

            // Get contract details
            const contract = utils.getContract(contractId);

            // Verify contract details
            expect(contract).not.toBeNull();
            expect(contract?.status).toBe(STATUS_FILLED);
            expect(contract?.['long-id']).toBe(creatorPositionId);
            expect(contract?.['short-id']).toBe(takerPositionId);

            // Verify NFT ownership
            const longOwnerResult = simnet.callReadOnlyFn(
                'bitforward-nft',
                'get-owner',
                [Cl.uint(creatorPositionId)],
                deployer
            );
            expect(longOwnerResult.result).toBeOk(Cl.some(Cl.principal(wallet1)));

            const shortOwnerResult = simnet.callReadOnlyFn(
                'bitforward-nft',
                'get-owner',
                [Cl.uint(takerPositionId)],
                deployer
            );
            expect(shortOwnerResult.result).toBeOk(Cl.some(Cl.principal(wallet2)));
        });

        it('takes an open short position', async () => {
            // Create a short position
            const createResult = utils.createPosition(
                wallet1,
                1, // 1 sBTC collateral
                false, // Short position
                'USD',
                0.1, // 0.1 sBTC premium
                1,
                1
            );

            // Check if the result is OK (successful)
            expect(createResult.result).toBeOk(expect.anything());

            // Get the position ID from the result
            const creatorPositionId = utils.getPositionId(createResult);
            expect(creatorPositionId).toBeGreaterThan(0);

            // Get token URI to find the contract ID
            const nftResult = simnet.callReadOnlyFn(
                'bitforward-nft',
                'get-token-uri',
                [Cl.uint(creatorPositionId)],
                deployer
            );

            expect(nftResult.result).toBeOk(expect.anything());
            const contractId = utils.extractNumber(nftResult.result.value.value);
            expect(contractId).toBeGreaterThan(0);

            // Take the position (which should be a long position)
            const takeResult = utils.takePosition(wallet2, contractId);

            // Check if the result is OK (successful)
            expect(takeResult.result).toBeOk(expect.anything());

            // Get the taker's position ID
            const takerPositionId = utils.getPositionId(takeResult);
            expect(takerPositionId).toBeGreaterThan(0);

            // Get contract details
            const contract = utils.getContract(contractId);

            // Verify contract details
            expect(contract).not.toBeNull();
            expect(contract?.status).toBe(STATUS_FILLED);
            expect(contract?.['long-id']).toBe(takerPositionId);
            expect(contract?.['short-id']).toBe(creatorPositionId);

            // Verify NFT ownership
            const shortOwnerResult = simnet.callReadOnlyFn(
                'bitforward-nft',
                'get-owner',
                [Cl.uint(creatorPositionId)],
                deployer
            );
            expect(shortOwnerResult.result).toBeOk(Cl.some(Cl.principal(wallet1)));

            const longOwnerResult = simnet.callReadOnlyFn(
                'bitforward-nft',
                'get-owner',
                [Cl.uint(takerPositionId)],
                deployer
            );
            expect(longOwnerResult.result).toBeOk(Cl.some(Cl.principal(wallet2)));
        });

        it('takes positions with different leverage values', async () => {
            // Create a position with high leverage
            const longLeverage = 5;  // 5x
            const shortLeverage = 2; // 2x

            const createResult = utils.createPosition(
                wallet1,
                1, // 1 sBTC collateral
                true, // Long position
                'USD',
                0.1, // 0.1 sBTC premium
                longLeverage,
                shortLeverage
            );

            // Check if the result is OK (successful)
            expect(createResult.result).toBeOk(expect.anything());

            // Get the position ID from the result
            const creatorPositionId = utils.getPositionId(createResult);
            expect(creatorPositionId).toBeGreaterThan(0);

            // Get token URI to find the contract ID
            const nftResult = simnet.callReadOnlyFn(
                'bitforward-nft',
                'get-token-uri',
                [Cl.uint(creatorPositionId)],
                deployer
            );

            expect(nftResult.result).toBeOk(expect.anything());
            const contractId = utils.extractNumber(nftResult.result.value.value);
            expect(contractId).toBeGreaterThan(0);

            // Take the position
            const takeResult = utils.takePosition(wallet2, contractId);

            // Check if the result is OK (successful)
            expect(takeResult.result).toBeOk(expect.anything());

            // Get contract details
            const contract = utils.getContract(contractId);

            // Verify contract details
            expect(contract).not.toBeNull();
            expect(contract?.status).toBe(STATUS_FILLED);
            expect(contract?.['long-leverage']).toBe(utils.scaleLeverage(longLeverage));
            expect(contract?.['short-leverage']).toBe(utils.scaleLeverage(shortLeverage));
        });

        it('takes positions with different asset types', async () => {
            // Test taking positions with each supported asset
            const supportedAssets = ['USD', 'EUR', 'GBP'];

            for (const asset of supportedAssets) {
                // Set a price for this asset
                await utils.setAssetPrice(asset, 10);

                // Create a position with this asset
                const createResult = utils.createPosition(
                    wallet1,
                    1, // 1 sBTC collateral
                    true, // Long position
                    asset, // Current asset being tested
                    0.1, // 0.1 sBTC premium
                    1,
                    1
                );

                // Check if the result is OK (successful)
                expect(createResult.result).toBeOk(expect.anything());

                // Get the position ID from the result
                const creatorPositionId = utils.getPositionId(createResult);
                expect(creatorPositionId).toBeGreaterThan(0);

                // Get token URI to find the contract ID
                const nftResult = simnet.callReadOnlyFn(
                    'bitforward-nft',
                    'get-token-uri',
                    [Cl.uint(creatorPositionId)],
                    deployer
                );

                expect(nftResult.result).toBeOk(expect.anything());
                const contractId = utils.extractNumber(nftResult.result.value.value);
                expect(contractId).toBeGreaterThan(0);

                // Take the position
                const takeResult = utils.takePosition(wallet2, contractId);

                // Check if the result is OK (successful)
                expect(takeResult.result).toBeOk(expect.anything());

                // Get contract details
                const contract = utils.getContract(contractId);

                // Verify contract details
                expect(contract).not.toBeNull();
                expect(contract?.status).toBe(STATUS_FILLED);
                expect(contract?.asset).toBe(asset);
            }
        });

        it('allows positions to be taken by different users', async () => {
            // Create first position (long)
            const createResult1 = utils.createPosition(
                wallet1,
                1, // 1 sBTC collateral
                true, // Long position
                'USD',
                0.1, // 0.1 sBTC premium
                1,
                1
            );

            expect(createResult1.result).toBeOk(expect.anything());
            const positionId1 = utils.getPositionId(createResult1);
            const nftResult1 = simnet.callReadOnlyFn(
                'bitforward-nft',
                'get-token-uri',
                [Cl.uint(positionId1)],
                deployer
            );
            const contractId1 = utils.extractNumber(nftResult1.result.value.value);

            // Create second position (short)
            const createResult2 = utils.createPosition(
                wallet1,
                1, // 1 sBTC collateral
                false, // Short position
                'USD',
                0.1, // 0.1 sBTC premium
                1,
                1
            );

            expect(createResult2.result).toBeOk(expect.anything());
            const positionId2 = utils.getPositionId(createResult2);
            const nftResult2 = simnet.callReadOnlyFn(
                'bitforward-nft',
                'get-token-uri',
                [Cl.uint(positionId2)],
                deployer
            );
            const contractId2 = utils.extractNumber(nftResult2.result.value.value);

            // Take first position with wallet2
            const takeResult1 = utils.takePosition(wallet2, contractId1);
            expect(takeResult1.result).toBeOk(expect.anything());

            // Take second position with wallet3
            const takeResult2 = utils.takePosition(wallet3, contractId2);
            expect(takeResult2.result).toBeOk(expect.anything());

            // Verify both contracts are filled with correct values
            const contract1 = utils.getContract(contractId1);
            expect(contract1).not.toBeNull();
            expect(contract1?.status).toBe(STATUS_FILLED);

            const contract2 = utils.getContract(contractId2);
            expect(contract2).not.toBeNull();
            expect(contract2?.status).toBe(STATUS_FILLED);
        });

        it('handles positions with negative premium', async () => {
            // Create a position with negative premium (short paying long)
            const createResult = utils.createPosition(
                wallet1,
                1, // 1 sBTC collateral
                true, // Long position
                'USD',
                -0.1, // -0.1 sBTC premium (negative - long pays short)
                1,
                1
            );

            // Check if the result is OK (successful)
            expect(createResult.result).toBeOk(expect.anything());

            // Get the position ID from the result
            const creatorPositionId = utils.getPositionId(createResult);
            expect(creatorPositionId).toBeGreaterThan(0);

            // Get token URI to find the contract ID
            const nftResult = simnet.callReadOnlyFn(
                'bitforward-nft',
                'get-token-uri',
                [Cl.uint(creatorPositionId)],
                deployer
            );

            expect(nftResult.result).toBeOk(expect.anything());
            const contractId = utils.extractNumber(nftResult.result.value.value);
            expect(contractId).toBeGreaterThan(0);

            // Take the position
            const takeResult = utils.takePosition(wallet2, contractId);

            // Check if the result is OK (successful)
            expect(takeResult.result).toBeOk(expect.anything());

            // Get contract details
            const contract = utils.getContract(contractId);

            // Verify contract details
            expect(contract).not.toBeNull();
            expect(contract?.status).toBe(STATUS_FILLED);
            // For negative premiums, verify the premium is negative
            expect(contract?.premium).toBeLessThan(0);
        });

        it('takes a position with large collateral amount', async () => {
            // Create a position with larger collateral but within wallet limits
            const collateralAmount = 5; // 5 sBTC

            const createResult = utils.createPosition(
                wallet1,
                collateralAmount,
                true, // Long position
                'USD',
                0.1, // 0.1 sBTC premium
                1,
                1
            );

            // Check if the result is OK (successful)
            expect(createResult.result).toBeOk(expect.anything());

            // Get the position ID from the result
            const creatorPositionId = utils.getPositionId(createResult);
            expect(creatorPositionId).toBeGreaterThan(0);

            // Get token URI to find the contract ID
            const nftResult = simnet.callReadOnlyFn(
                'bitforward-nft',
                'get-token-uri',
                [Cl.uint(creatorPositionId)],
                deployer
            );

            expect(nftResult.result).toBeOk(expect.anything());
            const contractId = utils.extractNumber(nftResult.result.value.value);
            expect(contractId).toBeGreaterThan(0);

            // Take the position
            const takeResult = utils.takePosition(wallet2, contractId);

            // Check if the result is OK (successful)
            expect(takeResult.result).toBeOk(expect.anything());

            // Get contract details
            const contract = utils.getContract(contractId);

            // Verify contract details
            expect(contract).not.toBeNull();
            expect(contract?.status).toBe(STATUS_FILLED);
            expect(contract?.['collateral-amount']).toBe(utils.scaleAmount(collateralAmount));
        });
    });

    describe('take-position error cases', () => {
        it('rejects taking non-existent contracts', async () => {
            // Attempt to take a non-existent contract
            const nonExistentId = 999;
            const takeResult = utils.takePosition(wallet2, nonExistentId);

            // Verify it returns CONTRACT_NOT_FOUND error
            expect(takeResult.result).toBeErr(Cl.uint(ERRORS.CONTRACT_NOT_FOUND));

            // Get and verify error message
            const errorCode = utils.getErrorCode(takeResult);
            if (errorCode !== null) {
                const errorMessage = utils.getErrorMessage(errorCode);
                expect(errorMessage).toBe("Contract not found");
            }
        });

        it('rejects taking an already filled position', async () => {
            // Create a long position
            const createResult = utils.createPosition(
                wallet1,
                1, // 1 sBTC collateral
                true, // Long position
                'USD',
                0.1, // 0.1 sBTC premium
                1,
                1
            );

            // Get the position ID from the result
            const creatorPositionId = utils.getPositionId(createResult);
            const nftResult = simnet.callReadOnlyFn(
                'bitforward-nft',
                'get-token-uri',
                [Cl.uint(creatorPositionId)],
                deployer
            );
            const contractId = utils.extractNumber(nftResult.result.value.value);

            // Take the position first time (should succeed)
            const takeResult1 = utils.takePosition(wallet2, contractId);
            expect(takeResult1.result).toBeOk(expect.anything());

            // Try to take the position again (should fail)
            const takeResult2 = utils.takePosition(wallet3, contractId);

            // Verify it returns ALREADY_HAS_COUNTERPARTY error
            expect(takeResult2.result).toBeErr(Cl.uint(ERRORS.ALREADY_HAS_COUNTERPARTY));

            // Get and verify error message
            const errorCode = utils.getErrorCode(takeResult2);
            if (errorCode !== null) {
                const errorMessage = utils.getErrorMessage(errorCode);
                expect(errorMessage).toBe("Already has counterparty");
            }
        });

        it('handles contract that already has a counterparty', async () => {
            // Setup a filled position with the createAndTakePosition utility
            const result = utils.createAndTakePosition(
                wallet1,
                wallet2,
                1, // 1 sBTC collateral
                true, // Creator is long
                'USD',
                0.1, // 0.1 sBTC premium
                1,
                1
            );

            expect(result.contractId).toBeGreaterThan(0);
            expect(result.creatorPositionId).toBeGreaterThan(0);
            expect(result.takerPositionId).toBeGreaterThan(0);

            // Try to take the position again
            const takeResult = utils.takePosition(wallet3, result.contractId);

            // Verify it returns ALREADY_HAS_COUNTERPARTY error
            expect(takeResult.result).toBeErr(Cl.uint(ERRORS.ALREADY_HAS_COUNTERPARTY));
        });
    });
});