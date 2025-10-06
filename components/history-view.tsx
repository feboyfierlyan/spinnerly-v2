"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { History, ArrowLeft, Clock, Trophy, Copy, Award, Download } from "lucide-react"
import type { Room, SpinHistory } from "@/lib/types"
import Link from "next/link"
import { motion } from "framer-motion"
import NotificationCard from "@/components/notification-card"

interface HistoryViewProps {
  room: Room
  history: SpinHistory[]
}

export default function HistoryView({ room, history }: HistoryViewProps) {
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const roomUrl = typeof window !== "undefined" ? `${window.location.origin}/room/${room.room_code}` : ""

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setNotification({
      type: "success",
      message: "Link berhasil disalin ke clipboard!",
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const wrapLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = (text || "").split(" ")
    const lines: string[] = []
    let current = ""

    for (let i = 0; i < words.length; i++) {
      const test = current ? `${current} ${words[i]}` : words[i]
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current)
        current = words[i]
      } else {
        current = test
      }
    }
    if (current) lines.push(current)
    return lines
  }

  const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    const radius = Math.min(r, h / 2, w / 2)
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.arcTo(x + w, y, x + w, y + h, radius)
    ctx.arcTo(x + w, y + h, x, y + h, radius)
    ctx.arcTo(x, y + h, x, y, radius)
    ctx.arcTo(x, y, x + w, y, radius)
    ctx.closePath()
  }

  const drawPill = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, bg: string) => {
    drawRoundedRect(ctx, x, y, w, h, h / 2)
    ctx.fillStyle = bg
    ctx.fill()
  }

  const downloadResultsImage = async () => {
    try {
      setIsGenerating(true)

      // Palette (3-5 colors, solid, no gradients)
      const colors = {
        appBg: "#F8FAFC", // slate-50
        cardBg: "#FFFFFF",
        border: "#E5E7EB", // gray-200
        title: "#0F172A", // slate-900
        subtitle: "#475569", // slate-600
        primary: "#7C3AED", // purple-600
        muted: "#94A3B8", // slate-400
        badgeText: "#FFFFFF",
      }

      // Layout
      const paddingX = 48
      const paddingY = 48
      const contentWidth = 960
      const rowGap = 18
      const dividerGap = 14
      const badgeSize = 32
      const badgeGap = 12
      const rightGutter = 100 // space for timestamp
      const textXStart = paddingX + badgeSize + badgeGap
      const maxTextWidth = contentWidth - (badgeSize + badgeGap + rightGutter)

      // Fonts
      const fontTitle = "bold 32px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
      const fontInfo = "16px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
      const fontName = "bold 20px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
      const fontMaterial = "16px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
      const fontTime = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
      const fontFooter = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"

      // Create a throwaway ctx to measure first; we’ll create the real canvas after we know height
      const measureCanvas = document.createElement("canvas")
      const measureCtx = measureCanvas.getContext("2d")!
      measureCtx.font = fontTitle
      const titleHeight = 36
      const statusText = room.names.length === 0 ? "Selesai" : "Berlangsung"

      // Measure header info line height
      measureCtx.font = fontInfo
      const infoLine = `Room: ${room.room_code} • Status: ${statusText}`
      const infoHeight = 22

      // Header block heights
      const headerTop = paddingY
      const headerBottom = headerTop + titleHeight + 8 + infoHeight + 20 // +20 for separator spacing

      // Measure each row height based on wrapping
      let listHeight = 0
      const lineHeightName = 26
      const lineHeightMaterial = 22

      const entriesMetrics = history.map((entry) => {
        // Name lines
        measureCtx.font = fontName
        const nameLines = wrapLines(measureCtx, entry.selected_name, maxTextWidth)

        // Material lines
        measureCtx.font = fontMaterial
        const materialLines = wrapLines(measureCtx, `→ ${entry.assigned_material}`, maxTextWidth)

        // Compute row height: top padding + name lines + small gap + material lines
        const nameBlockHeight = nameLines.length * lineHeightName
        const materialBlockHeight = materialLines.length * lineHeightMaterial
        const rowHeight = Math.max(badgeSize, nameBlockHeight + 6 + materialBlockHeight)

        listHeight += rowHeight + dividerGap + rowGap

        return { nameLines, materialLines, rowHeight }
      })

      // Footer
      const footerText = "Dibuat dengan Spinnerly • adil & transparan"
      measureCtx.font = fontFooter
      const footerHeight = 24

      // Final canvas dimensions (HiDPI)
      const width = paddingX * 2 + contentWidth
      const height = headerBottom + listHeight + footerHeight + paddingY

      const dpr = Math.max(2, Math.min(3, window.devicePixelRatio || 1))
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas tidak tersedia di browser ini.")

      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.scale(dpr, dpr)

      // Background
      ctx.fillStyle = colors.appBg
      ctx.fillRect(0, 0, width, height)

      // Card
      const cardX = paddingX - 8
      const cardY = paddingY - 8
      const cardW = width - (paddingX - 8) * 2
      const cardH = height - (paddingY - 8) * 2

      // Card with rounded border
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 16)
      ctx.fillStyle = colors.cardBg
      ctx.fill()
      ctx.lineWidth = 1
      ctx.strokeStyle = colors.border
      ctx.stroke()

      // Header
      let y = paddingY

      ctx.fillStyle = colors.primary
      ctx.font = fontTitle
      ctx.fillText(room.room_name || "Hasil Putaran", paddingX, y + 30)

      ctx.fillStyle = colors.subtitle
      ctx.font = fontInfo
      ctx.fillText(`Room: ${room.room_code} • Status: ${statusText}`, paddingX, y + 30 + 10 + 16)

      // Divider
      ctx.strokeStyle = colors.border
      ctx.beginPath()
      ctx.moveTo(paddingX, headerBottom - 10)
      ctx.lineTo(paddingX + contentWidth, headerBottom - 10)
      ctx.stroke()

      y = headerBottom + 10

      // Rows
      for (let i = 0; i < history.length; i++) {
        const entry = history[i]
        const metrics = entriesMetrics[i]
        const rowTop = y

        // Number badge (#rank descending)
        const rank = history.length - i
        drawPill(ctx, paddingX, rowTop, badgeSize, badgeSize, colors.primary)
        ctx.fillStyle = colors.badgeText
        ctx.font = "bold 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
        const badgeText = `#${rank}`
        const bt = ctx.measureText(badgeText)
        ctx.fillText(badgeText, paddingX + (badgeSize - bt.width) / 2, rowTop + badgeSize / 2 + 5)

        // Text blocks
        let textY = rowTop + 4
        ctx.fillStyle = colors.title
        ctx.font = fontName
        metrics.nameLines.forEach((line) => {
          ctx.fillText(line, textXStart, textY + lineHeightName - 6)
          textY += lineHeightName
        })

        textY += 2
        ctx.fillStyle = colors.primary
        ctx.font = fontMaterial
        metrics.materialLines.forEach((line) => {
          ctx.fillText(line, textXStart, textY + lineHeightMaterial - 6)
          textY += lineHeightMaterial
        })

        // Timestamp right-aligned
        ctx.fillStyle = colors.subtitle
        ctx.font = fontTime
        const timeText = formatDate(entry.spun_at)
        const timeW = ctx.measureText(timeText).width
        ctx.fillText(timeText, paddingX + contentWidth - timeW, rowTop + 18)

        // Divider under each row
        const rowHeight = metrics.rowHeight
        ctx.strokeStyle = colors.border
        ctx.beginPath()
        ctx.moveTo(paddingX, rowTop + rowHeight + dividerGap / 2)
        ctx.lineTo(paddingX + contentWidth, rowTop + rowHeight + dividerGap / 2)
        ctx.stroke()

        y += rowHeight + dividerGap + rowGap
      }

      // Footer
      ctx.fillStyle = colors.subtitle
      ctx.font = fontFooter
      ctx.fillText(footerText, paddingX, height - paddingY)

      // Download
      const pngUrl = canvas.toDataURL("image/png")
      const a = document.createElement("a")
      const now = new Date()
      const dateStr = new Intl.DateTimeFormat("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
        .format(now)
        .replace(/[^\d]/g, "")
      a.href = pngUrl
      a.download = `hasil-spin_${room.room_code}_${dateStr}.png`
      a.click()

      setNotification({
        type: "success",
        message: "Gambar hasil spin berhasil diunduh!",
      })
    } catch (err) {
      setNotification({
        type: "error",
        message: "Gagal membuat gambar. Coba lagi.",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      {notification && (
        <NotificationCard
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/room/${room.room_code}`}>
            <Button
              variant="ghost"
              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Room
            </Button>
          </Link>

          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <History className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{room.room_name || "Riwayat Putaran"}</h1>
              <p className="text-gray-600">
                Room: <span className="font-semibold text-purple-600">{room.room_code}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Card className="brilliant-card p-6 border border-gray-200 rounded-2xl hover:scale-105 hover:shadow-lg active:scale-98 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Trophy className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Putaran</p>
                <p className="text-2xl font-bold text-gray-900">{history.length}</p>
              </div>
            </div>
          </Card>

          <Card className="brilliant-card p-6 border border-gray-200 rounded-2xl hover:scale-105 hover:shadow-lg active:scale-98 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Award className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Nama Tersisa</p>
                <p className="text-2xl font-bold text-gray-900">{room.names.length}</p>
              </div>
            </div>
          </Card>

          <Card className="brilliant-card p-6 border border-gray-200 rounded-2xl hover:scale-105 hover:shadow-lg active:scale-98 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <History className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-lg font-bold text-gray-900">{room.names.length === 0 ? "Selesai" : "Berlangsung"}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Share Link */}
        <Card className="brilliant-card p-6 border border-gray-200 rounded-2xl mb-8 hover:shadow-lg transition-all duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 w-full">
              <p className="text-sm font-semibold text-gray-700 mb-2">Link Room</p>
              <input
                type="text"
                value={roomUrl}
                readOnly
                className="w-full px-4 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 text-gray-700"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full sm:w-auto">
              <Button
                onClick={() => copyToClipboard(roomUrl)}
                className="bg-purple-600 hover:bg-purple-700 rounded-xl h-10 hover:scale-110 active:scale-95 transition-transform w-full sm:w-auto text-sm"
                aria-label="Salin tautan room"
              >
                <Copy className="w-4 h-4 mr-2" />
                Salin
              </Button>
              <Button
                onClick={downloadResultsImage}
                disabled={isGenerating || history.length === 0}
                className="bg-gray-900 hover:bg-gray-800 rounded-xl h-10 hover:scale-110 active:scale-95 transition-transform w-full sm:w-auto text-sm"
                aria-busy={isGenerating}
                aria-label="Unduh gambar hasil"
                title={history.length === 0 ? "Belum ada riwayat untuk diunduh" : "Unduh gambar hasil"}
              >
                <Download className="w-4 h-4 mr-2" />
                {isGenerating ? "Membuat..." : "Download Gambar"}
              </Button>
            </div>
          </div>
        </Card>

        {/* History List */}
        <Card className="brilliant-card p-6 border border-gray-200 rounded-2xl hover:shadow-lg transition-all duration-300">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-purple-600" />
            Daftar Hasil Putaran
          </h2>

          {history.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg font-medium">Belum ada riwayat putaran</p>
              <p className="text-gray-400 text-sm mt-2">Mulai putar roda untuk melihat riwayat</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 bg-gray-50 rounded-xl hover:bg-purple-50 hover:scale-[1.02] hover:shadow-md active:scale-98 transition-all duration-300 border border-gray-100 cursor-pointer"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-sm">#{history.length - index}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-gray-900 break-words">{entry.selected_name}</p>
                    <p className="text-sm text-purple-600 font-medium mt-0.5 break-words">
                      → {entry.assigned_material}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-left sm:text-right w-full sm:w-auto">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(entry.spun_at)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        {/* Transparency Note */}
        <Card className="brilliant-card p-6 border border-blue-200 rounded-2xl mt-6 bg-blue-50 hover:shadow-lg transition-all duration-300">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <History className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-blue-900 mb-1">Tentang Transparansi</h3>
              <p className="text-sm text-blue-800 leading-relaxed">
                Semua hasil putaran disimpan secara permanen dan dapat diakses oleh siapa saja yang memiliki link ini.
                Sistem ini memastikan proses pemilihan yang adil dan dapat diverifikasi oleh semua pihak.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
