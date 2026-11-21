import StatusClient from "./StatusClient";
import { getLang } from "../../lib/server-lang";

export const metadata = { title: "নিবন্ধনের অবস্থা | Registration Status", robots: { index: false, follow: false } };
export default async function StatusPage() { return <StatusClient lang={await getLang()} />; }
