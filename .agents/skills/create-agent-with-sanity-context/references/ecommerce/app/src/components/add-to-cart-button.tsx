"use client";

import { ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";

interface AddToCartButtonProps {
  disabled?: boolean;
}

export function AddToCartButton({ disabled }: AddToCartButtonProps) {
  return (
    <Button className="w-full" disabled={disabled} size="lg">
      <ShoppingBag className="h-4 w-4" />
      Add to Cart
    </Button>
  );
}
