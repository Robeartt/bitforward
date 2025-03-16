import React, { useState, useEffect, useRef } from "react";
import { LeverageSliderProps } from "./types";

export const LeverageSlider: React.FC<LeverageSliderProps> = ({
  value,
  min,
  max,
  onChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const getPercentage = (): number => {
    return ((value - min) / (max - min)) * 100;
  };

  const handleSliderInteraction = (
    event: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent,
  ): void => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();

    // Get the correct client X position for both touch and mouse events
    let clientX: number;
    if ("touches" in event) {
      clientX = event.touches[0].clientX;
    } else {
      clientX = (event as MouseEvent).clientX;
    }

    // Calculate the relative position (0 to 1)
    const position = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width),
    );

    // Convert position to leverage value
    const range = max - min;
    let newValue = min + range * position;

    // Round to 1 decimal place
    newValue = Math.round(newValue * 10) / 10;

    // Ensure value stays within bounds
    newValue = Math.max(min, Math.min(max, newValue));

    // Update state
    onChange(newValue);
  };

  const startDragging = (event: React.MouseEvent | React.TouchEvent): void => {
    // Prevent default behavior and event bubbling
    event.preventDefault();
    event.stopPropagation();

    // Set dragging state
    setIsDragging(true);

    // Initial interaction
    handleSliderInteraction(event);
  };

  useEffect(() => {
    const handleDrag = (e: MouseEvent | TouchEvent): void => {
      if (!isDragging) return;
      e.preventDefault();
      handleSliderInteraction(e);
    };

    const stopDragging = (): void => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleDrag);
      document.addEventListener("touchmove", handleDrag, { passive: false });
      document.addEventListener("mouseup", stopDragging);
      document.addEventListener("touchend", stopDragging);
    }

    return () => {
      document.removeEventListener("mousemove", handleDrag);
      document.removeEventListener("touchmove", handleDrag);
      document.removeEventListener("mouseup", stopDragging);
      document.removeEventListener("touchend", stopDragging);
    };
  }, [isDragging]);

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    const step = 0.1;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      onChange(Math.min(max, Math.round((value + step) * 10) / 10));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      onChange(Math.max(min, Math.round((value - step) * 10) / 10));
    } else if (event.key === "Home") {
      event.preventDefault();
      onChange(min);
    } else if (event.key === "End") {
      event.preventDefault();
      onChange(max);
    }
  };

  return (
    <div className="mt-2.5 mb-5">
      <h3>Leverage</h3>
      <div
        ref={sliderRef}
        className="slider-track flex relative items-center mx-0 mt-9 mb-4 w-full h-1 rounded-lg cursor-pointer bg-zinc-800"
        role="slider"
        aria-label="Leverage slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value}x leverage`}
        tabIndex={0}
        onMouseDown={startDragging}
        onTouchStart={startDragging}
        onClick={(e) => handleSliderInteraction(e)}
        onKeyDown={handleKeyDown}
        style={{
          background: `linear-gradient(to right, #fc6432 0%, #fc6432 ${getPercentage()}%, #333 ${getPercentage()}%, #333 100%)`,
        }}
      >
        <div className="relative w-full">
          <div
            className="absolute top-0 left-0 h-full bg-orange-500 rounded transition-[width] duration-[0.1s] ease-[ease-out]"
            style={{
              width: `${getPercentage()}%`,
            }}
          />
          <div
            className="slider-handle absolute top-2/4 w-5 h-5 bg-white rounded-full border-2 border-orange-500 border-solid transition-all -translate-x-2/4 -translate-y-2/4 select-none cursor-grab duration-[0.1s] ease-[ease-out] shadow-[0_2px_4px_rgba(0,0,0,0.1)] touch-none z-[5] max-sm:w-6 max-sm:h-6"
            role="presentation"
            onMouseDown={(e) => {
              e.stopPropagation();
              startDragging(e);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              startDragging(e);
            }}
            style={{
              left: `${getPercentage()}%`,
            }}
          >
            <div
              className="absolute left-2/4 z-10 px-2 py-1 text-xs font-medium text-white whitespace-nowrap bg-orange-500 rounded transition-all -translate-x-2/4 pointer-events-none duration-[0.2s] ease-[ease] top-[-30px]"
              style={{
                opacity: isDragging ? "1" : "0.9",
              }}
            >
              <span>{value}</span>
              <span>x</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-between mt-1.5 text-xs text-neutral-400">
        <span>{min}x</span>
        <span
          className="absolute font-medium text-orange-500 -translate-x-2/4"
          style={{
            left: `${getPercentage()}%`,
          }}
        />
        <span>{max}x</span>
      </div>
    </div>
  );
};
