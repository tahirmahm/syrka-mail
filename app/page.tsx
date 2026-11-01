"use client";
import { useEffect, useState } from "react";
import LiveMailbox from "@/components/LiveMailbox";
import DemoMailbox from "@/components/DemoMailbox";
export default function MailApplication() {
  const [demo, setDemo] = useState(false),
    [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      setDemo(
        new URLSearchParams(location.search).get("demo") === "1" ||
          localStorage.getItem("syrka-demo-mode") === "true",
      );
    } catch {}
    setReady(true);
  }, []);
  function change(value: boolean) {
    setDemo(value);
    try {
      localStorage.setItem("syrka-demo-mode", String(value));
      const url = new URL(location.href);
      if (value) url.searchParams.set("demo", "1");
      else url.searchParams.delete("demo");
      history.replaceState(null, "", url);
    } catch {}
  }
  if (!ready)
    return (
      <div className="app-loading" role="status">
        Opening Syrka Mail…
      </div>
    );
  return demo ? (
    <DemoMailbox onExit={() => change(false)} />
  ) : (
    <LiveMailbox onDemo={() => change(true)} />
  );
}
