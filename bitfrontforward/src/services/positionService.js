// Position service for handling API calls related to positions

// Mock data for development - replace with actual API calls
const mockPositions = [
  {
    id: 1,
    status: "open",
    isLong: true,
    amount: 0.5,
    leverage: 2,
    entryPrice: 65000,
    currentPrice: 67500,
    liquidationPrice: 58500,
    fundingFee: 12.5,
    openingFee: 32.5,
    openTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    openBlock: 123456,
    expiryBlock: 223456,
  },
  {
    id: 2,
    status: "closed",
    isLong: false,
    amount: 0.25,
    leverage: 3,
    entryPrice: 68000,
    currentPrice: 67500,
    closePrice: 64000,
    liquidationPrice: 74000,
    fundingFee: 8.2,
    openingFee: 17.0,
    openTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    closeTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    openBlock: 120000,
    closeBlock: 121500,
  },
  {
    id: 3,
    status: "liquidated",
    isLong: true,
    amount: 0.75,
    leverage: 5,
    entryPrice: 62000,
    currentPrice: 67500,
    closePrice: 58000,
    liquidationPrice: 58500,
    fundingFee: 22.5,
    openingFee: 46.8,
    openTime: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
    closeTime: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 days ago
    openBlock: 118000,
    closeBlock: 119200,
  },
  {
    id: 4,
    status: "closed",
    isLong: true,
    amount: 0.3,
    leverage: 2,
    entryPrice: 63500,
    currentPrice: 67500,
    closePrice: 66000,
    liquidationPrice: 57150,
    fundingFee: 9.8,
    openingFee: 19.1,
    openTime: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
    closeTime: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(), // 18 days ago
    openBlock: 115000,
    closeBlock: 116000,
  },
  {
    id: 5,
    status: "open",
    isLong: false,
    amount: 0.15,
    leverage: 3,
    entryPrice: 69000,
    currentPrice: 67500,
    liquidationPrice: 75900,
    fundingFee: 5.4,
    openingFee: 10.4,
    openTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    openBlock: 124000,
    expiryBlock: 224000,
  },
];

// Fetch all positions
export const fetchPositions = async () => {
  // In a real app, this would be an API call
  // return await fetch('/api/positions').then(res => res.json());

  // For development, return mock data
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockPositions.filter((pos) => pos.status === "open"));
    }, 500);
  });
};

// Fetch position by ID
export const fetchPositionById = async (id) => {
  // In a real app, this would be an API call
  // return await fetch(`/api/positions/${id}`).then(res => res.json());

  // For development, return mock data
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const position = mockPositions.find((pos) => pos.id === parseInt(id));
      if (position) {
        resolve(position);
      } else {
        reject(new Error("Position not found"));
      }
    }, 500);
  });
};

// Fetch position history (closed positions)
export const fetchPositionHistory = async () => {
  // In a real app, this would be an API call
  // return await fetch('/api/positions/history').then(res => res.json());

  // For development, return mock data
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockPositions.filter((pos) => pos.status !== "open"));
    }, 500);
  });
};

// Create a new position
export const createPosition = async (positionData) => {
  // In a real app, this would be an API call
  // return await fetch('/api/positions', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(positionData)
  // }).then(res => res.json());

  // For development, return mock data
  return new Promise((resolve) => {
    setTimeout(() => {
      const newPosition = {
        id: mockPositions.length + 1,
        status: "open",
        openTime: new Date().toISOString(),
        openBlock: 125000,
        expiryBlock: 225000,
        currentPrice: 67500,
        fundingFee: 0,
        openingFee: positionData.amount * 100 * 0.001, // 0.1% fee
        ...positionData,
      };

      // Calculate liquidation price based on direction and leverage
      if (positionData.isLong) {
        newPosition.liquidationPrice =
          positionData.entryPrice * (1 - (1 / positionData.leverage) * 0.9);
      } else {
        newPosition.liquidationPrice =
          positionData.entryPrice * (1 + (1 / positionData.leverage) * 0.9);
      }

      mockPositions.push(newPosition);
      resolve(newPosition);
    }, 500);
  });
};

// Close a position
export const closePosition = async (id) => {
  // In a real app, this would be an API call
  // return await fetch(`/api/positions/${id}/close`, {
  //   method: 'POST'
  // }).then(res => res.json());

  // For development, update mock data
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const position = mockPositions.find((pos) => pos.id === parseInt(id));
      if (position && position.status === "open") {
        position.status = "closed";
        position.closeTime = new Date().toISOString();
        position.closeBlock = position.openBlock + 1500;
        position.closePrice = position.currentPrice;
        resolve(position);
      } else if (!position) {
        reject(new Error("Position not found"));
      } else {
        reject(new Error("Position is already closed"));
      }
    }, 500);
  });
};

// Update position data (for admin or system use)
export const updatePosition = async (id, updateData) => {
  // In a real app, this would be an API call
  // return await fetch(`/api/positions/${id}`, {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(updateData)
  // }).then(res => res.json());

  // For development, update mock data
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const position = mockPositions.find((pos) => pos.id === parseInt(id));
      if (position) {
        Object.assign(position, updateData);
        resolve(position);
      } else {
        reject(new Error("Position not found"));
      }
    }, 500);
  });
};

// Get position statistics
export const getPositionStats = async () => {
  // In a real app, this would be an API call
  // return await fetch('/api/positions/stats').then(res => res.json());

  // For development, calculate from mock data
  return new Promise((resolve) => {
    setTimeout(() => {
      const openPositions = mockPositions.filter(
        (pos) => pos.status === "open",
      );
      const closedPositions = mockPositions.filter(
        (pos) => pos.status === "closed",
      );
      const liquidatedPositions = mockPositions.filter(
        (pos) => pos.status === "liquidated",
      );

      let totalPnL = 0;
      let winCount = 0;

      closedPositions.forEach((pos) => {
        const pnl = pos.isLong
          ? (pos.closePrice - pos.entryPrice) * pos.amount
          : (pos.entryPrice - pos.closePrice) * pos.amount;

        totalPnL += pnl;
        if (pnl > 0) winCount++;
      });

      resolve({
        openPositionsCount: openPositions.length,
        closedPositionsCount: closedPositions.length,
        liquidatedPositionsCount: liquidatedPositions.length,
        totalPnL,
        winRate:
          closedPositions.length > 0 ? winCount / closedPositions.length : 0,
      });
    }, 500);
  });
};
