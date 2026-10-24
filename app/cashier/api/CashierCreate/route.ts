// src/app/api/orders/cashier-create/route.ts
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

    const { items, total_amount, payment_method, source } = await request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "No items in order" },
        { status: 400 }
      );
    }

    // 1. Insert the primary record into 'orders'
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert([
        {
          source: source || "walk-in",
          total_amount,
          payment_method,
          status: "completed",
          payment_status: "paid",
        },
      ])
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Map line items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
      price: item.price,
    }));

    // 3. Bulk insert line items
    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      // Don't leave an orphaned order behind
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw itemsError;
    }

    return NextResponse.json({ success: true, orderId: order.id }, { status: 201 });
  } catch (error: any) {
    console.error("Supabase Cashier Write Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process cashier order" },
      { status: 500 }
    );
  }
}