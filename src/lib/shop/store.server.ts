import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";
import { inr } from "./money";
import { normalizePhone, STATES } from "./phone";
import type {
  Address,
  Analytics,
  CartInput,
  Category,
  Coupon,
  Customer,
  Offer,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  Quote,
} from "./types";

const ADMIN_ID = "beyyond";
const PEPPER = "beyyond-shop-pepper-v1";
const ADMIN_HASH = "68da11c834a5ec100cbe189f3d77afb39e73f98afd55a8c2535767086284a0d0";
const FREE_SHIPPING_OVER = 500_000;
const SHIPPING_FEE = 14_900;

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  price_paise: number | string;
  category: string;
  movement: string;
  case_mm: number | string;
  stock: number | string;
  image: string;
  featured: boolean | string;
  active: boolean | string;
};

type CouponRow = {
  code: string;
  kind: string;
  amount: number | string;
  min_paise: number | string;
  category: string | null;
  active: boolean | string;
  note: string;
};

type OrderRow = {
  id: string;
  customer_id: string;
  status: string;
  subtotal_paise: number | string;
  discount_paise: number | string;
  shipping_paise: number | string;
  total_paise: number | string;
  coupon_code: string | null;
  upi_ref: string;
  address_json: string;
  items_json: string;
  created_at: unknown;
  customer_name?: string | null;
  customer_phone?: string | null;
};

function num(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function flag(value: boolean | string) {
  return value === true || value === "t" || value === "true";
}

function asIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function hashText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEq(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    pricePaise: num(row.price_paise),
    category: row.category === "luxury" ? "luxury" : "everyday",
    movement: row.movement,
    caseMm: num(row.case_mm),
    stock: num(row.stock),
    image: row.image,
    featured: flag(row.featured),
    active: flag(row.active),
  };
}

function mapCoupon(row: CouponRow): Coupon {
  return {
    code: row.code,
    kind: row.kind === "flat" ? "flat" : "percent",
    amount: num(row.amount),
    minPaise: num(row.min_paise),
    category: row.category === "luxury" || row.category === "everyday" ? row.category : null,
    active: flag(row.active),
    note: row.note,
  };
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    customerId: row.customer_id,
    status: row.status as OrderStatus,
    subtotalPaise: num(row.subtotal_paise),
    discountPaise: num(row.discount_paise),
    shippingPaise: num(row.shipping_paise),
    totalPaise: num(row.total_paise),
    couponCode: row.coupon_code,
    upiRef: row.upi_ref ?? "",
    address: parseJson<Address>(row.address_json, {
      name: "",
      phone: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      pincode: "",
    }),
    items: parseJson<OrderItem[]>(row.items_json, []),
    createdAt: asIso(row.created_at),
    customerName: row.customer_name ?? undefined,
    customerPhone: row.customer_phone ?? undefined,
  };
}

function offerLabel(coupon: Coupon) {
  if (coupon.kind === "percent") {
    const where = coupon.category ? ` ${coupon.category}` : "";
    return `${coupon.amount}% off${where}`;
  }
  return `${inr(coupon.amount)} off`;
}

async function customerByToken(token: string | null | undefined): Promise<Customer | null> {
  if (!token) return null;
  const sql = await getSql();
  const rows = await sql<{ id: string; phone: string; name: string | null }>`
    select c.id, c.phone, c.name
    from sessions s
    join customers c on c.id = s.customer_id
    where s.token_hash = ${hashText(token)}
      and s.kind = 'customer'
      and s.expires_at > now()
  `;
  return rows[0] ?? null;
}

async function adminOk(token: string | null | undefined) {
  if (!token) return false;
  const sql = await getSql();
  const rows = await sql<{ token_hash: string }>`
    select token_hash from sessions
    where token_hash = ${hashText(token)} and kind = 'admin' and expires_at > now()
  `;
  return rows.length > 0;
}

async function issueSession(kind: "customer" | "admin", customerId: string | null) {
  const token = randomBytes(24).toString("hex");
  const sql = await getSql();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  await sql`
    insert into sessions (token_hash, kind, customer_id, expires_at)
    values (${hashText(token)}, ${kind}, ${customerId}, ${expires})
  `;
  return token;
}

