"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { scanCheckIn, type ScanResult } from "@/lib/actions/checkins";
import { parseMemberQr } from "@/lib/qr";
import { formatCurrency, formatDate } from "@/lib/format";
import { buttonVariants } from "@/components/buttonStyles";
import { Avatar } from "@/components/Avatar";

type HistoryItem = { key: number; time: string; name: string; kind: ScanResult["kind"]; detail: string };

// Same card still held up to the camera: don't fire again for this long.
const REPEAT_WINDOW_MS = 6000;
// How often a camera frame is checked for a QR code.
const FRAME_INTERVAL_MS = 120;

const TONE: Record<ScanResult["kind"], { box: string; title: string }> = {
  checked_in: { box: "border-success/40 bg-success/10", title: "text-success" },
  already: { box: "border-info/40 bg-info/10", title: "text-info" },
  blocked: { box: "border-danger/40 bg-danger/10", title: "text-danger" },
  not_found: { box: "border-danger/40 bg-danger/10", title: "text-danger" },
  error: { box: "border-danger/40 bg-danger/10", title: "text-danger" },
};

function describe(result: ScanResult) {
  switch (result.kind) {
    case "checked_in":
      return { name: result.member.fullName, headline: "Checked in", detail: "Checked in" };
    case "already":
      return { name: result.member.fullName, headline: "Already checked in today", detail: "Already in today" };
    case "blocked":
      return {
        name: result.member.fullName,
        headline: result.reason === "frozen" ? "Membership is frozen" : `Membership expired ${formatDate(result.member.endDate)}`,
        detail: result.reason === "frozen" ? "Frozen - not checked in" : "Expired - not checked in",
      };
    case "not_found":
      return { name: "Unknown card", headline: "Card not recognised", detail: "Not a member card here" };
    case "error":
      return { name: "Error", headline: result.message, detail: result.message };
  }
}

function cameraMessage(error: unknown) {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "The camera only works on a secure (https) address.";
  }
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera access was blocked. Allow the camera for this site in your browser's settings, then try again.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No camera was found on this device.";
  if (name === "NotReadableError") return "The camera is being used by another app. Close it and try again.";
  return "Couldn't start the camera. You can still use a USB scanner or type the code below.";
}

