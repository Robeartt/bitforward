import React from "react";

interface HeaderProps {
  isConnected: boolean;
  currentTime: string;
}

const Header: React.FC<HeaderProps> = ({ isConnected, currentTime }) => {
  return (
    <div className="flex justify-between items-center px-5 py-4 border-b border-solid bg-slate-950 border-b-slate-800 max-sm:flex-col max-sm:gap-2.5 max-sm:text-center">
      <div className="flex gap-2.5 items-center">
        <div className="flex items-center text-2xl tracking-tight max-sm:text-xl">
          <span className="text-orange-500">Bit</span>
          <span className="text-slate-50">Forward</span>
        </div>
        <img
          src="https://cdn.builder.io/api/v1/image/assets/TEMP/a7c71b388e5111ced6987407af0723fabc79cdc6"
          className="object-contain ml-0 h-[30px] w-[30px] max-sm:w-6 max-sm:h-6"
          alt="BitForward Logo"
        />
      </div>
      <div className="flex gap-5 max-sm:mx-0 max-sm:my-2.5">
        <button
          className="px-4 py-1.5 rounded transition-all cursor-pointer border-[none] duration-[0.2s] ease-[ease]"
          onClick={(event) => (window.location.href = "/overview")}
          style={{
            color:
              window.location.pathname === "/overview" ? "#fc6432" : "#8a8d93",
          }}
        >
          Overview
        </button>
        <button
          className="px-4 py-1.5 rounded transition-all cursor-pointer border-[none] duration-[0.2s] ease-[ease]"
          onClick={(event) => (window.location.href = "/speculate/new")}
          style={{
            color:
              window.location.pathname === "/speculate" ? "#fc6432" : "#8a8d93",
          }}
        >
          Speculate
        </button>
        <button
          className="px-4 py-1.5 rounded transition-all cursor-pointer border-[none] duration-[0.2s] ease-[ease]"
          onClick={(event) => (window.location.href = "/premiums")}
          style={{
            color:
              window.location.pathname === "/premiums" ? "#fc6432" : "#8a8d93",
          }}
        >
          Premiums
        </button>
        <button
          className="px-4 py-1.5 rounded transition-all cursor-pointer border-[none] duration-[0.2s] ease-[ease]"
          onClick={(event) => (window.location.href = "/settings")}
          style={{
            color:
              window.location.pathname === "/settings" ? "#fc6432" : "#8a8d93",
          }}
        >
          Settings
        </button>
      </div>
      <div className="flex gap-4 items-center">
        <div className="flex items-center">
          <span
            style={{
              color: isConnected ? "#00ff00" : "#ff0000",
            }}
          >
            <>
              {isConnected ? <span>LIVE</span> : null}
              {!isConnected ? <span>OFFLINE</span> : null}
            </>
          </span>
        </div>
        <div className="text-neutral-400">{currentTime}</div>
      </div>
    </div>
  );
};

export default Header;
