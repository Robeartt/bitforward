// api.js - Frontend API client for interacting with the position management backend

// Base URL for API requests - change this to match your deployment
const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Add a new position with the given contract ID
 * @param {number} contractId - The contract ID to add
 * @returns {Promise<Object>} The response with the added position data
 */
export const addPosition = async (contractId) => {
    console.log('Adding position for contractId:', contractId);
    try {
        const response = await fetch(`${API_BASE_URL}/position/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ contractId }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add position');
        }

        console.log('Position added successfully');
        return await response.json();
    } catch (error) {
        console.error('Error adding position:', error);
        throw error;
    }
};

/**
 * Remove a position with the given contract ID
 * @param {number} contractId - The contract ID to remove
 * @returns {Promise<Object>} The response with the removed position data
 */
export const removePosition = async (contractId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/position/remove`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ contractId }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to remove position');
        }

        return await response.json();
    } catch (error) {
        console.error('Error removing position:', error);
        throw error;
    }
};

/**
 * Get all positions
 * @returns {Promise<Array>} Array of all positions
 */
export const getPositions = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/positions`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch positions');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching positions:', error);
        throw error;
    }
};