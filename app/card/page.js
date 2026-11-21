import CardClient from "./CardClient";
import { getLang } from "../../lib/server-lang";

export const metadata = { title: "কনফার্মেশন কার্ড | Confirmation Card", robots: { index: false, follow: false } };
export default async function CardPage() { return <CardClient lang={await getLang()} />; }
