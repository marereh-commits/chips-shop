"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import LocationModal, { PickedLocation } from "./LocationModalOSM";


// Define your restaurant's physical coordinates and maximum delivery range
const SHOP_LAT = -1.2921; // Replace with your actual latitude
const SHOP_LON = 36.8219; // Replace with your actual longitude
const MAX_RADIUS_KM = 30; // Maximum delivery range in kilometers
const RESTAURANT_VIDEO_URL =
  "/videos/cooking.mp4.mov"; // Placeholder video path
const RESTAURANT_VIDEO_POSTER =
  "/videos/cooking.mp4.mov";

const MENU_ITEMS = [
  { 
    id: 1, 
    name: "Plain Chips (Regular)", 
    price: 100, 
    desc: "Delicious golden crispy regular chips served hot.", 
    category: "Meals", 
    tag: "Popular",
    image: "/images/plain-chips.png.png",
    requiresId: false
  },
  { 
    id: 2, 
    name: "The Grand Nyama Choma Platter", 
    price: 200, 
    desc: "Charred goat meat served with dense ugali, sukuma wiki, and kachumbari..", 
    category: "Meals", 
    tag: "Popular",
    image: "/images/choma-platter.png.png",
    requiresId: false
  },
  { 
    id: 3, 
    name: "Aromatic Beef Pilau and Flaky Chapati", 
    price: 150, 
    desc: "Spiced beef pilau rice paired with a flaky chapati and kachumbari.", 
    category: "Meals", 
    tag: "Popular",
    image: "/images/pilau-chapati.png.png",
    requiresId: false
  },
  { 
    id: 4, 
    name: "Mandazi chai", 
    price: 100, 
    desc: "Steaming masala chai served alongside freshly fried, golden-brown mandazi.", 
    category: "Meals", 
    tag: "Popular",
    image: "/images/mandazi-chai.png",
    requiresId: false
  },
  { 
    id: 5, 
    name: "Chips Masala", 
    price: 150, 
    desc: "Fresh fries tossed in a rich, deeply seasoned classic spicy masala sauce.", 
    category: "Meals", 
    tag: "Top Rated",
    image: "https://images.unsplash.com/photo-1585109649139-366815a0d713?w=500&auto=format&fit=crop&q=60",
    requiresId: false
  },
  { 
    id: 6, 
    name: "Smokie", 
    price: 40, 
    desc: "Savory smoked sausage grilled perfectly for a quick, tasty bite.", 
    category: "Sides", 
    tag: "Quick Snack",
    image: "/images/smokie.png.png",
    requiresId: false
  },
  { 
    id: 7, 
    name: "Soda 500ml", 
    price: 40, 
    desc: "Refreshing carbonated cold soda to pair perfectly with your meal.", 
    category: "Drinks", 
    tag: "Chilled",
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60",
    requiresId: false
  },
  { 
    id: 8, 
    name: "Mango Juice", 
    price: 40, 
    desc: "Sweet and naturally soothing fresh juice made from sweet local mangoes.", 
    category: "Drinks", 
    tag: "100% Fruit",
    image: "/images/mango-juice.png",
    requiresId: false
  },
  { 
    id: 9, 
    name: "Passion Juice", 
    price: 40, 
    desc: "A bright alternative blend loaded with crisp and energetic tropical notes.", 
    category: "Drinks", 
    tag: "Refreshing",
    image: "/images/passion-juice.png",
    requiresId: false
  },
  { 
    id: 10, 
    name: "Ugali fish", 
    price: 150, 
    desc: "Delicious ugali served with flavorful fish.", 
    category: "Meals", 
    tag: "Popular",
    image: "/images/ugali-fish.png",
    requiresId: false
  },
  { 
    id: 11, 
    name: "boiled egg", 
    price: 40, 
    desc: "Delicious boiled egg.", 
    category: "Sides", 
    tag: "Popular",
    image: "/images/boiled-egg.png",
    requiresId: false
  },
  { 
    id: 12, 
    name: "Donut", 
    price: 40, 
    desc: "Delicious donut.", 
    category: "Sides", 
    tag: "Popular",
    image: "/images/donut.png",
    requiresId: false
  },
  { 
    id: 13, 
    name: "half cake", 
    price: 40, 
    desc: "Delicious half cake.", 
    category: "Sides", 
    tag: "Popular",
    image: "/images/half-cake.png",
    requiresId: false
  },
   { 
    id: 14, 
    name: "meat pie", 
    price: 40, 
    desc: "Delicious meat pie.", 
    category: "Sides", 
    tag: "Popular",
    image: "/images/meat-pie.png",
    requiresId: false
  },
  { 
    id: 15, 
    name: "samosa nyama", 
    price: 40, 
    desc: "Delicious samosa with meat.", 
    category: "Sides", 
    tag: "Popular",
    image: "/images/samosa-nyama.png",
    requiresId: false
  },
  { 
    id: 16, 
    name: "samosa ndengu", 
    price: 40, 
    desc: "Delicious samosa with cow peas.", 
    category: "Sides", 
    tag: "Popular",
    image: "/images/samosa-ndengu.png",
    requiresId: false
  },
  { 
    id: 17, 
    name: "kebab nyama", 
    price: 40, 
    desc: "Delicious kebab with meat.", 
    category: "Sides", 
    tag: "Popular",
    image: "/images/kebab-nyama.png",
    requiresId: false
  },
  { 
    id: 18, 
    name: "kebab viazi", 
    price: 40, 
    desc: "Delicious kebab with potatoes.", 
    category: "Sides", 
    tag: "Popular",
    image: "/images/kebab-viazi.png",
    requiresId: false
  },
];

