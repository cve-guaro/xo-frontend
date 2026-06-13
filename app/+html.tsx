// app/+html.tsx — Root HTML Layout for Web Production Optimizations
import { ScrollViewStyleReset } from "expo-router/html";
import React from "react";

export default function HTML({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Primary SEO Meta Tags */}
        <title>XO Ethiopia - Play Tic-Tac-Toe for Real Money</title>
        <meta name="title" content="XO Ethiopia - Play Tic-Tac-Toe for Real Money" />
        <meta name="description" content="Play Tic-Tac-Toe for real money on XO Ethiopia. Join tournaments, play with friends, and win cash prizes daily! Easy withdrawals via Telebirr." />

        {/* PWA & Theme Color */}
        <meta name="theme-color" content="#0a0a14" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="shortcut icon" href="/favicon.png" />

        {/* Apple & Modern PWA Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="XO ET" />

        {/* Optimized Fonts Preconnect with swap display for LCP & FCP boost */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          as="style"
          // @ts-ignore
          fetchPriority="high"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          media="print"
          // @ts-ignore
          onLoad="this.media='all'"
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          />
        </noscript>

        {/* Scroll View Style Reset for proper React Native Web behavior */}
        <ScrollViewStyleReset />

        {/* Static Stylesheet Injection to avoid layout shift and runtime DOM overhead */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                background-color: #060614;
                margin: 0;
                padding: 0;
              }
              
              /* Reset input focus borders dynamically without JS layout shifts */
              input:focus, textarea:focus {
                outline: none !important;
                box-shadow: 0 0 0 2px rgba(0, 218, 243, 0.4) !important;
                border-color: #00daf3 !important;
              }
              
              /* Premium scrollbars */
              [data-scrollbar="custom"]::-webkit-scrollbar {
                width: 6px;
                height: 6px;
              }
              [data-scrollbar="custom"]::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.02);
                border-radius: 8px;
              }
              [data-scrollbar="custom"]::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.15);
                border-radius: 8px;
              }
              [data-scrollbar="custom"]::-webkit-scrollbar-thumb:hover {
                background: rgba(129, 236, 255, 0.4);
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
