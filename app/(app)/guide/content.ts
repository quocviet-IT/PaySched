// In-app user guide content. Plain-language, task-focused: "what you do and
// what it's for", not implementation detail. English only. Hard-coded as data.

export type GuideAudience = "user" | "admin";

export interface ProseSection {
  kind: "prose";
  heading: string;
  body: string;
}

export interface GlossarySection {
  kind: "glossary";
  items: { term: string; definition: string }[];
}

export interface FigureSection {
  kind: "figure";
  /** Matches a mockup in guide-figures.tsx. */
  variant: "dashboard-kpis" | "schedule-row" | "record-form";
  caption?: string;
  /** Explains the numbered ① ② markers drawn on the mockup. */
  callouts?: { n: number; label: string }[];
}

export type GuideSection = ProseSection | GlossarySection | FigureSection;

export interface GuideChapter {
  id: string;
  title: string;
  /** One short line shown in the "What you'll learn" callout. */
  whatYoullLearn: string;
  sections: GuideSection[];
}

export const AUDIENCE_LABELS: Record<GuideAudience, string> = {
  user: "Staff Guide",
  admin: "Manager Guide",
};

export const GUIDE: Record<GuideAudience, GuideChapter[]> = {
  user: [
    {
      id: "welcome",
      title: "Welcome & getting around",
      whatYoullLearn:
        "What this app is for, how to move around it, and how to sign in and out.",
      sections: [
        {
          kind: "prose",
          heading: "What this app is for",
          body: "This is where the company keeps track of money it has to pay out — rent, suppliers, loans, subscriptions, and one-off bills. You record what is due, when it's due, and mark it once it's paid, so nothing slips through the cracks.",
        },
        {
          kind: "prose",
          heading: "The menu on the left",
          body: "Everything lives in the left menu. Dashboard is your home view with the big picture. Schedules and History sit inside the Dashboard as tabs. Settings holds the lists everything is built from. Use the menu any time to jump straight to a section.",
        },
        {
          kind: "prose",
          heading: "Signing in and out",
          body: "Sign in with the username and password you were given. When you're done, use the Log out button in the top-right corner. If you share a computer, always log out so the next person can't act as you.",
        },
        {
          kind: "prose",
          heading: "Light or dark",
          body: "The little sun/moon button at the top switches between a light and a dark look. Pick whichever is easier on your eyes — it only changes how things look, not what they do.",
        },
      ],
    },
    {
      id: "dashboard",
      title: "Reading the dashboard",
      whatYoullLearn:
        "What each number and chart on the home screen is telling you, and how to dig into the detail.",
      sections: [
        {
          kind: "prose",
          heading: "The four numbers at the top",
          body: "Monthly Run-Rate is roughly what the company commits to spend every month on repeating bills. Upcoming is what's coming due soon. Overdue is what's already past its date and needs attention. Paid This Month is what you've actually paid out this calendar month.",
        },
        {
          kind: "prose",
          heading: "The timeframe buttons",
          body: "The buttons in the top-right (Next 7 Days, 30 Days, 90 Days, 12 Months) set how far ahead you're looking. Change them and the Upcoming number, the forecast chart, and the upcoming list all adjust to that window.",
        },
        {
          kind: "figure",
          variant: "dashboard-kpis",
          caption: "The numbers across the top, with the timeframe buttons above them.",
          callouts: [
            { n: 1, label: "Upcoming — what's due inside the timeframe you picked." },
            { n: 2, label: "Timeframe buttons — change the window and the numbers below follow." },
            { n: 3, label: "Overdue turns pink the moment something is past its date." },
          ],
        },
        {
          kind: "prose",
          heading: "The charts",
          body: "The forecast chart shows how much is expected to go out each month ahead. The breakdown donut splits your committed spending by type, company, or account — tap the toggle to switch. The spending trend shows what you've actually paid over recent months.",
        },
        {
          kind: "prose",
          heading: "Click anything to see the detail",
          body: "Almost everything is clickable. Click a number, a bar, or a slice and a table opens listing exactly which payments make it up. Click a row in that table to open the full detail of that expense, including its payment history.",
        },
        {
          kind: "prose",
          heading: "Upcoming Payments & Payment Issues",
          body: "The Upcoming Payments panel lists what's due, either grouped by company or as a plain list where you can record a payment on the spot. The Payment Issues panel flags anything that needs a second look — overdue items, late payments, or amounts that don't match what was scheduled.",
        },
      ],
    },
    {
      id: "schedules",
      title: "Adding & managing schedules",
      whatYoullLearn:
        "How to set up a payment, change it, and cancel or bring it back.",
      sections: [
        {
          kind: "prose",
          heading: "What a schedule is",
          body: "A schedule is one thing the company pays — for example \"office rent, every month\". You set it up once, and the app keeps reminding you when it's due and lets you record each payment against it.",
        },
        {
          kind: "prose",
          heading: "Add one",
          body: "Open the Schedules tab and click Add Schedule. Pick the vendor, the amount, how often it repeats (one-time, monthly, and so on), the next due date, and which company, account, and type it belongs to. Save, and it appears in the list.",
        },
        {
          kind: "prose",
          heading: "Edit one",
          body: "Click the pencil on any row to change its details — say the amount went up or the date moved. Your change takes effect right away across the dashboard.",
        },
        {
          kind: "prose",
          heading: "Cancel or bring it back",
          body: "Inside the edit window there's an Active switch. Turn it off to cancel a schedule you no longer pay — it stops counting in every total and chart and shows a faded \"Inactive\" tag. Turn it back on any time to revive it.",
        },
        {
          kind: "figure",
          variant: "schedule-row",
          caption: "A schedule row, and what a cancelled one looks like below it.",
          callouts: [
            { n: 1, label: "Record a payment ($) or edit (✎) the schedule, right from its row." },
            { n: 2, label: "A cancelled schedule is faded, tagged \"Inactive\", and left out of every total." },
          ],
        },
        {
          kind: "prose",
          heading: "Find one quickly",
          body: "Use the search box to type a vendor or company, or the tabs to show only what's due soon, overdue, or recurring. The Calendar view lays the same schedules out by date.",
        },
      ],
    },
    {
      id: "record-payment",
      title: "Recording a payment",
      whatYoullLearn:
        "How to mark something as paid, attach proof, and fix a mistake.",
      sections: [
        {
          kind: "prose",
          heading: "Mark it paid",
          body: "When a bill is paid, find its schedule and click the dollar icon (or the Record button in the upcoming list). Enter the date you paid, the amount, and how you paid it. This is what moves the bill from \"due\" to \"paid\".",
        },
        {
          kind: "prose",
          heading: "Attach the proof",
          body: "You can attach a confirmation file and an approval screenshot to a payment. Adding these keeps a clear paper trail, so anyone can later see that the payment really happened and was approved.",
        },
        {
          kind: "figure",
          variant: "record-form",
          caption: "The Record Payment form. Date, amount, and method are required; the rest is optional but worth adding.",
          callouts: [
            { n: 1, label: "Attach the payment confirmation — a receipt or bank slip." },
            { n: 2, label: "Attach the approval screenshot, so there's proof someone signed off." },
          ],
        },
        {
          kind: "prose",
          heading: "Who approved it",
          body: "If someone signed off on the payment, pick them in the Approved by box. It's optional, but it answers \"who said yes?\" without anyone having to ask.",
        },
        {
          kind: "prose",
          heading: "Fix a mistake",
          body: "In the History tab you can edit or delete a payment you got wrong. You'll be asked for a short reason — that reason is saved so the history stays honest. You can also manage the attached files after the fact.",
        },
      ],
    },
    {
      id: "csv-import",
      title: "Importing from a spreadsheet",
      whatYoullLearn:
        "How to bring in lots of payments at once instead of typing them one by one.",
      sections: [
        {
          kind: "prose",
          heading: "When to use it",
          body: "If you already have a list of payments in a spreadsheet, you don't have to retype them. The CSV import lets you load the whole list in one go.",
        },
        {
          kind: "prose",
          heading: "How it works",
          body: "Open Import (CSV) from the Schedules tab and upload your file. The app walks you through matching your columns and account names to the ones it uses, shows you a preview to review, then brings everything in once you confirm.",
        },
        {
          kind: "prose",
          heading: "Check before you confirm",
          body: "Always look over the preview step. It's much easier to fix a wrong column or a mismatched account there than to clean up dozens of records afterward.",
        },
      ],
    },
    {
      id: "tips",
      title: "Everyday tips",
      whatYoullLearn: "Small habits that keep the numbers trustworthy.",
      sections: [
        {
          kind: "prose",
          heading: "Record payments the day they happen",
          body: "The dashboard is only as right as what you put in. Recording a payment the same day keeps Overdue and Paid This Month accurate for everyone looking.",
        },
        {
          kind: "prose",
          heading: "Cancel instead of delete",
          body: "If you stop paying something, turn its Active switch off rather than deleting it. You keep the history, and it simply drops out of the live totals.",
        },
        {
          kind: "prose",
          heading: "Use the timeframe to plan",
          body: "Switch the timeframe to Next 90 Days or Next 12 Months before a planning meeting to see what's coming, not just what's due this week.",
        },
        {
          kind: "prose",
          heading: "Trust the Payment Issues panel",
          body: "If something shows up there, deal with it. It's the app's way of pointing at the few items that are off, so you don't have to scan everything yourself.",
        },
      ],
    },
    {
      id: "glossary",
      title: "Glossary",
      whatYoullLearn:
        "A quick reference for every term you'll meet, in plain words. Come back any time you forget one.",
      sections: [
        {
          kind: "glossary",
          items: [
            { term: "Schedule", definition: "One thing the company pays, set up once — like \"rent, monthly\". The app tracks when it's due and what's been paid against it." },
            { term: "Vendor", definition: "Who you're paying — the landlord, supplier, bank, or service." },
            { term: "Frequency", definition: "How often a schedule repeats: one-time, bi-weekly, monthly, quarterly, or yearly." },
            { term: "Next due date", definition: "The date the next payment is expected. The status (due soon, overdue) is worked out from this." },
            { term: "Monthly run-rate", definition: "Roughly what the company commits to spend each month on repeating bills, with every frequency converted to a per-month figure." },
            { term: "Upcoming", definition: "What's coming due inside the timeframe you've chosen at the top of the dashboard." },
            { term: "Overdue", definition: "A payment whose due date has already passed and hasn't been recorded as paid." },
            { term: "Paid this month", definition: "The payments you've actually recorded in the current calendar month." },
            { term: "Payment record", definition: "Proof that a bill was paid — the date, amount, method, and any attached files." },
            { term: "Active / Inactive", definition: "An active schedule counts in the totals; an inactive (cancelled) one is kept for history but left out of every number and chart." },
            { term: "Drill-down", definition: "The table that opens when you click a number or chart, listing exactly which payments make it up." },
          ],
        },
      ],
    },
  ],
  admin: [
    {
      id: "welcome",
      title: "Welcome",
      whatYoullLearn: "What you can do as an admin that regular staff can't.",
      sections: [
        {
          kind: "prose",
          heading: "Your extra powers",
          body: "As an admin you do everything a normal user does, plus you set up the building blocks: the people who can log in, and the lists of companies, vendors, accounts, and categories that schedules are built from. You can also delete records and review the full change history.",
        },
        {
          kind: "prose",
          heading: "Set things up first",
          body: "Before staff can add schedules smoothly, the lists in Settings should exist — companies, vendors, accounts, payment types, and expense types. A few minutes here saves everyone time later.",
        },
      ],
    },
    {
      id: "people",
      title: "People & access",
      whatYoullLearn: "How to give someone access and decide what they can do.",
      sections: [
        {
          kind: "prose",
          heading: "Add a user",
          body: "Open Users from the menu and create an account with a username and password. Hand those to the person — they sign in with them and can change details from their Account page.",
        },
        {
          kind: "prose",
          heading: "User vs Admin",
          body: "A User can record and manage payments day to day. An Admin can also manage other users, edit the master lists, and delete things. Give Admin only to the few people who truly need it.",
        },
        {
          kind: "prose",
          heading: "Deleting is admin-only",
          body: "Only admins can delete schedules and payment records. This is on purpose — it stops everyday mistakes from wiping out history.",
        },
      ],
    },
    {
      id: "lists",
      title: "Setting up your lists",
      whatYoullLearn:
        "What each list in Settings is for, so schedules have the right options to choose from.",
      sections: [
        {
          kind: "prose",
          heading: "Internal companies",
          body: "The companies (or branches) the spending belongs to. Every schedule is assigned to one, which is how the dashboard can break spending down by company.",
        },
        {
          kind: "prose",
          heading: "Vendors",
          body: "Who you pay. Adding vendors here means staff pick from a clean list instead of typing names differently every time.",
        },
        {
          kind: "prose",
          heading: "Payment accounts",
          body: "The bank accounts or cards money goes out from, each tied to a bank and a type (checking, savings, credit card, and so on). This is how spending can be broken down by account.",
        },
        {
          kind: "prose",
          heading: "Payment types & expense types",
          body: "Payment types describe how you pay (bank transfer, card, cash…). Expense types describe what the money is for (rent, utilities, supplies…). Both keep reporting consistent across the team.",
        },
      ],
    },
    {
      id: "tidy",
      title: "Keeping things tidy",
      whatYoullLearn:
        "How to keep the data clean and see what changed.",
      sections: [
        {
          kind: "prose",
          heading: "The change log (Audit)",
          body: "The Audit page records who created, edited, or deleted what, and when. When a number looks off, this is where you find out what happened.",
        },
        {
          kind: "prose",
          heading: "Delete safely",
          body: "Prefer cancelling a schedule (turning it Inactive) over deleting it, so you keep the history. Delete only when something was created by mistake. Editing or deleting a payment always asks for a reason, which is saved.",
        },
        {
          kind: "prose",
          heading: "Watch late payments",
          body: "When a payment is recorded after its due date, the app notes how many days late it was and surfaces it in Payment Issues. Use that to spot patterns — a vendor that's always late, or an approval step that drags.",
        },
      ],
    },
    {
      id: "glossary",
      title: "Glossary",
      whatYoullLearn: "A few terms that matter most when you're administering the system.",
      sections: [
        {
          kind: "glossary",
          items: [
            { term: "Role", definition: "What a person is allowed to do. \"User\" handles day-to-day payments; \"Admin\" also manages people, lists, and deletions." },
            { term: "Master lists", definition: "The reusable options in Settings — companies, vendors, accounts, payment types, expense types — that schedules are built from." },
            { term: "Audit log", definition: "The running record of who changed what and when, used to answer questions after the fact." },
            { term: "Days late", definition: "How many days after the due date a payment was actually recorded. Zero means it was on time." },
            { term: "Underpaid / Overpaid", definition: "A recorded payment that came in below or above the scheduled amount — flagged in Payment Issues for review." },
          ],
        },
      ],
    },
  ],
};
