import type { Response } from "express";

export type FacilitatorEvent = {
  id: number;
  service: "local-facilitator";
  endpoint: "supported" | "verify" | "settle" | "judge";
  method: "GET" | "POST";
  status: number;
  elapsedMs: number;
  timestamp: string;
};

export const facilitatorEventStreamHeaders = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "Access-Control-Allow-Origin": "*"
};

let nextEventId = 1;
const clients = new Set<Response>();
const recentEvents: FacilitatorEvent[] = [];

const writeEvent = (client: Response, event: FacilitatorEvent) => {
  client.write(`id: ${event.id}\n`);
  client.write("event: facilitator\n");
  client.write(`data: ${JSON.stringify(event)}\n\n`);
};

export const addEventClient = (client: Response) => {
  clients.add(client);
  client.write(": connected\n\n");

  for (const event of recentEvents) {
    writeEvent(client, event);
  }

  client.on("close", () => {
    clients.delete(client);
  });
};

export const emitFacilitatorEvent = (event: Omit<FacilitatorEvent, "id" | "service" | "timestamp">) => {
  const fullEvent: FacilitatorEvent = {
    id: nextEventId,
    service: "local-facilitator",
    timestamp: new Date().toISOString(),
    ...event
  };

  nextEventId += 1;
  recentEvents.push(fullEvent);
  if (recentEvents.length > 50) {
    recentEvents.shift();
  }

  for (const client of clients) {
    writeEvent(client, fullEvent);
  }
};
