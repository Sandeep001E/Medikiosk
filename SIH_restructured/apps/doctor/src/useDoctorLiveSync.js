import { useState, useEffect, useRef } from 'react';

/**
 * Real-time Server-Sent Events (SSE) hook for Doctor Workstation.
 * Listens for live incoming patient cases transmitted via QR scan.
 */
export function useDoctorLiveSync(url = '/api/doctor/live-events', onEvent, enabled = true) {
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
            // Heartbeat or non-json frame
          }
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          if (eventSource) {
            eventSource.close();
          }
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (err) {
        console.warn('[DoctorLiveSync] Error connecting SSE:', err.message);
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
