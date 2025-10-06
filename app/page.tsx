"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Sparkles, Loader2, X, ArrowRight, Plus } from "lucide-react"
import NotificationCard from "@/components/notification-card"
import ChipInput from "@/components/chip-input"

export default function HomePage() {
  const [mode, setMode] = useState<"choose" | "join" | "create">("choose")
  const [roomCode, setRoomCode] = useState("")
  const [roomName, setRoomName] = useState("")
  const [names, setNames] = useState<string[]>([])
  const [materials, setMaterials] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const router = useRouter()

  // ... existing handlers (join/create) kept intact ...
  const handleJoinRoom = async () => {
    if (roomCode.trim().length !== 6) {
      setNotification({ type: "error", message: "Masukkan kode room yang valid (6 karakter)" })
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch("/api/rooms/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: roomCode.toUpperCase() }),
      })
      const data = await response.json()
      if (data.exists) {
        setTimeout(() => router.push(`/room/${roomCode.toUpperCase()}`), 250)
      } else {
        setNotification({ type: "error", message: "Kode room tidak ditemukan. Periksa kembali kode Anda." })
        setIsLoading(false)
      }
    } catch (e) {
      console.error("[v0] Error checking room:", e)
      setNotification({ type: "error", message: "Terjadi kesalahan. Silakan coba lagi." })
      setIsLoading(false)
    }
  }

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return setNotification({ type: "error", message: "Masukkan nama room!" })
    if (names.length < 2) return setNotification({ type: "error", message: "Masukkan minimal 2 nama!" })
    if (materials.length < 2) return setNotification({ type: "error", message: "Masukkan minimal 2 materi!" })
    if (names.length !== materials.length)
      return setNotification({ type: "error", message: "Jumlah nama dan materi harus sama!" })

    setIsLoading(true)
    try {
      const response = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: roomName.trim(), names, materials }),
      })
      const data = await response.json()
      if (data.roomCode && data.creatorSessionId) {
        localStorage.setItem(`creator_${data.roomCode}`, data.creatorSessionId)
        setTimeout(() => router.push(`/room/${data.roomCode}`), 250)
      } else {
        setNotification({ type: "error", message: "Gagal membuat room. Silakan coba lagi." })
        setIsLoading(false)
      }
    } catch (e) {
      console.error("[v0] Error creating room:", e)
      setNotification({ type: "error", message: "Terjadi kesalahan. Silakan coba lagi." })
      setIsLoading(false)
    }
  }

  // For smooth overlay transition classes
  const isOverlayOpen = mode === "join" || mode === "create"
  const overlayTitle = useMemo(() => (mode === "join" ? "Gabung Room" : "Buat Room Baru"), [mode])

  return (
    <div className="h-dvh relative overflow-hidden page-transition font-sans">
      {/* Notifications */}
      {notification && (
        <NotificationCard
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Starfield background (Duolingo-ish) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20"
        style={{
          backgroundColor: "#1f4b7a",
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.25) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "28px 28px, 18px 18px",
          backgroundPosition: "0 0, 10px 10px",
        }}
      />
      {/* Soft glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl bg-white/10 -z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl bg-cyan-300/10 -z-10"
      />

      {/* Hero content (centered, no scroll) */}
      <div className="h-full grid place-items-center">
        <div className="mx-auto max-w-6xl w-full px-6">
          <header className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white drop-shadow-sm text-balance">Spinnerly</h1>
            <p className="mt-3 text-white/80 text-lg md:text-xl text-pretty">Where Every Spin is Verifiably Fair</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Gabung Room card */}
            <button
              onClick={() => setMode("join")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setMode("join")
                }
              }}
              aria-label="Gabung Room"
              className="group w-full rounded-[28px] border border-white/20 bg-white/95 hover:bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] transition-all duration-200 p-8 md:p-12 text-left pressable-card focus-visible:ring-4 focus-visible:ring-purple-400/40"
            >
              <div className="flex items-center justify-center">
                <div className="h-16 w-16 rounded-2xl grid place-items-center bg-purple-100 text-purple-600 shadow-inner">
                  <ArrowRight className="h-7 w-7" />
                </div>
              </div>
              <div className="mt-6 text-center">
                <h3 className="text-2xl md:text-4xl font-extrabold text-gray-900">Gabung Room</h3>
                <p className="mt-2 text-gray-500 text-base md:text-lg">Masukkan kode room untuk bergabung</p>
              </div>
            </button>

            {/* Buat Room card */}
            <button
              onClick={() => setMode("create")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setMode("create")
                }
              }}
              aria-label="Buat Room Baru"
              className="group w-full rounded-[28px] border border-white/20 bg-white/95 hover:bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] transition-all duration-200 p-8 md:p-12 text-left pressable-card focus-visible:ring-4 focus-visible:ring-purple-400/40"
            >
              <div className="flex items-center justify-center">
                <div className="h-16 w-16 rounded-2xl grid place-items-center bg-purple-100 text-purple-600 shadow-inner">
                  <Plus className="h-7 w-7" />
                </div>
              </div>
              <div className="mt-6 text-center">
                <h3 className="text-2xl md:text-4xl font-extrabold text-gray-900">Buat Room Baru</h3>
                <p className="mt-2 text-gray-500 text-base md:text-lg">Buat room spinner wheel baru</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Tiny twinkling star illustrations over hero */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <span className="twinkle absolute w-[3px] h-[3px]" style={{ top: "12%", left: "8%" }} />
        <span className="twinkle absolute w-[2px] h-[2px]" style={{ top: "22%", left: "32%", animationDelay: ".4s" }} />
        <span className="twinkle absolute w-[3px] h-[3px]" style={{ top: "35%", left: "18%", animationDelay: ".9s" }} />
        <span
          className="twinkle absolute w-[2px] h-[2px]"
          style={{ top: "58%", left: "12%", animationDelay: "1.3s" }}
        />
        <span
          className="twinkle absolute w-[3px] h-[3px]"
          style={{ top: "14%", right: "10%", animationDelay: ".7s" }}
        />
        <span
          className="twinkle absolute w-[2px] h-[2px]"
          style={{ top: "40%", right: "22%", animationDelay: "1.1s" }}
        />
        <span
          className="twinkle absolute w-[3px] h-[3px]"
          style={{ top: "66%", right: "16%", animationDelay: ".2s" }}
        />
        <span
          className="twinkle absolute w-[2px] h-[2px]"
          style={{ bottom: "14%", left: "46%", animationDelay: ".8s" }}
        />
      </div>

      {/* Modal overlay for Join/Create */}
      <div
        className={`fixed inset-0 z-[70] transition ${
          isOverlayOpen ? "opacity-100 visible pointer-events-auto" : "opacity-0 invisible pointer-events-none"
        }`}
        aria-hidden={!isOverlayOpen}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 z-0 bg-black/40 backdrop-blur-sm transition-opacity ${
            isOverlayOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => !isLoading && setMode("choose")}
        />

        {/* Card container */}
        <div className="absolute inset-0 z-10 grid place-items-center p-4" onMouseDown={(e) => e.stopPropagation()}>
          <Card
            role="dialog"
            aria-modal="true"
            aria-labelledby="overlay-title"
            className={`w-full max-w-md md:max-w-2xl border border-white/20 rounded-2xl bg-white shadow-xl transition-all duration-200 ${
              isOverlayOpen ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"
            }`}
          >
            <div className="flex items-center justify-between p-4 md:p-6 border-b">
              <h2 id="overlay-title" className="text-xl md:text-2xl font-bold text-gray-900">
                {overlayTitle}
              </h2>
              <button
                className="rounded-full p-2 hover:bg-gray-100 active:scale-95 transition"
                onClick={() => !isLoading && setMode("choose")}
                aria-label="Tutup"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* Body - scroll inside the card only */}
            <div className="p-4 md:p-6 max-h-[85dvh] overflow-auto">
              {mode === "join" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Kode Room</label>
                    <Input
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      placeholder="Masukkan 6 karakter kode"
                      maxLength={6}
                      className="soft-input text-lg focus:border-purple-500 focus:ring-purple-500"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && roomCode.length === 6) handleJoinRoom()
                      }}
                    />
                  </div>

                  <Button
                    onClick={handleJoinRoom}
                    disabled={roomCode.length !== 6 || isLoading}
                    className="w-full h-12 text-lg font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 hover:scale-105 active:scale-95 transition-transform"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Bergabung...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-5 h-5 mr-2" />
                        Gabung Room
                      </>
                    )}
                  </Button>
                </div>
              )}

              {mode === "create" && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Room</label>
                    <Input
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="Contoh: Pembagian Tugas Kelompok A"
                      className="soft-input"
                    />
                  </div>

                  <ChipInput items={names} onChange={setNames} placeholder="Masukkan nama..." label="Daftar Nama" />
                  <ChipInput
                    items={materials}
                    onChange={setMaterials}
                    placeholder="Masukkan materi..."
                    label="Daftar Materi"
                  />

                  <Button
                    onClick={handleCreateRoom}
                    disabled={isLoading}
                    className="w-full h-12 text-lg font-semibold rounded-xl brilliant-gradient text-white hover:opacity-90 mt-2 hover:scale-105 active:scale-95 transition-all disabled:hover:scale-100"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Membuat Room...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Buat Room
                      </>
                    )}
                  </Button>

                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <p className="text-sm text-purple-900">
                      <strong>Catatan:</strong> Jumlah nama dan materi harus sama. Setiap putaran akan memilih satu nama
                      secara acak untuk mendapat satu materi.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
