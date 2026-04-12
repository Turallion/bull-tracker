import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const response = await fetch(url, { cache: "force-cache" });

    if (!response.ok) {
      return NextResponse.json({ error: "Could not fetch avatar" }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400"
      }
    });
  } catch {
    return NextResponse.json({ error: "Could not fetch avatar" }, { status: 500 });
  }
}