export function CheckInScanner() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  // A ref, not just state: the camera loop reads it between renders.
  const busyRef = useRef(false);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const keyRef = useRef(0);

  // A short tone so staff who aren't looking at the screen know it worked:
  // high for success, low for anything that needs attention. Best-effort.
  const feedback = useCallback((kind: ScanResult["kind"]) => {
    try {
      navigator.vibrate?.(kind === "checked_in" ? 80 : [60, 40, 60]);
      const audio = audioRef.current;
      if (!audio) return;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = kind === "checked_in" ? 880 : kind === "already" ? 660 : 220;
      gain.gain.value = 0.08;
      osc.connect(gain).connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + (kind === "checked_in" ? 0.12 : 0.3));
    } catch {
      // No sound is fine.
    }
  }, []);

  const submit = useCallback(
    async (code: string, force = false) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      let outcome: ScanResult;
      try {
        outcome = await scanCheckIn(code, force);
      } catch {
        outcome = { kind: "error", message: "Couldn't reach the server. Check the connection and scan again." };
      }
      const info = describe(outcome);
      setResult(outcome);
      setHistory((prev) =>
        [
          { key: ++keyRef.current, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), name: info.name, kind: outcome.kind, detail: info.detail },
          ...prev,
        ].slice(0, 10)
      );
      feedback(outcome.kind);
      busyRef.current = false;
      setBusy(false);
    },
    [feedback]
  );

  const handleDetected = useCallback(
    (text: string) => {
      const now = Date.now();
      const last = lastScanRef.current;
      if (last.code === text && now - last.at < REPEAT_WINDOW_MS) return;
      lastScanRef.current = { code: text, at: now };
      if (!parseMemberQr(text)) {
        setResult({ kind: "not_found" });
        feedback("not_found");
        return;
      }
      void submit(text);
    },
    [submit, feedback]
  );

  // The camera: open it, then look at a frame a few times a second. jsQR is
  // loaded only when the camera is switched on, so the rest of the app doesn't
  // carry it.
  useEffect(() => {
    // Both elements are always rendered (only hidden while the camera is off).
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!cameraOn || !video || !canvas) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let timer: number | undefined;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera api");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();

        const { default: jsQR } = await import("jsqr");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("no canvas");

        const look = () => {
          if (cancelled) return;
          if (!busyRef.current && video.readyState >= 2 && video.videoWidth > 0) {
            // Downscale big frames: a QR code doesn't need 720p to be read.
            const scale = Math.min(1, 640 / video.videoWidth);
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const found = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" });
            if (found?.data) handleDetected(found.data);
          }
          timer = window.setTimeout(look, FRAME_INTERVAL_MS);
        };
        look();
      } catch (e) {
        if (cancelled) return;
        setCameraError(cameraMessage(e));
        setCameraOn(false);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    };
  }, [cameraOn, handleDetected]);

  // A USB scanner "types" the code into whatever is focused, then presses
  // Enter - so on a computer, keep the box focused and ready. Not on phones,
  // where focusing would pop the keyboard up over the camera.
  const refocus = useCallback(() => {
    if (window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus();
  }, []);
  useEffect(refocus, [refocus]);

  function startCamera() {
    setCameraError(null);
    // Audio may only start after a tap, so this is where it's created.
    if (!audioRef.current && typeof AudioContext !== "undefined") audioRef.current = new AudioContext();
    void audioRef.current?.resume();
    setCameraOn(true);
  }

  function onManualSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = inputRef.current?.value.trim() ?? "";
    if (inputRef.current) inputRef.current.value = "";
    if (value) {
      lastScanRef.current = { code: value, at: Date.now() };
      if (parseMemberQr(value)) void submit(value);
      else setResult({ kind: "not_found" });
    }
    refocus();
  }

  const info = result ? describe(result) : null;
  const member = result && "member" in result ? result.member : null;

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="relative aspect-video bg-heading">
            <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${cameraOn ? "" : "hidden"}`} />
            <canvas ref={canvasRef} className="hidden" />
            {cameraOn && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-2/3 w-2/3 max-w-xs rounded-2xl border-2 border-white/80" />
              </div>
            )}
            {!cameraOn && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/70">
                Camera is off
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-body">
              {cameraOn ? "Hold a member card up to the camera." : "Use this device's camera to scan member cards."}
            </p>
            {cameraOn ? (
              <button type="button" onClick={() => setCameraOn(false)} className={buttonVariants.secondary}>
                Stop camera
              </button>
            ) : (
              <button type="button" onClick={startCamera} className={buttonVariants.primary}>
                Start camera
              </button>
            )}
          </div>
          {cameraError && <p className="border-t border-border bg-danger/10 px-4 py-2.5 text-sm text-danger">{cameraError}</p>}
        </div>

        <form onSubmit={onManualSubmit} className="rounded-xl border border-border bg-surface p-4">
          <label htmlFor="scan-code" className="block text-sm font-medium text-heading">
            USB scanner or typed code
          </label>
          <p className="mt-0.5 text-xs text-muted">Click the box and scan with a USB scanner, or paste a code and press Enter.</p>
          <div className="mt-3 flex gap-3">
            <input
              id="scan-code"
              ref={inputRef}
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Scan or paste a code"
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-heading placeholder:text-muted focus:border-primary focus:outline-none"
            />
            <button type="submit" disabled={busy} className={buttonVariants.secondary}>
              Check in
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <div role="status" aria-live="polite" className="min-h-40">
          {result && info ? (
            <div className={`rounded-xl border p-5 ${TONE[result.kind].box}`}>
              <div className="flex items-center gap-4">
                {member && <Avatar src={member.photoUrl} name={member.fullName} className="h-14 w-14 shrink-0 text-lg" />}
                <div className="min-w-0">
                  <p className="truncate text-xl font-bold text-heading">{info.name}</p>
                  <p className={`text-sm font-semibold ${TONE[result.kind].title}`}>
                    {result.kind === "checked_in" && "✓ "}
                    {info.headline}
                  </p>
                </div>
              </div>
              {member && (
                <p className="mt-3 text-sm text-body">
                  {[member.memberNo != null && `Member #${member.memberNo}`, member.planName ?? "No plan", `Expires ${formatDate(member.endDate)}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              {member && member.outstanding > 0 && (
                <p className="mt-2 rounded-lg bg-warning/15 px-3 py-2 text-sm font-semibold text-heading">
                  Balance due: {formatCurrency(member.outstanding)}
                </p>
              )}
              {result.kind === "blocked" && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button type="button" disabled={busy} onClick={() => void submit(result.member.id, true)} className={buttonVariants.secondary}>
                    Check in anyway
                  </button>
                  <a href={`/members/${result.member.id}`} className={buttonVariants.tertiary}>
                    Open member →
                  </a>
                </div>
              )}
              {result.kind === "not_found" && (
                <p className="mt-2 text-sm text-body">This isn&apos;t a member card from this gym. Try again, or search for the member instead.</p>
              )}
            </div>
          ) : (
            <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border bg-surface p-5 text-center text-sm text-muted">
              Scan a member card to check them in. The result shows here.
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-heading">This session</h2>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nothing scanned yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {history.map((item) => (
                <li key={item.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-heading">{item.name}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className={item.kind === "checked_in" ? "text-success" : item.kind === "already" ? "text-info" : "text-danger"}>{item.detail}</span>
                    <span className="text-xs text-muted">{item.time}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
