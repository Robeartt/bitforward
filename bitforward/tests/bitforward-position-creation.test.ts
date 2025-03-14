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
 * Comprehensive Tests for position creation in BitForward contract
 * Using the BitForwardUtils helper functions with better error reporting
 */
describe('bitforward-position-creation-extended', () => {
    // Set up test environment before each test
    beforeEach(async () => {
        await utils.initialize();
    });

    describe('create-position success cases', () => {
        it('creates a long position with valid parameters', () => {
            // Create a long position with basic parameters
            const createResult = utils.createPosition(
                wallet1,
                1, // 1 sBTC collateral (reduced for 10 sBTC limit)
                true,
                'USD',
                0.1, // 0.1 sBTC premium (reduced for 10 sBTC limit)
                1,
                1
            );

            // Check if the result is OK (successful)
            expect(createResult.result).toBeOk(expect.anything());

            // Get the position ID from the result
            const positionId = utils.getPositionId(createResult);
            expect(positionId).toBeGreaterThan(0);

            // Get token URI to find the contract ID
            const nftResult = simnet.callReadOnlyFn(
                'bitforward-nft',
                'get-token-uri',
                [Cl.uint(positionId)],
                deployer
            );

            expect(nftResult.result).toBeOk(expect.anything());
            const contractId = utils.extractNumber(nftResult.result.value.value);
            expect(contractId).toBeGreaterThan(0);

            // Get contract details
            const contract = utils.getContract(contractId);

            // Verify contract details
            expect(contract).not.toBeNull();
            expect(contract?.status).toBe(STATUS_OPEN);
            expect(contract?.['collateral-amount']).toBe(utils.scaleAmount(1));
            expect(contract?.premium).toBe(utils.scaleAmount(0.1));
            expect(contract?.asset).toBe('USD');
            expect(contract?.['long-id']).toBe(positionId);
            expect(contract?.['short-id']).toBe(0);
            expect(contract?.['long-leverage']).toBe(utils.scaleLeverage(1));
            expect(contract?.['short-leverage']).toBe(utils.scaleLeverage(1));
        });

        it('creates a short position with valid parameters', () => {
            // Create a short position
            const createResult = utils.createPosition(
                wallet1,
                1, // 1 sBTC collateral (reduced for 10 sBTC limit)
                false, // Short position
                'USD',
                0.1, // 0.1 sBTC premium (reduced for 10 sBTC limit)
                1,
                1
            );

            // Check if the result is OK (successful)
            expect(createResult.result).toBeOk(expect.anything());

            // Get the position ID from the result
            const positionId = utils.getPositionId(createResult);
            expect(positionId).toBeGreaterThan(0);

            // Get token URI to find the contract ID
            const nftResult = simnet.callReadOnlyFn(
                'bitforward-nft',
                'get-token-uri',
                [Cl.uint(positionId)],
                deployer
            );

            expect(nftResult.result).toBeOk(expect.anything());
            const contractId = utils.extractNumber(nftResult.result.value.value);
            expect(contractId).toBeGreaterThan(0);

            // Get contract details
            const contract = utils.getContract(contractId);

            // Verify contract details
            expect(contract).not.toBeNull();
            expect(contract?.status).toBe(STATUS_OPEN);
            expect(contract?.['collateral-amount']).toBe(utils.scaleAmount(1));
            expect(contract?.premium).toBe(utils.scaleAmount(0.1));
            expect(contract?.asset).toBe('USD');
            expect(contract?.['long-id']).toBe(0);
            expect(contract?.['short-id']).toBe(positionId);
            expect(contract?.['long-leverage']).toBe(utils.scaleLeverage(1));
            expect(contract?.['short-leverage']).toBe(utils.scaleLeverage(1));
        });

        it('handles negative premium correctly', () => {
            // Create a position with negative premium (long paying short)
            const createResult = utils.createPosition(
                wallet1,
                1, // 1 sBTC collateral (reduced for 10 sBTC limit)
                true,
                'USD',
                -0.1, // -0.1 sBTC premium (reduced for 10 sBTC limit)
                1,
                1
            );

            // Check if the result is OK (successful)
            expect(createResult.result).toBeOk(expect.anything());

            // Get the position ID from the result
            const positionId = utils.getPositionId(createResult);
            expect(positionId).toBeGreaterThan(0);

            // Get token URI to find the contract ID
            const nftResult = simnet.callReadOnlyFn(
                'bitforward-nft',
                'get-token-uri',
                [Cl.uint(positionId)],
                deployer
            );

            expect(nftResult.result).toBeOk(expect.anything());
            const contractId = utils.extractNumber(nftResult.result.value.value);
            expect(contractId).toBeGreaterThan(0);

            // Get contract details
            const contract = utils.getContract(contractId);

            // Verify contract details
            expect(contract).not.toBeNull();
            // For negative premiums, verify the premium is negative
            // This might show up differently based on the Clarity version
            expect(contract?.premium).toBeLessThan(0);
        });

        it('creates positions with different leverage values', () => {
            // Create a position with higher leverage
            const longLeverage = 5;  // 5x
            const shortLeverage = 2; // 2x

            const createResult = utils.createPosition(
                wallet1,
                1, // 1 sBTC collateral (reduced for 10 sBTC limit)
                true,
                'USD',
                0.1, // 0.1 sBTC premium (reduced for 10 sBTC limit)
                longLeverage,
                shortLeverage
            );

            // Check if the result is OK (successful)
            expect(createResult.result).toBeOk(expect.anything());

            // Get the position ID from the result
            const positionId = utils.getPositionId(createResult);
            expect(positionId).toBeGreaterThan(0);

            // Get token URI to find the contract ID
            const nftResult = simnet.callReadOnlyFn(
                'bitforward-nft',
                'get-token-uri',
                [Cl.uint(positionId)],
                deployer
            );

            expect(nftResult.result).toBeOk(expect.anything());
            const contractId = utils.extractNumber(nftResult.result.value.value);
            expect(contractId).toBeGreaterThan(0);

            // Get contract details
            const contract = utils.getContract(contractId);

            // Verify contract details
            expect(contract).not.toBeNull();
            expect(contract?.['long-leverage']).toBe(utils.scaleLeverage(longLeverage));
            expect(contract?.['short-leverage']).toBe(utils.scaleLeverage(shortLeverage));
        });

        it('properly increments contract IDs', () => {
            // Create first position
            const firstCreateResult = utils.createPosition(
                wallet1,
                1, // 1 sBTC collateral (reduced for 10 sBTC limit)
                true,
                'USD',
                0.1, // 0.1 sBTC premium (reduced for 10 sBTC limit)
                1,
                1
            );

            expect(firstCreateResult.result).toBeOk(expect.anything());
            const firstPositionId = utils.getPositionId(firstCreateResult);

            // Get first contract ID
            const firstNftResult = simnet.callReadOnlyFn(
                'bitforward-nft',
                'get-token-uri',
                [Cl.uint(firstPositionId)],
                deployer
            );

            const firstContractId = utils.extractNumber(firstNftResult.result.value.value);

            // Create second position
            const secondCreateResult = utils.createPosition(
                wallet2,
                1, // 1 sBTC collateral (reduced for 10 sBTC limit)
                false,
                'USD',
                0.1, // 0.1 sBTC premium (reduced for 10 sBTC limit)
                1,
                1
            );

            expect(secondCreateResult.result).toBeOk(expect.anything());
            const secondPositionId = utils.getPositionId(secondCreateResult);

            // Get second contract ID
            const secondNftResult = simnet.callReadOnlyFn(
                'bitforward-nft',
                'get-token-uri',
                [Cl.uint(secondPositionId)],
                deployer
            );

            const secondContractId = utils.extractNumber(secondNftResult.result.value.value);

            // Verify contract IDs are incremented
            expect(secondContractId).toBe(firstContractId + 1);
        });

        it('creates position with very high leverage (10x)', () => {
            // Create a position with very high leverage
            const longLeverage = 10;  // 10x
            const shortLeverage = 10; // 10x

            const createResult = utils.createPosition(
                wallet1,
                1, // 1 sBTC collateral (reduced for 10 sBTC limit)
                true,
                'USD',
                0.1, // 0.1 sBTC premium (reduced for 10 sBTC limit)
                longLeverage,
                shortLeverage
            );

            // Check if the result is OK (successful)
            expect(createResult.result).toBeOk(expect.anything());

            // Get the position ID from the result
            const positionId = utils.getPositionId(createResult);
            expect(positionId).toBeGreaterThan(0);

            // Get token URI to find the contract ID
            const nftResult = simnet.callReadOnlyFn(
                'bitforward-nft',
                'get-token-uri',
                [Cl.uint(positionId)],
                deployer
            );

            expect(nftResult.result).toBeOk(expect.anything());
            const contractId = utils.extractNumber(nftResult.result.value.value);
            expect(contractId).toBeGreaterThan(0);

            // Get contract details
            const contract = utils.getContract(contractId);

            // Verify contract details
            expect(contract).not.toBeNull();
            expect(contract?.['long-leverage']).toBe(utils.scaleLeverage(longLeverage));
            expect(contract?.['short-leverage']).toBe(utils.scaleLeverage(shortLeverage));
        });

        it('creates position with large collateral amount', () => {
            // Create a position with larger collateral but within wallet limits
            const collateralAmount = 5; // 5 sBTC (half the wallet limit)

            const createResult = utils.createPosition(
                wallet1,
                collateralAmount,
                true,
                'USD',
                0.1, // 0.1 sBTC premium (reduced for 10 sBTC limit)
                1,
                1
            );

            // Check if the result is OK (successful)
            expect(createResult.result).toBeOk(expect.anything());

            // Get the position ID from the result
            const positionId = utils.getPositionId(createResult);
            expect(positionId).toBeGreaterThan(0);

            // Get token URI to find the contract ID
            const nftResult = simnet.callReadOnlyFn(
                'bitforward-nft',
                'get-token-uri',
                [Cl.uint(positionId)],
                deployer
            );

            expect(nftResult.result).toBeOk(expect.anything());
            const contractId = utils.extractNumber(nftResult.result.value.value);
            expect(contractId).toBeGreaterThan(0);

            // Get contract details
            const contract = utils.getContract(contractId);

            // Verify contract details
            expect(contract).not.toBeNull();
            expect(contract?.['collateral-amount']).toBe(utils.scaleAmount(collateralAmount));
        });

        it('creates position with far future closing block', () => {
            // Create a position with a closing block far in the future
            const blocksInFuture = 100; // 100 blocks ahead

            // Use utils function with specific blocksToExpiration parameter
            const createResult = utils.createPosition(
                wallet1,
                1, // 1 sBTC collateral (reduced for 10 sBTC limit)
                true,
                'USD',
                0.1, // 0.1 sBTC premium (reduced for 10 sBTC limit)
                1,
                1,
                blocksInFuture // Specify blocks to expiration
            );

            // Check if the result is OK (successful)
            expect(createResult.result).toBeOk(expect.anything());

            // Get the position ID from the result
            const positionId = utils.getPositionId(createResult);
            expect(positionId).toBeGreaterThan(0);

            // Get token URI to find the contract ID
            const nftResult = simnet.callReadOnlyFn(
                'bitforward-nft',
                'get-token-uri',
                [Cl.uint(positionId)],
                deployer
            );

            expect(nftResult.result).toBeOk(expect.anything());
            const contractId = utils.extractNumber(nftResult.result.value.value);
            expect(contractId).toBeGreaterThan(0);

            // Get contract details
            const contract = utils.getContract(contractId);

            // Verify contract details
            expect(contract).not.toBeNull();
            expect(contract?.['closing-block']).toBe(simnet.burnBlockHeight + blocksInFuture);
        });

        it('creates position with all supported assets', async () => {
            // Test creating positions with each supported asset
            const supportedAssets = ['USD', 'EUR', 'GBP'];

            for (const asset of supportedAssets) {
                // Set a price for this asset if not already set
                await utils.setAssetPrice(asset, 10);

                // Create a position with this asset
                const createResult = utils.createPosition(
                    wallet1,
                    1, // 1 sBTC collateral (reduced for 10 sBTC limit)
                    true,
                    asset,  // Current asset being tested
                    0.1, // 0.1 sBTC premium (reduced for 10 sBTC limit)
                    1,
                    1
                );

                // Check if the result is OK (successful)
                expect(createResult.result).toBeOk(expect.anything());

                // Get the position ID from the result
                const positionId = utils.getPositionId(createResult);
                expect(positionId).toBeGreaterThan(0);

                // Get token URI to find the contract ID
                const nftResult = simnet.callReadOnlyFn(
                    'bitforward-nft',
                    'get-token-uri',
                    [Cl.uint(positionId)],
                    deployer
                );

                expect(nftResult.result).toBeOk(expect.anything());
                const contractId = utils.extractNumber(nftResult.result.value.value);
                expect(contractId).toBeGreaterThan(0);

                // Get contract details
                const contract = utils.getContract(contractId);

                // Verify contract details
                expect(contract).not.toBeNull();
                expect(contract?.asset).toBe(asset);
            }
        });
    });

    describe('create-position error cases', () => {
        it('rejects position with zero collateral', () => {
            // Try to create a position with zero collateral
            const result = utils.createPosition(
                wallet1,
                0,  // Zero collateral
                true,
                'USD',
                0.1,
                1,
                1
            );

            // Verify it returns NO_VALUE error
            expect(result.result).toBeErr(Cl.uint(ERRORS.NO_VALUE));
        });

        it('rejects position with closing block in the past', () => {
            // Create a position with a negative blocks to expiration value
            const createResult = utils.createPosition(
                wallet1,
                1,
                true,
                'USD',
                0.1,
                1,
                1,
                -1 // Negative blocksToExpiration
            );

            // Verify it returns CLOSE_BLOCK_IN_PAST error
            expect(createResult.result).toBeErr(Cl.uint(ERRORS.CLOSE_BLOCK_IN_PAST));
        });

        it('rejects position with closing block equal to current block', () => {
            // Create a position with 0 blocks to expiration (current block)
            const createResult = utils.createPosition(
                wallet1,
                1,
                true,
                'USD',
                0.1,
                1,
                1,
                0 // Zero blocksToExpiration (current block)
            );

            // Verify it returns CLOSE_BLOCK_IN_PAST error
            expect(createResult.result).toBeErr(Cl.uint(ERRORS.CLOSE_BLOCK_IN_PAST));
        });

        it('rejects position with long leverage less than 1x', () => {
            // Create a position with the invalid long leverage
            const createResult = utils.createPosition(
                wallet1,
                1,
                true,
                'USD',
                0.1,
                0.5, // 0.5x leverage (invalid)
                1
            );

            // Verify it returns INVALID_LEVERAGE error
            expect(createResult.result).toBeErr(Cl.uint(ERRORS.INVALID_LEVERAGE));
        });

        it('rejects position with short leverage less than 1x', () => {
            // Create a position with the invalid short leverage
            const createResult = utils.createPosition(
                wallet1,
                1,
                true,
                'USD',
                0.1,
                1,
                0.5 // 0.5x leverage (invalid)
            );

            // Verify it returns INVALID_LEVERAGE error
            expect(createResult.result).toBeErr(Cl.uint(ERRORS.INVALID_LEVERAGE));
        });

        it('rejects position with unsupported asset', () => {
            // Try to create a position with unsupported asset
            const result = utils.createPosition(
                wallet1,
                1,
                true,
                'XYZ', // Unsupported asset
                0.1,
                1,
                1
            );

            // Verify it returns ASSET_NOT_SUPPORTED error
            expect(result.result).toBeErr(Cl.uint(ERRORS.ASSET_NOT_SUPPORTED));
        });

        it('rejects position creation when contract is stopped', () => {
            // First stop the contract (owner only function)
            const stopResult = utils.simnet.callPublicFn(
                'bitforward',
                'stop-contract',
                [],
                deployer
            );
            expect(stopResult.result).toBeOk(expect.anything());

            // Now try to create a position
            const result = utils.createPosition(
                wallet1,
                1,
                true,
                'USD',
                0.1,
                1,
                1
            );

            // Verify it returns CONTRACT_STOPPED error
            expect(result.result).toBeErr(Cl.uint(ERRORS.CONTRACT_STOPPED));
        });
    });
});