"use client"

import { useEffect } from "react"
import { Card } from "@/components/ui/card"
import { CheckCircle2, AlertCircle, X } from "lucide-react"

interface NotificationCardProps {
  type: "success" | "error"
  message: string
  onClose: () => void
}

export default function NotificationCard({ type, message, onClose }: NotificationCardProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)

    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
      <Card
        className="brilliant-card p-6 border-2 rounded-2xl max-w-md w-full animate-scale-in"
        style={{
          borderColor: type === "success" ? "#10B981" : "#EF4444",
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: type === "success" ? "#D1FAE5" : "#FEE2E2",
            }}
          >
            {type === "success" ? (
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600" />
            )}
          </div>
          <div className="flex-1">
            <h3
              className="text-lg font-bold mb-1"
              style={{
                color: type === "success" ? "#059669" : "#DC2626",
              }}
            >
              {type === "success" ? "Berhasil!" : "Perhatian!"}
            </h3>
            <p className="text-gray-700">{message}</p>
          </div>
          <button onClick={onClose} className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </Card>
    </div>
  )
}
