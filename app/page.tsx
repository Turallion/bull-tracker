"use client";

import { useEffect, useState } from "react";
import type { AnalyzerResult } from "@/lib/types";

const LOADER_MESSAGES = [
  "Scanning the timeline for hidden bullishness...",
  "Counting engagement candles across the last 20 posts...",
  "Adjusting for small-creator edge and whale compression...",
  "Checking whether the replies are alpha or just exit liquidity...",
  "Pricing your influence for peak bull market delusion..."
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const words = text.split(" ");
  let line = "";
  let lines = 0;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const testWidth = context.measureText(testLine).width;

    if (testWidth > maxWidth && line) {
      context.fillText(line, x, y + lines * lineHeight);
      lines += 1;
      line = word;

      if (lines >= maxLines - 1) {
        break;
      }
    } else {
      line = testLine;
    }
  }

  if (line && lines < maxLines) {
    context.fillText(line, x, y + lines * lineHeight);
  }
}

async function loadImage(src: string) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";

  return new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not prepare the card image."));
    image.src = src;
  });
}

function getInitials(name: string, username: string) {
  const source = name.trim() || username.trim() || "X";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function drawAvatarFallback(
  context: CanvasRenderingContext2D,
  result: AnalyzerResult,
  x: number,
  y: number,
  size: number
) {
  const gradient = context.createLinearGradient(x, y, x + size, y + size);
  gradient.addColorStop(0, "#7bf1a8");
  gradient.addColorStop(1, "#f5c35b");

  context.save();
  context.beginPath();
  context.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  context.closePath();
  context.clip();
  context.fillStyle = "#152118";
  context.fillRect(x, y, size, size);
  context.globalAlpha = 0.22;
  context.fillStyle = gradient;
  context.fillRect(x, y, size, size);
  context.globalAlpha = 1;
  context.restore();

  context.strokeStyle = "rgba(255,255,255,0.18)";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(x + size / 2, y + size / 2, size / 2 - 1.5, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = "#f8f8f1";
  context.font = `700 ${Math.round(size * 0.36)}px Georgia, "Times New Roman", serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(getInitials(result.profile.name, result.profile.username), x + size / 2, y + size / 2 + 2);
  context.textAlign = "start";
  context.textBaseline = "alphabetic";
}

async function buildCardPng(result: AnalyzerResult) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available in this browser.");
  }

  const background = context.createLinearGradient(0, 0, 1200, 630);
  background.addColorStop(0, "#05130c");
  background.addColorStop(0.5, "#102718");
  background.addColorStop(1, "#241109");
  context.fillStyle = background;
  roundRect(context, 0, 0, 1200, 630, 36);
  context.fill();

  const glowLeft = context.createRadialGradient(150, 80, 20, 150, 80, 170);
  glowLeft.addColorStop(0, "rgba(123,241,168,0.28)");
  glowLeft.addColorStop(1, "rgba(123,241,168,0)");
  context.fillStyle = glowLeft;
  context.beginPath();
  context.arc(150, 80, 170, 0, Math.PI * 2);
  context.fill();

  const glowRight = context.createRadialGradient(1080, 560, 30, 1080, 560, 200);
  glowRight.addColorStop(0, "rgba(245,195,91,0.22)");
  glowRight.addColorStop(1, "rgba(245,195,91,0)");
  context.fillStyle = glowRight;
  context.beginPath();
  context.arc(1080, 560, 200, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "rgba(255,255,255,0.12)";
  context.fillStyle = "rgba(255,255,255,0.04)";
  roundRect(context, 48, 42, 1104, 546, 32);
  context.fill();
  context.stroke();

  context.fillStyle = "#96f0b7";
  context.font = '24px "Courier New", monospace';
  context.fillText("X BULL EARNINGS ESTIMATOR", 82, 92);

  context.fillStyle = "#ffffff";
  context.font = '700 34px Georgia, "Times New Roman", serif';
  context.fillText("Projected Monthly Bull Range", 82, 152);

  const amountGradient = context.createLinearGradient(82, 210, 720, 210);
  amountGradient.addColorStop(0, "#7bf1a8");
  amountGradient.addColorStop(1, "#f5c35b");
  context.fillStyle = amountGradient;
  context.font = '700 72px Georgia, "Times New Roman", serif';
  context.fillText(`${formatMoney(result.lowerMonthly)} - ${formatMoney(result.upperMonthly)}`, 82, 250);

  context.fillStyle = "rgba(123,241,168,0.13)";
  context.strokeStyle = "rgba(123,241,168,0.28)";
  roundRect(context, 82, 292, 248, 52, 26);
  context.fill();
  context.stroke();
  context.fillStyle = "#e6fff0";
  context.font = '700 24px Georgia, "Times New Roman", serif';
  context.textAlign = "center";
  context.fillText(result.level.name, 206, 326);
  context.textAlign = "start";

  try {
    const avatarImage = await loadImage(
      result.profile.avatarUrl.startsWith("data:")
        ? result.profile.avatarUrl
        : `/api/avatar?url=${encodeURIComponent(result.profile.avatarUrl)}`
    );

    context.save();
    context.beginPath();
    context.arc(140, 140, 58, 0, Math.PI * 2);
    context.closePath();
    context.clip();
    context.drawImage(avatarImage, 82, 82, 116, 116);
    context.restore();

    context.strokeStyle = "rgba(255,255,255,0.16)";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(140, 140, 56.5, 0, Math.PI * 2);
    context.stroke();
  } catch {
    drawAvatarFallback(context, result, 82, 82, 116);
  }

  context.fillStyle = "#ffffff";
  context.font = '700 34px Georgia, "Times New Roman", serif';
  context.fillText(result.profile.name, 214, 127);
  context.fillStyle = "#b3c6bb";
  context.font = '20px "Courier New", monospace';
  context.fillText(
    `@${result.profile.username} · ${formatCompact(result.profile.subscribers)} followers`,
    214,
    160
  );

  const pillY = 292;
  const pillWidth = 236;
  const pillHeight = 68;
  const pillGap = 16;
  const metaPills = [
    { label: "Level", value: result.level.name },
    { label: "Multiplier", value: `${result.engagementMultiplier}x` },
    { label: "Engagement", value: String(result.engagementRate) }
  ];

  if (result.isDemo) {
    metaPills.push({ label: "Mode", value: "Demo fallback" });
  }

  for (const [index, pill] of metaPills.entries()) {
    const x = 82 + index * (pillWidth + pillGap);
    context.fillStyle = "rgba(255,255,255,0.04)";
    context.strokeStyle = "rgba(255,255,255,0.08)";
    roundRect(context, x, pillY, pillWidth, pillHeight, 24);
    context.fill();
    context.stroke();

    context.fillStyle = "#b3c6bb";
    context.font = '18px "Courier New", monospace';
    context.fillText(pill.label, x + 18, pillY + 28);
    context.fillStyle = "#ffffff";
    context.font = '700 20px Georgia, "Times New Roman", serif';
    context.fillText(pill.value, x + 18, pillY + 54);
  }

  context.fillStyle = "#fff8dc";
  context.font = '30px Georgia, "Times New Roman", serif';
  drawWrappedText(context, result.level.comment, 82, 410, 860, 40, 3);

  context.fillStyle = "#d0d7d3";
  context.font = '20px "Courier New", monospace';
  context.fillText("Built by @Sherhaneth", 82, 575);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not generate the image file."));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

export default function HomePage() {
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<AnalyzerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaderIndex, setLoaderIndex] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setLoaderIndex((current) => (current + 1) % LOADER_MESSAGES.length);
    }, 1700);

    return () => window.clearInterval(timer);
  }, [isLoading]);

  useEffect(() => {
    setDownloadError(null);
  }, [result]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanUsername = username.replace(/^@/, "").trim();

    if (!cleanUsername) {
      setError("Enter an X username to estimate earnings.");
      return;
    }

    setError(null);
    setResult(null);
    setLoaderIndex(0);
    setDownloadError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username: cleanUsername })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not fetch X data right now.");
      }

      setResult(payload.result as AnalyzerResult);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDownload() {
    if (!result) {
      return;
    }

    try {
      setDownloadError(null);
      const blob = await buildCardPng(result);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `${result.profile.username}-bull-earnings-card.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (caughtError) {
      setDownloadError(
        caughtError instanceof Error ? caughtError.message : "Could not download the card."
      );
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">Bull cycle simulator</span>
          <h1>X Bull Earnings Estimator</h1>
          <p>
            Drop in any X handle and we will estimate a monthly bull-market income range using
            subscribers, the last 20 tweets, and a small-creator edge.
          </p>
        </div>

        <form className="search-panel" onSubmit={handleSubmit}>
          <label htmlFor="username">X username</label>
          <div className="search-row">
            <input
              id="username"
              name="username"
              placeholder="@elonmusk"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="off"
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Estimating..." : "Estimate"}
            </button>
          </div>
        </form>
      </section>

      <section className="result-wrap">
        <article className="result-panel">
          {isLoading ? (
            <div className="loader-card" aria-live="polite">
              <div className="loader-chart">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <h2>Running the bull tape...</h2>
              <p>{LOADER_MESSAGES[loaderIndex]}</p>
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className="empty-card error-card">
              <h2>Could not estimate right now</h2>
              <p>{error}</p>
              <p className="error-help">
                If you see a rate limit message, your app is running correctly and the block is coming
                from twitterapi.io. Try again later or review your API usage in twitterapi.io.
              </p>
            </div>
          ) : null}

          {!isLoading && !error && !result ? (
            <div className="empty-card">
              <h2>Your result card will appear here</h2>
              <p>PFP, account name, bull-market range, crypto level, and a joke for the timeline.</p>
            </div>
          ) : null}

          {!isLoading && result ? (
            <div className="result-stack">
              <div className="bull-card" id="bull-card">
                <div className="bull-card__header">
                  <img
                    src={
                      result.profile.avatarUrl.startsWith("data:")
                        ? result.profile.avatarUrl
                        : `/api/avatar?url=${encodeURIComponent(result.profile.avatarUrl)}`
                    }
                    alt={`${result.profile.name} avatar`}
                    className="avatar"
                  />
                  <div>
                    <p className="card-label">Projected monthly bull range</p>
                    <h2>{result.profile.name}</h2>
                    <p className="muted">
                      @{result.profile.username} · {formatCompact(result.profile.subscribers)} followers
                    </p>
                  </div>
                </div>

                <div className="earnings-band">
                  <span>{formatMoney(result.lowerMonthly)}</span>
                  <span className="range-separator">-</span>
                  <span>{formatMoney(result.upperMonthly)}</span>
                </div>

                <div className="meta-row">
                  <div className="meta-pill">
                    <span>Level</span>
                    <strong>{result.level.name}</strong>
                  </div>
                  <div className="meta-pill">
                    <span>Multiplier</span>
                    <strong>{result.engagementMultiplier}x</strong>
                  </div>
                  <div className="meta-pill">
                    <span>Engagement score</span>
                    <strong>{result.engagementRate}</strong>
                  </div>
                  {result.isDemo ? (
                    <div className="meta-pill">
                      <span>Mode</span>
                      <strong>Demo fallback</strong>
                    </div>
                  ) : null}
                </div>

                <p className="commentary">{result.level.comment}</p>

                <p className="card-footer">Built by @Sherhaneth</p>
              </div>

              <button type="button" className="download-button" onClick={handleDownload}>
                Download card
              </button>
              {downloadError ? <p className="download-error">{downloadError}</p> : null}
            </div>
          ) : null}
        </article>
      </section>

      <footer className="page-footer">
        <a
          className="sherhan-link"
          href="https://x.com/SherhanEth"
          target="_blank"
          rel="noreferrer"
        >
          Built by @Sherhaneth
        </a>
      </footer>
    </main>
  );
}
