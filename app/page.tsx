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
    desc: "Delicious golden crispy regular chips served hot.", 
    category: "Meals", 
    tag: "Popular",
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=60",
    requiresId: false
  },
  { 
    id: 2, 
    name: "Chips Masala", 
    price: 150, 
    desc: "Fresh fries tossed in a rich, deeply seasoned classic spicy masala sauce.", 
    category: "Meals", 
    tag: "Top Rated",
    image: "https://images.unsplash.com/photo-1585109649139-366815a0d713?w=500&auto=format&fit=crop&q=60",
    requiresId: false
  },
  { 
    id: 3, 
    name: "Smokie", 
    price: 40, 
    desc: "Savory smoked sausage grilled perfectly for a quick, tasty bite.", 
    category: "Sides", 
    tag: "Quick Snack",
    image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=60",
    requiresId: false
  },
  { 
    id: 4, 
    name: "Soda 500ml", 
    price: 40, 
    desc: "Refreshing carbonated cold soda to pair perfectly with your meal.", 
    category: "Drinks", 
    tag: "Chilled",
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60",
    requiresId: false
  },
  { 
    id: 5, 
    name: "Mango Juice", 
    price: 40, 
    desc: "Sweet and naturally soothing fresh juice made from sweet local mangoes.", 
    category: "Drinks", 
    tag: "100% Fruit",
    image: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=500&auto=format&fit=crop&q=60",
    requiresId: false
  },
  { 
    id: 6, 
    name: "Mango Juice Alternative", 
    price: 40, 
    desc: "A bright alternative blend loaded with crisp and energetic tropical notes.", 
    category: "Drinks", 
    tag: "Refreshing",
    image: "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&auto=format&fit=crop&q=60",
    requiresId: false
  }
];

