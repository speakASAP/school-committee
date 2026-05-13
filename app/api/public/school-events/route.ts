import { NextResponse } from "next/server";

export interface SchoolEvent {
  title: string;
  date: string;
  url: string;
}

const SOURCE_URL = "https://www.zsstrilky.cz/zakladni-skola/nadchazejici-udalosti";
let cache: { events: SchoolEvent[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({ events: cache.events });
  }

  try {
    const res = await fetch(SOURCE_URL, {
      headers: { "User-Agent": "school-committee-bot/1.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ events: [] });
    }

    const html = await res.text();
    const events = parseEvents(html);
    cache = { events, fetchedAt: Date.now() };
    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ events: [] });
  }
}

function parseEvents(html: string): SchoolEvent[] {
  const events: SchoolEvent[] = [];
  const itemRegex = /<article[^>]*>([\s\S]*?)<\/article>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(html)) !== null && events.length < 10) {
    const block = match[1];
    const titleMatch = /<h[23][^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
    const dateMatch =
      /<time[^>]*datetime="([^"]*)"[^>]*>/i.exec(block) ??
      /<[^>]*class="[^"]*date[^"]*"[^>]*>([\s\S]*?)<\//i.exec(block);

    if (titleMatch) {
      const rawHref = titleMatch[1];
      const title = titleMatch[2].replace(/<[^>]+>/g, "").trim();
      const date = dateMatch ? (dateMatch[1] || dateMatch[2] || "").replace(/<[^>]+>/g, "").trim() : "";
      const url = rawHref.startsWith("http") ? rawHref : `https://www.zsstrilky.cz${rawHref}`;
      if (title) events.push({ title, date, url });
    }
  }

  if (events.length === 0) {
    const linkRegex = /<a[^>]*href="(\/[^"]*udalost[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    while ((match = linkRegex.exec(html)) !== null && events.length < 10) {
      const title = match[2].replace(/<[^>]+>/g, "").trim();
      if (title && title.length > 3) {
        events.push({
          title,
          date: "",
          url: `https://www.zsstrilky.cz${match[1]}`,
        });
      }
    }
  }

  return events;
}
