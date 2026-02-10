import React from 'react';

const NanoBanana: React.FC = () => {
  return (
    <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-zinc-100">Nano Banana Pro</h3>
        <span className="px-2 py-1 text-xs font-medium text-green-400 bg-green-400/10 rounded-full border border-green-400/20">
          Nano Banana Pro — Active
        </span>
      </div>
      <p className="text-sm text-zinc-400">
        This application is currently using the latest update of the Nano Banana Pro model.
      </p>
    </div>
  );
};

export default NanoBanana;