export async function listProducts(all = false) {
  const sql = await getSql();
  const rows = all
    ? await sql<ProductRow>`select * from products order by created_at desc`
    : await sql<ProductRow>`select * from products where active = true order by featured desc, name asc`;
  return rows.map(mapProduct);
}

export async function productBySlug(slug: string) {
  const sql = await getSql();
  const rows = await sql<ProductRow>`select * from products where slug = ${slug} and active = true`;
  return rows[0] ? mapProduct(rows[0]) : null;
}

export async function listOffers(): Promise<Offer[]> {
  const sql = await getSql();
  const rows = await sql<CouponRow>`select * from coupons where active = true order by code asc`;
  return rows.map(mapCoupon).map((coupon) => ({
    code: coupon.code,
    label: offerLabel(coupon),
    note: coupon.note,
  }));
}

export async function requestOtp(phoneInput: string) {
  const phone = normalizePhone(phoneInput);
  if (!phone) return { ok: false as const, error: "Enter a 10-digit Indian mobile number." };
  const sql = await getSql();
  const existing = await sql<{
    sent_at: unknown;
    sends: number | string;
  }>`select sent_at, sends from otp_codes where phone = ${phone}`;
  const row = existing[0];
  const sentAt = row ? new Date(asIso(row.sent_at)).getTime() : 0;
  const age = Date.now() - sentAt;
  if (row && age < 25_000) {
    return { ok: false as const, error: "Wait a few seconds, then ask for a new code." };
  }
  const sends = row ? num(row.sends) : 0;
  if (row && age < 30 * 60_000 && sends >= 8) {
    return { ok: false as const, error: "Too many codes for this number. Try again in a little while." };
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const nextSends = row && age < 30 * 60_000 ? sends + 1 : 1;
  const expires = new Date(Date.now() + 5 * 60_000).toISOString();
  await sql`
    insert into otp_codes (phone, code_hash, expires_at, attempts, sent_at, sends)
    values (${phone}, ${hashText(`otp:${phone}:${code}`)}, ${expires}, 0, now(), ${nextSends})
    on conflict (phone) do update
      set code_hash = excluded.code_hash,
          expires_at = excluded.expires_at,
          attempts = 0,
          sent_at = now(),
          sends = ${nextSends}
  `;
  return { ok: true as const, phone, code };
}

export async function verifyOtp(phoneInput: string, codeInput: string) {
  const phone = normalizePhone(phoneInput);
  const code = codeInput.replace(/\D/g, "");
  if (!phone) return { ok: false as const, error: "Enter a valid mobile number." };
  if (!/^\d{6}$/.test(code)) return { ok: false as const, error: "Enter the 6-digit code." };
  const sql = await getSql();
  const rows = await sql<{ code_hash: string; expires_at: unknown; attempts: number | string }>`
    select code_hash, expires_at, attempts from otp_codes where phone = ${phone}
  `;
  const row = rows[0];
  if (!row || new Date(asIso(row.expires_at)).getTime() < Date.now()) {
    return { ok: false as const, error: "That code expired. Ask for a new one." };
  }
  if (num(row.attempts) >= 5) {
    return { ok: false as const, error: "Too many tries. Ask for a new code." };
  }
  if (!safeEq(row.code_hash, hashText(`otp:${phone}:${code}`))) {
    await sql`update otp_codes set attempts = attempts + 1 where phone = ${phone}`;
    return { ok: false as const, error: "That code does not match." };
  }
  await sql`delete from otp_codes where phone = ${phone}`;
  let customers = await sql<{ id: string; phone: string; name: string | null }>`
    select id, phone, name from customers where phone = ${phone}
  `;
  if (!customers[0]) {
    const id = `cus_${randomBytes(8).toString("hex")}`;
    customers = await sql<{ id: string; phone: string; name: string | null }>`
      insert into customers (id, phone) values (${id}, ${phone})
      returning id, phone, name
    `;
  }
  const customer = customers[0];
  if (!customer) return { ok: false as const, error: "Could not open your account. Try again." };
  const token = await issueSession("customer", customer.id);
  return {
    ok: true as const,
    token,
    needsName: !customer.name,
    customer: { id: customer.id, phone: customer.phone, name: customer.name },
  };
}

export async function saveName(token: string | null, nameInput: string) {
  const customer = await customerByToken(token);
  if (!customer) return { ok: false as const, error: "Sign in again to save your name." };
  const name = nameInput.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 60) {
    return { ok: false as const, error: "Use your name, between 2 and 60 letters." };
  }
  const sql = await getSql();
  await sql`update customers set name = ${name} where id = ${customer.id}`;
  return { ok: true as const, customer: { ...customer, name } };
}

