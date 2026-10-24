// src/app/cashier/_components/MenuGrid.tsx
"use client";

const CHIP_SHOP_MENU = [
  { id: "1", name: "Regular Chips", price: 150, category: "chips" },
  { id: "2", name: "Large Chips", price: 250, category: "chips" },
  { id: "3", name: "Fish", price: 200, category: "mains" },
  { id: "4", name: "Sausage", price: 50, category: "mains" },
  { id: "5", name: "Soda (500ml)", price: 70, category: "drinks" },
  { id: "6", name: "Bhajia", price: 180, category: "chips" },
];

interface MenuGridProps {
  onSelectItem: (item: { id: string; name: string; price: number }) => void;
}

export default function MenuGrid({ onSelectItem }: MenuGridProps) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Quick Menu</h2>
      <div className="grid grid-cols-3 gap-4">
        {CHIP_SHOP_MENU.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectItem(item)}
            className="h-28 bg-white border-2 border-gray-200 hover:border-amber-500 rounded-xl flex flex-col justify-between p-4 shadow-sm text-left transition-all active:scale-95"
          >
            <span className="font-semibold text-lg leading-tight">{item.name}</span>
            <span className="text-amber-600 font-bold">KES {item.price}</span>
          </button>
        ))}
      </div>
    </div>
  );
}