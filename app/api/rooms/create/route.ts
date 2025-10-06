import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(request: Request) {
  try {
    const { roomName, names, materials } = await request.json()

    if (!roomName || typeof roomName !== "string" || roomName.trim().length === 0) {
      return NextResponse.json({ error: "Nama room diperlukan" }, { status: 400 })
    }

    if (!names || !Array.isArray(names) || names.length < 2) {
      return NextResponse.json({ error: "Minimal 2 nama diperlukan" }, { status: 400 })
    }

    if (!materials || !Array.isArray(materials) || materials.length !== names.length) {
      return NextResponse.json({ error: "Jumlah materi harus sama dengan jumlah nama" }, { status: 400 })
    }

    const supabase = await createClient()
    let roomCode = generateRoomCode()
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      const { data: existing } = await supabase.from("rooms").select("id").eq("room_code", roomCode).maybeSingle()

      if (!existing) {
        break
      }

      roomCode = generateRoomCode()
      attempts++
    }

    const creatorSessionId = crypto.randomUUID()

    const { data, error } = await supabase
      .from("rooms")
      .insert({
        room_code: roomCode,
        room_name: roomName.trim(),
        names: names,
        materials: materials,
        current_material_index: 0,
        creator_session_id: creatorSessionId, // Store creator session ID
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Gagal membuat room" }, { status: 500 })
    }

    return NextResponse.json({
      roomCode: data.room_code,
      creatorSessionId: creatorSessionId,
    })
  } catch (error) {
    console.error("Error in create room:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
