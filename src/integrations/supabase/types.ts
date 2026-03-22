export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_reports: {
        Row: {
          content: string
          generated_at: string
          id: string
          report_type: string
          title: string
        }
        Insert: {
          content: string
          generated_at?: string
          id?: string
          report_type?: string
          title: string
        }
        Update: {
          content?: string
          generated_at?: string
          id?: string
          report_type?: string
          title?: string
        }
        Relationships: []
      }
      ai_chat_logs: {
        Row: {
          ai_response: string | null
          created_at: string
          id: string
          user_id: string | null
          user_message: string
        }
        Insert: {
          ai_response?: string | null
          created_at?: string
          id?: string
          user_id?: string | null
          user_message: string
        }
        Update: {
          ai_response?: string | null
          created_at?: string
          id?: string
          user_id?: string | null
          user_message?: string
        }
        Relationships: []
      }
      ai_monitor_reports: {
        Row: {
          anomalies: string[] | null
          generated_at: string
          id: string
          key_metrics: Json | null
          report_content: Json
          report_type: string
          suggestions: string[] | null
          summary: string | null
          triggered_by: string | null
        }
        Insert: {
          anomalies?: string[] | null
          generated_at?: string
          id?: string
          key_metrics?: Json | null
          report_content?: Json
          report_type?: string
          suggestions?: string[] | null
          summary?: string | null
          triggered_by?: string | null
        }
        Update: {
          anomalies?: string[] | null
          generated_at?: string
          id?: string
          key_metrics?: Json | null
          report_content?: Json
          report_type?: string
          suggestions?: string[] | null
          summary?: string | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          content: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published: boolean | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      board_preferences: {
        Row: {
          animations_enabled: boolean
          created_at: string
          id: string
          sound_id: string | null
          sound_volume: number
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          animations_enabled?: boolean
          created_at?: string
          id?: string
          sound_id?: string | null
          sound_volume?: number
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          animations_enabled?: boolean
          created_at?: string
          id?: string
          sound_id?: string | null
          sound_volume?: number
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          created_at: string
          id: string
          prayer_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prayer_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prayer_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayer_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          ai_reply: string | null
          created_at: string
          email: string | null
          id: string
          message: string
          name: string | null
          replied_at: string | null
        }
        Insert: {
          ai_reply?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message: string
          name?: string | null
          replied_at?: string | null
        }
        Update: {
          ai_reply?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          name?: string | null
          replied_at?: string | null
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          prayer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prayer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prayer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayer_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      prayed_actions: {
        Row: {
          created_at: string
          id: string
          prayer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prayer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prayer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayed_actions_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayer_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_cards: {
        Row: {
          background_url: string | null
          created_at: string
          created_by: string | null
          extended_prayer: string | null
          id: string
          likes_count: number
          prayed_count: number
          prayer_text: string
          source: string
          status: string
          tags: string[] | null
          text_style: string | null
          title: string | null
          updated_at: string
          views: number
        }
        Insert: {
          background_url?: string | null
          created_at?: string
          created_by?: string | null
          extended_prayer?: string | null
          id?: string
          likes_count?: number
          prayed_count?: number
          prayer_text: string
          source?: string
          status?: string
          tags?: string[] | null
          text_style?: string | null
          title?: string | null
          updated_at?: string
          views?: number
        }
        Update: {
          background_url?: string | null
          created_at?: string
          created_by?: string | null
          extended_prayer?: string | null
          id?: string
          likes_count?: number
          prayed_count?: number
          prayer_text?: string
          source?: string
          status?: string
          tags?: string[] | null
          text_style?: string | null
          title?: string | null
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      prayer_playlists: {
        Row: {
          created_at: string
          id: string
          name: string
          prayer_ids: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          prayer_ids?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          prayer_ids?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_logs: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_saved_prayers: {
        Row: {
          card_size: string
          created_at: string
          favorite: boolean | null
          grid_position: number
          id: string
          notes: string | null
          pinned: boolean | null
          position: number | null
          prayer_id: string
          user_id: string
        }
        Insert: {
          card_size?: string
          created_at?: string
          favorite?: boolean | null
          grid_position?: number
          id?: string
          notes?: string | null
          pinned?: boolean | null
          position?: number | null
          prayer_id: string
          user_id: string
        }
        Update: {
          card_size?: string
          created_at?: string
          favorite?: boolean | null
          grid_position?: number
          id?: string
          notes?: string | null
          pinned?: boolean | null
          position?: number | null
          prayer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_saved_prayers_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayer_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      verse_summaries: {
        Row: {
          created_at: string
          exegesis: string | null
          id: string
          reference: string
          summary: string | null
          updated_at: string
          verse_text: string | null
        }
        Insert: {
          created_at?: string
          exegesis?: string | null
          id?: string
          reference: string
          summary?: string | null
          updated_at?: string
          verse_text?: string | null
        }
        Update: {
          created_at?: string
          exegesis?: string | null
          id?: string
          reference?: string
          summary?: string | null
          updated_at?: string
          verse_text?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
