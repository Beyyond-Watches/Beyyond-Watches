export const UPI_ID = "7400790654@fam";
export const UPI_NAME = "Beyyond Watches";

export function upiPayUrl(app: "upi" | "gpay" | "phonepe" | "paytm", amount: string, note: string) {
  const q = new URLSearchParams({
    pa: UPI_ID,
    pn: UPI_NAME,
    am: amount,
    cu: "INR",
    tn: note,
  });
  const query = q.toString();
  if (app === "gpay") return `tez://upi/pay?${query}`;
  if (app === "phonepe") return `phonepe://pay?${query}`;
  if (app === "paytm") return `paytmmp://pay?${query}`;
  return `upi://pay?${query}`;
}

export function makePayRef() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "BW";
  for (let i = 0; i < 6; i += 1) ref += alphabet[Math.floor(Math.random() * alphabet.length)];
  return ref;
}
