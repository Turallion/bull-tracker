# X Bull Earnings Estimator

A Next.js app for estimating how much an X account could earn per month in a bull market using subscriber count and engagement on the last 20 tweets.

## Stack

- Next.js for the web app and Vercel deployment
- `twitterapi.io` for X profile and tweet data
- A custom scoring model with:
  - diminishing per-subscriber value
  - small-creator boost
  - engagement multiplier normalized by subscriber size
  - downloadable result card

## Getting started

1. Copy `.env.example` to `.env.local`
2. Add your `TWITTERAPI_IO_KEY`
3. Install dependencies with `npm install`
4. Run `npm run dev`

## Deploying to Vercel

1. Import the repo from GitHub
2. Add `TWITTERAPI_IO_KEY` in Project Settings -> Environment Variables
3. Deploy
