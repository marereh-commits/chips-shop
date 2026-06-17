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
}

export default function KitchenDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveOrders();

    const kitchenChannel = supabase
      .channel("kitchen-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchActiveOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(kitchenChannel);
    };
  }, []);

  const fetchActiveOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .neq("status", "Delivered")
        .order("id", { ascending: false });

      if (error) throw error;
      if (data) setOrders(data);
    } catch (err) {
    console.error("Error fetching kitchen data:", err);
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

      if (error) {
        throw error;
      } else {
        setOrders((prev) =>
          nextStatus === "Delivered"
            ? prev.filter((o) => o.id !== orderId)
            : prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
        );
      }
    } catch (err) {
      console.error("Failed to update status column:", err);
      alert("Error reaching database server. Check network connection.");
    }
  };

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
      <div className="flex justify-between items-center border-b border-stone-800 pb-5 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            👨‍🍳 Kitchen Order Station <span className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-0.5 rounded-full font-bold animate-pulse">Live Connections Enabled</span>
          </h1>
          <p className="text-stone-500 text-xs mt-1">Frying updates are synchronized directly to customer devices.</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-black text-amber-400">{orders.length}</span>
          <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Active Batches</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-stone-800 rounded-[2rem] bg-stone-900/20">
          <span className="text-4xl mb-3">📭</span>
          <h3 className="font-bold text-stone-300">All Order Streams Cleared</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-xs">New checkouts placed at the front counter will instantly pop up here in real time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orders.map((order) => (
            <div key={order.id} className="bg-stone-900 border border-stone-800/80 rounded-3xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden transition hover:border-stone-700/50">
              
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-mono text-stone-500 tracking-wider">ORDER #{order.id}</span>
                    <h3 className="font-extrabold text-white text-lg tracking-tight mt-0.5">{order.name}</h3>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider border transition-colors ${
                    order.status === "Frying" || order.status === "Pending"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  }`}>
                    {order.status === "Frying" || order.status === "Pending" ? "🔥 Frying" : "🚴 Transit"}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-stone-400 border-b border-stone-800/60 pb-3 mb-4">
                  <p>📞 <span className="font-medium text-stone-300">{order.phone}</span></p>
                  <p>📍 <span className="font-medium text-stone-300 leading-relaxed">{order.address}</span></p>
                </div>

                <div className="bg-stone-950/60 border border-stone-800/40 rounded-2xl p-3 mb-4">
                  <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Kitchen Slip</p>
                  <p className="text-sm font-bold text-stone-200 tracking-wide leading-relaxed whitespace-pre-line">
                    {order.items}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-800/60 mt-2 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[9px] text-stone-500 block font-bold uppercase tracking-wider">Collect Total</span>
                  <span className="text-base font-black text-emerald-400">Ksh {order.totalprice}</span>
                </div>

                <div className="flex items-center gap-2">
                  {(order.status === "Frying" || order.status === "Pending") && (
                    <button
                      onClick={() => updateOrderStatus(order.id, "Transit")}
                      className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition active:scale-95 flex items-center gap-1 shadow-md"
                    >
                      🚀 Dispatch
                    </button>
                  )}
                  <button
                    onClick={() => updateOrderStatus(order.id, "Delivered")}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition active:scale-95 flex items-center gap-1 shadow-lg shadow-blue-900/20"
                  >
                    ✓ Mark Delivered
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