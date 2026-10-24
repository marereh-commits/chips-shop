"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";

interface Order {
  id: number;
  created_at: string;
  name: string;
  phone: string;
  address: string;
  items: string;
  totalprice: number;
  status: string;
  table_number?: string; // DINE-IN: set when the order came from a table QR code
}

interface StockItem {
  name: string;
  remaining: number;
  capacity: number;
  threshold: number;
}

export default function KitchenDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Baseline inventory settings for the kitchen station
  const [stockInventory, setStockInventory] = useState<StockItem[]>([
    { name: "Plain Chips", remaining: 42, capacity: 100, threshold: 20 },
    { name: "Masala Chips", remaining: 18, capacity: 80, threshold: 25 },
    { name: "Chicken Tikka", remaining: 9, capacity: 30, threshold: 10 },
    { name: "Soda / Drinks", remaining: 55, capacity: 120, threshold: 30 },
  ]);

  useEffect(() => {
    fetchDashboardData();

    // Smart real-time listener tracking all events to update both layout pipeline and analytical streams
    const kitchenChannel = supabase
      .channel("kitchen-orders-analytics")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newOrder = payload.new as Order;
            if (newOrder.status !== "Delivered") {
              setOrders((prev) => [newOrder, ...prev]);
            } else {
              setCompletedOrders((prev) => [newOrder, ...prev]);
            }
            // Automatically deduct stock when a new order lands
            deductStockFromItems(newOrder.items);
          } else if (payload.eventType === "UPDATE") {
            const updatedOrder = payload.new as Order;
            if (updatedOrder.status === "Delivered") {
              // Move from active view to completed analytics view
              setOrders((prev) => prev.filter((o) => o.id !== updatedOrder.id));
              setCompletedOrders((prev) => {
                if (prev.some((o) => o.id === updatedOrder.id)) return prev;
                return [updatedOrder, ...prev];
              });
            } else {
              setOrders((prev) =>
                prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
              );
            }
          } else if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
            setCompletedOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(kitchenChannel);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch active kitchen orders
      const activeRes = await supabase
        .from("orders")
        .select("*")
        .neq("status", "Delivered")
        .order("id", { ascending: false });

      // Fetch delivered orders to aggregate sales analytics
      const completedRes = await supabase
        .from("orders")
        .select("*")
        .eq("status", "Delivered");

      if (activeRes.error) throw activeRes.error;
      if (completedRes.error) throw completedRes.error;

      if (activeRes.data) setOrders(activeRes.data);
      if (completedRes.data) setCompletedOrders(completedRes.data);
    } catch (err: any) {
      console.error("Error fetching kitchen and analytics streams:", {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: number, nextStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: nextStatus })
        .eq("id", orderId);

      if (error) throw error;

      // Optimistic layout sync for immediate UI updates
      if (nextStatus === "Delivered") {
        const deliveredOrder = orders.find((o) => o.id === orderId);
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        if (deliveredOrder) {
          setCompletedOrders((prev) => [{ ...deliveredOrder, status: "Delivered" }, ...prev]);
        }
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
        );
      }
    } catch (err) {
      console.error("Failed to update status column:", err);
      alert("Error reaching database server. Check network connection.");
    }
  };

  // Helper parser: Extracts item names and quantities from the plaintext slips
  // Expects formats like "2x Plain Chips" or "1 x Masala Chips"
  const parseItemQuantities = (itemsString: string): Record<string, number> => {
    const counts: Record<string, number> = {};
    if (!itemsString) return counts;

    const lines = itemsString.split("/\n|,\s*/");
    lines.forEach((line) => {
      const match = line.match(/(\d+)\s*[xX]\s*(.+)/);
      if (match) {
        const qty = parseInt(match[1], 10);
        const name = match[2].trim();
        counts[name] = (counts[name] || 0) + qty;
      } else if (line.trim()) {
        // Fallback if no multipliers are present
        const name = line.trim();
        counts[name] = (counts[name] || 0) + 1;
      }
    });
    return counts;
  };

  // Deducts items dynamically when incoming pipelines change
  const deductStockFromItems = (itemsString: string) => {
    const parsed = parseItemQuantities(itemsString);
    setStockInventory((prev) =>
      prev.map((stock) => {
        const matchKey = Object.keys(parsed).find((k) =>
          k.toLowerCase().includes(stock.name.toLowerCase())
        );
        if (matchKey) {
          return {
            ...stock,
            remaining: Math.max(0, stock.remaining - parsed[matchKey]),
          };
        }
        return stock;
      })
    );
  };

  // Restock control button behavior
  const handleRestock = (itemName: string) => {
    setStockInventory((prev) =>
      prev.map((item) =>
        item.name === itemName ? { ...item, remaining: item.capacity } : item
      )
    );
  };

  // --- Analytics Aggregators ---
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.totalprice || 0), 0);
  
  // Calculate historical items metrics mapping
  const salesVolumeMetrics: Record<string, number> = {};
  completedOrders.forEach((o) => {
    const parsed = parseItemQuantities(o.items);
    Object.entries(parsed).forEach(([name, qty]) => {
      // Group variants gracefully
      let standardName = name;
      if (name.toLowerCase().includes("plain")) standardName = "Plain Chips";
      if (name.toLowerCase().includes("masala")) standardName = "Masala Chips";
      if (name.toLowerCase().includes("chicken")) standardName = "Chicken Tikka";
      if (name.toLowerCase().includes("soda") || name.toLowerCase().includes("drink")) standardName = "Soda / Drinks";
      
      salesVolumeMetrics[standardName] = (salesVolumeMetrics[standardName] || 0) + qty;
    });
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-400 flex flex-col items-center justify-center font-sans gap-2">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold tracking-wider uppercase">Loading Kitchen Pipeline...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-6 font-sans">
      
      {/* HEADER STATION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-stone-800 pb-5 mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            👨‍🍳 Kitchen Order & Control Station{" "}
            <span className="text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
              Analytics Engine Active
            </span>
          </h1>
          <p className="text-stone-500 text-xs mt-1">
            Frying operations, dynamic component stock parsing, and revenue generation tracking.
          </p>
        </div>
        <div className="flex gap-6 text-left md:text-right">
          <div>
            <span className="text-3xl font-black text-amber-400">{orders.length}</span>
            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Active Batches</p>
          </div>
          <div className="border-l border-stone-800 pl-6">
            <span className="text-3xl font-black text-emerald-400">Ksh {totalRevenue.toLocaleString()}</span>
            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Gross Sales (Delivered)</p>
          </div>
        </div>
      </div>

      {/* ANALYTICS & INVENTORY CONTROL PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Realtime Stock Level Components */}
        <div className="lg:col-span-2 bg-stone-900 border border-stone-800/80 rounded-[2rem] p-6 shadow-xl">
          <h2 className="text-sm font-black text-stone-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            📦 Current Pantry Stock Levels
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stockInventory.map((item) => {
              const isLow = item.remaining <= item.threshold;
              const fillPercentage = (item.remaining / item.capacity) * 100;
              return (
                <div key={item.name} className="bg-stone-950/60 border border-stone-800/60 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-sm text-stone-200">{item.name}</span>
                      {isLow ? (
                        <span className="text-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-400 font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md animate-pulse">
                          Low Stock Warning
                        </span>
                      ) : (
                        <span className="text-[9px] bg-stone-800 text-stone-400 font-bold px-2 py-0.5 rounded-md">
                          Stable
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className={`text-xl font-black ${isLow ? 'text-rose-400' : 'text-stone-100'}`}>
                        {item.remaining}
                      </span>
                      <span className="text-xs text-stone-600">/ {item.capacity} items left</span>
                    </div>
                    
                    {/* Progress Bar Visualizer */}
                    <div className="w-full bg-stone-900 rounded-full h-1.5 mt-3 overflow-hidden">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-500 ${isLow ? 'bg-rose-500' : 'bg-amber-500'}`} 
                        style={{ width: `${fillPercentage}%` }}
                      />
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleRestock(item.name)}
                    className="mt-4 w-full text-center py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-[11px] font-bold rounded-xl border border-stone-800/60 transition"
                  >
                    🔄 Restock to Max Capacity
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Product Sales Performance Summary */}
        <div className="bg-stone-900 border border-stone-800/80 rounded-[2rem] p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-black text-stone-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              🔥 Best Sellers (Volumes Sold)
            </h2>
            <div className="space-y-3.5">
              {stockInventory.map((stockItem) => {
                const count = salesVolumeMetrics[stockItem.name] || 0;
                return (
                  <div key={stockItem.name} className="flex justify-between items-center bg-stone-950/30 px-4 py-2.5 rounded-xl border border-stone-800/40">
                    <span className="text-xs text-stone-400 font-medium">{stockItem.name}</span>
                    <span className="text-sm font-black text-amber-400 px-2.5 py-0.5 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                      {count} sold
                    </span>
                  </div>
                );
              })}
              {Object.keys(salesVolumeMetrics).length === 0 && (
                <p className="text-stone-600 text-xs text-center py-6">No completed batches tracked today yet.</p>
              )}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-stone-800/60 text-center">
            <span className="text-[10px] text-stone-500 block font-bold uppercase tracking-wider">Total Handled Batches</span>
            <span className="text-xs text-stone-300 font-bold">{completedOrders.length + orders.length} Orders Registered</span>
          </div>
        </div>

      </div>

      {/* LINE PIPELINE ORDERS CONTAINER */}
      <h2 className="text-sm font-black text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        ⏰ Live Active Orders Queue
      </h2>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-stone-800 rounded-[2rem] bg-stone-900/20">
          <span className="text-4xl mb-3">📭</span>
          <h3 className="font-bold text-stone-300">All Order Streams Cleared</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-xs">
            New checkouts placed at the front counter will instantly pop up here in real time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-stone-900 border border-stone-800/80 rounded-3xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden transition hover:border-stone-700/50"
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-stone-500 tracking-wider">ORDER #{order.id}</span>
                      {/* DINE-IN: table badge */}
                      {order.table_number && (
                        <span className="text-[10px] font-black uppercase bg-amber-500 text-stone-950 px-2 py-0.5 rounded-md">
                          Table {order.table_number}
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-white text-lg tracking-tight mt-0.5">{order.name}</h3>
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider border transition-colors ${
                      order.status === "Transit"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {order.status === "Transit"
                      ? order.table_number ? "🍽️ Serving" : "🚴 Transit"
                      : "🔥 Frying"}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-stone-400 border-b border-stone-800/60 pb-3 mb-4">
                  <p>
                    📞 <span className="font-medium text-stone-300">{order.phone}</span>
                  </p>
                  <p>
                    📍 <span className="font-medium text-stone-300 leading-relaxed">{order.address}</span>
                  </p>
                </div>

                <div className="bg-stone-950/60 border border-stone-800/40 rounded-2xl p-3 mb-4">
                  <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Kitchen Slip</p>
                  <p className="text-sm font-bold text-stone-200 tracking-wide leading-relaxed whitespace-pre-line">
                    {order.items?.replace(/,\s*/g, "\n")}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-800/60 mt-2 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[9px] text-stone-500 block font-bold uppercase tracking-wider">Collect Total</span>
                  <span className="text-base font-black text-emerald-400">Ksh {order.totalprice}</span>
                </div>

                <div className="flex items-center gap-2">
                  {order.status !== "Transit" && (
                    <button
                      onClick={() => updateOrderStatus(order.id, "Transit")}
                      className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition active:scale-95 flex items-center gap-1 shadow-md"
                    >
                      {order.table_number ? "🍽️ Serve" : "🚀 Dispatch"}
                    </button>
                  )}
                  <button
                    onClick={() => updateOrderStatus(order.id, "Delivered")}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition active:scale-95 flex items-center gap-1 shadow-lg shadow-blue-900/20"
                  >
                    {order.table_number ? "✓ Mark Served" : "✓ Mark Delivered"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}