export async function currentCustomer(token: string | null) {
  return customerByToken(token);
}

export async function logout(token: string | null) {
  if (!token) return;
  const sql = await getSql();
  await sql`delete from sessions where token_hash = ${hashText(token)}`;
}

export async function quoteCart(items: CartInput[], couponCode: string | null): Promise<Quote | { ok: false; error: string }> {
  if (!items.length) return { ok: false, error: "Your cart is empty." };
  if (items.length > 12) return { ok: false, error: "Keep a cart to 12 watches, then check out." };
  const sql = await getSql();
  const lines: Quote["lines"] = [];
  for (const item of items) {
    const qty = Math.floor(num(item.qty));
    if (qty < 1) return { ok: false, error: "Check the quantities in your cart." };
    const rows = await sql<ProductRow>`select * from products where id = ${item.productId} and active = true`;
    const product = rows[0] ? mapProduct(rows[0]) : null;
    if (!product) return { ok: false, error: "A watch in your cart is no longer listed." };
    if (qty > product.stock) {
      return { ok: false, error: product.stock < 1 ? `${product.name} is sold out.` : `${product.name} has only ${product.stock} left.` };
    }
    lines.push({
      productId: product.id,
      name: product.name,
      image: product.image,
      qty,
      pricePaise: product.pricePaise,
      category: product.category,
      linePaise: product.pricePaise * qty,
    });
  }
  const subtotalPaise = lines.reduce((sum, line) => sum + line.linePaise, 0);
  let discountPaise = 0;
  let applied: string | null = null;
  let couponError: string | null = null;
  const code = couponCode?.trim().toUpperCase() ?? "";
  if (code) {
    const coupons = await sql<CouponRow>`select * from coupons where code = ${code}`;
    const coupon = coupons[0] ? mapCoupon(coupons[0]) : null;
    if (!coupon || !coupon.active) couponError = "That coupon is not active.";
    else {
      const eligible = coupon.category ? lines.filter((line) => line.category === coupon.category) : lines;
      const base = eligible.reduce((sum, line) => sum + line.linePaise, 0);
      if (!eligible.length) couponError = "That coupon does not cover this cart.";
      else if (base < coupon.minPaise) couponError = `This code starts at ${inr(coupon.minPaise)}.`;
      else {
        discountPaise = coupon.kind === "percent" ? Math.floor((base * coupon.amount) / 100) : Math.min(coupon.amount, base);
        applied = coupon.code;
      }
    }
  }
  const shippingPaise = subtotalPaise >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FEE;
  const totalPaise = Math.max(0, subtotalPaise - discountPaise) + shippingPaise;
  return {
    ok: true,
    lines,
    subtotalPaise,
    discountPaise,
    shippingPaise,
    totalPaise,
    couponCode: applied,
    couponError,
  };
}

function readAddress(input: Address): Address | string {
  const name = input.name.trim().replace(/\s+/g, " ");
  const phone = normalizePhone(input.phone);
  const line1 = input.line1.trim();
  const line2 = input.line2.trim();
  const city = input.city.trim();
  const state = input.state.trim();
  const pincode = input.pincode.trim();
  if (name.length < 2) return "Add the full name for delivery.";
  if (!phone) return "Enter a valid Indian mobile number for delivery.";
  if (line1.length < 5) return "Add the full street address.";
  if (city.length < 2) return "Add a city.";
  if (!STATES.includes(state as (typeof STATES)[number])) return "Choose a state.";
  if (!/^\d{6}$/.test(pincode)) return "Enter a 6-digit PIN code.";
  return { name, phone, line1, line2, city, state, pincode };
}

