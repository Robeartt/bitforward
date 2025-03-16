import React, { useState } from "react";
import CreatePosition from "./CreatePosition";

export default function Overview() {
  const [successMessage, setSuccessMessage] = useState(null);

  const handlePositionCreated = (newPosition) => {
    setSuccessMessage(`Position #${newPosition.id} created successfully!`);

    // Clear success message after 5 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);

    console.log("New position created:", newPosition);
  };

  return (
    <div className="w-full">
      {successMessage && (
        <div className="mb-6 p-3 bg-green-900 bg-opacity-30 border border-green-500 text-green-300 rounded-lg text-center">
          {successMessage}
        </div>
      )}


    </div>
  );
}
