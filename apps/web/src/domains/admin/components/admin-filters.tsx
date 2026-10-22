"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { useDebounce } from "@/shared/hooks/use-debounce";

export const ALL = "all";

/** Debounced search box used by the admin lists. */
export function AdminSearch({ label, onSearch }: { label: string; onSearch: (q: string) => void }) {
  const [value, setValue] = useState("");
  const debounced = useDebounce(value.trim(), 350);
  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  });
  useEffect(() => onSearchRef.current(debounced), [debounced]);
  return <Input aria-label={label} placeholder={label} icon={<Search />} value={value} onChange={(e) => setValue(e.target.value)} className="sm:w-72" />;
}

export function AdminFilter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="sm:w-56">
      <Select aria-label={label} value={value} onValueChange={onChange} options={[{ value: ALL, label: `All ${label.toLowerCase()}` }, ...options]} />
    </div>
  );
}
