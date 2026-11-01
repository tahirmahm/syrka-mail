import { z } from "zod";
export type DemoFolder =
  "Inbox" | "Sent" | "Drafts" | "Scheduled" | "Archive" | "Spam" | "Trash";
export type Category =
  | "Academic"
  | "Applications"
  | "Work"
  | "Personal"
  | "Newsletters"
  | "Administration";
export interface DemoAttachment {
  id: string;
  name: string;
  content: string;
  type: string;
}
export interface DemoMessage {
  id: string;
  from: string;
  to: string[];
  cc: string[];
  bcc?: string[];
  date: string;
  body: string;
  attachments: DemoAttachment[];
}
export interface DemoThread {
  id: string;
  subject: string;
  category: Category;
  folder: DemoFolder;
  unread: boolean;
  starred: boolean;
  important?: boolean;
  replyToThreadId?: string;
  snoozedUntil?: string;
  scheduledAt?: string;
  messages: DemoMessage[];
}
export interface DemoCommitment {
  id: string;
  threadId: string;
  title: string;
  destination: string;
  state: "proposed" | "approved" | "dismissed" | "completed";
  due: string;
  excerpt: string;
}
export interface DemoState {
  version: 1;
  threads: DemoThread[];
  commitments: DemoCommitment[];
  applicationStates: Record<string, string>;
}
export const DEMO_KEY = "syrka.mail.demo.v1";
export const DEMO_IDENTITY = "Alex Morgan <alex@syrka.example>";
const topics: [string, Category, string, string][] = [
  [
    "Thesis proposal: feedback and next steps",
    "Academic",
    "Dr. Maya Chen",
    "Please revise the research question and send a two-page outline by Friday. Your comparison of urban mobility policies is promising. Let us review the methodology at our next supervision meeting.",
  ],
  [
    "Interview invitation — Policy Research internship",
    "Applications",
    "Elena at Northbridge",
    "We enjoyed reviewing your application. Could you attend an interview on 12 November at 14:00 CET? Please confirm your availability and bring a short example of your research.",
  ],
  [
    "Your enrolment documents are ready",
    "Administration",
    "Student Services",
    "Your fictional enrolment certificate is available. Please review your registered address before submitting it to the scholarship team.",
  ],
  [
    "Project Atlas — review before our next meeting",
    "Work",
    "Sam Rivera",
    "The project brief is ready for review. Please share your comments on the objectives and proposed timeline. We will decide the next steps together.",
  ],
  [
    "Sunday lunch plans",
    "Personal",
    "Jordan Ellis",
    "Would you like to meet for lunch this Sunday? I found a quiet place near the park. No rush—let me know when you have a moment.",
  ],
  [
    "This week in sustainable cities",
    "Newsletters",
    "The Urban Review",
    "This fictional weekly edition explores walkable neighborhoods, open transport data and three new research papers. Save a little reading time for the weekend.",
  ],
  [
    "Reading list for International Relations",
    "Academic",
    "Professor Ada Brooks",
    "For our next seminar, read chapters three and four and prepare one discussion question. The reading notes are attached as a safe text sample.",
  ],
  [
    "Application received — Graduate Analyst",
    "Applications",
    "Recruitment at Meridian",
    "Thank you for submitting your application. Our team will review it over the coming two weeks. No additional documents are required at this stage.",
  ],
  [
    "Scholarship supporting documents checklist",
    "Administration",
    "Scholarship Office",
    "Please provide an enrolment certificate and a short statement of purpose by 20 November. This message is fictional and creates no real deadline.",
  ],
  [
    "Design review: a clearer onboarding journey",
    "Work",
    "Noah Patel",
    "I have incorporated the accessibility feedback. Please check the revised navigation labels and empty states before our design review.",
  ],
  [
    "A few photographs from the coast",
    "Personal",
    "Taylor Kim",
    "I finally sorted the photographs from our trip. The little cafe by the station was a highlight. Let us plan another weekend away soon.",
  ],
  [
    "Your monthly library bulletin",
    "Newsletters",
    "University Library",
    "New collections include policy journals, digital archives and research-method guides. Join the introductory session if you would like a refresher.",
  ],
  [
    "Seminar moved to room B204",
    "Academic",
    "Course Administration",
    "The seminar will take place in room B204 this week. The time is unchanged. Please check the course page for the reading list.",
  ],
  [
    "Research assistant opportunity",
    "Applications",
    "Dr. Sofia Marin",
    "Our lab is looking for a part-time research assistant. If you are interested, send a short note describing your relevant coursework. No offer has been made.",
  ],
  [
    "Accommodation renewal reminder",
    "Administration",
    "Campus Housing",
    "The fictional renewal form is due at the end of the month. Review your room preference and contact the housing team if you need help.",
  ],
  [
    "Meeting notes and open questions",
    "Work",
    "Priya Singh",
    "We agreed to collect additional stakeholder feedback. The budget question remains open. Please review the notes and correct anything we misunderstood.",
  ],
  [
    "Coffee next week?",
    "Personal",
    "Morgan Lee",
    "It would be good to catch up next week. I am free Tuesday or Thursday afternoon. Tell me which works better for you.",
  ],
  [
    "Three opportunities worth a closer look",
    "Newsletters",
    "Career Dispatch",
    "This sample newsletter includes a policy fellowship, a campus research role and an open data workshop. Check the original requirements before applying.",
  ],
  [
    "Feedback on your literature review",
    "Academic",
    "Dr. Maya Chen",
    "Your literature review connects the main debates well. Please distinguish evidence from interpretation and add references for the final paragraph.",
  ],
  [
    "Next stage: portfolio review",
    "Applications",
    "Elena at Northbridge",
    "We would like to review a writing sample. Please choose work that you are authorized to share and remove confidential information.",
  ],
  [
    "Library account notification",
    "Administration",
    "Library Services",
    "A book on your reading list is ready for collection. Please bring your student card. This is a fictional notice for the demo mailbox.",
  ],
  [
    "Workshop agenda for Thursday",
    "Work",
    "Sam Rivera",
    "The workshop will cover research questions, evidence quality and next steps. Please bring one question you would like the team to discuss.",
  ],
  [
    "Weekend walking route",
    "Personal",
    "Jordan Ellis",
    "Here is the route we discussed. It follows the river and finishes near the old town. We can adjust it if the weather changes.",
  ],
  [
    "Research digest: institutions and technology",
    "Newsletters",
    "Open Research Digest",
    "A curated sample of new working papers, interviews and methods resources. This fictional digest contains no external tracking links.",
  ],
];
export function seedDemo(now = new Date()): DemoState {
  const threads: DemoThread[] = Array.from({ length: 42 }, (_, i) => {
    const [subject, category, name, body] = topics[i % topics.length];
    const folder: DemoFolder =
      i < 27
        ? "Inbox"
        : i < 32
          ? "Sent"
          : i < 35
            ? "Drafts"
            : i < 37
              ? "Scheduled"
              : i < 40
                ? "Archive"
                : i === 40
                  ? "Spam"
                  : "Trash";
    const date = new Date(now.getTime() - (i * 3 + 1) * 3600000).toISOString();
    const outgoing = ["Sent", "Drafts", "Scheduled"].includes(folder);
    const from = outgoing
      ? DEMO_IDENTITY
      : `${name} <${name
          .toLowerCase()
          .replace(/[^a-z]/g, "")
          .slice(0, 24)}@mail.example>`;
    const attachments: DemoAttachment[] =
      i % 7 === 0
        ? [
            {
              id: `sample-${i}`,
              name: i % 2 ? "seminar-notes.txt" : "meeting-invitation.ics",
              type: i % 2 ? "text/plain" : "text/calendar",
              content:
                i % 2
                  ? "SYRKA MAIL — FICTIONAL DEMO ATTACHMENT\n\nReading notes\n1. Review the research question.\n2. Compare the available evidence.\n3. Bring one question to the seminar."
                  : "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Syrka//Demo Only//EN\r\nBEGIN:VEVENT\r\nUID:fictional-demo@syrka.example\r\nDTSTART:20261112T130000Z\r\nDTEND:20261112T133000Z\r\nSUMMARY:Fictional demo interview\r\nEND:VEVENT\r\nEND:VCALENDAR",
            },
          ]
        : [];
    const first: DemoMessage = {
      id: `message-${i}-1`,
      from,
      to: [outgoing ? "colleague@mail.example" : DEMO_IDENTITY],
      cc: i % 5 === 0 ? ["Sam Rivera <sam@mail.example>"] : [],
      date,
      body: outgoing
        ? `Hello ${name},\n\nThank you for the update about ${subject.toLowerCase()}. I will review the details and follow up with any questions.\n\nBest wishes,\nAlex\n\n[Fictional message — Syrka Demo Mailbox]`
        : `Hello Alex,\n\n${body}\n\nBest wishes,\n${name}\n\n[Fictional message — Syrka Demo Mailbox]`,
      attachments,
    };
    const messages = [first];
    if (i < 10)
      messages.push({
        id: `message-${i}-2`,
        from: DEMO_IDENTITY,
        to: [from],
        cc: [],
        date: new Date(Date.parse(date) + 600000).toISOString(),
        body: "Thank you for the update. I will review the details and follow up with any questions.\n\nAlex\n\n[Simulated conversation — no message was sent]",
        attachments: [],
      });
    return {
      id: `thread-${i}`,
      subject: i >= 24 ? `Re: ${subject}` : subject,
      category,
      folder,
      unread: folder === "Inbox" && i % 3 !== 0,
      starred: i % 6 === 0,
      important: i % 5 === 0,
      ...(i === 8
        ? { snoozedUntil: new Date(now.getTime() + 86400000).toISOString() }
        : {}),
      ...(folder === "Scheduled"
        ? {
            scheduledAt: new Date(
              now.getTime() + 86400000 * (i - 34),
            ).toISOString(),
          }
        : {}),
      messages,
    };
  });
  return {
    version: 1,
    threads,
    commitments: [
      {
        id: "commitment-1",
        threadId: "thread-0",
        title: "Review thesis outline",
        destination: "Dashboard",
        state: "proposed",
        due: new Date(now.getTime() + 3 * 86400000).toISOString(),
        excerpt:
          "Please revise the research question and send a two-page outline by Friday.",
      },
      {
        id: "commitment-2",
        threadId: "thread-1",
        title: "Confirm interview availability",
        destination: "Calendar",
        state: "proposed",
        due: "2026-11-12T13:00:00Z",
        excerpt: "Could you attend an interview on 12 November at 14:00 CET?",
      },
    ],
    applicationStates: {
      "thread-1": "Interview",
      "thread-7": "Applied",
      "thread-13": "Exploring",
      "thread-19": "Review",
    },
  };
}
export function updateThread(
  state: DemoState,
  id: string,
  patch: Partial<DemoThread>,
): DemoState {
  return {
    ...state,
    threads: state.threads.map((t) =>
      t.id === id ? { ...t, ...patch, id: t.id } : t,
    ),
  };
}
export function visibleThreads(
  state: DemoState,
  folder: string,
  query = "",
  unreadOnly = false,
) {
  return state.threads
    .filter((t) => {
      const folderMatch =
        folder === "Search"
          ? t.folder !== "Trash"
          : folder === "All Mail"
            ? !["Trash", "Spam"].includes(t.folder)
            : folder === "Sent"
              ? t.messages.some((m) => m.from === DEMO_IDENTITY) &&
                !["Trash", "Spam", "Drafts", "Scheduled"].includes(t.folder)
              : folder === "Important"
                ? !!t.important && !["Trash", "Spam"].includes(t.folder)
                : folder === "Starred"
                  ? t.starred && !["Trash", "Spam"].includes(t.folder)
                  : folder === "Snoozed"
                    ? !!t.snoozedUntil
                    : folder === "Academic"
                      ? t.category === "Academic"
                      : folder === "Applications"
                        ? t.category === "Applications"
                        : t.folder === folder &&
                          (folder !== "Inbox" || !t.snoozedUntil);
      return (
        folderMatch &&
        (!unreadOnly || t.unread) &&
        [
          t.subject,
          t.category,
          ...t.messages.map(
            (m) => m.from + " " + m.to.join(" ") + " " + m.body,
          ),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())
      );
    })
    .sort(
      (a, b) =>
        Date.parse(b.messages.at(-1)!.date) -
        Date.parse(a.messages.at(-1)!.date),
    );
}
export function runScheduled(state: DemoState, now = Date.now()): DemoState {
  return {
    ...state,
    threads: state.threads.map((t) =>
      t.folder === "Scheduled" &&
      t.scheduledAt &&
      Date.parse(t.scheduledAt) <= now
        ? { ...t, folder: "Sent", scheduledAt: undefined }
        : t.snoozedUntil && Date.parse(t.snoozedUntil) <= now
          ? { ...t, snoozedUntil: undefined }
          : t,
    ),
  };
}
const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  content: z.string().max(100000),
  type: z.enum(["text/plain", "text/calendar"]),
});
const messageSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.array(z.string()),
  cc: z.array(z.string()),
  bcc: z.array(z.string()).optional(),
  date: z.string(),
  body: z.string().max(100000),
  attachments: z.array(attachmentSchema),
});
const threadSchema = z.object({
  id: z.string(),
  subject: z.string(),
  category: z.enum([
    "Academic",
    "Applications",
    "Work",
    "Personal",
    "Newsletters",
    "Administration",
  ]),
  folder: z.enum([
    "Inbox",
    "Sent",
    "Drafts",
    "Scheduled",
    "Archive",
    "Spam",
    "Trash",
  ]),
  unread: z.boolean(),
  starred: z.boolean(),
  important: z.boolean().optional(),
  replyToThreadId: z.string().optional(),
  snoozedUntil: z.string().optional(),
  scheduledAt: z.string().optional(),
  messages: z.array(messageSchema).min(1).max(100),
});
const demoSchema = z.object({
  version: z.literal(1),
  threads: z.array(threadSchema).max(1000),
  commitments: z
    .array(
      z.object({
        id: z.string(),
        threadId: z.string(),
        title: z.string(),
        destination: z.string(),
        state: z.enum(["proposed", "approved", "dismissed", "completed"]),
        due: z.string(),
        excerpt: z.string(),
      }),
    )
    .max(1000),
  applicationStates: z.record(z.string(), z.string()),
});
export function restoreDemo(value: string | null): DemoState {
  if (!value) return seedDemo();
  try {
    const parsed = demoSchema.safeParse(JSON.parse(value));
    return parsed.success ? runScheduled(parsed.data) : seedDemo();
  } catch {
    return seedDemo();
  }
}
