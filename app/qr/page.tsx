"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function TableQRCodes() {
  const [count, setCount] = useState(20);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => setBaseUrl(window.location.origin), []);

  return (
    <div className="min-h-screen bg-white p-8 text-gray-900">
      <div className="print:hidden max-w-xl mx-auto mb-8 space-y-3">
        <h1 className="text-2xl font-black">Table QR Codes</h1>
        <div className="flex gap-3 items-center">
          <label className="text-sm font-bold">Number of tables</label>
          <input
            type="number" min={1} max={100} value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
            className="border rounded-lg px-3 py-2 w-24"
          />
          <button onClick={() => window.print()} className="bg-[#FFC014] font-bold px-5 py-2 rounded-full">
            Print
          </button>
        </div>
        <p className="text-xs text-gray-500">Links point to: {baseUrl}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
        {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
          <div key={n} className="break-inside-avoid border-2 border-gray-200 rounded-2xl p-5 flex flex-col items-center gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">SADYBECH HOTEL</p>
            <QRCodeSVG value={`${baseUrl}/?table=${n}`} size={150} />
            <p className="text-2xl font-black">Table {n}</p>
            <p className="text-[10px] text-gray-400">Scan to order</p>
          </div>
        ))}
      </div>
    </div>
  );
}