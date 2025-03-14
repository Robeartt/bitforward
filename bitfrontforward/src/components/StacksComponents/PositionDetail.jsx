import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useStacks } from "../../context/StacksContext";
import {
  fetchPositionById,
  closePosition,
} from "../../services/positionService";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";

export default function PositionDetail() {
  const { id } = useParams();
  const { stacksUser } = useStacks();
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const loadPosition = async () => {
      try {
        setLoading(true);
        const data = await fetchPositionById(id);
        setPosition(data);
      } catch (err) {
        console.error("Failed to load position:", err);
        setError("Failed to load position details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadPosition();
    }
  }, [id]);

  const handleClosePosition = async () => {
    if (!position || !stacksUser) return;

    try {
      setIsClosing(true);
      await closePosition(position.id);
      // Refresh position data after closing
      const updatedPosition = await fetchPositionById(id);
      setPosition(updatedPosition);
    } catch (err) {
      console.error("Failed to close position:", err);
      setError("Failed to close position. Please try again later.");
    } finally {
      setIsClosing(false);
    }
  };

  // Calculate profit/loss
  const calculatePnL = () => {
    if (!position) return { value: 0, percentage: 0, isPositive: false };

    const entryValue = position.entryPrice * position.amount;
    const currentValue = position.currentPrice * position.amount;

    // For long positions, profit when price goes up
    // For short positions, profit when price goes down
    const pnlValue = position.isLong
      ? currentValue - entryValue
      : entryValue - currentValue;

    const pnlPercentage = (pnlValue / entryValue) * 100;
    const isPositive = pnlValue >= 0;

    return {
      value: Math.abs(pnlValue).toFixed(2),
      percentage: Math.abs(pnlPercentage).toFixed(2),
      isPositive,
    };
  };

  const pnl = position
    ? calculatePnL()
    : { value: 0, percentage: 0, isPositive: false };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="p-6 rounded-xl border border-solid backdrop-blur-[10px] bg-slate-950 bg-opacity-50 border-[#fc6432] border-opacity-20">
          <div className="flex items-center justify-center h-40">
            <div className="text-white">Loading position details...</div>
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

  if (!position) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="p-6 rounded-xl border border-solid backdrop-blur-[10px] bg-slate-950 bg-opacity-50 border-[#fc6432] border-opacity-20">
          <div className="flex flex-col items-center justify-center h-40">
            <div className="text-white mb-4">Position not found</div>
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
          <ArrowLeft size={16} className="mr-1" />
          Back to Overview
        </Link>
      </div>

      <div className="p-6 rounded-xl border border-solid backdrop-blur-[10px] bg-slate-950 bg-opacity-50 border-[#fc6432] border-opacity-20">
        <div className="mb-6 text-lg font-semibold tracking-wide text-[#fc6432]">
          <div className="flex justify-between items-center">
            <div>POSITION #{position.id}</div>
            <div className="text-sm px-3 py-1 rounded-full bg-slate-800">
              {position.status === "open" ? (
                <span className="text-green-400">OPEN</span>
              ) : position.status === "closed" ? (
                <span className="text-gray-400">CLOSED</span>
              ) : (
                <span className="text-red-400">LIQUIDATED</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="p-5 rounded-lg bg-slate-950 bg-opacity-80">
            <div className="mb-4 text-sm text-neutral-400">
              POSITION DETAILS
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between">
                <span className="text-neutral-400">Direction</span>
                <span className="flex items-center">
                  {position.isLong ? (
                    <>
                      <TrendingUp size={16} className="text-green-500 mr-1" />
                      <span className="text-green-500">LONG</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown size={16} className="text-red-500 mr-1" />
                      <span className="text-red-500">SHORT</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Size</span>
                <span className="text-white">{position.amount} BTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Leverage</span>
                <span className="text-white">{position.leverage}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Entry Price</span>
                <span className="text-white">
                  ${position.entryPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Current Price</span>
                <span className="text-white">
                  ${position.currentPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Liquidation Price</span>
                <span className="text-white">
                  ${position.liquidationPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-lg bg-slate-950 bg-opacity-80">
            <div className="mb-4 text-sm text-neutral-400">PROFIT/LOSS</div>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between">
                <span className="text-neutral-400">P&L</span>
                <span
                  className={pnl.isPositive ? "text-green-500" : "text-red-500"}
                >
                  {pnl.isPositive ? "+" : "-"}${pnl.value} ({pnl.percentage}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Entry Value</span>
                <span className="text-white">
                  ${(position.entryPrice * position.amount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Current Value</span>
                <span className="text-white">
                  ${(position.currentPrice * position.amount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Funding Fee</span>
                <span className="text-white">
                  ${position.fundingFee.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Opening Fee</span>
                <span className="text-white">
                  ${position.openingFee.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-6">
          <div className="p-5 rounded-lg bg-slate-950 bg-opacity-80">
            <div className="mb-4 text-sm text-neutral-400">
              TIME INFORMATION
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between">
                <span className="text-neutral-400">Opening Time</span>
                <span className="text-white">
                  {new Date(position.openTime).toLocaleString()}
                </span>
              </div>
              {position.closeTime && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Closing Time</span>
                  <span className="text-white">
                    {new Date(position.closeTime).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-400">Opening Block</span>
                <span className="text-white">{position.openBlock}</span>
              </div>
              {position.closeBlock && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Closing Block</span>
                  <span className="text-white">{position.closeBlock}</span>
                </div>
              )}
              {position.expiryBlock && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Expiry Block</span>
                  <span className="text-white">{position.expiryBlock}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {position.status === "open" && stacksUser && (
          <div className="flex justify-center">
            <button
              onClick={handleClosePosition}
              disabled={isClosing}
              className="px-6 py-3 bg-[#fc6432] text-white rounded-lg hover:bg-[#ff8a61] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClosing ? "Closing Position..." : "Close Position"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
