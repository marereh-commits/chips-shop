// src/app/cashier/page.tsx
"use client";

import { useState } from "react";
import MenuGrid from "./_components/MenuGrid";
import OrderQueue from "./_components/OrderQueue";
import CartCheckout from "./_components/CartCheckout";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function CashierDashboard() {
  const [activeTab, setActiveTab] = useState<"walk-in" | "queue">("walk-in");
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (item: Omit<CartItem, "quantity">) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const clearCart = () => setCart([]);

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
      {/* LEFT COLUMN: 2/3 Width for Order Management / POS Menu */}
      <div className="flex flex-col w-2/3 border-r border-gray-200">
        {/* Tab Navigation */}
        <div className="flex bg-white border-b border-gray-200 p-4 gap-4">
          <button
            onClick={() => setActiveTab("walk-in")}
            className={`px-6 py-3 font-bold rounded-lg transition-colors ${
              activeTab === "walk-in" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            New Walk-In Order
          </button>
          <button
            onClick={() => setActiveTab("queue")}
            className={`px-6 py-3 font-bold rounded-lg transition-colors ${
              activeTab === "queue" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            Live Order Queue
          </button>
        </div>

        {/* Dynamic View Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "walk-in" ? (
            <MenuGrid onSelectItem={addToCart} />
          ) : (
            <OrderQueue />
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: 1/3 Width for Cart & Checkout */}
      <div className="w-1/3 bg-white flex flex-col h-full shadow-lg">
        <CartCheckout cart={cart} setCart={setCart} onOrderComplete={clearCart} />
      </div>
    </div>
  );
}