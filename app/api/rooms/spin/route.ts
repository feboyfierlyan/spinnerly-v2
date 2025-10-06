import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { roomId, selectedName, assignedMaterial, remainingNames, nextMaterialIndex } = await request.json()

    console.log("[v0 API] Received spin request:", {
      roomId,
      selectedName,
      assignedMaterial,
      remainingNamesCount: remainingNames.length,
      nextMaterialIndex,
    })

    const supabase = await createClient()

    const { error: historyError } = await supabase.from("spin_history").insert({
      room_id: roomId,
      selected_name: selectedName,
      assigned_material: assignedMaterial,
    })

    if (historyError) {
      console.error("[v0 API] Error saving history:", historyError)
      return NextResponse.json({ error: "Gagal menyimpan riwayat", success: false }, { status: 500 })
    }

    console.log("[v0 API] History saved successfully")

    const { data: updateData, error: updateError } = await supabase
      .from("rooms")
      .update({
        names: remainingNames,
        current_material_index: nextMaterialIndex,
      })
      .eq("id", roomId)
      .select()

    if (updateError) {
      console.error("[v0 API] Error updating room:", updateError)
      return NextResponse.json({ error: "Gagal memperbarui room", success: false }, { status: 500 })
    }

    console.log("[v0 API] Room updated successfully:", updateData)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0 API] Error in spin:", error)
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 })
  }
}
