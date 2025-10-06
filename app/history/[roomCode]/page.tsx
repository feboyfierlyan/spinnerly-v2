import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import HistoryView from "@/components/history-view"

interface PageProps {
  params: Promise<{ roomCode: string }>
}

export default async function HistoryPage({ params }: PageProps) {
  const { roomCode } = await params
  const supabase = await createClient()

  const { data: room, error: roomError } = await supabase.from("rooms").select("*").eq("room_code", roomCode).single()

  if (roomError || !room) {
    notFound()
  }

  const { data: history, error: historyError } = await supabase
    .from("spin_history")
    .select("*")
    .eq("room_id", room.id)
    .order("spun_at", { ascending: false })

  if (historyError) {
    console.error("[v0] Error fetching history:", historyError)
  }

  return (
    <div className="relative min-h-dvh starry-bg-light">
      <div aria-hidden className="absolute inset-0 space-vignette" />
      <HistoryView room={room} history={history || []} />
    </div>
  )
}
