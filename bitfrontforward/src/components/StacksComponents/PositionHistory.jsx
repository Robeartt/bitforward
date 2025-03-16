import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useStacks } from "../../context/StacksContext";
import { fetchPositionHistory } from "../../services/positionService";
import { TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";

export default function PositionHistory() {
  const { stacksUser } = useStacks();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    type: "all", // 'all', 'long', 'short'
    status: "all", // 'all', 'closed', 'liquidated'
    sortBy: "date", // 'date', 'pnl', 'size'
    sortOrder: "desc", // 'asc', 'desc'
  });

  // Stats
  const [stats, setStats] = useState({
    totalPositions: 0,
    profitablePositions: 0,
    totalPnL: 0,
    bestPosition: null,
    worstPosition: null,
  });

  useEffect(() => {
    const loadPositions = async () => {
      try {
        setLoading(true);
        const data = await fetchPositionHistory();
        setPositions(data);
        calculateStats(data);
      } catch (err) {
        console.error("Failed to load position history:", err);
        setError("Failed to load position history. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadPositions();
  }, []);

  const calculateStats = (positionData) => {
    if (!positionData || positionData.length === 0) return;

    let totalPnL = 0;
    let profitableCount = 0;
    let bestPnL = -Infinity;
    let worstPnL = Infinity;
    let bestPos = null;
    let worstPos = null;

    positionData.forEach((pos) => {
      const pnl = calculatePositionPnL(pos);
      totalPnL += pnl.value;

      if (pnl.isPositive) profitableCount++;

      if (pnl.value > bestPnL) {
        bestPnL = pnl.value;
        bestPos = pos;
      }

      if (pnl.value < worstPnL) {
        worstPnL = pnl.value;
        worstPos = pos;
      }
    });

    setStats({
      totalPositions: positionData.length,
      profitablePositions: profitableCount,
      totalPnL,
      bestPosition: bestPos,
      worstPosition: worstPos,
    });
  };

  const calculatePositionPnL = (position) => {
    const entryValue = position.entryPrice * position.amount;
    const closeValue = position.closePrice * position.amount;

    // For long positions, profit when price goes up
    // For short positions, profit when price goes down
    const pnlValue = position.isLong
      ? closeValue - entryValue
      : entryValue - closeValue;

    const pnlPercentage = (pnlValue / entryValue) * 100;
    const isPositive = pnlValue >= 0;

    return {
      value: pnlValue,
      displayValue: Math.abs(pnlValue).toFixed(2),
      percentage: Math.abs(pnlPercentage).toFixed(2),
      isPositive,
    };
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const filteredPositions = () => {
    return positions
      .filter((pos) => {
        // Filter by type
        if (
          filters.type !== "all" &&
          ((filters.type === "long" && !pos.isLong) ||
            (filters.type === "short" && pos.isLong))
        ) {
          return false;
        }

        // Filter by status
        if (filters.status !== "all" && pos.status !== filters.status) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by selected criteria
        if (filters.sortBy === "date") {
          return filters.sortOrder === "asc"
            ? new Date(a.closeTime) - new Date(b.closeTime)
            : new Date(b.closeTime) - new Date(a.closeTime);
        }

        if (filters.sortBy === "pnl") {
          const pnlA = calculatePositionPnL(a).value;
          const pnlB = calculatePositionPnL(b).value;
          return filters.sortOrder === "asc" ? pnlA - pnlB : pnlB - pnlA;
        }

        if (filters.sortBy === "size") {
          return filters.sortOrder === "asc"
            ? a.amount - b.amount
            : b.amount - a.amount;
        }

        return 0;
      });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="p-6 rounded-xl border border-solid backdrop-blur-[10px] bg-slate-950 bg-opacity-50 border-[#fc6432] border-opacity-20">
          <div className="flex items-center justify-center h-40">
            <div className="text-white">Loading position history...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="p-6 rounded-xl border border-solid backdrop-blur-[10px] bg-slate-950 bg-opacity-50 border-[#fc6432] border-opacity-20">
          <div className="flex flex-col items-center justify-center h-40">
            <div className="text-red-500 mb-4">{error}</div>
            <Link
              to="/overview"
              className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors"
            >
              Return to Overview
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-4">
        <Link
          to="/overview"
          className="flex items-center text-[#fc6432] hover:text-[#ff8a61] transition-colors"
        >
          <ArrowUpRight size={16} className="mr-1" />
          Back to Overview
        </Link>
      </div>

      <div className="p-6 rounded-xl border border-solid backdrop-blur-[10px] bg-slate-950 bg-opacity-50 border-[#fc6432] border-opacity-20 mb-6">
        <div className="mb-6 text-lg font-semibold tracking-wide text-[#fc6432]">
          POSITION HISTORY
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-slate-950 bg-opacity-80">
            <div className="text-sm text-neutral-400 mb-1">Total Positions</div>
            <div className="text-xl text-white">{stats.totalPositions}</div>
          </div>
          <div className="p-4 rounded-lg bg-slate-950 bg-opacity-80">
            <div className="text-sm text-neutral-400 mb-1">Win Rate</div>
            <div className="text-xl text-white">
              {stats.totalPositions > 0
                ? `${((stats.profitablePositions / stats.totalPositions) * 100).toFixed(1)}%`
                : "0%"}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-slate-950 bg-opacity-80">
            <div className="text-sm text-neutral-400 mb-1">Total P&L</div>
            <div
              className={`text-xl ${stats.totalPnL >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {stats.totalPnL >= 0 ? "+" : "-"}$
              {Math.abs(stats.totalPnL).toFixed(2)}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-slate-950 bg-opacity-80">
            <div className="text-sm text-neutral-400 mb-1">Best Trade</div>
            {stats.bestPosition ? (
              <div className="text-xl text-green-500">
                +${calculatePositionPnL(stats.bestPosition).displayValue}
              </div>
            ) : (
              <div className="text-xl text-white">N/A</div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Position Type
              </label>
              <select
                className="w-full p-2 rounded bg-slate-800 text-white border-none"
                value={filters.type}
                onChange={(e) => handleFilterChange("type", e.target.value)}
              >
                <option value="all">All Positions</option>
                <option value="long">Long Only</option>
                <option value="short">Short Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Status
              </label>
              <select
                className="w-full p-2 rounded bg-slate-800 text-white border-none"
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="closed">Closed</option>
                <option value="liquidated">Liquidated</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Sort By
              </label>
              <select
                className="w-full p-2 rounded bg-slate-800 text-white border-none"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange("sortBy", e.target.value)}
              >
                <option value="date">Date</option>
                <option value="pnl">Profit/Loss</option>
                <option value="size">Position Size</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Order
              </label>
              <select
                className="w-full p-2 rounded bg-slate-800 text-white border-none"
                value={filters.sortOrder}
                onChange={(e) =>
                  handleFilterChange("sortOrder", e.target.value)
                }
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-700">
                <th className="p-3 text-neutral-400">Position ID</th>
                <th className="p-3 text-neutral-400">Type</th>
                <th className="p-3 text-neutral-400">Size</th>
                <th className="p-3 text-neutral-400">Entry Price</th>
                <th className="p-3 text-neutral-400">Close Price</th>
                <th className="p-3 text-neutral-400">P&L</th>
                <th className="p-3 text-neutral-400">Close Date</th>
                <th className="p-3 text-neutral-400">Status</th>
                <th className="p-3 text-neutral-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPositions().length > 0 ? (
                filteredPositions().map((position) => {
                  const pnl = calculatePositionPnL(position);
                  return (
                    <tr
                      key={position.id}
                      className="border-b border-slate-800 hover:bg-slate-900"
                    >
                      <td className="p-3 text-white">#{position.id}</td>
                      <td className="p-3">
                        {position.isLong ? (
                          <span className="flex items-center text-green-500">
                            <TrendingUp size={16} className="mr-1" />
                            LONG
                          </span>
                        ) : (
                          <span className="flex items-center text-red-500">
                            <TrendingDown size={16} className="mr-1" />
                            SHORT
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-white">{position.amount} BTC</td>
                      <td className="p-3 text-white">
                        ${position.entryPrice.toFixed(2)}
                      </td>
                      <td className="p-3 text-white">
                        ${position.closePrice.toFixed(2)}
                      </td>
                      <td
                        className={`p-3 ${pnl.isPositive ? "text-green-500" : "text-red-500"}`}
                      >
                        {pnl.isPositive ? "+" : "-"}${pnl.displayValue} (
                        {pnl.percentage}%)
                      </td>
                      <td className="p-3 text-white">
                        {new Date(position.closeTime).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        {position.status === "closed" ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-slate-700 text-gray-300">
                            CLOSED
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-900 text-red-300">
                            LIQUIDATED
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <Link
                          to={`/position/${position.id}`}
                          className="px-3 py-1 text-xs bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="p-4 text-center text-neutral-400">
                    No positions found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