export default function ChipsBaseApp() {
  // Intro gate — Turned off by default since LampIntro file is missing
  const [showIntro, setShowIntro] = useState(false);

  // Location States
  const [locationVerified, setLocationVerified] = useState<boolean | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [isBypassed, setIsBypassed] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

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

  // SEARCH: text typed into the menu search bar
  const [searchQuery, setSearchQuery] = useState("");

  // DINE-IN: table number read from the QR code link (?table=5)
  const [tableNumber, setTableNumber] = useState<string | null>(null);

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

  // Dine-in: read ?table=5 from the QR code link
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("table");
    if (t && /^\d{1,3}$/.test(t)) {
      setTableNumber(t);
      setLocationVerified(true); // already inside the hotel, skip location gate
      setIsBypassed(true);
    }
  }, []);

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

  // Opens the KFC-style location picker (search, current location, map pin)
  const verifyUserLocation = () => {
    setLocError(null);
    setIsBypassed(false);
    setShowLocationModal(true);
  };

  // Called when the customer confirms a location in the modal
  const handleLocationConfirm = (loc: PickedLocation) => {
    const dist = calculateDistance(SHOP_LAT, SHOP_LON, loc.lat, loc.lng);
    setDistance(dist);
    setShowLocationModal(false);
    setLocError(null);

    // Prefill the checkout address with what they picked
    setCustomerInfo((prev) => ({ ...prev, address: loc.address }));

    setLocationVerified(dist <= MAX_RADIUS_KM);
  };

  const handleBypass = () => {
    setIsBypassed(true);
    setLocationVerified(true);
    setLocError(null);
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

    // Strict safety block against validation bypass
    if (needsIdVerification && !idNumber.trim()) {
      alert("This order contains regulated items. Please input your National ID to check out.");
      return;
    }

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
            address: tableNumber ? `Table ${tableNumber} (Dine-in)` : customerInfo.address,
            table_number: tableNumber,
            items: orderItemsText,
            totalprice: totalPrice,
            status: "Frying",
            ...(needsIdVerification ? { id_number: idNumber.trim() } : {}) // Sends ID to DB only if required
          }
        ])
        .select();

      if (error) {
        alert("Slight network delay. Please submit your request once more.");
        setIsSubmitting(false);
      } else if (data && data.length > 0) {
        setCurrentOrderId(data[0].id);
        setLiveStatus("Frying");
        setFinalOrderTotal(totalPrice); 
        setOrderPlaced(true);
        setShowCheckoutModal(false);
        setCart({});
        setIdNumber(""); // Resets verification field state
      }
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  // SEARCH: when there is a query, search across ALL categories;
  // otherwise fall back to the selected tab.
  const query = searchQuery.trim().toLowerCase();

  const visibleItems = MENU_ITEMS.filter((item) => {
    if (query) {
      return (
        item.name.toLowerCase().includes(query) ||
        item.desc.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.tag.toLowerCase().includes(query)
      );
    }
    return item.category === activeCategory;
  });

  // --- SCREEN 0: LAMP INTRO GATE ---
  // Safeguard: renders nothing if showIntro becomes true, preventing crashes
  if (showIntro) {
    return null; 
  }

  // --- SCREEN 1: LOCATION CONCEALER / LANDING ---
  if (locationVerified === null || (locationVerified === false && !isBypassed)) {
    return (
      <div className="min-h-screen bg-[#FFFDF6] flex flex-col items-center justify-center p-6 text-center font-sans tracking-tight">
        <div className="max-w-md w-full bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100">

          <div className="relative w-full h-44 bg-gray-100">
            <video
              className="absolute inset-0 w-full h-full object-cover"
              src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
              poster="https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&auto=format&fit=crop&q=60"
              autoPlay
              muted
              loop
              playsInline
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0" />
          </div>

          <div className="p-8">

          <h1 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">SADYBECH HOTEL</h1>
          <p className="text-gray-500 text-sm px-4 mb-8 leading-relaxed">
            Please share your location to discover menus available for quick delivery directly to your Table.
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
              className="w-full bg-[#FFC014] hover:bg-[#e6ac10] active:scale-[0.99] text-gray-950 font-bold py-4 rounded-full text-sm tracking-wide shadow-md transition-all"
            >
              {locationVerified === false ? "Choose Another Location" : "Share Current Location"}
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

        <LocationModal
          open={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          onConfirm={handleLocationConfirm}
          accent="#E6A100"
        />
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
            {(liveStatus === "Transit" || liveStatus === "Out for Delivery") && (tableNumber ? "🍽️" : "🛵")}
            {liveStatus === "Delivered" && "✅"}
          </div>

          <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">
            {(liveStatus === "Frying" || liveStatus === "Pending") && "Preparing Your Order"}
            {(liveStatus === "Transit" || liveStatus === "Out for Delivery") && (tableNumber ? "Coming To Your Table" : "In Transit")}
            {liveStatus === "Delivered" && (tableNumber ? "Order Served" : "Order Delivered")}
          </h1>
          
          <p className="text-gray-500 text-xs mt-1 mb-8">
            Order Reference: <span className="text-gray-900 font-bold font-mono">#{currentOrderId}</span>
          </p>

          {/* Stepper */}
          <div className="w-full px-4 mb-8 relative">
            <div className="flex justify-between items-center relative z-10">
              {["Kitchen", tableNumber ? "Serving" : "Transit", tableNumber ? "Served" : "Arrived"].map((stepName, idx) => {
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
            <div className="flex justify-between items-start gap-4"><span className="text-gray-400 font-medium whitespace-nowrap">{tableNumber ? "Seated At:" : "Deliver To:"}</span> <b className="text-gray-900 text-right leading-snug">{tableNumber ? `Table ${tableNumber}` : customerInfo.address}</b></div>
            
            <div className="pt-3.5 border-t border-gray-200 flex items-center justify-between text-gray-900">
              <span className="text-xs text-gray-500 font-medium">Total Price</span>
              <span className="text-base font-black text-gray-900 font-mono">Ksh {finalOrderTotal}</span>
            </div>
          </div>

          <button 
            onClick={() => {
              setOrderPlaced(false);
              setCart({});
              setCurrentOrderId(null);
              setFinalOrderTotal(0);
              setIsSubmitting(false);
              setIsBypassed(!!tableNumber);
              setLocationVerified(tableNumber ? true : null);
            }}
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
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-6 py-6 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase">
                SADYBECH HOTEL
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] tracking-wide font-bold uppercase ${
                isOpen ? "bg-[#23A158] text-white" : "bg-gray-200 text-gray-600"
              }`}>
                {isOpen ? "Open" : "Closed"}
              </span>
              {tableNumber && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] tracking-wide font-bold uppercase bg-[#FFC014] text-gray-950">
                  Table {tableNumber}
                </span>
              )}
            </div>
            <p className="text-gray-500 text-xs md:text-sm max-w-xl font-normal leading-relaxed">
              ⚡ Delivered hot and fresh.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="h-16 w-16 rounded-2xl overflow-hidden shadow-sm bg-gray-100 hidden sm:block">
              <img 
                src="https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=60" 
                alt="SADYBECH HOTEL" 
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

      {/* Closed notice */}
      {!isOpen && (
        <div className="max-w-5xl mx-auto px-6 mt-6">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 text-xs text-gray-600 text-center">
            We're currently closed. Orders are open daily from 9:30am to 8:00pm — browse the menu and come back when we reopen.
          </div>
        </div>
      )}

      {/* Restaurant Video Feature */}
      <section className="max-w-5xl mx-auto px-6 mt-8">
        <div className="relative overflow-hidden rounded-3xl min-h-[260px] sm:min-h-[340px] bg-gray-100 shadow-sm border border-gray-100">
          <video
            className="absolute inset-0 w-full h-full object-cover"
            src={RESTAURANT_VIDEO_URL}
            poster={RESTAURANT_VIDEO_POSTER}
            autoPlay
            muted
            loop
            playsInline
            aria-label="Fresh chips being prepared at SADYBECH HOTEL"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-black/5" />
          <div className="relative z-10 min-h-[260px] sm:min-h-[340px] flex items-end p-6 sm:p-8">
            <div className="max-w-md text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#FFC014] mb-2">
                Fresh from the fryer
              </p>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                Hot chips, fast delivery, proper flavor.
              </h2>
              <p className="mt-3 text-sm text-white/85 leading-relaxed">
                Watch the sizzle, pick your plate, and we will bring it to your table while it is still hot.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Search + Categories Tabs */}
      <div className="max-w-5xl mx-auto px-6 mt-8">
        {/* Search bar */}
        <div className="relative w-full mb-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meals, sides or drinks..."
            className="w-full pl-11 pr-10 py-3 rounded-full bg-gray-100 border-2 border-transparent text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#FFC014] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category tabs (dimmed while searching, since search covers all categories) */}
        <div className={`flex gap-2 overflow-x-auto pb-2 scrollbar-none transition-opacity ${query ? "opacity-40" : ""}`}>
          {["Meals", "Sides", "Drinks"].map((cat) => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setSearchQuery(""); }}
              className={`px-6 py-2.5 rounded-full text-xs font-bold tracking-wide transition-all shrink-0 ${
                activeCategory === cat && !query
                  ? "bg-[#FFF8E6] text-[#E6A100] border-2 border-[#FFC014]"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* No results message */}
      {visibleItems.length === 0 && (
        <div className="max-w-5xl mx-auto px-6 mt-10 text-center py-16 text-gray-500 text-sm">
          No items match "<span className="font-semibold text-gray-900">{searchQuery}</span>". Try another word.
        </div>
      )}

      {/* Grid List */}
      <div className="px-6 mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
        {visibleItems.map((item) => {
          const quantity = cart[item.id] || 0;
          return (
            <div 
              key={item.id} 
              className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1.5 border border-gray-100 flex flex-col justify-between transition-all duration-300 ease-out will-change-transform"
            >
              <div className="relative h-48 w-full bg-gray-50 overflow-hidden">
                <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[10px] font-bold text-gray-800 shadow-sm">
                  {item.tag}
                </div>
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105" 
                />
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900 tracking-tight transition-transform duration-300 group-hover:-translate-y-0.5">
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

      {/* FOOTER */}
      <footer className={`mt-16 bg-stone-900 text-stone-300 px-6 pt-10 text-center ${getCartCount() > 0 ? "pb-28" : "pb-10"}`}>
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-6">

          {/* Brand */}
          <h2 className="text-2xl font-black tracking-tight text-white uppercase">
            SADYBECH HOTEL
          </h2>

          {/* Notice */}
          <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-xl">
            Item availability, prices, delivery areas and charges may vary.
            Orders are open daily from 9:30am to 8:00pm.
          </p>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm font-semibold">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="hover:text-[#FFC014] transition"
            >
              Menu
            </button>
            <a href="/privacy" className="hover:text-[#FFC014] transition">Privacy Policy</a>
            <a href="/terms" className="hover:text-[#FFC014] transition">Terms &amp; Conditions</a>
          </nav>

          {/* Social icons */}
          <div className="flex gap-3">
            <a
              href="https://x.com/yourhandle"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X"
              className="w-10 h-10 rounded-full border border-stone-600 flex items-center justify-center hover:border-[#FFC014] hover:text-[#FFC014] transition"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://instagram.com/yourhandle"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-10 h-10 rounded-full border border-stone-600 flex items-center justify-center hover:border-[#FFC014] hover:text-[#FFC014] transition"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" className="fill-current stroke-none" />
              </svg>
            </a>
          </div>

          {/* Copyright */}
          <p className="text-xs text-stone-500">
            Copyright © {new Date().getFullYear()} SADYBECH HOTEL. All Rights Reserved.
          </p>
        </div>
      </footer>

      {/* Floating Checkout Bar */}
      {getCartCount() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100 z-30 flex justify-center shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <button
            onClick={() => isOpen && setShowCheckoutModal(true)}
            disabled={!isOpen}
            className="w-full max-w-md bg-[#FFC014] hover:bg-[#e6ac10] text-gray-950 font-bold text-sm py-4 rounded-full shadow-md flex items-center justify-between px-6 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <span>{isOpen ? "View Order Bag" : "We're closed right now"}</span>
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
                  onClick={() => { if (isOpen) { setShowCartDrawer(false); setShowCheckoutModal(true); } }}
                  disabled={!isOpen}
                  className="w-full bg-[#FFC014] text-gray-950 text-sm font-bold py-4 rounded-full text-center block hover:bg-[#e6ac10] transition shadow-sm disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {isOpen ? "Go to Checkout" : "We're closed right now"}
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

              {!tableNumber && (
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
              )}

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