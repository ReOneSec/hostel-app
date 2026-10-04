"use client";

import { Agentation } from "agentation";

export function AgentationProvider() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <Agentation 
      endpoint="http://localhost:3000" 
      onSessionCreated={(sessionId) => {
        console.log("Agentation session started:", sessionId);
      }}
    />
  );
}
