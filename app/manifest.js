export default function manifest() {
  return {
    name: "গঙ্গানন্দপুর মাধ্যমিক বিদ্যালয় — পুনর্মিলনী ২০২৭",
    short_name: "Reunion 2027",
    description: "Ganganandapur Secondary School Reunion 2027",
    lang: "bn",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8f4",
    theme_color: "#ffffff",
    icons: [
      { src: "/logo-256.png", sizes: "256x256", type: "image/png" },
      { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