export async function placeOrder(input: {
  token: string | null;
  items: CartInput[];
  couponCode: string | null;
  address: Address;
  upiRef: string;
  payRef: string;
}) {
  const customer = await customerByToken(input.token);
  if (!customer) return { ok: false as const, error: "Sign in with your mobile number before paying." };
  if (!customer.name) return { ok: false as const, error: "Add your name before placing the order." };
  const address = readAddress(input.address);
  if (typeof address === "string") return { ok: false as const, error: address };
  const quote = await quoteCart(input.items, input.couponCode);
  if (!quote.ok) return quote;
  if (input.couponCode?.trim() && quote.couponError) {
    return { ok: false as const, error: quote.couponError };
  }
  const sql = await getSql();
  const taken: { id: string; qty: number }[] = [];
  for (const line of quote.lines) {
    const updated = await sql<{ id: string }>`
      update products set stock = stock - ${line.qty}
      where id = ${line.productId} and stock >= ${line.qty}
      returning id
    `;
    if (!updated.length) {
      for (const row of taken) {
        await sql`update products set stock = stock + ${row.qty} where id = ${row.id}`;
      }
      return { ok: false as const, error: "One of those watches just sold out. Review your cart." };
    }
    taken.push({ id: line.productId, qty: line.qty });
  }
  let id = /^BW[A-Z0-9]{6}$/.test(input.payRef) ? input.payRef : `BW${randomBytes(3).toString("hex").toUpperCase()}`;
  const clash = await sql<{ id: string }>`select id from orders where id = ${id}`;
  if (clash.length) id = `BW${randomBytes(3).toString("hex").toUpperCase()}`;
  const upiRef = input.upiRef.trim().slice(0, 40);
  const items: OrderItem[] = quote.lines.map((line) => ({
    productId: line.productId,
    name: line.name,
    image: line.image,
    qty: line.qty,
    pricePaise: line.pricePaise,
    category: line.category,
  }));
  await sql`
    insert into orders (
      id, customer_id, status, subtotal_paise, discount_paise, shipping_paise, total_paise,
      coupon_code, upi_ref, address_json, items_json
    ) values (
      ${id}, ${customer.id}, 'placed', ${quote.subtotalPaise}, ${quote.discountPaise},
      ${quote.shippingPaise}, ${quote.totalPaise}, ${quote.couponCode}, ${upiRef},
      ${JSON.stringify(address)}, ${JSON.stringify(items)}
    )
  `;
  return { ok: true as const, orderId: id };
}

export async function ordersFor(token: string | null) {
  const customer = await customerByToken(token);
  if (!customer) return [];
  const sql = await getSql();
  const rows = await sql<OrderRow>`
    select * from orders where customer_id = ${customer.id} order by created_at desc
  `;
  return rows.map(mapOrder);
}

export async function orderFor(token: string | null, id: string) {
  const customer = await customerByToken(token);
  if (!customer) return null;
  const sql = await getSql();
  const rows = await sql<OrderRow>`
    select * from orders where id = ${id} and customer_id = ${customer.id}
  `;
  return rows[0] ? mapOrder(rows[0]) : null;
}

export async function upiSvg(amountPaise: number, note: string) {
  const amount = (amountPaise / 100).toFixed(2);
  const query = new URLSearchParams({
    pa: "7400790654@fam",
    pn: "Beyyond Watches",
    am: amount,
    cu: "INR",
    tn: note.slice(0, 40),
  });
  const mod = await import("qrcode");
  const svg = await mod.toString(`upi://pay?${query.toString()}`, {
    type: "svg",
    margin: 1,
    width: 220,
    color: { dark: "#161513", light: "#fffdf9" },
  });
  if (!svg.includes("<svg") || svg.toLowerCase().includes("<script")) return "";
  return svg;
}

export async function loginAdmin(id: string, password: string) {
  const idMatch = safeEq(id.trim().toLowerCase(), ADMIN_ID);
  const hash = hashText(`${PEPPER}:${password}`);
  const passMatch = safeEq(hash, ADMIN_HASH);
  if (!idMatch || !passMatch) return { ok: false as const, error: "Those admin details do not match." };
  const token = await issueSession("admin", null);
  return { ok: true as const, token };
}

export async function adminSessionOk(token: string | null) {
  return adminOk(token);
}

async function requireAdmin(token: string | null) {
  if (!(await adminOk(token))) return false;
  return true;
}

