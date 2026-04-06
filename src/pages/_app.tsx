import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Instrument_Sans } from "next/font/google";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={instrumentSans.className}>
      <Component {...pageProps} />
    </div>
  );
}
