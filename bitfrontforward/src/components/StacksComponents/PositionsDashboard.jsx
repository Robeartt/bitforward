import React, { useState, useEffect } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PositionDashboard = () => {
  // Position status mapping
  const statusMap = new Map([
    ["open", { label: "Open", color: "text-green-500" }],
    ["closed", { label: "Closed", color: "text-gray-500" }],
    ["liquidated", { label: "Liquidated", color: "text-red-500" }],
    ["matched", { label: "Matched", color: "text-blue-500" }],
  ]);

  const [positions, setPositions] = useState([]);
  const [history, setHistory] = useState([]);
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch positions and history on component mount
  useEffect(() => {
    fetchPositions();
    fetchHistory();
  }, []);

  const fetchPositions = async () => {
    try {
      const response = await fetch("/api/positions");
      const data = await response.json();
      setPositions(data);
    } catch (err) {
      setError("Failed to fetch positions");
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch("/api/positions/history");
      const data = await response.json();
      setHistory(data);
    } catch (err) {
      setError("Failed to fetch position history");
    }
  };

  const handleNewPosition = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/position/new", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create position");
      }

      setSuccess("Position created successfully");
      setAddress("");
      fetchPositions();
      fetchHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrice = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ price: Number(price) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to set price");
      }

      setSuccess(`Price set successfully. Transaction ID: ${data.txId}`);
      setPrice("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="default" className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">
            {success}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create New Position</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleNewPosition} className="space-y-4">
            <div>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter address"
                className="w-full p-2 border rounded"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Position"}
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Set Price</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPrice} className="space-y-4">
            <div>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Enter price"
                className="w-full p-2 border rounded"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "Setting price..." : "Set Price"}
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Address</th>
                  <th className="p-2 text-left">Amount</th>
                  <th className="p-2 text-left">Long</th>
                  <th className="p-2 text-left">Open Value</th>
                  <th className="p-2 text-left">Premium</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2">{position.address}</td>
                    <td className="p-2">{position.amount}</td>
                    <td className="p-2">
                      <span
                        className={
                          position.long ? "text-green-500" : "text-blue-500"
                        }
                      >
                        {position.long ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="p-2">{position.openValue}</td>
                    <td className="p-2">{position.premium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Position History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Address</th>
                  <th className="p-2 text-left">Open Block</th>
                  <th className="p-2 text-left">Closing Block</th>
                  <th className="p-2 text-left">Matched</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2">{item.address}</td>
                    <td className="p-2">{item.openBlock}</td>
                    <td className="p-2">{item.closingBlock}</td>
                    <td className="p-2">
                      <span
                        className={
                          statusMap.get(item.matched ? "matched" : "closed")
                            ?.color || "text-gray-500"
                        }
                      >
                        {item.matched ? "Yes" : "No"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PositionDashboard;
