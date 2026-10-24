import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return NextResponse.json(
        { success: false, error: "Server is not configured" },
        { status: 500 }
      );
    }

    // Created per request, so a missing key can't break the build
    const supabaseAdmin = createClient(url, serviceKey);

    const { items, total_amount, payment_method, table_number } =
      await request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "No items in order" },
        { status: 400 }
      );
    }

    const table =
      typeof table_number === "string" && /^\d{1,3}$/.test(table_number)
        ? table_number
        : null;

    // Same format the customer page uses, so the kitchen parser handles both
    const itemsText = items
      .map((i: any) => `${i.quantity}x ${i.name}`)
      .join(", ");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert([
        {
          name: table ? `Table ${table}` : "Walk-in",
          phone: "-",
          address: table ? `Table ${table} (Dine-in)` : "Counter (Walk-in)",
          table_number: table,
          items: itemsText,
          totalprice: total_amount,
          status: "Frying",
          payment_method,
          source: "walk-in",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      { success: true, orderId: order.id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Supabase Cashier Write Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process cashier order",
      },
      { status: 500 }
    );
  }
}