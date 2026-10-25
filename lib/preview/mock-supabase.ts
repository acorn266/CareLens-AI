// In-memory stand-in for the Supabase client, used only when isPreviewMode is
// true. Nothing is sent over the network and nothing is persisted: data lives
// in this module's memory and resets on page reload / server restart.

type Row = Record<string, any>;

export const PREVIEW_USER = {
  id: "preview-user",
  email: "preview@carelens.local",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: {},
  user_metadata: { full_name: "Preview User" },
  created_at: new Date().toISOString(),
};

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

const sampleAnalysis = (
  analysis: string,
  confidence: "Low" | "Medium" | "High",
  urgency: "Routine" | "Monitor" | "Seek Care",
  recommendations: string[],
  followUpQuestions?: string[]
) => ({
  analysis,
  confidence,
  urgency,
  recommendations,
  followUpQuestions,
  timestamp: new Date().toISOString(),
  preview: true,
});

const tables: Record<string, Row[]> = {
  profiles: [
    {
      id: PREVIEW_USER.id,
      email: PREVIEW_USER.email,
      full_name: "Preview User",
      created_at: daysAgo(30),
      updated_at: daysAgo(30),
    },
  ],
  health_records: [
    {
      id: "sample-skin-1",
      user_id: PREVIEW_USER.id,
      type: "skin_analysis",
      title: "[Sample] Skin Analysis",
      data: { preview: true, analysisType: "skin" },
      analysis_result: sampleAnalysis(
        "SAMPLE DATA. This is placeholder text shown in preview mode, not a real analysis.\n\n**Visual Assessment**: A small area of mild redness on the forearm.\n**Confidence Level**: Medium\n**Urgency Level**: Monitor",
        "Medium",
        "Monitor",
        [
          "Keep the area clean and dry",
          "Note any changes over the next few days",
          "Consult a healthcare professional if it spreads or becomes painful",
        ]
      ),
      created_at: daysAgo(1),
      updated_at: daysAgo(1),
    },
    {
      id: "sample-med-1",
      user_id: PREVIEW_USER.id,
      type: "medication_scan",
      title: "[Sample] Medication Scan",
      data: { preview: true, analysisType: "medication" },
      analysis_result: sampleAnalysis(
        "SAMPLE DATA. This is placeholder text shown in preview mode, not a real medication identification.\n\n**Medication Identification**: Example Medication 10 mg (fictional)\n**Usage Information**: As directed on the label",
        "Low",
        "Routine",
        ["Confirm medication details with your pharmacist"]
      ),
      created_at: daysAgo(3),
      updated_at: daysAgo(3),
    },
    {
      id: "sample-voice-1",
      user_id: PREVIEW_USER.id,
      type: "voice_log",
      title: "[Sample] Voice Symptom Log",
      data: {
        preview: true,
        transcript: "Sample transcript: I've had a mild headache since this morning.",
      },
      analysis_result: sampleAnalysis(
        "SAMPLE DATA. This is placeholder text shown in preview mode, not a real symptom analysis.\n\n**Symptom Extraction**: Mild headache\n**Urgency Assessment**: Routine",
        "Medium",
        "Routine",
        ["Stay hydrated and rest", "Seek care if the headache is severe or sudden"],
        ["How long has the headache lasted?", "Is it getting worse?"]
      ),
      created_at: daysAgo(5),
      updated_at: daysAgo(5),
    },
  ],
  conversations: [
    {
      id: "sample-conversation-1",
      user_id: PREVIEW_USER.id,
      title: "[Sample] Staying hydrated",
      messages: [
        {
          id: "m1",
          role: "user",
          content: "How much water should I drink each day?",
          timestamp: daysAgo(2),
        },
        {
          id: "m2",
          role: "assistant",
          content:
            "[Preview mode] This is a sample reply, not real AI output. In the full app, CareLens AI would answer here and remind you to check with a healthcare professional.",
          timestamp: daysAgo(2),
        },
      ],
      created_at: daysAgo(2),
      updated_at: daysAgo(2),
    },
  ],
  medications: [],
  medication_logs: [],
};

let signedIn = true;
const listeners = new Set<(event: string, session: any) => void>();

const session = () =>
  signedIn
    ? {
        access_token: "preview-access-token",
        token_type: "bearer",
        user: PREVIEW_USER,
      }
    : null;

const notify = (event: string) =>
  listeners.forEach((listener) => listener(event, session()));

class MockQuery implements PromiseLike<{ data: any; error: any }> {
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: Row[] = [];
  private filters: [string, unknown][] = [];
  private orderBy?: { column: string; ascending: boolean };
  private max?: number;
  private returnSingle = false;

  constructor(private table: string) {
    tables[table] ??= [];
  }

  select() {
    return this; // keeps the current op so insert().select() still inserts
  }
  insert(rows: Row | Row[]) {
    this.op = "insert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  upsert(rows: Row | Row[]) {
    this.op = "upsert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  update(values: Row) {
    this.op = "update";
    this.payload = [values];
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }
  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending ?? true };
    return this;
  }
  limit(count: number) {
    this.max = count;
    return this;
  }
  single() {
    this.returnSingle = true;
    return this;
  }
  maybeSingle() {
    return this.single();
  }

  private matches = (row: Row) =>
    this.filters.every(([column, value]) => row[column] === value);

  private run() {
    const rows = tables[this.table];
    let result: Row[] = [];

    switch (this.op) {
      case "insert":
        result = this.payload.map((row) => ({
          id: `preview-${Math.random().toString(36).slice(2, 10)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...row,
        }));
        rows.push(...result);
        break;
      case "upsert":
        for (const row of this.payload) {
          const existing = rows.find((r) => r.id === row.id);
          if (existing) Object.assign(existing, row);
          else rows.push(row);
          result.push(existing ?? row);
        }
        break;
      case "update":
        result = rows.filter(this.matches);
        result.forEach((row) => Object.assign(row, this.payload[0]));
        break;
      case "delete":
        result = rows.filter(this.matches);
        tables[this.table] = rows.filter((row) => !this.matches(row));
        break;
      default:
        result = rows.filter(this.matches);
    }

    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      result = [...result].sort((a, b) =>
        (a[column] > b[column] ? 1 : -1) * (ascending ? 1 : -1)
      );
    }
    if (this.max !== undefined) result = result.slice(0, this.max);

    const data = structuredClone(result);
    return { data: this.returnSingle ? data[0] ?? null : data, error: null };
  }

  then<T1 = { data: any; error: any }, T2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: any) => T2 | PromiseLike<T2>) | null
  ): PromiseLike<T1 | T2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }
}

export function createMockSupabaseClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: session() }, error: null }),
      getUser: async () => ({
        data: { user: signedIn ? PREVIEW_USER : null },
        error: null,
      }),
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        listeners.add(callback);
        return {
          data: { subscription: { unsubscribe: () => listeners.delete(callback) } },
        };
      },
      // Any email/password "signs in" as the preview user. Nothing is sent anywhere.
      signInWithPassword: async () => {
        signedIn = true;
        notify("SIGNED_IN");
        return { data: { user: PREVIEW_USER, session: session() }, error: null };
      },
      signUp: async () => {
        signedIn = true;
        notify("SIGNED_IN");
        return { data: { user: PREVIEW_USER, session: session() }, error: null };
      },
      signOut: async () => {
        signedIn = false;
        notify("SIGNED_OUT");
        return { error: null };
      },
      exchangeCodeForSession: async () => ({
        data: { session: session() },
        error: null,
      }),
    },
    from: (table: string) => new MockQuery(table),
  };
}
