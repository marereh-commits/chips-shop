// src/app/api/orders/cashier-create/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize a secure server-side client using your private service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(request: Request) {
  try {
    const { items, total_amount, payment_method, source } = await request.json();

    // 1. Insert the primary record into your main 'orders' table
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert([
        {
          source: source || "walk-in",
          total_amount: total_amount,
          payment_method: payment_method,
          status: "completed",       // Walk-ins are usually completed instantly at the counter
          payment_status: "paid",
        },
      ])
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Map line items to match your 'order_items' junction/relational table schema
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
      price: item.price,
    }));

    // 3. Bulk insert the break-down items
    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems);

    if (itemsError) throw itemsError;

    return NextResponse.json({ success: true, orderId: order.id }, { status: 201 });
  } catch (error: any) {
    console.error("Supabase Cashier Write Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process cashier order" }, 
      { status: 500 }
    );
  }
}