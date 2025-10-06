import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { roomCode } = await request.json()

    if (!roomCode || roomCode.length !== 6) {
      return NextResponse.json({ exists: false }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: room, error } = await supabase
      .from("rooms")
      .select("id")
      .eq("room_code", roomCode.toUpperCase())
      .maybeSingle()

    if (error) {
      console.error("Error checking room:", error)
      return NextResponse.json({ exists: false }, { status: 500 })
    }

    return NextResponse.json({ exists: !!room })
  } catch (error) {
    console.error("Error in check room route:", error)
    return NextResponse.json({ exists: false }, { status: 500 })
  }
}
