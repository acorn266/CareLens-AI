import { createClient, type User } from "@supabase/supabase-js";
import { createSupabaseClient } from "@/lib/supabase";
import type { HealthRecord } from "@/lib/supabase";
import { isPreviewMode } from "@/lib/preview-mode";

// Server-side: has Supabase Auth validate the caller's access token, then
// returns a client that acts as that user (public anon key + the user's JWT),
// so every query is subject to Row Level Security. Returns null when the token
// is missing, expired, revoked or forged. No service-role key is involved.
export async function getUserScopedClient(
  authToken?: string
): Promise<{ supabase: any; user: User } | null> {
  if (!authToken) return null;

  const supabase = isPreviewMode
    ? createSupabaseClient()
    : createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: `Bearer ${authToken}` } },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      );

  // Passing the token makes Supabase Auth verify it server-side
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(authToken);

  return error || !user ? null : { supabase, user };
}

// Chooses the client for a write: the token's user on the server, or the
// signed-in session when called from the browser. The server never falls back
// to its shared client for user data.
async function resolveUserClient(authToken?: string) {
  if (authToken) return getUserScopedClient(authToken);
  if (typeof window === "undefined") return null;

  const supabase = createSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return error || !user ? null : { supabase, user: user as User };
}

// Health Records Functions
export async function saveHealthRecord(
  recordData: {
    type: "skin_analysis" | "voice_log" | "medication_scan" | "chat_session";
    title: string;
    data: any;
    analysisResult?: any;
  },
  authToken?: string
) {
  try {
    const auth = await resolveUserClient(authToken);

    if (!auth) {
      console.warn("User not authenticated, skipping health record save");
      return null; // Return null instead of throwing error
    }

    const { supabase, user } = auth;
    const { data, error } = await supabase
      .from("health_records")
      .insert([
        {
          user_id: user.id,
          type: recordData.type,
          title: recordData.title,
          data: recordData.data,
          analysis_result: recordData.analysisResult,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error saving health record:", error);
    throw error;
  }
}

export async function getHealthRecords(userId?: string) {
  try {
    const supabase = createSupabaseClient();

    // Get current user if userId not provided
    if (!userId) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        console.warn("User not authenticated for health records");
        return [];
      }
      userId = user.id;
    }

    const { data, error } = await supabase
      .from("health_records")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching health records:", error);
    return [];
  }
}

export async function updateHealthRecord(
  id: string,
  updateData: Partial<HealthRecord>
) {
  try {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("health_records")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error updating health record:", error);
    throw error;
  }
}

export async function deleteHealthRecord(id: string) {
  try {
    const supabase = createSupabaseClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    // Delete the record, ensuring it belongs to the current user
    const { error } = await supabase
      .from("health_records")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id); // Ensure user can only delete their own records

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error deleting health record:", error);
    throw error;
  }
}

// Conversation Functions
export async function saveConversation(
  title: string,
  messages: any[],
  authToken?: string
) {
  try {
    // User-scoped access: RLS limits this to the caller's own conversations
    const auth = await resolveUserClient(authToken);
    if (!auth) {
      throw new Error("User not authenticated");
    }
    const { supabase, user } = auth;

    // Log counts only; titles and messages contain health information
    console.log("Saving conversation:", { messageCount: messages.length });

    const { data, error } = await supabase
      .from("conversations")
      .insert([
        {
          user_id: user.id,
          title,
          messages,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    console.log("Conversation saved successfully:", data.id);
    return data;
  } catch (error) {
    console.error("Error saving conversation:", error);
    throw error;
  }
}

export async function updateConversation(
  id: string,
  messages: any[],
  authToken?: string
) {
  try {
    // User-scoped access: RLS limits this to the caller's own conversations
    const auth = await resolveUserClient(authToken);
    if (!auth) {
      throw new Error("User not authenticated");
    }
    const { supabase, user } = auth;

    const { data, error } = await supabase
      .from("conversations")
      .update({
        messages,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id) // Ensure user can only update their own conversations
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error updating conversation:", error);
    throw error;
  }
}

export async function getConversations(userId?: string) {
  try {
    const supabase = createSupabaseClient();

    // Get current user if userId not provided
    if (!userId) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        console.log("No authenticated user found");
        return [];
      }
      userId = user.id;
      console.log("Fetching conversations for user:", userId);
    }

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return [];
    }

    console.log("Found conversations:", data?.length || 0);
    return data || [];
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return [];
  }
}

// Health Statistics Functions
export async function getHealthStats(userId?: string) {
  try {
    const supabase = createSupabaseClient();

    // Get current user if userId not provided
    if (!userId) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return {
          totalRecords: 0,
          skinAnalyses: 0,
          voiceLogs: 0,
          medicationScans: 0,
          chatSessions: 0,
        };
      }
      userId = user.id;
    }

    // Get health records count by type
    const { data: records, error } = await supabase
      .from("health_records")
      .select("type")
      .eq("user_id", userId);

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    const stats = {
      totalRecords: records?.length || 0,
      skinAnalyses:
        records?.filter((r: any) => r.type === "skin_analysis").length || 0,
      voiceLogs: records?.filter((r: any) => r.type === "voice_log").length || 0,
      medicationScans:
        records?.filter((r: any) => r.type === "medication_scan").length || 0,
      chatSessions:
        records?.filter((r: any) => r.type === "chat_session").length || 0,
    };

    return stats;
  } catch (error) {
    console.error("Error fetching health stats:", error);
    return {
      totalRecords: 0,
      skinAnalyses: 0,
      voiceLogs: 0,
      medicationScans: 0,
      chatSessions: 0,
    };
  }
}

export async function getRecentHealthRecords(limit: number = 5) {
  try {
    const supabase = createSupabaseClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return [];
    }

    // Get recent health records
    const { data: records, error } = await supabase
      .from("health_records")
      .select("id, type, title, created_at, data")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    return records || [];
  } catch (error) {
    console.error("Error fetching recent health records:", error);
    return [];
  }
}
