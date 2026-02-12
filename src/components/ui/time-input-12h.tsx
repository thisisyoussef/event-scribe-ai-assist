import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TimeInput12hProps = {
  value?: string; // expects "HH:MM" in 24h format
  onChange: (value: string) => void; // emits "HH:MM" 24h
  disabled?: boolean;
  className?: string;
  id?: string;
};

function parse24h(value?: string): { hour12: string; minute: string; ampm: "AM" | "PM" } {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return { hour12: "", minute: "", ampm: "AM" };
  }
  const [hStr, mStr] = value.split(":");
  const h = Math.max(0, Math.min(23, Number(hStr)));
  const minute = mStr.padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12Num = h % 12 === 0 ? 12 : h % 12;
  return { hour12: String(hour12Num).padStart(2, "0"), minute, ampm };
}

function to24h(hour12: string, minute: string, ampm: "AM" | "PM"): string {
  if (!hour12 || !minute) return "";
  const h12 = Math.max(1, Math.min(12, Number(hour12)));
  const base = h12 % 12;
  const h24 = ampm === "PM" ? base + 12 : base;
  return `${String(h24).padStart(2, "0")}:${String(Number(minute)).padStart(2, "0")}`;
}

export function TimeInput12h({ value, onChange, disabled, className, id }: TimeInput12hProps) {
  const { hour12, minute, ampm } = useMemo(() => parse24h(value), [value]);

  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")), []);

  const handleHourChange = (h: string) => onChange(to24h(h, minute || "00", ampm));
  const handleMinuteChange = (m: string) => onChange(to24h(hour12 || "12", m, ampm));
  const handleAmPmChange = (ap: "AM" | "PM") => onChange(to24h(hour12 || "12", minute || "00", ap));

  return (
    <div className={cn("flex items-center gap-2 md:gap-1.5", className)} id={id}>
      <Select value={hour12} onValueChange={handleHourChange} disabled={disabled}>
        <SelectTrigger className="flex-1 md:w-20 h-14 md:h-11 text-base md:text-sm font-medium border md:border border-white/10 md:border-input rounded-2xl md:rounded-lg">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent>
          {hours.map((h) => (
            <SelectItem key={h} value={h} className="text-base md:text-sm h-11 md:h-9">{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-white/30 md:text-white/50 text-xl md:text-base font-bold">:</span>

      <Select value={minute} onValueChange={handleMinuteChange} disabled={disabled}>
        <SelectTrigger className="flex-1 md:w-20 h-14 md:h-11 text-base md:text-sm font-medium border md:border border-white/10 md:border-input rounded-2xl md:rounded-lg">
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent>
          {minutes.map((m) => (
            <SelectItem key={m} value={m} className="text-base md:text-sm h-11 md:h-9">{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={ampm} onValueChange={(v) => handleAmPmChange(v as "AM" | "PM")} disabled={disabled}>
        <SelectTrigger className="w-[72px] md:w-20 h-14 md:h-11 text-base md:text-sm font-semibold border md:border border-white/10 md:border-input rounded-2xl md:rounded-lg">
          <SelectValue placeholder="AM" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM" className="text-base md:text-sm h-11 md:h-9 font-medium">AM</SelectItem>
          <SelectItem value="PM" className="text-base md:text-sm h-11 md:h-9 font-medium">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export default TimeInput12h;