export async function overview(token: string | null): Promise<Analytics | null> {
  if (!(await requireAdmin(token))) return null;
  const sql = await getSql();
  const rows = await sql<OrderRow>`select * from orders order by created_at desc`;
  const orders = rows.map(mapOrder);
  const live = orders.filter((order) => order.status !== "declined");
  const revenuePaise = live.reduce((sum, order) => sum + order.totalPaise, 0);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const days = [];
  for (let i = 13; i >= 0; i -= 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - i);
    const key = fmt.format(date);
    const subset = live.filter((order) => fmt.format(new Date(order.createdAt)) === key);
    days.push({
      day: key.slice(5),
      revenuePaise: subset.reduce((sum, order) => sum + order.totalPaise, 0),
      orders: subset.length,
    });
  }
  const tally = new Map<string, { name: string; qty: number; revenuePaise: number }>();
  let luxuryPaise = 0;
  let everydayPaise = 0;
  for (const order of live) {
    for (const item of order.items) {
      const current = tally.get(item.name) ?? { name: item.name, qty: 0, revenuePaise: 0 };
      current.qty += item.qty;
      current.revenuePaise += item.pricePaise * item.qty;
      tally.set(item.name, current);
      if (item.category === "luxury") luxuryPaise += item.pricePaise * item.qty;
      else everydayPaise += item.pricePaise * item.qty;
    }
  }
  return {
    revenuePaise,
    orders: live.length,
    declined: orders.length - live.length,
    aovPaise: live.length ? Math.round(revenuePaise / live.length) : 0,
    luxuryPaise,
    everydayPaise,
    days,
    top: [...tally.values()].sort((a, b) => b.revenuePaise - a.revenuePaise).slice(0, 5),
  };
}

function slugify(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
  return slug || "watch";
}

function safeImage(src: string) {
  const value = src.trim();
  if (value.startsWith("/watches/")) return value;
  if (value.startsWith("https://") && value.length < 400) return value;
  return "/watches/city.jpg";
}

export async function saveProduct(
  token: string | null,
  input: {
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
  },
) {
  if (!(await requireAdmin(token))) return { ok: false as const, error: "Sign in to the desk again." };
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) return { ok: false as const, error: "Give the watch a name." };
  const pricePaise = Math.round(num(input.priceRupees) * 100);
  if (pricePaise < 50_000 || pricePaise > 100_000_000) {
    return { ok: false as const, error: "Price should sit between ₹500 and ₹10,00,000." };
  }
  const caseMm = Math.round(num(input.caseMm));
  if (caseMm < 28 || caseMm > 52) return { ok: false as const, error: "Case size looks off." };
  const stock = Math.round(num(input.stock));
  if (stock < 0 || stock > 500) return { ok: false as const, error: "Stock should be between 0 and 500." };
  const category: Category = input.category === "luxury" ? "luxury" : "everyday";
  const movement = input.movement.trim().slice(0, 40) || "Quartz";
  const sql = await getSql();
  const id = input.id?.trim() || `prd_${randomBytes(6).toString("hex")}`;
  let slug = slugify(name);
  const clash = await sql<{ id: string }>`select id from products where slug = ${slug} and id <> ${id}`;
  if (clash.length) slug = `${slug}-${randomBytes(2).toString("hex")}`;
  const existing = await sql<{ id: string }>`select id from products where id = ${id}`;
  const image = safeImage(input.image);
  const tagline = input.tagline.trim().slice(0, 140);
  const description = input.description.trim().slice(0, 800);
  if (existing.length) {
    await sql`
      update products set
        slug = ${slug},
        name = ${name},
        tagline = ${tagline},
        description = ${description},
        price_paise = ${pricePaise},
        category = ${category},
        movement = ${movement},
        case_mm = ${caseMm},
        stock = ${stock},
        image = ${image},
        featured = ${input.featured},
        active = ${input.active}
      where id = ${id}
    `;
  } else {
    await sql`
      insert into products (
        id, slug, name, tagline, description, price_paise, category, movement, case_mm, stock, image, featured, active
      ) values (
        ${id}, ${slug}, ${name}, ${tagline}, ${description}, ${pricePaise}, ${category}, ${movement},
        ${caseMm}, ${stock}, ${image}, ${input.featured}, ${input.active}
      )
    `;
  }
  return { ok: true as const };
}

