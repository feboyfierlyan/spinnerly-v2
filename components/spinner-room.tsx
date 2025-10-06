"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Copy, History, Share2, Volume2, VolumeX, Sparkles, CheckCircle2, Eye } from "lucide-react"
import type { Room } from "@/lib/types"
import Link from "next/link"
import NotificationCard from "@/components/notification-card"
import Confetti from "@/components/confetti"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface SpinnerRoomProps {
  room: Room
}

interface SpinEvent {
  type: "spin_started"
  selectedIndex: number
  selectedName: string
  selectedMaterial: string
  totalRotation: number
  timestamp: number
}

export default function SpinnerRoom({ room }: SpinnerRoomProps) {
  const [currentNames, setCurrentNames] = useState<string[]>(room.names)
  const [allMaterials] = useState<string[]>(room.materials)
  const [currentMaterialIndex, setCurrentMaterialIndex] = useState<number>(room.current_material_index)
  const [isSpinning, setIsSpinning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [isCreator, setIsCreator] = useState(false)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationRef = useRef<number | null>(null)
  const channelRef = useRef<any>(null)
  const isCreatorRef = useRef(false)

  const router = useRouter()
  const reloadingRef = useRef(false)
  const postSaveCleanupTimeoutRef = useRef<number | null>(null)
  const prevMaterialIndexRef = useRef<number>(room.current_material_index)
  const prevNamesCountRef = useRef<number>(room.names.length)

  const safeReload = () => {
    if (reloadingRef.current) return
    reloadingRef.current = true
    console.log("[v0] Triggering page refresh to avoid duplicate spins")
    try {
      router.refresh()
    } catch (e) {
      if (typeof window !== "undefined") window.location.reload()
    }
  }

  const schedulePostSaveCleanup = () => {
    if (typeof window === "undefined") return
    if (postSaveCleanupTimeoutRef.current) return
    postSaveCleanupTimeoutRef.current = window.setTimeout(() => {
      setShowConfetti(false)
      // Only unlock if a reload hasn't been triggered (fallback usability)
      if (!reloadingRef.current) {
        setIsSaving(false)
        setIsSpinning(false)
      }
      postSaveCleanupTimeoutRef.current = null
    }, 1200)
  }

  useEffect(() => {
    return () => {
      if (postSaveCleanupTimeoutRef.current) {
        clearTimeout(postSaveCleanupTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const materialChanged = currentMaterialIndex !== prevMaterialIndexRef.current
    const namesChanged = currentNames.length !== prevNamesCountRef.current
    if (materialChanged || namesChanged) {
      console.log("[v0] Progress changed - unlocking and clearing visuals")
      // Clear transient UI states so the next spin is enabled
      setIsSpinning(false)
      setIsSaving(false)
      setShowConfetti(false)
      // Allow future reloads if needed
      reloadingRef.current = false
      // Clear any pending cleanup timers
      if (postSaveCleanupTimeoutRef.current) {
        clearTimeout(postSaveCleanupTimeoutRef.current)
        postSaveCleanupTimeoutRef.current = null
      }
    }
    prevMaterialIndexRef.current = currentMaterialIndex
    prevNamesCountRef.current = currentNames.length
  }, [currentMaterialIndex, currentNames.length])

  const roomUrl = typeof window !== "undefined" ? `${window.location.origin}/room/${room.room_code}` : ""

  const currentMaterial = allMaterials[currentMaterialIndex]
  const isComplete = currentMaterialIndex >= allMaterials.length

  const colors = ["#8B5CF6", "#EC4899", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#6366F1"]

  useEffect(() => {
    if (typeof window !== "undefined") {
      const creatorSessionId = localStorage.getItem(`creator_${room.room_code}`)
      const creator = creatorSessionId === room.creator_session_id
      setIsCreator(creator)
      isCreatorRef.current = creator
    }
  }, [room.room_code, room.creator_session_id])

  useEffect(() => {
    isCreatorRef.current = isCreator
  }, [isCreator])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`room:${room.id}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on("broadcast", { event: "spin" }, (payload) => {
        console.log("[v0] Received spin broadcast:", payload)
        const spinEvent = payload.payload as SpinEvent

        triggerRealtimeSpin(spinEvent)
      })
      .on("broadcast", { event: "spin-finalized" }, (payload) => {
        console.log("[v0] Received spin-finalized broadcast:", payload)
        const { nextMaterialIndex } = payload.payload as { nextMaterialIndex: number }

        // Only apply instant finish on viewers. Creator already forces a reload.
        if (!isCreatorRef.current) {
          setCurrentNames([])
          setCurrentMaterialIndex(nextMaterialIndex)
          setSelectedName(null)
          setSelectedMaterial(null)
          setShowConfetti(false)
          setIsSpinning(false)
          setIsSaving(false)
          setRotation(0)
        }
      })
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          console.log("[v0] Room updated:", payload)
          const updatedRoom = payload.new as Room

          setCurrentNames(updatedRoom.names)
          setCurrentMaterialIndex(updatedRoom.current_material_index)
          setSelectedName(null)
          setSelectedMaterial(null)
          setShowConfetti(false)
          setIsSpinning(false)
          setIsSaving(false)
          setRotation(0)

          if (isCreatorRef.current) {
            safeReload()
          }
        },
      )
      .subscribe((status) => {
        console.log("[v0] Realtime status:", status)
        setIsRealtimeConnected(status === "SUBSCRIBED")
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [room.id])

  useEffect(() => {
    drawWheel()
  }, [currentNames, rotation])

  useEffect(() => {
    if (typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }, [])

  const playSound = (frequency: number, duration: number, type: OscillatorType = "sine") => {
    if (!soundEnabled || !audioContextRef.current) return

    const ctx = audioContextRef.current
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = frequency
    oscillator.type = type

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  }

  const playTickSound = () => {
    playSound(800, 0.05, "square")
  }

  const playCelebrationSound = () => {
    if (!soundEnabled || !audioContextRef.current) return

    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((note, index) => {
      setTimeout(() => playSound(note, 0.3, "sine"), index * 100)
    })
  }

  const drawWheel = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 10

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const anglePerSegment = (2 * Math.PI) / currentNames.length

    currentNames.forEach((name, index) => {
      const startAngle = index * anglePerSegment + (rotation * Math.PI) / 180
      const endAngle = startAngle + anglePerSegment

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = colors[index % colors.length]
      ctx.fill()
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 3
      ctx.stroke()

      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(startAngle + anglePerSegment / 2)
      ctx.textAlign = "center"
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 18px sans-serif"
      ctx.fillText(name, radius * 0.65, 0)
      ctx.restore()
    })

    ctx.beginPath()
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI)
    ctx.fillStyle = "#ffffff"
    ctx.fill()
    ctx.strokeStyle = "#8B5CF6"
    ctx.lineWidth = 4
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(centerX, 20)
    ctx.lineTo(centerX - 15, 50)
    ctx.lineTo(centerX + 15, 50)
    ctx.closePath()
    ctx.fillStyle = "#EF4444"
    ctx.fill()
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2
    ctx.stroke()
  }

  const triggerRealtimeSpin = (spinEvent: SpinEvent) => {
    console.log("[v0] ===== triggerRealtimeSpin CALLED =====")
    console.log("[v0] spinEvent:", spinEvent)
    console.log("[v0] isSpinning:", isSpinning)

    const creatorSessionId = typeof window !== "undefined" ? localStorage.getItem(`creator_${room.room_code}`) : null
    const isCreatorNow = creatorSessionId === room.creator_session_id
    console.log("[v0] creatorSessionId from localStorage:", creatorSessionId)
    console.log("[v0] room.creator_session_id:", room.creator_session_id)
    console.log("[v0] isCreatorNow (checked directly):", isCreatorNow)

    if (isSpinning) {
      console.log("[v0] Already spinning, returning early")
      return
    }

    console.log("[v0] Setting up spin animation...")
    setIsSpinning(true)
    setSelectedName(null)
    setSelectedMaterial(null)
    setShowConfetti(false)

    playSound(400, 0.2, "sine")

    const duration = 5000
    const startTime = Date.now()
    const startRotation = rotation
    let lastTickRotation = 0

    console.log("[v0] Animation parameters:", {
      duration,
      startTime,
      startRotation,
      totalRotation: spinEvent.totalRotation,
    })

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      const easeInOutCubic =
        progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2

      const currentRotation = startRotation + spinEvent.totalRotation * easeInOutCubic

      setRotation(currentRotation % 360)

      const rotationDiff = currentRotation - lastTickRotation
      if (rotationDiff >= 30) {
        playTickSound()
        lastTickRotation = currentRotation
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        console.log("[v0] ===== ANIMATION COMPLETE =====")
        console.log("[v0] Selected name:", spinEvent.selectedName)
        console.log("[v0] Selected material:", spinEvent.selectedMaterial)
        console.log("[v0] isCreatorNow (at completion):", isCreatorNow)

        setSelectedName(spinEvent.selectedName)
        setSelectedMaterial(spinEvent.selectedMaterial)
        setShowConfetti(true)
        playCelebrationSound()

        if (isCreatorNow) {
          console.log("[v0] Creator detected, calling saveSpinResult...")
          setIsSaving(true)
          saveSpinResult(spinEvent)
        } else {
          console.log("[v0] Not creator, skipping saveSpinResult")
          // Remove the selected name on viewer
          setCurrentNames((prev) => prev.filter((_, i) => i !== spinEvent.selectedIndex))
          // Compute next material index now to decide if we're at final state
          const nextIndex = currentMaterialIndex + 1
          setCurrentMaterialIndex(nextIndex)

          // If this was the last spin, immediately clear the result and visuals
          // so the viewer sees the "Selesai!" panel without waiting for UPDATE
          if (nextIndex >= allMaterials.length) {
            setSelectedName(null)
            setSelectedMaterial(null)
            setShowConfetti(false)
            setRotation(0)
          }

          setIsSpinning(false)
          // Ensure confetti auto-stops for viewers too (non-final spins)
          setTimeout(() => setShowConfetti(false), 1200)
        }
      }
    }

    console.log("[v0] Starting animation loop...")
    animate()
  }

  const saveSpinResult = async (spinEvent: SpinEvent) => {
    console.log("[v0] ===== saveSpinResult CALLED =====")
    console.log("[v0] spinEvent:", spinEvent)
    console.log("[v0] currentNames:", currentNames)
    console.log("[v0] currentMaterialIndex:", currentMaterialIndex)

    try {
      const remainingNames = currentNames.filter((_, i) => i !== spinEvent.selectedIndex)

      console.log("[v0] Calculated remaining names:", remainingNames)
      console.log("[v0] Next material index:", currentMaterialIndex + 1)

      const requestBody = {
        roomId: room.id,
        selectedName: spinEvent.selectedName,
        assignedMaterial: spinEvent.selectedMaterial,
        remainingNames: remainingNames,
        nextMaterialIndex: currentMaterialIndex + 1,
      }

      console.log("[v0] Sending API request with body:", requestBody)

      const response = await fetch("/api/rooms/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      console.log("[v0] API response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] API error response:", errorText)
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()
      console.log("[v0] API response JSON:", result)

      if (!result.success) {
        throw new Error("API returned success: false")
      }

      setCurrentNames((prev) => prev.filter((_, i) => i !== spinEvent.selectedIndex))
      setCurrentMaterialIndex((idx) => idx + 1)

      console.log("[v0] ===== SPIN SAVED SUCCESSFULLY =====")
      // Schedule cleanup in case refresh is slow/unavailable
      schedulePostSaveCleanup()
      safeReload()
    } catch (error) {
      console.error("[v0] ===== ERROR IN saveSpinResult =====")
      console.error("[v0] Error:", error)
      setNotification({
        type: "error",
        message: "Gagal menyimpan hasil spin. Silakan coba lagi.",
      })
      setIsSaving(false)
      setIsSpinning(false)
    }
  }

  const spinWheel = async () => {
    if (!isCreator) {
      setNotification({
        type: "error",
        message: "Hanya pembuat room yang dapat memutar roda!",
      })
      return
    }

    if (isSpinning || isSaving) return

    if (currentNames.length === 1) {
      const lastName = currentNames[0]
      const lastMaterial = currentMaterial

      setSelectedName(lastName)
      setSelectedMaterial(lastMaterial)
      setShowConfetti(true)
      playCelebrationSound()

      try {
        console.log("[v0] Saving final spin for last name")
        setIsSaving(true)

        const nextMaterialIndex = currentMaterialIndex + 1 // compute once for reuse

        const response = await fetch("/api/rooms/spin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: room.id,
            selectedName: lastName,
            assignedMaterial: lastMaterial,
            remainingNames: [],
            nextMaterialIndex, // use computed value
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error("[v0] Final spin API error:", errorText)
          throw new Error(`API error: ${response.status}`)
        }

        const result = await response.json()
        console.log("[v0] Final spin API response:", result)

        if (!result.success) {
          throw new Error("Final spin failed")
        }

        setCurrentNames([])
        setCurrentMaterialIndex(nextMaterialIndex)

        try {
          if (channelRef.current) {
            await channelRef.current.send({
              type: "broadcast",
              event: "spin-finalized",
              payload: { nextMaterialIndex },
            })
            console.log("[v0] spin-finalized broadcast sent")
          }
        } catch (e) {
          console.error("[v0] Failed to broadcast spin-finalized:", e)
        }

        // Schedule cleanup + reload for final spin as well (creator-only strong path)
        schedulePostSaveCleanup()
        safeReload()
      } catch (error) {
        console.error("[v0] Error saving final spin:", error)
        setNotification({
          type: "error",
          message: "Gagal menyimpan hasil spin terakhir.",
        })
        setIsSaving(false)
      }

      // Tighten confetti duration for final spin too
      setTimeout(() => setShowConfetti(false), 1200)
      return
    }

    setIsSpinning(true)

    if (isSpinning || currentNames.length === 0 || isComplete) return

    console.log("[v0] Starting spin with names:", currentNames)
    console.log("[v0] isCreator:", isCreator)

    const spins = 5 + Math.random() * 3
    const randomAngle = Math.random() * 360
    const totalRotation = spins * 360 + randomAngle

    const finalRotation = (rotation + totalRotation) % 360
    const normalizedRotation = (360 - finalRotation) % 360
    const anglePerSegment = 360 / currentNames.length
    const selectedIndex = Math.floor(normalizedRotation / anglePerSegment)
    const winner = currentNames[selectedIndex]
    const winnerMaterial = currentMaterial

    const spinEvent: SpinEvent = {
      type: "spin_started",
      selectedIndex,
      selectedName: winner,
      selectedMaterial: winnerMaterial,
      totalRotation,
      timestamp: Date.now(),
    }

    console.log("[v0] Broadcasting spin event:", spinEvent)

    if (channelRef.current) {
      await channelRef.current.send({
        type: "broadcast",
        event: "spin",
        payload: spinEvent,
      })
      console.log("[v0] Broadcast sent successfully")
    } else {
      console.error("[v0] Channel not available for broadcast")
      setIsSpinning(false)
      setNotification({
        type: "error",
        message: "Koneksi realtime tidak tersedia. Coba lagi.",
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    playSound(1000, 0.1, "sine")
    setNotification({
      type: "success",
      message: "Link berhasil disalin ke clipboard!",
    })
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      {showConfetti && <Confetti key={`confetti-${Date.now()}`} />}

      {notification && (
        <NotificationCard
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{room.room_name || "Room Spinner"}</h1>
            <p className="text-gray-600 mt-1">
              Kode Room: <span className="font-semibold text-purple-600">{room.room_code}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isCreator && (
              <div className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                Mode Viewer
              </div>
            )}
            {isRealtimeConnected && (
              <div className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Realtime
              </div>
            )}
            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              variant="outline"
              size="icon"
              className="rounded-xl border-gray-300 hover:scale-110 active:scale-95 transition-transform"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="brilliant-card p-6 border border-gray-200 rounded-2xl hover:shadow-lg transition-all duration-300">
              {isComplete ? (
                <div className="mb-6 p-6 bg-green-50 rounded-xl border-2 border-green-300 text-center">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                    <p className="text-2xl font-bold text-green-900">Selesai!</p>
                  </div>
                  <p className="text-green-700">Semua materi telah dibagikan kepada peserta.</p>
                  <Link href={`/history/${room.room_code}`}>
                    <Button className="mt-4 bg-green-600 hover:bg-green-700 rounded-xl text-white hover:scale-105 active:scale-95 transition-transform">
                      <History className="w-4 h-4 mr-2" />
                      Lihat Hasil Lengkap
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-200 text-center">
                  <p className="text-sm font-semibold text-purple-700 mb-1">Materi Saat Ini:</p>
                  <p className="text-xl font-bold text-purple-900">{currentMaterial}</p>
                  <p className="text-xs text-purple-600 mt-1">
                    Putaran {currentMaterialIndex + 1} dari {allMaterials.length}
                  </p>
                </div>
              )}

              <div className="flex flex-col items-center">
                <canvas ref={canvasRef} width={500} height={500} className="max-w-full h-auto" />

                <Button
                  onClick={spinWheel}
                  disabled={isSpinning || isSaving || currentNames.length === 0 || isComplete || !isCreator}
                  aria-busy={isSpinning || isSaving}
                  className="mt-6 w-full max-w-md h-14 text-lg font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 hover:scale-105 active:scale-98 transition-all duration-200"
                >
                  {isSpinning || isSaving ? (
                    "Memutar..."
                  ) : !isCreator ? (
                    <span className="flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Mode Viewer - Hanya Bisa Melihat
                    </span>
                  ) : isComplete ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      Semua Materi Sudah Dibagikan
                    </span>
                  ) : currentNames.length === 1 ? (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Pilih Nama Terakhir
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Putar Roda
                    </span>
                  )}
                </Button>

                <AnimatePresence mode="wait">
                  {selectedName && selectedMaterial && (
                    <motion.div
                      key={`result-${selectedName}-${selectedMaterial}-${Date.now()}`}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -30 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="mt-6 p-6 bg-purple-50 rounded-2xl w-full text-center border border-purple-200"
                    >
                      <p className="text-sm font-semibold text-purple-700 mb-2">Terpilih:</p>
                      <p className="text-2xl font-bold text-purple-900 mb-3">{selectedName}</p>
                      <div className="pt-3 border-t border-purple-200">
                        <p className="text-sm font-semibold text-purple-700 mb-1">Mendapat Materi:</p>
                        <p className="text-xl font-bold text-purple-900">{selectedMaterial}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="brilliant-card p-6 border border-gray-200 rounded-2xl hover:scale-[1.02] hover:shadow-lg transition-all duration-300">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-purple-600" />
                Bagikan
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Link Room:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={roomUrl}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm bg-gray-50 rounded-lg border border-gray-200 text-gray-700"
                    />
                    <Button
                      onClick={() => copyToClipboard(roomUrl)}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 rounded-lg hover:scale-110 active:scale-95 transition-transform"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Link href={`/history/${room.room_code}`}>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 rounded-xl text-white hover:scale-105 active:scale-95 transition-transform">
                    <History className="w-4 h-4 mr-2" />
                    Lihat Riwayat
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="brilliant-card p-6 border border-gray-200 rounded-2xl hover:shadow-lg transition-all duration-300">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Nama Tersisa ({currentNames.length})</h2>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {currentNames.length === 0 ? (
                  <p className="text-gray-500 text-center py-4 text-sm">Semua sudah terpilih!</p>
                ) : (
                  currentNames.map((name, index) => (
                    <div
                      key={index}
                      className="p-3 bg-purple-50 rounded-xl border border-purple-100 hover:scale-105 hover:shadow-md active:scale-98 transition-all duration-200 cursor-pointer"
                    >
                      <p className="font-semibold text-gray-900 text-sm">{name}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="brilliant-card p-6 border border-gray-200 rounded-2xl hover:shadow-lg transition-all duration-300">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Materi Tersisa</h2>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {allMaterials.slice(currentMaterialIndex).map((material, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-xl border ${
                      index === 0 ? "bg-purple-100 border-purple-300 font-semibold" : "bg-gray-50 border-gray-200"
                    } hover:scale-105 hover:shadow-md active:scale-98 transition-all duration-200 cursor-pointer`}
                  >
                    <p className="text-gray-900 text-sm">
                      {index === 0 && "▶ "}
                      {material}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
