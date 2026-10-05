"use client";

import { Check, Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiErrorMessage } from "@/lib/api-client";

import { useCategories, useCreateCategory } from "./use-products";

const NONE = "__none";

/** Category of a product, with "Nouvelle catégorie" inline. */
export function CategorySelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const categories = useCategories();
  const create = useCreateCategory();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const add = async () => {
    if (!name.trim()) return;
    try {
      const category = await create.mutateAsync(name.trim());
      onChange(category.id);
      setAdding(false);
      setName("");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  if (adding) {
    return (
      <div className="flex gap-2">
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom de la catégorie"
          maxLength={100}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void add();
            }
          }}
        />
        <Button
          type="button"
          size="icon"
          onClick={add}
          disabled={create.isPending}
          aria-label="Créer la catégorie"
        >
          {create.isPending ? <Loader2 className="animate-spin" /> : <Check />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => setAdding(false)}
          aria-label="Annuler"
        >
          <X />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Select
        value={value ?? NONE}
        onValueChange={(v) => onChange(v === NONE ? null : v)}
      >
        <SelectTrigger aria-label="Catégorie">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Sans catégorie</SelectItem>
          {categories.data?.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" variant="outline" onClick={() => setAdding(true)}>
        <Plus /> Nouvelle
      </Button>
    </div>
  );
}
