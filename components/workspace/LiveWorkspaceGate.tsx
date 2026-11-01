"use client";
import MailCalendar from "./MailCalendar";
import { seedWorkspace } from "@/lib/workspace/model";
export default function LiveWorkspaceGate({
  view,
  onDemo,
}: {
  view: string;
  onDemo: () => void;
}) {
  if (view === "Calendar") {
    const state = {
      ...seedWorkspace(),
      events: [],
      proposals: [],
      courses: [],
      associations: [],
      opportunities: [],
      goals: [],
      steps: [],
      documents: [],
    };
    return (
      <MailCalendar
        state={state}
        onChange={() => {}}
        onSource={() => {}}
        mode="unconfigured"
      />
    );
  }
  return (
    <section className="live-workspace-gate">
      <span className="category-chip">Live integration not configured</span>
      <h2>
        {view === "Academic"
          ? "Connect your authorized course context."
          : "Connect your authorized career context."}
      </h2>
      <p>
        {view === "Academic"
          ? "Campus membership, course associations and academic requirements must come from an approved Campus adapter or your explicit confirmation."
          : "Roadmaps goals and Passport evidence require approved, scoped access. No career stage, achievement or credential is inferred without review."}
      </p>
      <p>
        The versioned integration contracts are implemented. Live endpoints and
        authorization have not been supplied. No data is read from other Syrka
        applications.
      </p>
      <button className="primary" onClick={onDemo}>
        Explore this workflow in Demo Mailbox
      </button>
    </section>
  );
}
