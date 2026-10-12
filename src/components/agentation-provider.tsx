"use client";

import { useEffect, useState } from "react";

export function AgentationProvider() {
  const [AgentationComponent, setAgentationComponent] = useState<any>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      import("agentation")
        .then((mod) => {
          setAgentationComponent(() => mod.Agentation);
        })
        .catch(() => {});
    }
  }, []);

  if (process.env.NODE_ENV !== "development" || !AgentationComponent) {
    return null;
  }

  return (
    <AgentationComponent
      endpoint="http://localhost:3000"
      onSessionCreated={(sessionId: string) => {
        console.log("Agentation session started:", sessionId);
      }}
    />
  );
}
