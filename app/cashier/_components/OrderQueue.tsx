// src/app/cashier/_components/OrderQueue.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/supabase";

interface Order {
  id: string;
  total_amount: number;
  status: string;
  source: string;
  created_at: string;
}

export default function OrderQueue() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const fetchActiveOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .in("status", ["pending", "preparing"])
        .order("created_at", { ascending: false });

      if (!error && data) setOrders(data);
    };

    fetchActiveOrders();

    const orderSubscription = supabase
      .channel("cashier-order-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          if (eventType === "INSERT") {
            if (newRecord.status === "pending" || newRecord.status === "preparing") {
              setOrders((prev) => [newRecord as Order, ...prev]);
            }
          } else if (eventType === "UPDATE") {
            if (newRecord.status === "completed" || newRecord.status === "cancelled") {
              setOrders((prev) => prev.filter((o) => o.id !== newRecord.id));
            } else {
              setOrders((prev) =>
                prev.map((o) => (o.id === newRecord.id ? (newRecord as Order) : o))
              );
            }
          } else if (eventType === "DELETE") {
            setOrders((prev) => prev.filter((o) => o.id !== oldRecord.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderSubscription);
    };
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Live Kitchen & Pickup Queue</h2>
      {orders.length === 0 ? (
        <p className="text-gray-400 text-center py-8 bg-white border rounded-xl">No active orders right now.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white border-2 border-amber-100 p-4 rounded-xl shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <span className="font-mono text-sm font-bold bg-gray-100 px-2 py-1 rounded">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${
                    order.source === "web" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                  }`}>
                    {order.source}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-500 mt-2">
                  Status: <span className="text-amber-600 capitalize">{order.status}</span>
                </p>
              </div>
              <div className="flex justify-between items-center border-t pt-3 mt-4">
                <span className="font-bold text-gray-800">KES {order.total_amount}</span>
                <button 
                  onClick={async () => {
                    await supabase.from("orders").update({ status: "completed" }).eq("id", order.id);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                >
                  Mark Ready
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}