export default function ChipsBaseApp() {
  // Location States
  const [locationVerified, setLocationVerified] = useState<boolean | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [isBypassed, setIsBypassed] = useState(false);

  // Store Operational Hours State
  const [isOpen, setIsOpen] = useState(false);

  // App States
  const [cart, setCart] = useState<{ [key: number]: number }>({});
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "", address: "" });
  const [idNumber, setIdNumber] = useState("");
  const [activeCategory, setActiveCategory] = useState("Meals");

  // Submission Safety State Lock
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Realtime Order Live Tracking States
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [liveStatus, setLiveStatus] = useState<string>("Frying");
  
  // FIXED: New state to preserve the accurate total price after checkout resets the basket
  const [finalOrderTotal, setFinalOrderTotal] = useState<number>(0);

  const needsIdVerification = Object.entries(cart).some(([id, qty]) => {
    const item = MENU_ITEMS.find((m) => m.id === Number(id));
    return item?.requiresId && qty > 0;
  });

  // Operational Hours Logic (9:30 AM - 8:00 PM)
  useEffect(() => {
    const checkStoreStatus = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      const currentTimeInMinutes = hours * 60 + minutes;
      const openTimeInMinutes = 9 * 60 + 30;  // 9:30 AM
      const closeTimeInMinutes = 20 * 60;     // 8:00 PM

      if (currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes < closeTimeInMinutes) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    checkStoreStatus();
    const interval = setInterval(checkStoreStatus, 30000);
    return () => clearInterval(interval);
  }, []);

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
      setLocError("Geolocation services are unavailable.");
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
        setLocError("Please allow access to location to view the restaurant menu.");
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

    if (isSubmitting) return;
    setIsSubmitting(true);

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
        alert("Slight network delay. Please submit your request once more.");
        setIsSubmitting(false);
      } else if (data && data.length > 0) {
        setCurrentOrderId(data[0].id);
        setLiveStatus("Frying");
        setFinalOrderTotal(totalPrice); // FIXED: Cache the price right before deleting the cart data
        setOrderPlaced(true);
        setShowCheckoutModal(false);
        setCart({});
      }
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  // --- SCREEN 1: LOCATION CONCEALER / LANDING ---
  if (locationVerified === null || (locationVerified === false && !isBypassed)) {
    return (
      <div className="min-h-screen bg-[#FFFDF6] flex flex-col items-center justify-center p-6 text-center font-sans tracking-tight">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
          
          <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center bg-amber-50 rounded-full border border-amber-200 shadow-inner">
            <span className="text-5xl select-none transform transition-transform duration-300 hover:rotate-12">🍟</span>
            <span className="absolute top-2 right-2 text-base animate-bounce">✨</span>
          </div>

          <h1 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">CZAR HOUSE</h1>
          <p className="text-gray-500 text-sm px-4 mb-8 leading-relaxed">
            Please share your location to discover menus available for quick delivery directly to your doorstep.
          </p>

          {locationVerified === false && distance !== null && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl text-xs text-left border border-red-100 space-y-1 text-center">
              <p className="font-bold uppercase tracking-wider text-red-800">Outside Delivery Radius</p>
              <p className="text-gray-600 font-light">You are currently {distance.toFixed(1)} km away. Our immediate delivery radius is capped at 30 km.</p>
            </div>
          )}

          {locError && (
            <div className="mb-4 p-3 bg-amber-50 text-amber-800 rounded-xl text-xs border border-amber-100">
              {locError}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={verifyUserLocation}
              disabled={checkingLocation}
              className="w-full bg-[#FFC014] hover:bg-[#e6ac10] active:scale-[0.99] text-gray-950 font-bold py-4 rounded-full text-sm tracking-wide shadow-md transition-all disabled:bg-gray-200 disabled:text-gray-400"
            >
              {checkingLocation ? "Checking location..." : "Share Current Location"}
            </button>

            {locationVerified === false && (
              <button
                onClick={handleBypass}
                className="w-full bg-transparent hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-full text-xs transition border border-gray-200 tracking-wide"
              >
                Request Manual Sub-Town Delivery
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- SCREEN 2: ORDER PROGRESS / TRACKING SCREEN ---
  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-[#FFFDF6] flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-gray-100 text-center">
          
          <div className="w-20 h-20 bg-amber-50 text-3xl rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-100">
            {(liveStatus === "Frying" || liveStatus === "Pending") && "🍳"}
            {(liveStatus === "Transit" || liveStatus === "Out for Delivery") && "🛵"}
            {liveStatus === "Delivered" && "✅"}
          </div>

          <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">
            {(liveStatus === "Frying" || liveStatus === "Pending") && "Preparing Your Order"}
            {(liveStatus === "Transit" || liveStatus === "Out for Delivery") && "In Transit"}
            {liveStatus === "Delivered" && "Order Delivered"}
          </h1>
          
          <p className="text-gray-500 text-xs mt-1 mb-8">
            Order Reference: <span className="text-gray-900 font-bold font-mono">#{currentOrderId}</span>
          </p>

          {/* Stepper */}
          <div className="w-full px-4 mb-8 relative">
            <div className="flex justify-between items-center relative z-10">
              {["Kitchen", "Transit", "Arrived"].map((stepName, idx) => {
                const isActive = 
                  (idx === 0) || 
                  (idx === 1 && (liveStatus === "Transit" || liveStatus === "Out for Delivery" || liveStatus === "Delivered")) ||
                  (idx === 2 && liveStatus === "Delivered");
                return (
                  <div key={stepName} className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all duration-500 font-bold ${
                      isActive 
                        ? "bg-[#FFC014] text-gray-950 shadow-sm" 
                        : "bg-gray-100 text-gray-400"
                    }`}>
                      {idx + 1}
                    </div>
                    <span className="text-[10px] font-bold mt-2 text-gray-500 uppercase tracking-wide">{stepName}</span>
                  </div>
                );
              })}
            </div>
            <div className="absolute top-4 left-10 right-10 h-1 bg-gray-100 -z-0">
              <div 
                className="h-full bg-[#FFC014] transition-all duration-500"
                style={{
                  width: (liveStatus === "Frying" || liveStatus === "Pending") ? "0%" : (liveStatus === "Transit" || liveStatus === "Out for Delivery") ? "50%" : "100%"
                }}
              />
            </div>
          </div>

          <div className="text-left bg-gray-50 border border-gray-100 rounded-2xl p-5 text-gray-700 text-xs space-y-3 mb-8">
            <div className="flex justify-between"><span className="text-gray-400 font-medium">Customer:</span> <b className="text-gray-900 font-bold">{customerInfo.name}</b></div>
            <div className="flex justify-between"><span className="text-gray-400 font-medium">Phone:</span> <b className="text-gray-900 font-mono">{customerInfo.phone}</b></div>
            <div className="flex justify-between items-start gap-4"><span className="text-gray-400 font-medium whitespace-nowrap">Deliver To:</span> <b className="text-gray-900 text-right leading-snug">{customerInfo.address}</b></div>
            
            <div className="pt-3.5 border-t border-gray-200 flex items-center justify-between text-gray-900">
              <span className="text-xs text-gray-500 font-medium">Total Price</span>
              {/* FIXED: Now reads from the cached final total instead of looking inside an empty cart object */}
              <span className="text-base font-black text-gray-900 font-mono">Ksh {finalOrderTotal}</span>
            </div>
          </div>

          <button 
            onClick={() => { setOrderPlaced(false); setCart({}); setIsBypassed(false); setLocationVerified(null); setCurrentOrderId(null); setFinalOrderTotal(0); }}
            className="w-full bg-[#FFC014] hover:bg-[#e6ac10] text-gray-950 text-sm font-bold py-4 rounded-full transition-all shadow-sm"
          >
            Go Back To Menu
          </button>
        </div>
      </div>
    );
  }

  // --- SCREEN 3: MAIN MENU DASHBOARD ---
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-36">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-6 py-6 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase">
                CZAR HOUSE
              </h1>
              <span className="bg-[#23A158] text-white px-2.5 py-0.5 rounded-full text-[10px] tracking-wide font-bold uppercase">
                Open
              </span>
            </div>
            <p className="text-gray-500 text-xs md:text-sm max-w-xl font-normal leading-relaxed">
              ⚡ Delivered hot and fresh.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="h-16 w-16 rounded-2xl overflow-hidden shadow-sm bg-gray-100 hidden sm:block">
              <img 
                src="https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=60" 
                alt="Czar House Chips" 
                className="w-full h-full object-cover"
              />
            </div>

            <button 
              onClick={() => setShowCartDrawer(true)}
              className="relative bg-[#FFC014] p-3.5 rounded-full text-gray-950 hover:bg-[#e6ac10] transition-all flex items-center justify-center shadow-md"
            >
              <span className="text-xl">🛒</span>
              {getCartCount() > 0 && (
                <span className="absolute -top-1 -right-1 bg-gray-900 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                  {getCartCount()}
                </span>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* Categories Tabs */}
      <div className="max-w-5xl mx-auto px-6 mt-8">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {["Meals", "Sides", "Drinks"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2.5 rounded-full text-xs font-bold tracking-wide transition-all shrink-0 ${
                activeCategory === cat
                  ? "bg-[#FFF8E6] text-[#E6A100] border-2 border-[#FFC014]"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List */}
      <div className="px-6 mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
        {MENU_ITEMS.filter((item) => item.category === activeCategory).map((item) => {
          const quantity = cart[item.id] || 0;
          return (
            <div 
              key={item.id} 
              className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md border border-gray-100 flex flex-col justify-between transition-all duration-200"
            >
              <div className="relative h-48 w-full bg-gray-50 overflow-hidden">
                <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[10px] font-bold text-gray-800 shadow-sm">
                  {item.tag}
                </div>
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-full h-full object-cover" 
                />
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900 tracking-tight">
                    {item.name}
                  </h3>
                  <p className="text-gray-500 text-xs leading-relaxed font-normal min-h-[36px]">
                    {item.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                  <span className="text-base text-gray-900 font-extrabold font-mono">
                    Ksh {item.price}
                  </span>

                  {quantity > 0 ? (
                    <div className="flex items-center bg-[#FFC014] rounded-full p-0.5 shadow-sm">
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="px-2.5 py-1 text-gray-950 hover:opacity-70 text-xs font-bold transition"
                      >
                        —
                      </button>
                      <span className="px-1.5 font-mono text-xs font-extrabold text-gray-950">{quantity}</span>
                      <button 
                        onClick={() => addToCart(item.id)}
                        className="px-2.5 py-1 text-gray-950 hover:opacity-70 text-xs font-bold transition"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(item.id)}
                      className="bg-gray-100 hover:bg-[#FFC014] text-gray-900 font-bold text-xs px-4 py-2 rounded-full transition-all flex items-center gap-1"
                    >
                      <span>+</span> Add
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Checkout Bar */}
      {getCartCount() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100 z-30 flex justify-center shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <button
            onClick={() => setShowCheckoutModal(true)}
            className="w-full max-w-md bg-[#FFC014] hover:bg-[#e6ac10] text-gray-950 font-bold text-sm py-4 rounded-full shadow-md flex items-center justify-between px-6 transition-all"
          >
            <span>View Order Bag</span>
            <span className="bg-gray-900 text-white px-3 py-1 rounded-full font-extrabold font-mono text-xs">Ksh {getCartTotal()}</span>
          </button>
        </div>
      )}

      {/* BASKET DRAWER */}
      {showCartDrawer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-md bg-white text-gray-900 h-full shadow-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-5 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-900">Your Basket</h2>
                <button onClick={() => setShowCartDrawer(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold uppercase">Close</button>
              </div>

              {getCartCount() === 0 ? (
                <p className="text-gray-400 text-xs font-normal text-center py-20 italic">Your cart is empty.</p>
              ) : (
                <div className="divide-y divide-gray-50 overflow-y-auto max-h-[65vh] pr-1 mt-2">
                  {Object.entries(cart).map(([id, qty]) => {
                    const item = MENU_ITEMS.find((m) => m.id === Number(id));
                    if (!item) return null;
                    return (
                      <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-gray-900">{item.name}</h4>
                          <span className="text-xs font-mono font-semibold text-gray-500">Ksh {item.price * qty}</span>
                        </div>
                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-full">
                          <button onClick={() => removeFromCart(item.id)} className="px-2 text-gray-600 font-bold text-xs">—</button>
                          <span className="text-xs font-mono font-bold text-gray-900 px-1">{qty}</span>
                          <button onClick={() => addToCart(item.id)} className="px-2 text-gray-600 font-bold text-xs">+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {getCartCount() > 0 && (
              <div className="pt-5 border-t border-gray-100 space-y-4">
                <div className="flex justify-between text-gray-900 text-sm font-bold">
                  <span>Total Bill:</span>
                  <span className="text-gray-900 font-mono text-base">Ksh {getCartTotal()}</span>
                </div>
                <button
                  onClick={() => { setShowCartDrawer(false); setShowCheckoutModal(true); }}
                  className="w-full bg-[#FFC014] text-gray-950 text-sm font-bold py-4 rounded-full text-center block hover:bg-[#e6ac10] transition shadow-sm"
                >
                  Go to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL FORM */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white text-gray-900 rounded-3xl w-full max-w-md p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto border border-gray-100">
            <h2 className="text-lg font-black text-center text-gray-900 tracking-tight mb-6">Delivery Details</h2>
            
            <form onSubmit={handleCheckout} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-500 font-bold uppercase tracking-wider text-[10px] mb-1">Your Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., John Doe"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FFC014] text-sm"
                />
              </div>

              <div>
                <label className="block text-gray-500 font-bold uppercase tracking-wider text-[10px] mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  required
                  placeholder="e.g., 0712345678"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FFC014] text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-500 font-bold uppercase tracking-wider text-[10px] mb-1">Delivery Address</label>
                <textarea 
                  required
                  rows={2}
                  placeholder="Apartment, building, house number or estate directions..."
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FFC014] text-sm resize-none"
                />
              </div>

              {needsIdVerification && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-2">
                  <label className="block text-amber-900 font-bold text-xs">National ID Number</label>
                  <input 
                    type="text" 
                    required={needsIdVerification}
                    placeholder="Enter ID for verification"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none text-sm"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-gray-900 font-bold text-sm">
                <span>Total Amount:</span>
                <span className="text-xl font-black font-mono">Ksh {getCartTotal()}</span>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowCheckoutModal(false)}
                  className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3.5 rounded-full transition text-xs disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-2/3 bg-[#FFC014] hover:bg-[#e6ac10] text-gray-950 font-bold py-3.5 rounded-full transition shadow-sm text-xs disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Confirming Order..." : "Confirm Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}