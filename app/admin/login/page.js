import LoginClient from "./LoginClient";
import { getLang } from "../../../lib/server-lang";

export const metadata = { title: "Admin login", robots: { index: false, follow: false } };
export default async function LoginPage() { return <LoginClient lang={await getLang()} />; }
