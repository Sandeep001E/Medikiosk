import { useState, useEffect, useRef } from 'react';

/**
 * Custom React hook to establish a Server-Sent Events (SSE) connection
 * for real-time bi-directional synchronization between Patient and Doctor portals.
 *
 * @param {string} url - SSE endpoint (e.g. '/api/patient/live-events' or '/api/doctor/live-events')
 * @param {Function} onEvent - Callback invoked when a real-time event arrives: ({ event, payload, timestamp })
 * @param {boolean} enabled - Whether to keep connection active
 */
export function useLiveSync(url, onEvent, enabled = true) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled || !url) return;

    let eventSource = null;
    let reconnectTimeout = null;

    const connect = () => {
      try {
        eventSource = new EventSource(url);

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        eventSource.onmessage = (msgEvent) => {
          try {
            const data = JSON.parse(msgEvent.data);
            setLastEvent(data);
            if (onEventRef.current) {
              onEventRef.current(data);
            }
          } catch (err) {
            // Ignore non-json or heartbeat frames
          }
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          if (eventSource) {
            eventSource.close();
          }
          // Exponential / delayed reconnection
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (err) {
        console.warn('[LiveSync] Error connecting SSE:', err.message);
        reconnectTimeout = setTimeout(connect, 4000);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) eventSource.close();
      setIsConnected(false);
    };
  }, [url, enabled]);

  return { isConnected, lastEvent };
}
