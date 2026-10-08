export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let ten = digits;
  if (digits.length === 12 && digits.startsWith("91")) ten = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) ten = digits.slice(1);
  if (!/^[6-9]\d{9}$/.test(ten)) return null;
  return `+91${ten}`;
}

export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const ten = digits.slice(-10);
  if (ten.length < 10) return phone;
  return `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`;
}

export const STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;
