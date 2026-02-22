"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import Pusher from "pusher-js";

type PusherContextValue = {
  pusher: Pusher | null;
  isReady: boolean;
};

const PusherContext = createContext<PusherContextValue>({ pusher: null, isReady: false });

function createPusherClient(): Pusher | null {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "us2";
  if (typeof window === "undefined") return null;
  if (!key?.trim()) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Pusher] Skipped: NEXT_PUBLIC_PUSHER_KEY is not set. Add it to .env.local and restart.");
    }
    return null;
  }
  const client = new Pusher(key.trim(), {
    cluster: (cluster as string).trim(),
    forceTLS: true,
  });
  if (process.env.NODE_ENV === "development") {
    client.connection.bind("connected", () => console.log("[Pusher] Connected"));
    client.connection.bind("error", (err: Error) => console.warn("[Pusher] Connection error", err));
  }
  return client;
}

export function PusherProvider({ children }: { children: React.ReactNode }) {
  const [pusher, setPusher] = useState<Pusher | null>(null);
  const [isReady, setIsReady] = useState(false);
  const ref = useRef<Pusher | null>(null);

  useEffect(() => {
    if (ref.current) return;
    const client = createPusherClient();
    ref.current = client;
    setPusher(client);
    setIsReady(true);
    return () => {
      client?.disconnect();
      ref.current = null;
      setPusher(null);
      setIsReady(false);
    };
  }, []);

  const value = useMemo(() => ({ pusher, isReady }), [pusher, isReady]);
  return <PusherContext.Provider value={value}>{children}</PusherContext.Provider>;
}

export function usePusher(): Pusher | null {
  return useContext(PusherContext).pusher;
}

/**
 * Subscribe to a Pusher channel event. Unsubscribes on unmount.
 */
export function usePusherChannel(
  channelName: string | null,
  eventName: string,
  onEvent: (data: unknown) => void
): void {
  const pusher = usePusher();
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!pusher || !channelName) return;
    const channel = pusher.subscribe(channelName);
    const handler = (data: unknown) => {
      onEventRef.current(data);
    };
    channel.bind(eventName, handler);
    return () => {
      channel.unbind(eventName, handler);
      pusher.unsubscribe(channelName);
    };
  }, [pusher, channelName, eventName]);
}
