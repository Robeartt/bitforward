import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  );

  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    };

    updateClock();
    const clockInterval = setInterval(updateClock, 1000);

    return () => {
      clearInterval(clockInterval);
    };
  }, []);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="flex justify-between items-center px-5 py-4 border-b border-solid bg-slate-950 border-b-slate-800 max-sm:flex-col max-sm:gap-2.5 max-sm:text-center">
      <div className="flex items-center">
        <Link to="/" className="flex items-center">
          <img
            src="https://cdn.builder.io/api/v1/image/assets/TEMP/f951ab49f451c201772284705cec07678dc2839c"
            className="object-contain h-9 w-[140px] max-sm:h-[31px] max-sm:w-[120px]"
            alt="BitForward Logo"
          />
        </Link>
      </div>

      <nav className="flex gap-5 max-sm:mx-0 max-sm:my-2.5">
        <Link
          to="/overview"
          className="px-4 py-1.5 rounded transition-all cursor-pointer border-none duration-[0.2s] ease-[ease]"
          style={{
            color: isActive("/overview") ? "#fc6432" : "#8a8d93",
          }}
        >
          Overview
        </Link>
        <Link
          to="/speculate"
          className="px-4 py-1.5 rounded transition-all cursor-pointer border-none duration-[0.2s] ease-[ease]"
          style={{
            color: isActive("/speculate") ? "#fc6432" : "#8a8d93",
          }}
        >
          Speculate
        </Link>
        <Link
          to="/premiums"
          className="px-4 py-1.5 rounded transition-all cursor-pointer border-none duration-[0.2s] ease-[ease]"
          style={{
            color: isActive("/premiums") ? "#fc6432" : "#8a8d93",
          }}
        >
          Premiums
        </Link>
        <Link
          to="/settings"
          className="px-4 py-1.5 rounded transition-all cursor-pointer border-none duration-[0.2s] ease-[ease]"
          style={{
            color: isActive("/settings") ? "#fc6432" : "#8a8d93",
          }}
        >
          Settings
        </Link>
      </nav>

      <div className="flex gap-4 items-center">
        <div
          className="flex items-center"
          style={{
            color: isConnected ? "#00ff00" : "#ff0000",
          }}
        >
          {isConnected ? <span>LIVE</span> : <span>OFFLINE</span>}
        </div>
        <time className="text-neutral-400">{currentTime}</time>
      </div>
    </header>
  );
};
