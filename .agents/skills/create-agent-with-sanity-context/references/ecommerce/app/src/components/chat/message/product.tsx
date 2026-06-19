"use client";

import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";

import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";

const QUERY = `
  *[_type == "product" && _id == $id][0] {
    title,
    "slug": slug.current,
    "image": variants[0].images[0],
  }
`;

interface ProductData {
  image: { asset: { _ref: string } } | null;
  slug: string;
  title: string;
}

interface ProductProps {
  id: string;
  isInline?: boolean;
}

export function Product(props: ProductProps) {
  const { id, isInline } = props;

  const { data: product, isLoading } = useSWR(`product-${id}`, () =>
    client.fetch<ProductData | null>(QUERY, { id })
  );

  if (isLoading) {
    if (isInline) {
      return null;
    }

    return (
      <div className="flex animate-pulse items-center gap-3 rounded-md border border-neutral-200 bg-white p-2">
        <div className="h-10 w-10 shrink-0 rounded bg-neutral-100" />

        <div className="h-5 w-24 rounded bg-neutral-100" />
      </div>
    );
  }

  if (!product) {
    return null;
  }

  if (isInline) {
    return (
      <Link
        className="text-blue-600 underline hover:text-blue-700"
        href={`/products/${product.slug}`}
      >
        {product.title}
      </Link>
    );
  }

  return (
    <Link
      className="flex items-center gap-3 rounded-md border border-neutral-200 bg-white p-2 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
      href={`/products/${product.slug}`}
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-neutral-100">
        {product.image && (
          <Image
            alt={product.title}
            className="object-cover"
            fill
            src={urlFor(product.image).width(80).height(80).url()}
          />
        )}
      </div>

      <span className="font-medium text-neutral-900 text-sm">
        {product.title}
      </span>
    </Link>
  );
}
