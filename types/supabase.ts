export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          emergency_contacts: Json[];
          accessibility_preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          emergency_contacts?: Json[];
          accessibility_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          emergency_contacts?: Json[];
          accessibility_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      health_records: {
        Row: {
          id: string;
          user_id: string;
          type:
            | "skin_analysis"
            | "voice_log"
            | "medication_scan"
            | "chat_session";
          title: string | null;
          data: Json;
          analysis_result: Json | null;
          confidence_level: "Low" | "Medium" | "High" | null;
          urgency_level: "Routine" | "Monitor" | "Seek Care" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type:
            | "skin_analysis"
            | "voice_log"
            | "medication_scan"
            | "chat_session";
          title?: string | null;
          data: Json;
          analysis_result?: Json | null;
          confidence_level?: "Low" | "Medium" | "High" | null;
          urgency_level?: "Routine" | "Monitor" | "Seek Care" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?:
            | "skin_analysis"
            | "voice_log"
            | "medication_scan"
            | "chat_session";
          title?: string | null;
          data?: Json;
          analysis_result?: Json | null;
          confidence_level?: "Low" | "Medium" | "High" | null;
          urgency_level?: "Routine" | "Monitor" | "Seek Care" | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          messages: Json[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          messages?: Json[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          messages?: Json[];
          created_at?: string;
          updated_at?: string;
        };
      };
      medications: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          dosage: string | null;
          frequency: string | null;
          instructions: string | null;
          side_effects: string[] | null;
          interactions: Json[];
          image_url: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          dosage?: string | null;
          frequency?: string | null;
          instructions?: string | null;
          side_effects?: string[] | null;
          interactions?: Json[];
          image_url?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          dosage?: string | null;
          frequency?: string | null;
          instructions?: string | null;
          side_effects?: string[] | null;
          interactions?: Json[];
          image_url?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      medication_logs: {
        Row: {
          id: string;
          user_id: string;
          medication_id: string;
          taken_at: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          medication_id: string;
          taken_at?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          medication_id?: string;
          taken_at?: string;
          notes?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
