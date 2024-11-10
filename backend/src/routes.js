import express from "express";

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function processPositionResponse(rawPosition, address) {
    // Handle none response type (no position exists)
    if (rawPosition.type === 'none') {
        return null;
    }

    if (!rawPosition || !rawPosition.value || !rawPosition.value.value) {
        return null;
    }

    const positionValues = rawPosition.value.value;

    let matched = null;
    if (positionValues.matched.type === "some") {
        matched = positionValues.matched.value.value;
    }

    return {
        address,
        amount: Number(positionValues.amount.value),
        closingBlock: Number(positionValues.closing_block.value),
        long: positionValues.long.type === "true",
        matched: matched,
        openBlock: Number(positionValues.open_block.value),
        openValue: Number(positionValues.open_value.value),
        premium: Number(positionValues.premium.value),
    };
}

async function getPositionWithRetry(contract, address, maxRetries = 5, delayMs = 20000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const rawPosition = await contract.getPosition(address);
            
            // If position exists, return it
            if (rawPosition.type === 'some') {
                return rawPosition;
            }

            // If we haven't reached max retries, wait and try again
            if (attempt < maxRetries) {
                console.log(`Attempt ${attempt}/${maxRetries}: Position not found yet, retrying in ${delayMs/1000} seconds...`);
                await delay(delayMs);
            }
        } catch (error) {
            console.error(`Attempt ${attempt}/${maxRetries} failed:`, error);
            if (attempt === maxRetries) {
                throw error;
            }
            await delay(delayMs);
        }
    }
    
    // If we've exhausted all retries and still no position
    return null;
}

async function getMatchedPositionWithRetry(contract, address, maxRetries = 5, delayMs = 20000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const rawPosition = await contract.getPosition(address);
            
            // If position exists and has a match, return it
            if (rawPosition.type === 'some') {
                const processedPosition = processPositionResponse(rawPosition, address);
                if (processedPosition && processedPosition.matched !== null) {
                    return rawPosition;
                }
            }

            // If we haven't reached max retries, wait and try again
            if (attempt < maxRetries) {
                console.log(`Attempt ${attempt}/${maxRetries}: Matched position not found yet, retrying in ${delayMs/1000} seconds...`);
                await delay(delayMs);
            }
        } catch (error) {
            console.error(`Attempt ${attempt}/${maxRetries} failed:`, error);
            if (attempt === maxRetries) {
                throw error;
            }
            await delay(delayMs);
        }
    }
    
    // If we've exhausted all retries and still no matched position
    return null;
}

export function createRoutes(storage, contract) {
    const router = express.Router();

    // Existing routes...
    router.post("/position/new", async (req, res) => {
        try {
            const { address } = req.body;
            if (!address) {
                return res.status(400).json({ error: "Address is required" });
            }

            console.log(`Checking position for address: ${address}`);

            const rawPosition = await getPositionWithRetry(contract, address);
            if (!rawPosition) {
                return res.status(404).json({ 
                    error: "Position not found after maximum retries",
                    details: "The position might not be confirmed on the blockchain yet"
                });
            }

            const processedPosition = processPositionResponse(rawPosition, address);
            if (!processedPosition) {
                return res.status(404).json({ 
                    error: "Invalid position data",
                    details: "Position exists but data is invalid"
                });
            }

            storage.addPosition(processedPosition);
            res.json(processedPosition);
        } catch (error) {
            console.error("Error:", error);
            res.status(500).json({ 
                error: error.message,
                details: "An unexpected error occurred while processing the position"
            });
        }
    });

    router.post("/position/match", async (req, res) => {
        try {
            const { address, matchedAddress } = req.body;
            if (!address || !matchedAddress) {
                return res.status(400).json({ error: "Both address and matchedAddress are required" });
            }
    
            console.log(`Checking matched position for address: ${address}`);
    
            // Get the initiator's position
            const rawPosition = await getMatchedPositionWithRetry(contract, address);
            if (!rawPosition) {
                return res.status(404).json({ 
                    error: "Matched position not found after maximum retries",
                    details: "The match might not be confirmed on the blockchain yet"
                });
            }
    
            const initiatorPosition = processPositionResponse(rawPosition, address);
            if (!initiatorPosition) {
                return res.status(404).json({ 
                    error: "Invalid position data",
                    details: "Position exists but data is invalid"
                });
            }
    
            // Verify the match is with the expected address
            if (initiatorPosition.matched !== matchedAddress) {
                return res.status(400).json({ 
                    error: "Position matched with unexpected address",
                    details: `Expected match with ${matchedAddress} but found match with ${initiatorPosition.matched}`
                });
            }
    
            // Get the matched position
            const rawMatchedPosition = await contract.getPosition(matchedAddress);
            if (rawMatchedPosition && rawMatchedPosition.type === 'some') {
                const matchedPosition = processPositionResponse(rawMatchedPosition, matchedAddress);
                if (matchedPosition) {
                    // Update both positions in storage
                    matchedPosition.matched = address;
                    storage.addPosition(matchedPosition);
                }
            }
    
            // Update the initiator's position in storage
            storage.addPosition(initiatorPosition);
            
            res.json(initiatorPosition);
        } catch (error) {
            console.error("Error:", error);
            res.status(500).json({ 
                error: error.message,
                details: "An unexpected error occurred while processing the matched position"
            });
        }
    });

    router.get("/positions", (req, res) => {
        res.json(storage.getPositions());
    });

    router.get("/positions/history", (req, res) => {
        res.json(storage.getHistory());
    });

    router.post("/price", async (req, res) => {
        try {
            const { price } = req.body;
            if (!price) {
                return res.status(400).json({ error: "Price is required" });
            }
            const result = await contract.setPrice(price);
            res.json({ txId: result });
        } catch (error) {
            console.error("Error:", error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}