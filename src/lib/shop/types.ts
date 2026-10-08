export type Category = "everyday" | "luxury";

export type Product = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  pricePaise: number;
  category: Category;
  movement: string;
  caseMm: number;
  stock: number;
  image: string;
  featured: boolean;
  active: boolean;
};

export type Customer = {
  id: string;
  phone: string;
  name: string | null;
};

export type Address = {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
};

export type OrderItem = {
  productId: string;
  name: string;
  image: string;
  qty: number;
  pricePaise: number;
  category: Category;
};

export type OrderStatus = "placed" | "packed" | "shipped" | "delivered" | "declined";

export type Order = {
  id: string;
  customerId: string;
  status: OrderStatus;
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  totalPaise: number;
  couponCode: string | null;
  upiRef: string;
  address: Address;
  items: OrderItem[];
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
};

export type CartInput = { productId: string; qty: number };

export type QuoteLine = OrderItem & { linePaise: number };

export type Quote = {
  ok: true;
  lines: QuoteLine[];
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  totalPaise: number;
  couponCode: string | null;
  couponError: string | null;
};

export type Offer = {
  code: string;
  label: string;
  note: string;
};

export type Coupon = {
  code: string;
  kind: "percent" | "flat";
  amount: number;
  minPaise: number;
  category: Category | null;
  active: boolean;
  note: string;
};

export type Analytics = {
  revenuePaise: number;
  orders: number;
  declined: number;
  aovPaise: number;
  luxuryPaise: number;
  everydayPaise: number;
  days: { day: string; revenuePaise: number; orders: number }[];
  top: { name: string; qty: number; revenuePaise: number }[];
};

export const WATCH_IMAGES = [
  "/watches/aurum.jpg",
  "/watches/nocturne.jpg",
  "/watches/meridian.jpg",
  "/watches/obsidian.jpg",
  "/watches/pearl.jpg",
  "/watches/city.jpg",
  "/watches/field.jpg",
  "/watches/coastal.jpg",
  "/watches/pilot.jpg",
  "/watches/metro.jpg",
] as const;

export type ShopSearch = {
  cat: "all" | Category;
  q: string;
  sort: "featured" | "price-asc" | "price-desc";
};

export function shopSearch(partial: Partial<ShopSearch> = {}): ShopSearch {
  return {
    cat: partial.cat ?? "all",
    q: partial.q ?? "",
    sort: partial.sort ?? "featured",
  };
}
