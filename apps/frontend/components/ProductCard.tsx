import React from 'react';
import Image from 'next/image';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { resolveProductImageUrl } from '../lib/images';

export type Product = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  imageUrl: string; // can be full URL or public_id
  shortDescription: string;
};

export function ProductCard({ product }: { product: Product }) {
  const price = (product.priceCents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  const imgSrc = resolveProductImageUrl(product.imageUrl, 800);
  return (
    <Card className="overflow-hidden" aria-label={product.name}>
      <div className="relative h-48 w-full">
        <Image
          src={imgSrc}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
          priority={false}
        />
      </div>
      <CardContent>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-gray-900">{product.name}</h3>
            <p className="text-sm text-gray-600">{product.shortDescription}</p>
          </div>
          <Badge aria-label={`Price ${price}`}>{price}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProductCardSkeleton() {
  return (
    <Card aria-hidden="true">
      <div className="h-48 w-full bg-gray-200 animate-pulse" />
      <CardContent>
        <div className="h-4 w-2/3 bg-gray-200 animate-pulse mb-2" />
        <div className="h-3 w-full bg-gray-200 animate-pulse" />
      </CardContent>
    </Card>
  );
}
