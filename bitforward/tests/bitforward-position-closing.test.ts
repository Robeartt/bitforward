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
 * Comprehensive Tests for position closing in BitForward contract
 * Using the BitForwardUtils helper functions with better error reporting
 */
describe('bitforward-position-closing-extended', () => {
    // Set up test environment before each test
    beforeEach(async () => {
        // Initialize the test environment
        await utils.initialize();

        // Set asset prices for testing
        await utils.setAssetPrice('USD', 10);
        await utils.setAssetPrice('EUR', 9);
        await utils.setAssetPrice('GBP', 8);
    });

    // Helper function to create a position
    const createTestPosition = (
        isLong = true,
        blocksToExpiration = 10,
        longLeverage = 1,
        shortLeverage = 1,
        asset = 'USD',
        premium = 0.1,
        collateral = 1
    ) => {
        return utils.createPosition(
            wallet1,
            collateral,
            isLong,
            asset,
            premium,
            longLeverage,
            shortLeverage,
            blocksToExpiration
        );
    };

    // Helper function to get contract ID from position ID
    const getContractIdFromPositionId = (positionId) => {
        const nftResult = simnet.callReadOnlyFn(
            'bitforward-nft',
            'get-token-uri',
            [Cl.uint(positionId)],
            deployer
        );

        if (nftResult.result.type !== 7) {
            return 0;
        }

        return utils.extractNumber(nftResult.result.value.value);
    };

    describe('close-contract basic functionality', () => {
        it('successfully closes a contract at closing block with no price change', () => {
            // Create a long position
            const createResult = createTestPosition(true, 3); // 3 blocks to expiration
            expect(createResult.result).toBeOk(expect.anything());

            // Get the position ID
            const positionId = utils.getPositionId(createResult);
            expect(positionId).toBeGreaterThan(0);

            // Get the contract ID
            const contractId = getContractIdFromPositionId(positionId);
            expect(contractId).toBeGreaterThan(0);

            // Take the position
            const takeResult = utils.takePosition(wallet2, contractId);
            expect(takeResult.result).toBeOk(expect.anything());

            // Advance to closing block
            simnet.mineEmptyBurnBlocks(3);

            // Close the contract
            const closeResult = utils.closeContract(wallet3, contractId);
            expect(closeResult.result).toBeOk(expect.anything());

            // Verify contract was closed
            const contract = utils.getContract(contractId);
            expect(contract).not.toBeNull();
            expect(contract?.status).toBe(STATUS_CLOSED);
            console.log(contract)
        });
    });

    describe('close-contract error cases', () => {
        it('rejects closing non-existent contracts', () => {
            // Attempt to close a non-existent contract
            const nonExistentId = 999;
            const closeResult = utils.closeContract(wallet3, nonExistentId);

            // Verify it returns CONTRACT_NOT_FOUND error
            expect(closeResult.result).toBeErr(Cl.uint(ERRORS.CONTRACT_NOT_FOUND));
        });

        it('rejects closing unfilled contracts', () => {
            // Create a position but don't take it
            const createResult = createTestPosition(true, 5);
            expect(createResult.result).toBeOk(expect.anything());

            // Get the position ID
            const positionId = utils.getPositionId(createResult);
            expect(positionId).toBeGreaterThan(0);

            // Get the contract ID
            const contractId = getContractIdFromPositionId(positionId);
            expect(contractId).toBeGreaterThan(0);

            // Advance to closing block
            simnet.mineEmptyBurnBlocks(5);

            // Try to close the unfilled contract
            const closeResult = utils.closeContract(wallet3, contractId);

            // Verify it returns INVALID_STATUS error
            expect(closeResult.result).toBeErr(Cl.uint(ERRORS.INVALID_STATUS));
        });
    });

    describe('close-contract with price changes', () => {
        it('handles long profit when price increases', () => {
            // Create a long position
            const createResult = createTestPosition(true, 3); // 3 blocks to expiration
            expect(createResult.result).toBeOk(expect.anything());

            // Get the position ID
            const positionId = utils.getPositionId(createResult);
            expect(positionId).toBeGreaterThan(0);

            // Get the contract ID
            const contractId = getContractIdFromPositionId(positionId);
            expect(contractId).toBeGreaterThan(0);

            // Take the position
            const takeResult = utils.takePosition(wallet2, contractId);
            expect(takeResult.result).toBeOk(expect.anything());

            // Update price higher (20% up)
            utils.setAssetPrice('USD', 12);

            // Advance to closing block
            simnet.mineEmptyBurnBlocks(3);

            // Close the contract
            const closeResult = utils.closeContract(wallet3, contractId);
            expect(closeResult.result).toBeOk(expect.anything());

            // Verify contract was closed
            const contract = utils.getContract(contractId);
            expect(contract).not.toBeNull();
            expect(contract?.status).toBe(STATUS_CLOSED);

            // Verify long payout is greater than short payout due to price increase
            expect(contract?.['long-payout']).toBeGreaterThan(contract?.['short-payout']);
        });

        it('handles short profit when price decreases', () => {
            // Create a long position
            const createResult = createTestPosition(true, 3); // 3 blocks to expiration
            expect(createResult.result).toBeOk(expect.anything());

            // Get the position ID
            const positionId = utils.getPositionId(createResult);
            expect(positionId).toBeGreaterThan(0);

            // Get the contract ID
            const contractId = getContractIdFromPositionId(positionId);
            expect(contractId).toBeGreaterThan(0);

            // Take the position
            const takeResult = utils.takePosition(wallet2, contractId);
            expect(takeResult.result).toBeOk(expect.anything());

            // Update price lower (20% down)
            utils.setAssetPrice('USD', 8);

            // Advance to closing block
            simnet.mineEmptyBurnBlocks(3);

            // Close the contract
            const closeResult = utils.closeContract(wallet3, contractId);
            expect(closeResult.result).toBeOk(expect.anything());

            // Verify contract was closed
            const contract = utils.getContract(contractId);
            expect(contract).not.toBeNull();
            expect(contract?.status).toBe(STATUS_CLOSED);

            // Verify short payout is greater than long payout due to price decrease
            expect(contract?.['short-payout']).toBeGreaterThan(contract?.['long-payout']);
        });
    });

    describe('liquidation scenarios', () => {
        it('can close early if long position would be liquidated', () => {
            // Create a position with high leverage
            const longLeverage = 5; // 5x leverage
            const createResult = createTestPosition(
                true, // Long position
                20,   // 20 blocks ahead
                longLeverage,
                1,    // 1x for short
                'USD',
                0.1,
                1
            );
            expect(createResult.result).toBeOk(expect.anything());

            // Get the position ID
            const positionId = utils.getPositionId(createResult);
            expect(positionId).toBeGreaterThan(0);

            // Get the contract ID
            const contractId = getContractIdFromPositionId(positionId);
            expect(contractId).toBeGreaterThan(0);

            // Take the position
            const takeResult = utils.takePosition(wallet2, contractId);
            expect(takeResult.result).toBeOk(expect.anything());

            // Update price to trigger liquidation (25% down)
            utils.setAssetPrice('USD', 7.5);

            // Close before expiration (should work due to liquidation)
            const closeResult = utils.closeContract(wallet3, contractId);
            expect(closeResult.result).toBeOk(expect.anything());

            // Verify contract was closed
            const contract = utils.getContract(contractId);
            expect(contract).not.toBeNull();
            expect(contract?.status).toBe(STATUS_CLOSED);
        });

        it('can close early if short position would be liquidated', () => {
            // Create a position with high leverage for short
            const shortLeverage = 5; // 5x leverage
            const createResult = createTestPosition(
                false, // Short position
                20,    // 20 blocks ahead
                1,     // 1x for long
                shortLeverage,
                'USD',
                0.1,
                1
            );
            expect(createResult.result).toBeOk(expect.anything());

            // Get the position ID
            const positionId = utils.getPositionId(createResult);
            expect(positionId).toBeGreaterThan(0);

            // Get the contract ID
            const contractId = getContractIdFromPositionId(positionId);
            expect(contractId).toBeGreaterThan(0);

            // Take the position
            const takeResult = utils.takePosition(wallet2, contractId);
            expect(takeResult.result).toBeOk(expect.anything());

            // Update price to trigger liquidation (25% up)
            utils.setAssetPrice('USD', 12.5);

            // Close before expiration (should work due to liquidation)
            const closeResult = utils.closeContract(wallet3, contractId);
            expect(closeResult.result).toBeOk(expect.anything());

            // Verify contract was closed
            const contract = utils.getContract(contractId);
            expect(contract).not.toBeNull();
            expect(contract?.status).toBe(STATUS_CLOSED);
        });
    });

    describe('multiple positions and assets', () => {
        it('handles different assets correctly', () => {
            // Test with EUR asset
            const createResult = createTestPosition(
                true, // Long position
                3,    // 3 blocks expiration
                1,    // 1x for long
                1,    // 1x for short
                'EUR',// Different asset
                0.1,
                1
            );
            expect(createResult.result).toBeOk(expect.anything());

            // Get the position ID
            const positionId = utils.getPositionId(createResult);
            expect(positionId).toBeGreaterThan(0);

            // Get the contract ID
            const contractId = getContractIdFromPositionId(positionId);
            expect(contractId).toBeGreaterThan(0);

            // Take the position
            const takeResult = utils.takePosition(wallet2, contractId);
            expect(takeResult.result).toBeOk(expect.anything());

            // Advance to closing block
            simnet.mineEmptyBurnBlocks(3);

            // Close the contract
            const closeResult = utils.closeContract(wallet3, contractId);
            expect(closeResult.result).toBeOk(expect.anything());

            // Verify contract was closed
            const contract = utils.getContract(contractId);
            expect(contract).not.toBeNull();
            expect(contract?.status).toBe(STATUS_CLOSED);
            expect(contract?.asset).toBe('EUR');
        });
    });

    describe('already closed contracts', () => {
        it('rejects closing already closed contracts', () => {
            // Create a position
            const createResult = createTestPosition(true, 3); // 3 blocks to expiration
            expect(createResult.result).toBeOk(expect.anything());

            // Get the position ID
            const positionId = utils.getPositionId(createResult);
            expect(positionId).toBeGreaterThan(0);

            // Get the contract ID
            const contractId = getContractIdFromPositionId(positionId);
            expect(contractId).toBeGreaterThan(0);

            // Take the position
            const takeResult = utils.takePosition(wallet2, contractId);
            expect(takeResult.result).toBeOk(expect.anything());

            // Advance to closing block
            simnet.mineEmptyBurnBlocks(3);

            // Close the contract
            const closeResult1 = utils.closeContract(wallet3, contractId);
            expect(closeResult1.result).toBeOk(expect.anything());

            // Try to close it again
            const closeResult2 = utils.closeContract(wallet3, contractId);

            // Verify it returns INVALID_STATUS error
            expect(closeResult2.result).toBeErr(Cl.uint(ERRORS.INVALID_STATUS));
        });
    });
});