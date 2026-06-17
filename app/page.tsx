"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

// --- CONFIGURATION ---
const SHOP_LAT = 0.1833; // Ugunja Town Center
const SHOP_LON = 34.2986;
const MAX_RADIUS_KM = 30.0;

const MENU_ITEMS = [
  { 
    id: 1, 
    name: "Plain Chips (Regular)", 
    price: 100, 
    desc: "Classic crisp golden fries cooked to perfection", 
    category: "Meals", 
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=60",
    requiresId: false
  },
  { 
    id: 2, 
    name: "Chips Masala", 
    price: 150, 
    desc: "Fries coated in spicy, tangy signature masala sauce", 
    category: "Meals", 
    image: "https://images.unsplash.com/photo-1585109649139-366815a0d713?w=500&auto=format&fit=crop&q=60",
    requiresId: false
  },
  { 
    id: 3, 
    name: "Loaded Chips", 
    price: 250, 
    desc: "Fries topped heavily with melted cheese and minced beef", 
    category: "Meals", 
    image: "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&auto=format&fit=crop&q=60",
    requiresId: false
  },
  { 
    id: 4, 
    name: "Smokie (Per Piece)", 
    price: 40, 
    desc: "Perfect side companion for your hot chips", 
    category: "Sides", 
    image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=60",
    requiresId: false
  },
  { 
    id: 5, 
    name: "Soda 500ml", 
    price: 70, 
    desc: "Chilled refreshing carbonated soda", 
    category: "Drinks", 
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60",
    requiresId: false
  },
  { 
    id: 6, 
    name: "Fresh Mango Juice", 
    price: 120, 
    desc: "Thick, sweet, and perfectly blended local mangoes", 
    category: "Drinks", 
    image: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=500&auto=format&fit=crop&q=60",
    requiresId: false
  },
  { 
    id: 7, 
    name: "Fresh Passion Juice", 
    price: 120, 
    desc: "Tangy and refreshing blended passion fruit juice with seeds strained", 
    category: "Drinks", 
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60",
    requiresId: false
  },
  { 
    id: 8, 
    name: "Pineapple Mint Blend", 
    price: 140, 
    desc: "Sweet tropical pineapple blended with a cool touch of fresh mint leaves", 
    category: "Drinks", 
    image: "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=500&auto=format&fit=crop&q=60",
    requiresId: false
  },
  { 
    id: 9, 
    name: "Tusker Lager (500ml)", 
    price: 260, 
    desc: "Cold, crisp iconic local lager. Requires a legal age National ID check at purchase.", 
    category: "Drinks", 
    image: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=500&auto=format&fit=crop&q=60",
    requiresId: true
  }
];

