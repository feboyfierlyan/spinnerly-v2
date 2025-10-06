"use client"

import { useState, type KeyboardEvent } from "react"
import { X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ChipInputProps {
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
  label: string
}

export default function ChipInput({ items, onChange, placeholder, label }: ChipInputProps) {
  const [inputValue, setInputValue] = useState("")

  const handleAdd = () => {
    const trimmed = inputValue.trim()
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed])
      setInputValue("")
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAdd()
    }
  }

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>

      {/* Input area */}
      <div className="flex gap-2 mb-3">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="rounded-xl border-gray-300 focus:border-purple-500 focus:ring-purple-500"
        />
        <Button
          type="button"
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className="h-10 w-10 p-0 rounded-xl bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Chips display */}
      <div className="flex flex-wrap gap-2 min-h-[60px] p-3 border border-gray-200 rounded-xl bg-gray-50">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Belum ada item. Klik + untuk menambahkan.</p>
        ) : (
          items.map((item, index) => (
            <div
              key={index}
              className="chip-item flex items-center gap-2 px-3 py-1.5 bg-white border border-purple-200 rounded-full text-sm font-medium text-gray-700 hover:border-purple-300 hover:shadow-sm transition-all"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="hover:bg-purple-100 rounded-full p-0.5 transition-colors hover:scale-110 active:scale-95"
              >
                <X className="w-3.5 h-3.5 text-purple-600" />
              </button>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-gray-500 mt-2">Total: {items.length} item</p>
    </div>
  )
}
