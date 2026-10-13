import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "I am feeling healthy 👌😁😊" });
}
