"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ArrowRight, Plus, Sparkles, Loader2 } from "lucide-react"
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

  const handleJoinRoom = async () => {
    if (roomCode.trim().length !== 6) {
      setNotification({
        type: "error",
        message: "Masukkan kode room yang valid (6 karakter)",
      })
      return
    }

    setIsLoading(true)

    try {
      // Check if room exists
      const response = await fetch("/api/rooms/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: roomCode.toUpperCase() }),
      })

      const data = await response.json()

      if (data.exists) {
        setTimeout(() => {
          router.push(`/room/${roomCode.toUpperCase()}`)
        }, 300)
      } else {
        setNotification({
          type: "error",
          message: "Kode room tidak ditemukan. Periksa kembali kode Anda.",
        })
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Error checking room:", error)
      setNotification({
        type: "error",
        message: "Terjadi kesalahan. Silakan coba lagi.",
      })
      setIsLoading(false)
    }
  }

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      setNotification({
        type: "error",
        message: "Masukkan nama room!",
      })
      return
    }

    if (names.length < 2) {
      setNotification({
        type: "error",
        message: "Masukkan minimal 2 nama!",
      })
      return
    }

    if (materials.length < 2) {
      setNotification({
        type: "error",
        message: "Masukkan minimal 2 materi!",
      })
      return
    }

    if (names.length !== materials.length) {
      setNotification({
        type: "error",
        message: "Jumlah nama dan materi harus sama!",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: roomName.trim(),
          names: names,
          materials: materials,
        }),
      })

      const data = await response.json()

      if (data.roomCode && data.creatorSessionId) {
        localStorage.setItem(`creator_${data.roomCode}`, data.creatorSessionId)

        setTimeout(() => {
          router.push(`/room/${data.roomCode}`)
        }, 300)
      } else {
        setNotification({
          type: "error",
          message: "Gagal membuat room. Silakan coba lagi.",
        })
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Error creating room:", error)
      setNotification({
        type: "error",
        message: "Terjadi kesalahan. Silakan coba lagi.",
      })
      setIsLoading(false)
    }
  }

  if (mode === "choose") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4 page-transition">
        {notification && (
          <NotificationCard
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )}

        <div className="w-full max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-3">Spinnerly</h1>
            <p className="text-lg text-gray-600">Where Every Spin is Verifiably Fair</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card
              className="brilliant-card p-8 border border-gray-200 rounded-2xl cursor-pointer hover:border-purple-300 hover:shadow-md hover:scale-105 active:scale-100 transition-all"
              onClick={() => setMode("join")}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ArrowRight className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Gabung Room</h2>
                <p className="text-gray-600">Masukkan kode room untuk bergabung</p>
              </div>
            </Card>

            <Card
              className="brilliant-card p-8 border border-gray-200 rounded-2xl cursor-pointer hover:border-purple-300 hover:shadow-md hover:scale-105 active:scale-100 transition-all"
              onClick={() => setMode("create")}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Buat Room Baru</h2>
                <p className="text-gray-600">Buat room spinner wheel baru</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (mode === "join") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4 page-transition">
        {notification && (
          <NotificationCard
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )}

        <div className="w-full max-w-md">
          <Card className="brilliant-card p-8 border border-gray-200 rounded-2xl">
            <button
              onClick={() => setMode("choose")}
              className="text-purple-600 hover:text-purple-700 mb-6 flex items-center gap-2 font-medium hover:scale-105 active:scale-100 transition-transform"
            >
              ← Kembali
            </button>

            <h2 className="text-3xl font-bold text-gray-900 mb-6">Gabung Room</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Kode Room</label>
                <Input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Masukkan 6 karakter kode"
                  maxLength={6}
                  className="text-lg h-12 rounded-xl border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && roomCode.length === 6) {
                      handleJoinRoom()
                    }
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
                  "Gabung Room"
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 page-transition">
      {notification && (
        <NotificationCard
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="w-full max-w-2xl">
        <Card className="brilliant-card p-8 border border-gray-200 rounded-2xl">
          <button
            onClick={() => setMode("choose")}
            className="text-purple-600 hover:text-purple-700 mb-6 flex items-center gap-2 font-medium hover:scale-105 active:scale-100 transition-transform"
          >
            ← Kembali
          </button>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">Buat Room Baru</h2>
          <p className="text-gray-600 mb-6">
            Masukkan daftar nama dan materi. Sistem akan mengacak penugasan secara adil.
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Room</label>
              <Input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Contoh: Pembagian Tugas Kelompok A"
                className="h-12 rounded-xl border-gray-300 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <ChipInput items={names} onChange={setNames} placeholder="Masukkan nama..." label="Daftar Nama" />

            <ChipInput
              items={materials}
              onChange={setMaterials}
              placeholder="Masukkan materi..."
              label="Daftar Materi"
            />
          </div>

          <Button
            onClick={handleCreateRoom}
            disabled={isLoading}
            className="w-full h-12 text-lg font-semibold rounded-xl brilliant-gradient text-white hover:opacity-90 mt-6 hover:scale-105 active:scale-95 transition-all disabled:hover:scale-100"
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

          <div className="mt-6 p-4 bg-purple-50 rounded-xl border border-purple-100">
            <p className="text-sm text-purple-900">
              <strong>Catatan:</strong> Jumlah nama dan materi harus sama. Setiap putaran akan memilih satu nama secara
              acak untuk mendapat satu materi.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
