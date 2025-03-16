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

    // create position

    // router.post("/position/create", async (req, res) => {
    //     try {
    //         const { amount, closingBlock, isLong, asset, premium, longLeverage, shortLeverage, sender } = req.body;
            
    //         if (!amount || !closingBlock || isLong === undefined || !asset || !premium || !longLeverage || !shortLeverage || !sender) {
    //             return res.status(400).json({ error: "Missing required parameters" });
    //         }

    //         const result = await contract.createPosition(
    //             amount, 
    //             closingBlock, 
    //             isLong, 
    //             asset, 
    //             premium,
    //             longLeverage,
    //             shortLeverage,
    //             sender
    //         );
            
    //         res.json({ txId: result });
    //     } catch (error) {
    //         console.error("Error:", error);
    //         res.status(500).json({ 
    //             error: error.message,
    //             details: "Failed to create position"
    //         });
    //     }
    // });

    // add position to backend

    router.post("/position/add", async (req, res) => {
        try {
          const { 
            address, 
            amount, 
            closingBlock, 
            isLong, 
            asset = "USD", 
            premium = 0, 
            longLeverage = 100000000, // Default 1x leverage (scaled by 10^8)
            shortLeverage = 100000000  // Default 1x leverage (scaled by 10^8)
          } = req.body;
    
          if (!address) {
            return res.status(400).json({ error: "Address is required" });
          }
    
          if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({ error: "Valid amount is required" });
          }
    
          // If closingBlock is not provided, calculate it (e.g., 7 days from now)
          const currentBlock = await getCurrentBlock();
          const defaultClosingBlock = currentBlock + 1008; // ~7 days (at ~10 min/block)
          const effectiveClosingBlock = closingBlock || defaultClosingBlock;
    
          console.log(`Adding position for address: ${address}`);
          console.log(`Amount: ${amount}, Closing Block: ${effectiveClosingBlock}`);
          console.log(`Position Type: ${isLong ? 'Long' : 'Short'}, Asset: ${asset}`);
          console.log(`Premium: ${premium}, Long Leverage: ${longLeverage}, Short Leverage: ${shortLeverage}`);
    
          // Create a new position object
          const newPosition = {
            address,
            amount: Number(amount),
            closingBlock: Number(effectiveClosingBlock),
            long: Boolean(isLong),
            matched: null,
            openBlock: currentBlock,
            openValue: 0, // This will be filled when confirmed from blockchain
            premium: Number(premium),
            status: "pending"
          };
    
          // Add to storage
          storage.addPosition(newPosition);
          await storage.persist();
    
          res.json({ 
            success: true, 
            message: "Position added successfully", 
            position: newPosition 
          });
        } catch (error) {
          console.error("Error adding position:", error);
          res.status(500).json({ 
            error: error.message,
            details: "An unexpected error occurred while adding the position"
          });
        }
      });



      router.post("/position/remove", async (req, res) => {
        try {
          const { address } = req.body;
    
          if (!address) {
            return res.status(400).json({ error: "Address is required" });
          }
    
          console.log(`Removing position for address: ${address}`);
    
          const positions = storage.getPositions();
          const positionIndex = positions.findIndex(p => p.address === address);
    
          if (positionIndex === -1) {
            return res.status(404).json({ error: "Position not found" });
          }
    
          // Remove position from storage
          const removedPosition = positions[positionIndex];
          storage.removePosition(address);
          await storage.persist();
    
          // If the position has a match, also handle that relationship
          if (removedPosition.matched) {
            const matchedPosition = positions.find(p => p.address === removedPosition.matched);
            if (matchedPosition) {
              matchedPosition.matched = null;
              // Update the matched position in storage
              storage.addPosition(matchedPosition);
              await storage.persist();
            }
          }
    
          res.json({ 
            success: true, 
            message: "Position removed successfully", 
            position: removedPosition 
          });
        } catch (error) {
          console.error("Error removing position:", error);
          res.status(500).json({ 
            error: error.message,
            details: "An unexpected error occurred while removing the position"
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

    // this filters all positions to only the matchable ones
    router.get("/positions/matchable", (req, res) => {
        const positions = storage.getPositions();
        // Return unmatched positions only
        const matchablePositions = positions.filter(pos => pos.matched === null);
        res.json(matchablePositions);
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

    router.get("/contract/status", async (req, res) => {
        try {
            const isStopped = await contract.isContractStopped();
            res.json({ stopped: isStopped });
        } catch (error) {
            console.error("Error:", error);
            res.status(500).json({ 
                error: error.message,
                details: "Failed to check contract status"
            });
        }
    });



    return router;
}