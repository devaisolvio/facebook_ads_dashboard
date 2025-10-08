// src/components/Loader.tsx
import React from "react";

type LoaderProps = {
  label?: string;
  fullscreen?: boolean; // if true, centers in the whole viewport
};

const Loader: React.FC<LoaderProps> = ({ label = "Loading…", fullscreen = false }) => {
  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm"
          : "w-full h-full flex items-center justify-center"
      }
    >
      <div className="flex flex-col items-center gap-4">
        {/* spinner */}
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-gray-200 dark:border-slate-700"></div>
          <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
        </div>

        {/* label */}
        <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {label}
        </div>
      </div>
    </div>
  );
};

export default Loader;
