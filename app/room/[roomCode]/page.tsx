import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import SpinnerRoom from "@/components/spinner-room"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ roomCode: string }>
}

export default async function RoomPage({ params }: PageProps) {
  const { roomCode } = await params
  const supabase = await createClient()

  const { data: room, error } = await supabase.from("rooms").select("*").eq("room_code", roomCode).single()

  if (error || !room) {
    notFound()
  }

  return (
    <div className="min-h-screen starry-bg-light">
      <SpinnerRoom room={room} />
    </div>
  )
}
