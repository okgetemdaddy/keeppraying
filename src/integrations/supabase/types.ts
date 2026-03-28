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
      accountability_circle_members: {
        Row: {
          circle_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          circle_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          circle_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accountability_circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "accountability_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      accountability_circle_prayers: {
        Row: {
          circle_id: string
          created_at: string
          id: string
          prayer_id: string
          shared_by: string
        }
        Insert: {
          circle_id: string
          created_at?: string
          id?: string
          prayer_id: string
          shared_by: string
        }
        Update: {
          circle_id?: string
          created_at?: string
          id?: string
          prayer_id?: string
          shared_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "accountability_circle_prayers_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "accountability_circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accountability_circle_prayers_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayer_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      accountability_circles: {
        Row: {
          ai_encouragement: boolean
          created_at: string
          created_by: string
          description: string | null
          id: string
          invite_code: string
          max_members: number
          name: string
          updated_at: string
        }
        Insert: {
          ai_encouragement?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          invite_code?: string
          max_members?: number
          name: string
          updated_at?: string
        }
        Update: {
          ai_encouragement?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          invite_code?: string
          max_members?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      accountability_encouragements: {
        Row: {
          circle_id: string
          content: string
          generated_at: string
          id: string
        }
        Insert: {
          circle_id: string
          content: string
          generated_at?: string
          id?: string
        }
        Update: {
          circle_id?: string
          content?: string
          generated_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accountability_encouragements_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "accountability_circles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      breath_collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          prayer_ids: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          prayer_ids?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          prayer_ids?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      classical_prayers: {
        Row: {
          author: string
          author_era: string | null
          created_at: string
          created_by: string | null
          extended_text: string | null
          id: string
          labels: string[] | null
          prayer_text: string
          source_reference: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author: string
          author_era?: string | null
          created_at?: string
          created_by?: string | null
          extended_text?: string | null
          id?: string
          labels?: string[] | null
          prayer_text: string
          source_reference?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          author_era?: string | null
          created_at?: string
          created_by?: string | null
          extended_text?: string | null
          id?: string
          labels?: string[] | null
          prayer_text?: string
          source_reference?: string | null
          title?: string
          updated_at?: string
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
      daily_breath: {
        Row: {
          active_date: string
          created_at: string
          id: string
          prayer_id: string
          selected_by: string | null
        }
        Insert: {
          active_date: string
          created_at?: string
          id?: string
          prayer_id: string
          selected_by?: string | null
        }
        Update: {
          active_date?: string
          created_at?: string
          id?: string
          prayer_id?: string
          selected_by?: string | null
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          donation_type: string
          id: string
          status: string
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          donation_type?: string
          id?: string
          status?: string
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          donation_type?: string
          id?: string
          status?: string
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      family_room_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "family_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      family_room_prayers: {
        Row: {
          created_at: string
          id: string
          prayer_id: string
          room_id: string
          shared_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          prayer_id: string
          room_id: string
          shared_by: string
        }
        Update: {
          created_at?: string
          id?: string
          prayer_id?: string
          room_id?: string
          shared_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_room_prayers_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayer_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_room_prayers_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "family_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      family_rooms: {
        Row: {
          child_friendly: boolean
          created_at: string
          created_by: string
          description: string | null
          id: string
          invite_code: string
          name: string
          theme: string
          updated_at: string
        }
        Insert: {
          child_friendly?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          invite_code?: string
          name: string
          theme?: string
          updated_at?: string
        }
        Update: {
          child_friendly?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          invite_code?: string
          name?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback_submissions: {
        Row: {
          created_at: string
          feedback_type: string
          id: string
          message: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_type?: string
          id?: string
          message: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_type?: string
          id?: string
          message?: string
          title?: string | null
          user_id?: string
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
          audio_url: string | null
          background_url: string | null
          created_at: string
          created_by: string | null
          extended_prayer: string | null
          id: string
          labels: string[] | null
          likes_count: number
          meditation_essay: string | null
          meditation_link: string | null
          prayed_count: number
          prayer_text: string
          prayer_type: string
          region: string | null
          source: string
          status: string
          text_style: string | null
          title: string | null
          updated_at: string
          views: number
        }
        Insert: {
          audio_url?: string | null
          background_url?: string | null
          created_at?: string
          created_by?: string | null
          extended_prayer?: string | null
          id?: string
          labels?: string[] | null
          likes_count?: number
          meditation_essay?: string | null
          meditation_link?: string | null
          prayed_count?: number
          prayer_text: string
          prayer_type?: string
          region?: string | null
          source?: string
          status?: string
          text_style?: string | null
          title?: string | null
          updated_at?: string
          views?: number
        }
        Update: {
          audio_url?: string | null
          background_url?: string | null
          created_at?: string
          created_by?: string | null
          extended_prayer?: string | null
          id?: string
          labels?: string[] | null
          likes_count?: number
          meditation_essay?: string | null
          meditation_link?: string | null
          prayed_count?: number
          prayer_text?: string
          prayer_type?: string
          region?: string | null
          source?: string
          status?: string
          text_style?: string | null
          title?: string | null
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      prayer_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "prayer_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_group_prayers: {
        Row: {
          created_at: string
          group_id: string
          id: string
          prayer_id: string
          shared_by: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          prayer_id: string
          shared_by: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          prayer_id?: string
          shared_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_group_prayers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "prayer_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_group_prayers_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayer_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          invite_code: string
          name: string
          theme: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          invite_code?: string
          name: string
          theme?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          invite_code?: string
          name?: string
          theme?: string
          updated_at?: string
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
      prayer_requests: {
        Row: {
          admin_response: string | null
          assigned_prayer_id: string | null
          created_at: string
          escalation_batch: number
          id: string
          is_urgent: boolean
          last_escalated_at: string | null
          message: string
          request_type: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_response?: string | null
          assigned_prayer_id?: string | null
          created_at?: string
          escalation_batch?: number
          id?: string
          is_urgent?: boolean
          last_escalated_at?: string | null
          message: string
          request_type?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_response?: string | null
          assigned_prayer_id?: string | null
          created_at?: string
          escalation_batch?: number
          id?: string
          is_urgent?: boolean
          last_escalated_at?: string | null
          message?: string
          request_type?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_requests_assigned_prayer_id_fkey"
            columns: ["assigned_prayer_id"]
            isOneToOne: false
            referencedRelation: "prayer_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_standby: {
        Row: {
          expires_at: string | null
          id: string
          is_active: boolean
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          id?: string
          is_active?: boolean
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          id?: string
          is_active?: boolean
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          current_streak: number
          email: string | null
          first_donated_at: string | null
          full_name: string | null
          id: string
          is_donor: boolean
          is_founder: boolean
          is_public: boolean
          last_prayed_date: string | null
          longest_streak: number
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_streak?: number
          email?: string | null
          first_donated_at?: string | null
          full_name?: string | null
          id: string
          is_donor?: boolean
          is_founder?: boolean
          is_public?: boolean
          last_prayed_date?: string | null
          longest_streak?: number
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_streak?: number
          email?: string | null
          first_donated_at?: string | null
          full_name?: string | null
          id?: string
          is_donor?: boolean
          is_founder?: boolean
          is_public?: boolean
          last_prayed_date?: string | null
          longest_streak?: number
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
      standby_responses: {
        Row: {
          created_at: string
          id: string
          message: string
          prayer_id: string
          responder_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          prayer_id: string
          responder_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          prayer_id?: string
          responder_id?: string
        }
        Relationships: []
      }
      testimonies: {
        Row: {
          body: string
          created_at: string
          flagged: boolean
          id: string
          prayer_id: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          flagged?: boolean
          id?: string
          prayer_id?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          flagged?: boolean
          id?: string
          prayer_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonies_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayer_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      testimony_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          testimony_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          testimony_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          testimony_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimony_comments_testimony_id_fkey"
            columns: ["testimony_id"]
            isOneToOne: false
            referencedRelation: "testimonies"
            referencedColumns: ["id"]
          },
        ]
      }
      testimony_flags: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          testimony_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          testimony_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          testimony_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimony_flags_testimony_id_fkey"
            columns: ["testimony_id"]
            isOneToOne: false
            referencedRelation: "testimonies"
            referencedColumns: ["id"]
          },
        ]
      }
      testimony_likes: {
        Row: {
          created_at: string
          id: string
          testimony_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          testimony_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          testimony_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimony_likes_testimony_id_fkey"
            columns: ["testimony_id"]
            isOneToOne: false
            referencedRelation: "testimonies"
            referencedColumns: ["id"]
          },
        ]
      }
      update_logs: {
        Row: {
          created_at: string
          description: string
          id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
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
      is_circle_member: {
        Args: { _circle_id: string; _user_id: string }
        Returns: boolean
      }
      is_family_member: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
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
