"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import type { Location, RewardItem } from "@prisma/client";

interface LocationWithRewards extends Location {
  rewardItems: RewardItem[];
}

interface Props {
  locations: LocationWithRewards[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function StandPreview({
  logoUrl,
  message,
  qrValue,
  title = "Your stand preview",
}: {
  logoUrl?: string;
  message: string;
  qrValue: string;
  title?: string;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-500/10">
      <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">{title}</p>
      <div className="flex flex-col items-center gap-4 rounded-xl border border-white/10 bg-slate-950/60 p-6 text-center shadow-lg shadow-indigo-500/5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Uploaded logo"
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <span className="text-xs text-slate-400">Your logo</span>
          )}
        </div>
        <div className="rounded-xl bg-white p-3 shadow-inner shadow-slate-500/20">
          <QRCodeCanvas value={qrValue || "align-perks"} size={140} />
        </div>
        <p className="text-sm text-slate-200">{message}</p>
      </div>
    </div>
  );
}

export default function QrManager({ locations }: Props) {
  const [selectedLocationId, setSelectedLocationId] = useState(
    locations[0]?.id ?? "",
  );
  const [logoUrl, setLogoUrl] = useState("");
  const [message, setMessage] = useState("");
  const [lastAutoMessage, setLastAutoMessage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [step, setStep] = useState(1);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageEdited, setMessageEdited] = useState(false);

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedLocationId),
    [locations, selectedLocationId],
  );

  const signUpGiftName = useMemo(() => {
    return selectedLocation?.rewardItems.find(
      (item) => item.type === "SIGNUP_GIFT" && item.isEnabled,
    )?.name;
  }, [selectedLocation]);

  const defaultMessage = useMemo(
    () =>
      `Join our rewards program to earn points for every purchase. Sign up now and get a FREE ${signUpGiftName ?? "sign-up gift"}!`,
    [signUpGiftName],
  );

  useEffect(() => {
    let autoUpdated = false;
    setMessage((current) => {
      if (!messageEdited && (current.trim().length === 0 || current === lastAutoMessage)) {
        autoUpdated = true;
        return defaultMessage;
      }
      if (current === lastAutoMessage) {
        autoUpdated = true;
        return defaultMessage;
      }
      return current;
    });
    if (autoUpdated) {
      setMessageEdited(false);
    }
    setLastAutoMessage(defaultMessage);
  }, [defaultMessage, lastAutoMessage, messageEdited]);

  const qrValue = useMemo(() => {
    if (!selectedLocationId) return "";
    if (typeof window === "undefined") {
      return `/register?locationId=${selectedLocationId}`;
    }
    return `${window.location.origin}/register?locationId=${selectedLocationId}`;
  }, [selectedLocationId]);

  const totalPrice = quantity * 43.99;

  const resetWizard = () => {
    setStep(1);
    setQuantity(1);
    setLogoUrl("");
    setMessage(defaultMessage);
    setMessageEdited(false);
  };

  const placeOrder = async () => {
    if (!selectedLocationId) {
      setError("Choose a location to place your order.");
      return;
    }

    setPlacingOrder(true);
    setError(null);

    try {
      const response = await fetch("/api/stands/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: selectedLocationId,
          quantity,
          totalPrice,
          logoUrl: logoUrl || undefined,
          message,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Unable to place order right now.");
        return;
      }

      setStep(5);
    } catch (err) {
      console.error("Failed to place stand order", err);
      setError("Unexpected error, please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (locations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-slate-300">
        Add a location first to generate your QR code and order stands.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-indigo-500/10">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">
          Choose location
        </p>
        <div className="flex flex-wrap gap-2">
          {locations.map((location) => (
            <button
              key={location.id}
              type="button"
              onClick={() => setSelectedLocationId(location.id)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                selectedLocationId === location.id
                  ? "border-indigo-300 bg-indigo-500/20 text-white"
                  : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20"
              }`}
            >
              {location.name ?? "Unnamed location"}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 shadow-2xl shadow-indigo-500/10">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">
              Section A
            </p>
            <h2 className="text-2xl font-semibold text-white">Your QR Code</h2>
            <p className="mt-1 text-sm text-slate-300">
              This is your unique QR code. Share it with your customers so they can sign up for your rewards program.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-inner shadow-indigo-500/5">
            <div className="rounded-2xl bg-white p-4 shadow-lg shadow-slate-500/30">
              <QRCodeCanvas value={qrValue || "align-perks"} size={240} />
            </div>
            <p className="max-w-md text-sm text-slate-200">
              We HIGHLY recommend placing this on every table. The more exposure, the more sign-ups!
            </p>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-indigo-500/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">
                Section B
              </p>
              <h2 className="text-2xl font-semibold text-white">Purchase stands</h2>
              <p className="mt-1 text-sm text-slate-300">
                Customize your countertop stands and place your order in a few steps.
              </p>
            </div>
            <div className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-100">
              Step {step}/5
            </div>
          </div>

          {step === 1 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70 p-6">
                <div className="h-36 w-52 rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 shadow-lg shadow-indigo-500/20" />
              </div>
              <p className="text-sm text-slate-300">
                Durable plastic display stands to showcase your QR code at checkouts, tables, and waiting areas.
              </p>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-indigo-400/40"
              >
                Purchase Stands
              </button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Upload your logo</h3>
                <p className="text-sm text-slate-300">
                  Add a URL to your logo image to showcase your brand on the stand.
                </p>
              </div>
              <input
                type="text"
                value={logoUrl}
                onChange={(event) => setLogoUrl(event.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-indigo-400/40"
                >
                  Next
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLogoUrl("");
                    setStep(3);
                  }}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5"
                >
                  I don&apos;t have a logo
                </button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <StandPreview logoUrl={logoUrl} message={message} qrValue="stand-preview" />
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white" htmlFor="stand-message">
                  Message
                </label>
                <textarea
                  id="stand-message"
                  value={message}
                  onChange={(event) => {
                    setMessage(event.target.value);
                    setMessageEdited(true);
                  }}
                  rows={3}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  placeholder={defaultMessage}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-indigo-400/40"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <StandPreview logoUrl={logoUrl} message={message} qrValue={qrValue || "align-perks"} />
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white" htmlFor="stand-quantity">
                  How many would you like?
                </label>
                <input
                  id="stand-quantity"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(Math.max(1, Number(event.target.value) || 1))
                  }
                  className="w-32 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
                />
                <p className="text-sm text-slate-200">
                  Total: <span className="font-semibold text-white">{formatCurrency(totalPrice)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={placeOrder}
                disabled={placingOrder}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-indigo-400/40 disabled:opacity-60"
              >
                {placingOrder ? "Placing order..." : "Place Order"}
              </button>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-xl font-semibold text-white shadow-lg shadow-emerald-500/40">
                ✓
              </div>
              <h3 className="text-xl font-semibold text-white">Order Placed!</h3>
              <p className="text-sm text-emerald-100">
                We&apos;ve logged your order. You&apos;ll get an email confirmation shortly.
              </p>
              <button
                type="button"
                onClick={resetWizard}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10"
              >
                Return to Dashboard
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
