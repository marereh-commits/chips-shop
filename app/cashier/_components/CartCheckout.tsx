// src/app/cashier/_components/CartCheckout.tsx
"use client";

import { Dispatch, SetStateAction, useState } from "react";
import { CartItem } from "../page";

interface CartCheckoutProps {
  cart: CartItem[];
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  onOrderComplete: () => void;
}

export default function CartCheckout({ cart, setCart, onOrderComplete }: CartCheckoutProps) {
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "M-Pesa">("Cash");
  const [loading, setLoading] = useState(false);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return alert("Cart is empty");
    setLoading(true);

    try {
      const response = await fetch("/api/orders/cashier-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          total_amount: total,
          payment_method: paymentMethod,
          source: "walk-in",
        }),
      });

      if (response.ok) {
        alert("Order successfully processed!");
        onOrderComplete();
      } else {
        alert("Failed to process order.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-6 justify-between">
      <div>
        <h2 className="text-xl font-bold border-b pb-4 mb-4">Current Bill</h2>
        {cart.length === 0 ? (
          <p className="text-gray-400 text-center py-12">No items selected</p>
        ) : (
          <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs text-gray-500">KES {item.price} x {item.quantity}</p>
                </div>
                <span className="font-bold">KES {item.price * item.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between text-lg font-bold mb-4">
          <span>Total:</span>
          <span className="text-amber-600">KES {total}</span>
        </div>

        <p className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2">Payment Option</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(["Cash", "M-Pesa"] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`py-2 text-center font-bold rounded-lg border text-sm transition-all ${
                paymentMethod === method
                  ? "border-amber-500 bg-amber-50 text-amber-700"
                  : "border-gray-200 text-gray-600"
              }`}
            >
              {method}
            </button>
          ))}
        </div>

        <button
          onClick={handleCheckout}
          disabled={loading || cart.length === 0}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-4 rounded-xl font-bold text-lg shadow-md transition-all active:scale-[0.99]"
        >
          {loading ? "Processing..." : `Complete Order (KES ${total})`}
        </button>
      </div>
    </div>
  );
}