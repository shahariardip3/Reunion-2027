import { cookies } from "next/headers";
export async function getLang() {
  const cookieStore = await cookies();
  return cookieStore.get("site_lang")?.value === "en" ? "en" : "bn";
}
