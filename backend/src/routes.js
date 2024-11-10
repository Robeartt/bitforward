import express from "express";

function processPositionResponse(rawPosition, address) {
    if (!rawPosition || !rawPosition.value || !rawPosition.value.value) {
        return null;
    }

    const positionValues = rawPosition.value.value;

    let matched = null;
    if (positionValues.matched.type === "some") {
        matched = positionValues.matched.value;
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

export function createRoutes(storage, contract) {
    const router = express.Router();

    router.post("/position/new", async (req, res) => {
        try {
            const { address } = req.body;
            if (!address) {
                return res.status(400).json({ error: "Address is required" });
            }

            const rawPosition = await contract.getPosition(address);
            if (!rawPosition) {
                return res.status(404).json({ error: "Position not found" });
            }

            const processedPosition = processPositionResponse(rawPosition, address);
            if (!processedPosition) {
                return res.status(404).json({ error: "Invalid position data" });
            }

            storage.addPosition(processedPosition);
            res.json(processedPosition);
        } catch (error) {
            console.error("Error:", error);
            res.status(500).json({ error: error.message });
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
            const result = await contract.setPrice(price * 1000000);
            res.json({ txId: result });
        } catch (error) {
            console.error("Error:", error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}