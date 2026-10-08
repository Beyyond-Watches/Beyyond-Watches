import { createServerFn } from "@tanstack/react-start";
import type { Address, CartInput, Category, OrderStatus } from "./types";

async function store() {
  return import("./store.server");
}

export const listProducts = createServerFn({ method: "GET" }).handler(async () => {
  const db = await store();
  return db.listProducts(false);
});

export const getProduct = createServerFn({ method: "GET" })
  .validator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const db = await store();
    return db.productBySlug(data.slug);
  });

export const listOffers = createServerFn({ method: "GET" }).handler(async () => {
  const db = await store();
  return db.listOffers();
});

export const requestOtp = createServerFn({ method: "POST" })
  .validator((data: { phone: string }) => data)
  .handler(async ({ data }) => {
    const db = await store();
    return db.requestOtp(data.phone);
  });

export const verifyOtp = createServerFn({ method: "POST" })
  .validator((data: { phone: string; code: string }) => data)
  .handler(async ({ data }) => {
    const db = await store();
    return db.verifyOtp(data.phone, data.code);
  });

export const saveName = createServerFn({ method: "POST" })
  .validator((data: { token: string; name: string }) => data)
  .handler(async ({ data }) => {
    const db = await store();
    return db.saveName(data.token, data.name);
  });

export const currentCustomer = createServerFn({ method: "POST" })
  .validator((data: { token: string | null }) => data)
  .handler(async ({ data }) => {
    const db = await store();
    return db.currentCustomer(data.token);
  });

export const logoutCustomer = createServerFn({ method: "POST" })
  .validator((data: { token: string | null }) => data)
  .handler(async ({ data }) => {
    const db = await store();
    await db.logout(data.token);
    return { ok: true as const };
  });

export const quoteCart = createServerFn({ method: "POST" })
  .validator((data: { items: CartInput[]; couponCode: string | null }) => data)
  .handler(async ({ data }) => {
    const db = await store();
    return db.quoteCart(data.items ?? [], data.couponCode);
  });

export const upiQr = createServerFn({ method: "POST" })
  .validator((data: { amountPaise: number; note: string }) => data)
  .handler(async ({ data }) => {
    const db = await store();
    return db.upiSvg(data.amountPaise, data.note);
  });

export const placeOrder = createServerFn({ method: "POST" })
  .validator(
    (data: {
      token: string | null;
      items: CartInput[];
      couponCode: string | null;
      address: Address;
      upiRef: string;
      payRef: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const db = await store();
    return db.placeOrder(data);
  });

export const myOrders = createServerFn({ method: "POST" })
  .validator((data: { token: string | null }) => data)
  .handler(async ({ data }) => {
    const db = await store();
    return db.ordersFor(data.token);
  });

export const getMyOrder = createServerFn({ method: "POST" })
  .validator((data: { token: string | null; id: string }) => data)
  .handler(async ({ data }) => {
    const db = await store();
    return db.orderFor(data.token, data.id);
  });

export const adminLogin = createServerFn({ method: "POST" })
  .validator((data: { id: string; password: string }) => data)
  .handler(async ({ data }) => {
    const db = await store();
    return db.loginAdmin(data.id, data.password);
  });

export const adminSession = createServerFn({ method: "POST" })
  .validator((data: { token: string | null }) => data)
  .handler(async ({ data }) => {
    const db = await store();
    const ok = await db.adminSessionOk(data.token);
    return { ok };
  });

export const adminLogout = createServerFn({ method: "POST" })
  .validator((data: { token: string | null }) => data)
  .handler(async ({ data }) => {
    const db = await store();
    await db.logout(data.token);
    return { ok: true as const };
  });

export const adminOverview = createServerFn({ method: "POST" })
  .validator((data: { token: string | null }) => data)
  .handler(async ({ data }) => {
    const db = await store();
    return db.overview(data.token);
  });

export const adminProducts = createServerFn({ method: "POST" })
  .validator((data: { token: string | null }) => data)
  .handler(async ({ data }) => {
    const db = await store();
    if (!(await db.adminSessionOk(data.token))) return null;
    return db.listProducts(true);
  });

export const adminSaveProduct = createServerFn({ method: "POST" })
  .validator(
    (data: {
      token: string | null;
      id?: string;
      name: string;
      tagline: string;
      description: string;
      priceRupees: number;
      category: Category;
      movement: string;
      caseMm: number;
      stock: number;
      image: string;
      featured: boolean;
      active: boolean;
    }) => data,
  )
  .handler(async ({ data }) => {
    const db = await store();
    const { token, ...product } = data;
    return db.saveProduct(token, product);
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .validator((data: { token: string | null; id: string }) => data)
  .handler(async ({ data }) => {
    const db = await store();
    return db.deleteProduct(data.token, data.id);
  });

export const adminCoupons = createServerFn({ method: "POST" })
  .validator((data: { token: string | null }) => data)
  .handler(async ({ data }) => {
    const db = await store();
    return db.listCoupons(data.token);
  });

export const adminSaveCoupon = createServerFn({ method: "POST" })
  .validator(
    (data: {
      token: string | null;
      code: string;
      kind: "percent" | "flat";
      amount: number;
      minRupees: number;
      category: Category | "" | null;
      active: boolean;
      note: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const db = await store();
    const { token, ...coupon } = data;
    return db.saveCoupon(token, coupon);
  });

export const adminDeleteCoupon = createServerFn({ method: "POST" })
  .validator((data: { token: string | null; code: string }) => data)
  .handler(async ({ data }) => {
    const db = await store();
    return db.deleteCoupon(data.token, data.code);
  });

export const adminOrders = createServerFn({ method: "POST" })
  .validator((data: { token: string | null }) => data)
  .handler(async ({ data }) => {
    const db = await store();
    return db.adminOrderList(data.token);
  });

export const adminSetStatus = createServerFn({ method: "POST" })
  .validator((data: { token: string | null; id: string; status: OrderStatus }) => data)
  .handler(async ({ data }) => {
    const db = await store();
    return db.setOrderStatus(data.token, data.id, data.status);
  });
