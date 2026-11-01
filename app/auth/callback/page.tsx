"use client";
import { useEffect, useRef, useState } from "react";
import { type EmailOtpType } from "@supabase/supabase-js";
import { browserSupabase } from "@/lib/supabase/browser";
import { Brand } from "@/components/Brand";
export default function AuthCallback() {
  const [message, setMessage] = useState("Completing your secure sign-in…"),
    [failed, setFailed] = useState(false);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function finish() {
      try {
        const params = new URLSearchParams(location.search);
        if (params.has("error"))
          throw new Error(
            params.get("error_description")?.slice(0, 250) ||
              "The sign-in link was not accepted.",
          );
        const code = params.get("code"),
          hash = params.get("token_hash");
        history.replaceState(null, "", "/auth/callback");
        const r = await fetch("/api/config", { cache: "no-store" });
        if (!r.ok) throw new Error("Unable to load sign-in configuration.");
        const config = await r.json();
        if (!config.publicAuth) throw new Error(config.auth.message);
        const client = browserSupabase(
          config.publicAuth.url,
          config.publicAuth.publishableKey || config.publicAuth.anonKey,
        );
        let error;
        if (code) ({ error } = await client.auth.exchangeCodeForSession(code));
        else if (
          hash &&
          ["email", "magiclink"].includes(params.get("type") || "")
        )
          ({ error } = await client.auth.verifyOtp({
            token_hash: hash,
            type: params.get("type") as EmailOtpType,
          }));
        else
          throw new Error(
            "No valid sign-in code found. Request a new email link and open it in the same browser.",
          );
        if (error)
          throw new Error(
            "The link expired, was already used, or could not be verified. Request a new link.",
          );
        const { data } = await client.auth.getSession();
        if (!data.session)
          throw new Error(
            "Session could not be restored. Please sign in again.",
          );
        setMessage("Signed in. Opening your Syrka Mail workspace…");
        location.replace("/");
      } catch (e) {
        setFailed(true);
        setMessage((e as Error).message);
      }
    }
    void finish();
  }, []);
  return (
    <main className="auth-callback">
      <Brand />
      <section className="mailbox">
        <h1>{failed ? "Let’s try that again." : "Welcome back."}</h1>
        <p role={failed ? "alert" : "status"}>{message}</p>
        {failed && (
          <a className="primary" href="/">
            Return to sign-in
          </a>
        )}
      </section>
    </main>
  );
}
