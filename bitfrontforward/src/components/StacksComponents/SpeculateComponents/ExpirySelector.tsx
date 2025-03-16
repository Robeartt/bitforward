import React, { useState, useEffect } from "react";
import { TimeControl } from "./TimeControl";

interface ExpirySelectorProps {
  timeRemaining: string;
  onTimeChange: (days: number, hours: number, minutes: number) => void;
}

export const ExpirySelector: React.FC<ExpirySelectorProps> = ({
  timeRemaining,
  onTimeChange,
}) => {
  const [days, setDays] = useState<number>(0);
  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(0);
  const [expiryDate, setExpiryDate] = useState<Date>(new Date());

  useEffect(() => {
    updateDateTime();
  }, [days, hours, minutes]);

  const updateDateTime = () => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    newDate.setHours(newDate.getHours() + hours);
    newDate.setMinutes(newDate.getMinutes() + minutes);
    setExpiryDate(newDate);
    onTimeChange(days, hours, minutes);
  };

  const incrementTime = (unit: "days" | "hours" | "minutes") => {
    const maxValues = {
      days: 365,
      hours: 23,
      minutes: 59,
    };

    if (unit === "days" && days < maxValues.days) {
      setDays(days + 1);
    } else if (unit === "hours" && hours < maxValues.hours) {
      setHours(hours + 1);
    } else if (unit === "minutes" && minutes < maxValues.minutes) {
      setMinutes(minutes + 1);
    }
  };

  const decrementTime = (unit: "days" | "hours" | "minutes") => {
    if (unit === "days" && days > 0) {
      setDays(days - 1);
    } else if (unit === "hours" && hours > 0) {
      setHours(hours - 1);
    } else if (unit === "minutes" && minutes > 0) {
      setMinutes(minutes - 1);
    }
  };

  const updateTimeInput = (
    unit: "days" | "hours" | "minutes",
    value: string,
  ) => {
    const numValue = parseInt(value) || 0;
    const maxValues = {
      days: 365,
      hours: 23,
      minutes: 59,
    };

    const boundedValue = Math.min(Math.max(0, numValue), maxValues[unit]);

    if (unit === "days") {
      setDays(boundedValue);
    } else if (unit === "hours") {
      setHours(boundedValue);
    } else if (unit === "minutes") {
      setMinutes(boundedValue);
    }
  };

  const formatDate = () => {
    return expiryDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = () => {
    return expiryDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <section className="mb-5">
      <div className="flex justify-between items-center mb-2.5">
        <h2>Expires (EDT)</h2>
        <div className="text-sm text-neutral-400">
          <span>BLOCK REMAINING: </span>
          <span>
            {Math.max(
              1,
              Math.ceil((days * 24 * 60 + hours * 60 + minutes) / 10),
            )}{" "}
            block (
            {timeRemaining.includes("blocks")
              ? timeRemaining.split("(")[1].split(")")[0]
              : "10:00"}
            )
          </span>
        </div>
      </div>

      <div className="flex gap-5 mb-5 max-md:flex-col max-md:gap-2.5">
        <TimeControl
          label="Days"
          value={days}
          onIncrement={() => incrementTime("days")}
          onDecrement={() => decrementTime("days")}
          onChange={(value) => updateTimeInput("days", value)}
        />

        <TimeControl
          label="Hours"
          value={hours}
          onIncrement={() => incrementTime("hours")}
          onDecrement={() => decrementTime("hours")}
          onChange={(value) => updateTimeInput("hours", value)}
        />

        <TimeControl
          label="Minutes"
          value={minutes}
          onIncrement={() => incrementTime("minutes")}
          onDecrement={() => decrementTime("minutes")}
          onChange={(value) => updateTimeInput("minutes", value)}
        />
      </div>

      <div className="flex gap-5 max-md:flex-col max-md:gap-2.5">
        <div className="flex-1 p-3 rounded bg-slate-800">
          <h3>Date</h3>
          <div>
            <span>{formatDate()}</span>
            <i className="ti ti-calendar" aria-hidden="true"></i>
          </div>
        </div>

        <div className="flex-1 p-3 rounded bg-slate-800">
          <h3>Time</h3>
          <div>
            <span>{formatTime()}</span>
            <i className="ti ti-clock" aria-hidden="true"></i>
          </div>
        </div>
      </div>
    </section>
  );
};
