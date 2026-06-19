import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { urlFor } from "@/sanity/lib/image";

import type { PRODUCTS_QUERY_RESULT } from "../../sanity.types";

type Product = PRODUCTS_QUERY_RESULT[number];

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { title, slug, image, price, category, brand } = product;
  const hasDiscount =
    price?.compareAtPrice && price.compareAtPrice > (price.amount ?? 0);

  return (
    <a className="group block" href={`/products/${slug}`}>
      <div className="relative aspect-3/4 overflow-hidden rounded-lg bg-neutral-100">
        {image?.asset?.url ? (
          <img
            alt={image.alt || title || "Product image"}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            src={urlFor(image).width(600).height(800).url()}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-400">
            No image
          </div>
        )}

        {hasDiscount && (
          <Badge className="absolute top-2 left-2" variant="destructive">
            Sale
          </Badge>
        )}
      </div>

      <div className="mt-3 space-y-1">
        {(brand?.title || category?.title) && (
          <p className="text-neutral-500 text-xs">
            {brand?.title}

            {brand?.title && category?.title && " · "}

            {category?.title}
          </p>
        )}

        <h3 className="font-medium text-neutral-900 text-sm group-hover:underline">
          {title}
        </h3>

        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {formatPrice(price?.amount)}
          </span>

          {hasDiscount && (
            <span className="text-neutral-500 text-sm line-through">
              {formatPrice(price?.compareAtPrice)}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
