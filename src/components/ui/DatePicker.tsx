"use client";

import React, { useState, useRef, useEffect } from "react";
import { format, parse, isValid } from "date-fns";
import { DayPicker } from "react-day-picker";
import { Calendar as CalendarIcon } from "lucide-react";

interface DatePickerProps {
  value: string; // ISO 'YYYY-MM-DD'
  onChange: (dateStr: string) => void; // Emits 'YYYY-MM-DD'
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = "DD-MM-YYYY",
  className = "",
  disabled = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse ISO 'YYYY-MM-DD' to Date object
  const selectedDate = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
  const isDateValid = selectedDate && isValid(selectedDate);

  // Format for user display: 'dd-MM-yyyy'
  const displayValue = isDateValid ? format(selectedDate, "dd-MM-yyyy") : "";

  // Close popover when clicked outside or on Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen]);

  const handleDaySelect = (day?: Date) => {
    if (day && isValid(day)) {
      const iso = format(day, "yyyy-MM-dd");
      onChange(iso);
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
          {label}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-label={label || placeholder}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#1a251f] text-stone-800 dark:text-stone-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8b1a2b] shadow-xs disabled:opacity-50 cursor-pointer text-left transition-colors"
      >
        <span className={displayValue ? "font-mono" : "text-stone-400 font-normal"}>
          {displayValue || placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-stone-500 shrink-0 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 sm:left-auto sm:right-0 max-w-[calc(100vw-2rem)] z-50 p-3 bg-white dark:bg-[#1a251f] border border-stone-200 dark:border-stone-700 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <DayPicker
            mode="single"
            selected={isDateValid ? selectedDate : undefined}
            onSelect={handleDaySelect}
            className="text-xs"
            classNames={{
              root: "p-1",
              months: "space-y-2",
              month_caption: "flex justify-center items-center py-1 font-bold text-sm text-stone-900 dark:text-stone-100 font-serif",
              nav: "flex items-center justify-between absolute top-4 left-3 right-3",
              button_previous: "p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 cursor-pointer",
              button_next: "p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 cursor-pointer",
              weekday: "text-stone-400 text-xs font-medium py-1 text-center w-8",
              day: "w-8 h-8 p-0 text-center text-xs font-mono font-medium rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer",
              selected: "bg-[#8b1a2b] text-white hover:bg-[#701522] font-bold",
              today: "border border-[#8b1a2b] font-bold text-[#8b1a2b] dark:text-[#f2a5b1]",
            }}
          />
        </div>
      )}
    </div>
  );
}