export async function deleteProduct(token: string | null, id: string) {
  if (!(await requireAdmin(token))) return { ok: false as const, error: "Sign in to the desk again." };
  const sql = await getSql();
  await sql`delete from products where id = ${id}`;
  return { ok: true as const };
}

export async function listCoupons(token: string | null) {
  if (!(await requireAdmin(token))) return null;
  const sql = await getSql();
  const rows = await sql<CouponRow>`select * from coupons order by code asc`;
  return rows.map(mapCoupon);
}

export async function saveCoupon(
  token: string | null,
  input: {
    code: string;
    kind: "percent" | "flat";
    amount: number;
    minRupees: number;
    category: Category | "" | null;
    active: boolean;
    note: string;
  },
) {
  if (!(await requireAdmin(token))) return { ok: false as const, error: "Sign in to the desk again." };
  const code = input.code.trim().toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9]{3,16}$/.test(code)) {
    return { ok: false as const, error: "Use 3–16 letters or numbers for the code." };
  }
  const kind = input.kind === "flat" ? "flat" : "percent";
  const amount = Math.round(num(input.amount));
  if (kind === "percent" && (amount < 1 || amount > 80)) {
    return { ok: false as const, error: "Percent off should be between 1 and 80." };
  }
  const stored = kind === "percent" ? amount : amount * 100;
  if (kind === "flat" && (stored < 1000 || stored > 50_000_000)) {
    return { ok: false as const, error: "Flat discount looks off." };
  }
  const minPaise = Math.max(0, Math.round(num(input.minRupees) * 100));
  const category = input.category === "luxury" || input.category === "everyday" ? input.category : null;
  const sql = await getSql();
  await sql`
    insert into coupons (code, kind, amount, min_paise, category, active, note)
    values (${code}, ${kind}, ${stored}, ${minPaise}, ${category}, ${input.active}, ${input.note.trim().slice(0, 140)})
    on conflict (code) do update set
      kind = excluded.kind,
      amount = excluded.amount,
      min_paise = excluded.min_paise,
      category = excluded.category,
      active = excluded.active,
      note = excluded.note
  `;
  return { ok: true as const };
}

export async function deleteCoupon(token: string | null, code: string) {
  if (!(await requireAdmin(token))) return { ok: false as const, error: "Sign in to the desk again." };
  const sql = await getSql();
  await sql`delete from coupons where code = ${code.trim().toUpperCase()}`;
  return { ok: true as const };
}

export async function adminOrderList(token: string | null) {
  if (!(await requireAdmin(token))) return null;
  const sql = await getSql();
  const rows = await sql<OrderRow>`
    select o.*, c.name as customer_name, c.phone as customer_phone
    from orders o
    join customers c on c.id = o.customer_id
    order by o.created_at desc
    limit 200
  `;
  return rows.map(mapOrder);
}

async function adjustStock(items: OrderItem[], direction: 1 | -1) {
  const sql = await getSql();
  if (direction === 1) {
    for (const item of items) {
      const updated = await sql<{ id: string }>`
        update products set stock = stock - ${item.qty}
        where id = ${item.productId} and stock >= ${item.qty}
        returning id
      `;
      if (!updated.length) return false;
    }
    return true;
  }
  for (const item of items) {
    await sql`update products set stock = stock + ${item.qty} where id = ${item.productId}`;
  }
  return true;
}

export async function setOrderStatus(token: string | null, id: string, status: OrderStatus) {
  if (!(await requireAdmin(token))) return { ok: false as const, error: "Sign in to the desk again." };
  const allowed: OrderStatus[] = ["placed", "packed", "shipped", "delivered", "declined"];
  if (!allowed.includes(status)) return { ok: false as const, error: "Unknown status." };
  const sql = await getSql();
  const rows = await sql<OrderRow>`select * from orders where id = ${id}`;
  const order = rows[0] ? mapOrder(rows[0]) : null;
  if (!order) return { ok: false as const, error: "Order not found." };
  if (order.status === status) return { ok: true as const };
  if (order.status !== "declined" && status === "declined") {
    await adjustStock(order.items, -1);
  }
  if (order.status === "declined" && status !== "declined") {
    const ok = await adjustStock(order.items, 1);
    if (!ok) return { ok: false as const, error: "Not enough stock to reopen this order." };
  }
  await sql`update orders set status = ${status} where id = ${id}`;
  return { ok: true as const };
}
