import React, { useState, useRef, useEffect } from "react";
import { DropdownProps } from "./types";

export const Dropdown: React.FC<DropdownProps> = ({
  selected,
  options,
  label,
  sublabel,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSelect = (option: string) => {
    onSelect(option);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsOpen(false);
    } else if (event.key === "Enter" || event.key === " ") {
      toggleDropdown();
    }
  };

  return (
    <div className="mb-5" ref={dropdownRef}>
      {label && <h3 className="mb-1.5 text-sm text-neutral-400">{label}</h3>}
      <div className="relative">
        <button
          className="flex justify-between items-center p-3 w-full rounded cursor-pointer bg-slate-800 hover:bg-slate-700 transition-colors"
          onClick={toggleDropdown}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={`Select ${label}`}
        >
          <span>{selected}</span>
          <span
            className="transition-transform duration-200"
            style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            aria-hidden="true"
          >
            ▼
          </span>
        </button>
        {isOpen && (
          <ul
            className="absolute inset-x-0 top-full z-10 mt-1 rounded bg-slate-800 shadow-[0_4px_6px_rgba(0,0,0,0.1)] overflow-hidden"
            role="listbox"
            aria-activedescendant={selected}
          >
            {options.map((option) => (
              <li
                key={option}
                id={option}
                className={`p-3 cursor-pointer hover:bg-slate-700 transition-colors ${
                  selected === option ? "bg-slate-700" : ""
                }`}
                onClick={() => handleSelect(option)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleSelect(option);
                  }
                }}
                role="option"
                aria-selected={selected === option}
                tabIndex={0}
              >
                {option}
              </li>
            ))}
          </ul>
        )}
      </div>
      {sublabel && (
        <p className="mt-1.5 text-sm text-neutral-400">{sublabel}</p>
      )}
    </div>
  );
};
