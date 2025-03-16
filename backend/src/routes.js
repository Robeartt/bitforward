import express from "express";

export function createRoutes(storage, contract) {
    const router = express.Router();

    // Simplified position/add - only requires contractId
    router.post("/position/add", async (req, res) => {
        try {
            const { contractId } = req.body;

            if (!contractId) {
                return res.status(400).json({ error: "contractId is required" });
            }

            console.log(`Adding position for contractId: ${contractId}`);

            // Create a new position object with minimal data
            const newPosition = {
                contractId,
                createdAt: Date.now(),
                status: "active"
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

    // Simplified position/remove - only requires contractId
    router.post("/position/remove", async (req, res) => {
        try {
            const { contractId } = req.body;

            if (!contractId) {
                return res.status(400).json({ error: "contractId is required" });
            }

            console.log(`Removing position for contractId: ${contractId}`);

            const positions = storage.getPositions();
            const positionIndex = positions.findIndex(p => p.contractId === contractId);

            if (positionIndex === -1) {
                return res.status(404).json({ error: "Position not found" });
            }

            // Remove position from storage
            const removedPosition = positions[positionIndex];
            storage.removePosition(contractId);
            await storage.persist();

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

    // Simplified positions - just returns all contractIds
    router.get("/positions", (req, res) => {
        const positions = storage.getPositions();
        res.json(positions);
    });

    return router;
}