export default function ChipsBaseApp() {
  // Location States
  const [locationVerified, setLocationVerified] = useState<boolean | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [isBypassed, setIsBypassed] = useState(false);

  // App States
  const [cart, setCart] = useState<{ [key: number]: number }>({});
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "", address: "" });
  const [idNumber, setIdNumber] = useState("");
  const [activeCategory, setActiveCategory] = useState("Meals");

  // Realtime Order Live Tracking States
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [liveStatus, setLiveStatus] = useState<string>("Frying");

  // Detect local hosting blocks for development bypass
  const isDevelopmentEnvironment = 
    typeof window !== "undefined" && 
    (window.location.hostname === "localhost" || 
     window.location.hostname.startsWith("192.168."));

  // Check if any added item requires an age restriction check
  const needsIdVerification = Object.entries(cart).some(([id, qty]) => {
    const item = MENU_ITEMS.find((m) => m.id === Number(id));
    return item?.requiresId && qty > 0;
  });

  // Realtime Database Listener Hook
  useEffect(() => {
    if (!currentOrderId) return;

    const orderTrackingChannel = supabase
      .channel(`live-order-${currentOrderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${currentOrderId}`,
        },
        (payload) => {
          console.log("Live status updated from kitchen server:", payload.new.status);
          if (payload.new.status) {
            setLiveStatus(payload.new.status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderTrackingChannel);
    };
  }, [currentOrderId]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const verifyUserLocation = () => {
    if (!navigator.geolocation) {
      setLocError("Geolocation is not supported by your browser.");
      return;
    }

    setCheckingLocation(true);
    setLocError(null);
    setIsBypassed(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;
        const dist = calculateDistance(SHOP_LAT, SHOP_LON, userLat, userLon);
        
        setDistance(dist);
        setCheckingLocation(false);

        if (dist <= MAX_RADIUS_KM) {
          setLocationVerified(true);
        } else {
          setLocationVerified(false);
        }
      },
      (error) => {
        setCheckingLocation(false);
        setLocError("Please allow location access so we can verify the zone.");
        console.error(error);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleBypass = () => {
    setIsBypassed(true);
    setLocationVerified(true);
  };

  const addToCart = (id: number) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[id] > 1) updated[id]--;
      else delete updated[id];
      return updated;
    });
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [id, qty]) => {
      const item = MENU_ITEMS.find((m) => m.id === Number(id));
      return total + (item ? item.price * qty : 0);
    }, 0);
  };

  const getCartCount = () => {
    return Object.values(cart).reduce((a, b) => a + b, 0);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    const orderItemsText = Object.entries(cart)
      .map(([id, quantity]) => {
        const item = MENU_ITEMS.find((m) => m.id === Number(id));
        return item ? `${quantity}x ${item.name}` : "";
      })
      .filter(Boolean)
      .join(", ");

    const totalPrice = getCartTotal();

    try {
      const { data, error } = await supabase
        .from("orders")
        .insert([
          {
            name: customerInfo.name,
            phone: customerInfo.phone,
            address: customerInfo.address,
            items: orderItemsText,
            totalprice: totalPrice,
            status: "Frying"
          }
        ])
        .select();

      if (error) {
        console.error("Database Write Error:", error.message);
        alert("Could not connect to the database. Please try again.");
      } else if (data && data.length > 0) {
        setCurrentOrderId(data[0].id);
        setLiveStatus("Frying");
        setOrderPlaced(true);
        setShowCheckoutModal(false);
      }
    } catch (err) {
      console.error("Execution error:", err);
    }
  };

  // --- SCREEN 1: LOCATION GATER ---
  if (locationVerified === null || (locationVerified === false && !isBypassed)) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center p-4 text-center font-sans">
        <div className="max-w-md w-full bg-white rounded-[2rem] p-8 shadow-xl border border-stone-100">
          <div className="w-20 h-20 bg-[#FFC244]/10 text-4xl rounded-full flex items-center justify-center mx-auto mb-4">🍟</div>
          <h1 className="text-2xl font-extrabold text-stone-900 mb-2 tracking-tight">The Town Chips Base</h1>
          <p className="text-stone-500 text-sm mb-6 leading-relaxed">
            We cook everything fresh! Online ordering is optimized for a <b className="text-stone-800">2 km radius</b> around Eldoret town center.
          </p>

          {locationVerified === false && distance !== null && (
            <div className="mb-6 p-4 bg-rose-50 text-rose-900 rounded-2xl text-sm text-left space-y-3 border border-rose-100">
              <p className="font-bold text-center text-rose-700">
                ⚠️ Distance: ~{distance.toFixed(1)} km (Outside Zone)
              </p>
              <p className="text-xs text-rose-600 leading-relaxed font-medium">
                If you are ordering a delivery for a friend or an office located <b>inside town</b>, you can proceed by bypassing this gate.
              </p>
            </div>
          )}

          {locError && (
            <div className="mb-4 p-3.5 bg-amber-50 text-amber-900 rounded-xl text-xs border border-amber-100 font-medium">
              {locError}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={verifyUserLocation}
              disabled={checkingLocation}
              className="w-full bg-[#00A082] hover:bg-[#008A70] active:scale-[0.99] transition text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-700/20 disabled:bg-stone-300 disabled:shadow-none"
            >
              {checkingLocation ? "Verifying Distance..." : "Confirm Delivery Location"}
            </button>

            {locationVerified === false && (
              <button
                onClick={handleBypass}
                className="w-full bg-stone-50 hover:bg-stone-100 text-stone-600 font-semibold py-3.5 rounded-xl text-xs transition border border-stone-200"
              >
                🤝 Ordering for someone inside town
              </button>
            )}

            {/* Injected Local Testing Mode Bypass Button */}
            {isDevelopmentEnvironment && (
              <button
                onClick={handleBypass}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3.5 rounded-xl text-xs transition shadow-md active:scale-[0.99]"
              >
                🛠️ Dev Testing Mode: Skip Location Gate
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- SCREEN 2: ORDER SUCCESS ---
  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 shadow-xl border border-stone-100 text-center">
          
          <div className="w-24 h-24 bg-stone-50 border border-stone-100 text-5xl rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
            {(liveStatus === "Frying" || liveStatus === "Pending") && "🍳"}
            {(liveStatus === "Transit" || liveStatus === "Out for Delivery") && "🚴"}
            {liveStatus === "Delivered" && "🎉"}
          </div>

          <h1 className="text-2xl font-black text-stone-900 mb-1 tracking-tight">
            {(liveStatus === "Frying" || liveStatus === "Pending") && "Preparing Your Order"}
            {(liveStatus === "Transit" || liveStatus === "Out for Delivery") && "Out for Delivery"}
            {liveStatus === "Delivered" && "Enjoy Your Meal!"}
          </h1>
          
          <p className="text-stone-400 text-xs mb-8 font-medium">
            Order Tracking Code: <span className="font-mono font-bold text-stone-600">#{currentOrderId}</span>
          </p>

          {/* --- GLOVO STATUS PROGRESS STEPPER --- */}
          <div className="w-full px-2 mb-8 relative">
            <div className="flex justify-between items-center relative z-10">
              
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                  liveStatus === "Frying" || liveStatus === "Pending" || liveStatus === "Transit" || liveStatus === "Out for Delivery" || liveStatus === "Delivered"
                    ? "bg-[#00A082] text-white ring-4 ring-emerald-100"
                    : "bg-stone-200 text-stone-400"
                }`}>
                  1
                </div>
                <span className="text-[10px] font-black mt-2 text-stone-600 uppercase tracking-wide">Frying</span>
              </div>

              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                  liveStatus === "Transit" || liveStatus === "Out for Delivery" || liveStatus === "Delivered"
                    ? "bg-[#00A082] text-white ring-4 ring-emerald-100"
                    : "bg-stone-200 text-stone-400"
                }`}>
                  2
                </div>
                <span className="text-[10px] font-black mt-2 text-stone-600 uppercase tracking-wide">Transit</span>
              </div>

              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                  liveStatus === "Delivered"
                    ? "bg-blue-600 text-white ring-4 ring-blue-100"
                    : "bg-stone-200 text-stone-400"
                }`}>
                  3
                </div>
                <span className="text-[10px] font-black mt-2 text-stone-600 uppercase tracking-wide">Arrived</span>
              </div>

            </div>

            <div className="absolute top-4 left-8 right-8 h-1 bg-stone-100 -z-0 rounded-full">
              <div 
                className="h-full bg-[#00A082] transition-all duration-500 rounded-full"
                style={{
                  width: (liveStatus === "Frying" || liveStatus === "Pending") 
                    ? "10%" 
                    : (liveStatus === "Transit" || liveStatus === "Out for Delivery") 
                      ? "50%" 
                      : "100%",
                  backgroundColor: liveStatus === "Delivered" ? "#2563eb" : "#00A082"
                }}
              />
            </div>
          </div>

          <div className="text-left bg-stone-50 border border-stone-100 rounded-2xl p-4 text-stone-700 text-xs space-y-2.5 mb-6">
            <div><span className="text-stone-400 font-medium">Deliver To:</span> <b className="text-stone-900">{customerInfo.name}</b></div>
            <div><span className="text-stone-400 font-medium">Phone Number:</span> <b className="text-stone-900">{customerInfo.phone}</b></div>
            <div><span className="text-stone-400 font-medium">Drop Address:</span> <b className="text-stone-900 leading-relaxed">{customerInfo.address}</b></div>
            
            <div className="pt-2.5 border-t border-stone-200/60 flex items-center justify-between font-bold text-stone-900">
              <span className="flex items-center gap-1.5">
                <span className={`inline-block w-2 h-2 rounded-full ${liveStatus === "Delivered" ? "bg-blue-500" : "bg-emerald-500 animate-pulse"}`} />
                Cash Due on Arrival:
              </span>
              <span className={`text-base font-black ${liveStatus === "Delivered" ? "text-blue-600" : "text-[#00A082]"}`}>
                Ksh {getCartTotal()}
              </span>
            </div>
          </div>

          <button 
            onClick={() => { setOrderPlaced(false); setCart({}); setIsBypassed(false); setLocationVerified(null); setCurrentOrderId(null); setIdNumber(""); }} 
            className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-4 rounded-xl text-sm transition shadow-md active:scale-[0.99]"
          >
            Order Something Else
          </button>
        </div>
      </div>
    );
  }

  // --- SCREEN 3: GLOBAL STOREFRONT ---
  return (
    <div className="min-h-screen bg-[#FFFDF9] text-stone-900 font-sans pb-28">
      {isBypassed && (
        <div className="bg-amber-500 text-white text-xs font-bold px-4 py-2.5 text-center tracking-wide sticky top-0 z-40 shadow-sm">
          ⚠️ Override Active: Delivery point must be near the town circle!
        </div>
      )}

      <div className="bg-[#00A082] text-white pt-8 pb-14 px-4 relative rounded-b-[2.5rem] shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <span className="bg-[#FFC244] text-stone-950 font-black text-[10px] uppercase px-2 py-0.5 rounded-full tracking-wider">Store Open</span>
            <h1 className="text-3xl font-black mt-1 tracking-tight">The Chips Base</h1>
            <p className="text-emerald-100 text-xs font-medium mt-0.5">🚀 Delivered hot under 20 mins</p>
          </div>
          <div className="text-4xl bg-white/10 p-3 rounded-2xl backdrop-blur-sm">🍟</div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-6 relative z-10">
        <div className="bg-white flex space-x-2 p-1.5 rounded-2xl shadow-md border border-stone-100 mb-6 overflow-x-auto scrollbar-none sticky top-3">
          {["Meals", "Sides", "Drinks"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeCategory === cat 
                  ? "bg-[#FFC244] text-stone-900 shadow-sm" 
                  : "text-stone-500 hover:bg-stone-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-3.5">
          {MENU_ITEMS.filter(item => item.category === activeCategory).map((item) => (
            <div key={item.id} className="bg-white p-3.5 rounded-3xl shadow-sm border border-stone-100 flex items-center justify-between gap-4 transition hover:shadow-md">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-stone-900 text-base truncate">{item.name}</h3>
                  {item.requiresId && (
                    <span className="bg-red-100 text-red-700 font-extrabold text-[9px] px-1.5 py-0.5 rounded-md flex-shrink-0">🔞 18+</span>
                  )}
                </div>
                <p className="text-xs text-stone-400 mt-1 leading-snug line-clamp-2 pr-2">{item.desc}</p>
                <div className="text-base font-black text-[#00A082] mt-2.5">Ksh {item.price}</div>
              </div>
              
              <div className="relative w-24 h-24 bg-stone-50 rounded-2xl overflow-hidden flex-shrink-0 border border-stone-100">
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                
                <div className="absolute bottom-1 left-1 right-1 flex justify-center">
                  {cart[item.id] ? (
                    <div className="bg-white text-stone-900 rounded-full shadow-lg border border-stone-200 flex items-center justify-between px-1.5 py-1 w-full max-w-[84px]">
                      <button onClick={() => removeFromCart(item.id)} className="w-5 h-5 rounded-full bg-stone-100 font-bold text-xs flex items-center justify-center text-stone-700 active:scale-95">-</button>
                      <span className="font-extrabold text-xs">{cart[item.id]}</span>
                      <button onClick={() => addToCart(item.id)} className="w-5 h-5 rounded-full bg-[#FFC244] text-stone-900 font-bold text-xs flex items-center justify-center active:scale-95">+</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => addToCart(item.id)} 
                      className="bg-white hover:bg-stone-50 text-[#00A082] text-xs font-black px-3 py-1.5 rounded-full shadow-md border border-stone-100 flex items-center gap-1 active:scale-95 transition"
                    >
                      <span>+</span> Add
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {getCartCount() > 0 && !showCheckoutModal && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#FFFDF9] via-[#FFFDF9] to-transparent z-40">
          <button 
            onClick={() => setShowCheckoutModal(true)}
            className="max-w-md mx-auto w-full bg-[#00A082] hover:bg-[#008A70] text-white font-bold p-4 rounded-2xl shadow-xl flex items-center justify-between transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span className="bg-[#FFC244] text-stone-950 font-black text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-inner">
                {getCartCount()}
              </span>
              <span className="text-sm tracking-wide font-extrabold">View Basket</span>
            </div>
            <span className="text-base font-black">Ksh {getCartTotal()}</span>
          </button>
        </div>
      )}

      {showCheckoutModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-end justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl border-t border-stone-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5 pb-2 border-b border-stone-100">
              <div>
                <h2 className="text-xl font-black text-stone-900">Your Basket</h2>
                <p className="text-xs text-stone-400 mt-0.5">Complete delivery location</p>
              </div>
              <button 
                onClick={() => setShowCheckoutModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 font-bold flex items-center justify-center hover:bg-stone-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 mb-6 max-h-40 overflow-y-auto pr-1">
              {Object.entries(cart).map(([id, qty]) => {
                const item = MENU_ITEMS.find(m => m.id === Number(id));
                if (!item || qty <= 0) return null;
                return (
                  <div key={id} className="flex justify-between items-center text-sm bg-stone-50 p-2.5 rounded-xl">
                    <span className="font-semibold text-stone-800">{qty}x {item.name}</span>
                    <span className="font-bold text-stone-900">Ksh {item.price * qty}</span>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleCheckout} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wider">Recipient's Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="Who is picking up the food?"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#00A082] focus:bg-white transition" 
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wider">M-Pesa / Phone Number</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., 0712345678"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#00A082] focus:bg-white transition" 
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wider">Delivery Address (Eldoret Town Zone)</label>
                <textarea 
                  rows={2}
                  required
                  placeholder="e.g., Zion Mall, Ground Floor, Stall G12"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#00A082] focus:bg-white transition resize-none" 
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                />
              </div>

              {/* Conditional age restriction checkpoint block */}
              {needsIdVerification && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl animate-fade-in">
                  <label className="block text-xs font-black text-red-700 mb-1.5 uppercase tracking-wider">
                    🔞 National ID Number (Required for Age Verification)
                  </label>
                  <input 
                    type="text" 
                    required={needsIdVerification}
                    placeholder="Enter ID card number"
                    className="w-full bg-white border border-red-200 rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-bold tracking-wide" 
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                  />
                  <p className="text-[10px] text-red-600 font-medium mt-1.5 leading-relaxed">
                    Orders containing alcohol require a matching physical ID confirmation upon delivery hand-off.
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-4 mt-6">
                <div>
                  <span className="text-xs text-stone-400 block font-medium uppercase tracking-wider">Final Total</span>
                  <span className="text-2xl font-black text-stone-900">Ksh {getCartTotal()}</span>
                </div>
                <button 
                  type="submit"
                  className="flex-1 bg-[#00A082] hover:bg-[#008A70] text-white font-extrabold py-4 rounded-xl shadow-lg shadow-emerald-800/10 text-sm tracking-wide text-center"
                >
                  Confirm Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}