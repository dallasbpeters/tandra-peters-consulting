"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { cn, formatPrice } from "@/lib/utils";
import { urlFor } from "@/sanity/lib/image";

import type { PRODUCT_QUERY_RESULT } from "../../sanity.types";

import { AddToCartButton } from "./add-to-cart-button";
import { Badge } from "./ui/badge";

// Derive types from the generated query result
type Product = NonNullable<PRODUCT_QUERY_RESULT>;
type ProductVariant = NonNullable<Product["variants"]>[number];
type Color = NonNullable<ProductVariant["color"]>;
type Size = NonNullable<NonNullable<ProductVariant["sizes"]>[number]>;

interface ProductDetailsProps {
  brand: Product["brand"];
  category: Product["category"];
  colors: Color[];
  features: Product["features"];
  materials: Product["materials"];
  price: Product["price"];
  shortDescription: Product["shortDescription"];
  sizes: Size[];
  title: Product["title"];
  variants: Product["variants"];
}

export function ProductDetails({
  title,
  brand,
  category,
  shortDescription,
  price,
  features,
  materials,
  colors,
  sizes,
  variants,
}: ProductDetailsProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const hasDiscount =
    price?.compareAtPrice && price.compareAtPrice > (price.amount ?? 0);

  // Determine if selection is required and complete
  const needsColor = colors.length > 0;
  const needsSize = sizes.length > 0;
  const selectionComplete =
    (!needsColor || selectedColor !== null) &&
    (!needsSize || selectedSize !== null);

  // Get selected variant details for display/chatbot context
  const selectedColorName = colors.find((c) => c._id === selectedColor)?.title;
  const selectedSizeCode = sizes.find((s) => s._id === selectedSize)?.code;

  // Find the image for the selected color, or use first variant's image as default
  const selectedVariant = selectedColor
    ? variants?.find((v) => v.color?._id === selectedColor)
    : variants?.[0];
  const currentImage = selectedVariant?.images?.[0];

  // Get available sizes for the selected color
  const availableSizeIds = useMemo(() => {
    if (!selectedColor) {
      // If no color selected, all sizes are potentially available
      return new Set(sizes.map((s) => s._id));
    }
    // Find the variant for the selected color and get its available sizes
    const variant = variants?.find((v) => v.color?._id === selectedColor);
    if (!variant?.sizes) {
      return new Set<string>();
    }
    return new Set(variant.sizes.map((s) => s._id));
  }, [selectedColor, variants, sizes]);

  // Reset size selection if the selected size is not available for the new color
  const handleColorChange = (colorId: string) => {
    setSelectedColor(colorId);
    // Check if currently selected size is available for the NEW color
    const newVariant = variants?.find((v) => v.color?._id === colorId);
    const newAvailableSizeIds = new Set(
      newVariant?.sizes?.map((s) => s._id) ?? []
    );
    if (selectedSize && !newAvailableSizeIds.has(selectedSize)) {
      setSelectedSize(null);
    }
  };

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-12">
      {/* Image */}
      <div className="relative aspect-3/4 overflow-hidden rounded-lg bg-neutral-100">
        {currentImage?.asset?.url ? (
          <Image
            alt={currentImage.alt || title || "Product image"}
            blurDataURL={currentImage.asset.metadata?.lqip || undefined}
            className="object-cover"
            fill
            placeholder={currentImage.asset.metadata?.lqip ? "blur" : "empty"}
            priority
            src={urlFor(currentImage).width(800).height(1067).url()}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-400">
            No image
          </div>
        )}

        {hasDiscount && (
          <Badge className="absolute top-3 left-3" variant="destructive">
            Sale
          </Badge>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-col">
        {(brand?.title || category?.title) && (
          <p className="text-neutral-500 text-sm">
            {brand?.title}

            {brand?.title && category?.title && " · "}

            {category?.title}
          </p>
        )}

        <h1 className="mt-1 font-semibold text-2xl md:text-3xl">{title}</h1>

        {/* Price */}
        <div className="mt-4 flex items-center gap-3">
          <span className="font-medium text-xl">
            {formatPrice(price?.amount)}
          </span>

          {hasDiscount && (
            <span className="text-lg text-neutral-500 line-through">
              {formatPrice(price?.compareAtPrice)}
            </span>
          )}
        </div>

        {shortDescription && (
          <p className="mt-4 text-neutral-600">{shortDescription}</p>
        )}

        {/* Colors */}
        {needsColor && (
          <div className="mt-6">
            <p className="font-medium text-sm">
              Color
              {selectedColorName && (
                <span className="font-normal text-neutral-500">
                  {" "}
                  — {selectedColorName}
                </span>
              )}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {colors.map((color) => (
                <button
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    selectedColor === color._id
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 hover:border-neutral-400"
                  )}
                  key={color._id}
                  onClick={() => handleColorChange(color._id)}
                  type="button"
                >
                  {color.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sizes */}
        {needsSize && (
          <div className="mt-6">
            <p className="font-medium text-sm">
              Size
              {selectedSizeCode && (
                <span className="font-normal text-neutral-500">
                  {" "}
                  — {selectedSizeCode}
                </span>
              )}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {sizes.map((size) => {
                const isAvailable = availableSizeIds.has(size._id);
                const isSelected = selectedSize === size._id;

                return (
                  <button
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-md border text-sm transition-colors",
                      isSelected
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : isAvailable
                          ? "border-neutral-200 hover:border-neutral-400"
                          : "cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-300 line-through"
                    )}
                    disabled={!isAvailable}
                    key={size._id}
                    onClick={() => isAvailable && setSelectedSize(size._id)}
                    title={
                      isAvailable
                        ? `Select size ${size.code}`
                        : `Size ${size.code} unavailable`
                    }
                    type="button"
                  >
                    {size.code}
                  </button>
                );
              })}
            </div>

            {selectedColor &&
              !availableSizeIds.has(selectedSize ?? "") &&
              sizes.some((s) => !availableSizeIds.has(s._id)) && (
                <p className="mt-2 text-neutral-500 text-xs">
                  Some sizes are unavailable for this color
                </p>
              )}
          </div>
        )}

        {/* Add to Cart */}
        <div className="mt-8">
          {!selectionComplete && (needsColor || needsSize) && (
            <p className="mb-2 text-neutral-500 text-sm">
              {[
                "Please select ",
                needsColor && !selectedColor ? "a color" : "",
                needsColor && !selectedColor && needsSize && !selectedSize
                  ? " and "
                  : "",
                needsSize && !selectedSize ? "a size" : "",
              ].join("")}
            </p>
          )}

          <AddToCartButton disabled={!selectionComplete} />
        </div>

        {/* Features */}
        {features && features.length > 0 && (
          <div className="mt-8 border-neutral-200 border-t pt-6">
            <p className="font-medium text-sm">Features</p>

            <ul className="mt-2 space-y-1 text-neutral-600 text-sm">
              {features.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Materials */}
        {materials && materials.length > 0 && (
          <div className="mt-6">
            <p className="font-medium text-sm">Materials</p>

            <p className="mt-1 text-neutral-600 text-sm">
              {materials.map((m) => m.title).join(", ")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
