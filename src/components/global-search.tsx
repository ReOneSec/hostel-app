"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  React.useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/users?search=${encodeURIComponent(query)}`);
        if (res.ok) {
          const { data } = await res.json();
          setResults(data);
        }
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (userId: string) => {
    setOpen(false);
    router.push(`/admin/users/${userId}`);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Type a student name or email..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading && (
          <div className="p-4 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Searching...
          </div>
        )}
        {!isLoading && query.length >= 2 && results.length === 0 && (
          <CommandEmpty>No students found.</CommandEmpty>
        )}
        {!isLoading && results.length > 0 && (
          <CommandGroup heading="Students">
            {results.map((user) => (
              <CommandItem
                key={user.id}
                value={`${user.studentProfile?.fullName || user.username} ${user.email}`}
                onSelect={() => handleSelect(user.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div>
                  <p className="font-medium">{user.studentProfile?.fullName || user.username}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                {user.hostelAssignments?.[0]?.hostel && (
                  <div className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground">
                    {user.hostelAssignments[0].hostel.name}
                  </div>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
