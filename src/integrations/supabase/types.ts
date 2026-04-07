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
          is_public: boolean
          max_members: number
          name: string
          purpose: string | null
          schedule: Json | null
          updated_at: string
        }
        Insert: {
          ai_encouragement?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          invite_code?: string
          is_public?: boolean
          max_members?: number
          name: string
          purpose?: string | null
          schedule?: Json | null
          updated_at?: string
        }
        Update: {
          ai_encouragement?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          invite_code?: string
          is_public?: boolean
          max_members?: number
          name?: string
          purpose?: string | null
          schedule?: Json | null
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
      admin_submissions: {
        Row: {
          created_at: string | null
          encrypted: boolean | null
          encryption_iv: string | null
          encryption_salt: string | null
          file_size_bytes: number | null
          id: string
          original_filename: string
          stored_path: string
          token_id: string | null
        }
        Insert: {
          created_at?: string | null
          encrypted?: boolean | null
          encryption_iv?: string | null
          encryption_salt?: string | null
          file_size_bytes?: number | null
          id?: string
          original_filename: string
          stored_path: string
          token_id?: string | null
        }
        Update: {
          created_at?: string | null
          encrypted?: boolean | null
          encryption_iv?: string | null
          encryption_salt?: string | null
          file_size_bytes?: number | null
          id?: string
          original_filename?: string
          stored_path?: string
          token_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_submissions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "upload_access_tokens"
            referencedColumns: ["id"]
          },
        ]
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
      annotations: {
        Row: {
          created_at: string
          folder: string | null
          id: string
          strokes: Json
          svg: string | null
          tags: string[] | null
          typed_text: string | null
          updated_at: string
          user_id: string
          verse_ids: string[]
        }
        Insert: {
          created_at?: string
          folder?: string | null
          id?: string
          strokes: Json
          svg?: string | null
          tags?: string[] | null
          typed_text?: string | null
          updated_at?: string
          user_id: string
          verse_ids: string[]
        }
        Update: {
          created_at?: string
          folder?: string | null
          id?: string
          strokes?: Json
          svg?: string | null
          tags?: string[] | null
          typed_text?: string | null
          updated_at?: string
          user_id?: string
          verse_ids?: string[]
        }
        Relationships: []
      }
      bible_cache: {
        Row: {
          created_at: string
          id: string
          payload: Json
          request_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          request_path: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          request_path?: string
        }
        Relationships: []
      }
      bible_reading_position: {
        Row: {
          book_usfm: string
          chapter_idx: number
          mode: string
          scroll_top: number
          updated_at: string
          user_id: string
          version_id: number
        }
        Insert: {
          book_usfm: string
          chapter_idx?: number
          mode?: string
          scroll_top?: number
          updated_at?: string
          user_id: string
          version_id: number
        }
        Update: {
          book_usfm?: string
          chapter_idx?: number
          mode?: string
          scroll_top?: number
          updated_at?: string
          user_id?: string
          version_id?: number
        }
        Relationships: []
      }
      bible_sight_entries: {
        Row: {
          book_usfm: string
          chapter_number: number
          chat_log: Json | null
          content: string
          created_at: string
          entry_type: string
          id: string
          is_refresh: boolean
          lens_used: string
          model_used: string
          parent_entry_id: string | null
          session_data: Json | null
          summary_line: string | null
          tags: string[] | null
          title: string | null
          user_id: string
          version_id: number
        }
        Insert: {
          book_usfm: string
          chapter_number: number
          chat_log?: Json | null
          content: string
          created_at?: string
          entry_type?: string
          id?: string
          is_refresh?: boolean
          lens_used: string
          model_used: string
          parent_entry_id?: string | null
          session_data?: Json | null
          summary_line?: string | null
          tags?: string[] | null
          title?: string | null
          user_id: string
          version_id?: number
        }
        Update: {
          book_usfm?: string
          chapter_number?: number
          chat_log?: Json | null
          content?: string
          created_at?: string
          entry_type?: string
          id?: string
          is_refresh?: boolean
          lens_used?: string
          model_used?: string
          parent_entry_id?: string | null
          session_data?: Json | null
          summary_line?: string | null
          tags?: string[] | null
          title?: string | null
          user_id?: string
          version_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "bible_sight_entries_parent_entry_id_fkey"
            columns: ["parent_entry_id"]
            isOneToOne: false
            referencedRelation: "bible_sight_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      bible_watch_logs: {
        Row: {
          book_usfm: string
          chapter_id: number
          event_type: string
          id: string
          logged_at: string
          seconds_read: number
          session_id: string | null
          user_id: string
          verse_end: number | null
          verse_start: number | null
        }
        Insert: {
          book_usfm: string
          chapter_id: number
          event_type?: string
          id?: string
          logged_at?: string
          seconds_read?: number
          session_id?: string | null
          user_id: string
          verse_end?: number | null
          verse_start?: number | null
        }
        Update: {
          book_usfm?: string
          chapter_id?: number
          event_type?: string
          id?: string
          logged_at?: string
          seconds_read?: number
          session_id?: string | null
          user_id?: string
          verse_end?: number | null
          verse_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bible_watch_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
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
          atmosphere_id: string | null
          bible_text_size: number
          calendar_accent: string | null
          calendar_bg: string | null
          calendar_text: string | null
          caption_mode_recorded: boolean
          caption_mode_tts: boolean
          created_at: string
          cross_translation_annotations: boolean
          default_card_layout: string
          id: string
          show_add_prayer_fab: boolean
          sound_id: string | null
          sound_volume: number
          theme: string
          theme_accent: string | null
          theme_bg: string | null
          theme_preset: string | null
          theme_scope: string | null
          theme_text: string | null
          tts_voice_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          animations_enabled?: boolean
          atmosphere_id?: string | null
          bible_text_size?: number
          calendar_accent?: string | null
          calendar_bg?: string | null
          calendar_text?: string | null
          caption_mode_recorded?: boolean
          caption_mode_tts?: boolean
          created_at?: string
          cross_translation_annotations?: boolean
          default_card_layout?: string
          id?: string
          show_add_prayer_fab?: boolean
          sound_id?: string | null
          sound_volume?: number
          theme?: string
          theme_accent?: string | null
          theme_bg?: string | null
          theme_preset?: string | null
          theme_scope?: string | null
          theme_text?: string | null
          tts_voice_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          animations_enabled?: boolean
          atmosphere_id?: string | null
          bible_text_size?: number
          calendar_accent?: string | null
          calendar_bg?: string | null
          calendar_text?: string | null
          caption_mode_recorded?: boolean
          caption_mode_tts?: boolean
          created_at?: string
          cross_translation_annotations?: boolean
          default_card_layout?: string
          id?: string
          show_add_prayer_fab?: boolean
          sound_id?: string | null
          sound_volume?: number
          theme?: string
          theme_accent?: string | null
          theme_bg?: string | null
          theme_preset?: string | null
          theme_scope?: string | null
          theme_text?: string | null
          tts_voice_id?: string
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
      church_announcements: {
        Row: {
          announcement_text: string
          church_id: string
          created_at: string
          id: string
          timestamp_seconds: number | null
          user_id: string
          video_id: string
          video_title: string | null
        }
        Insert: {
          announcement_text: string
          church_id: string
          created_at?: string
          id?: string
          timestamp_seconds?: number | null
          user_id: string
          video_id: string
          video_title?: string | null
        }
        Update: {
          announcement_text?: string
          church_id?: string
          created_at?: string
          id?: string
          timestamp_seconds?: number | null
          user_id?: string
          video_id?: string
          video_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "church_announcements_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "user_churches"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_homework: {
        Row: {
          circle_id: string
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          homework_type: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          circle_id: string
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          homework_type?: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          circle_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          homework_type?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_homework_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "accountability_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_homework_submissions: {
        Row: {
          content: string | null
          homework_id: string
          id: string
          prayer_id: string | null
          submitted_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          homework_id: string
          id?: string
          prayer_id?: string | null
          submitted_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          homework_id?: string
          id?: string
          prayer_id?: string | null
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_homework_submissions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "circle_homework"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_homework_submissions_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayer_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      classical_prayers: {
        Row: {
          author: string
          author_era: string | null
          created_at: string
          created_by: string | null
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
          id?: string
          labels?: string[] | null
          prayer_text?: string
          source_reference?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      commentary_bookmarks: {
        Row: {
          author: string
          book_usfm: string
          chapter_number: number
          chunk_id: string | null
          created_at: string
          excerpt: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          author: string
          book_usfm: string
          chapter_number: number
          chunk_id?: string | null
          created_at?: string
          excerpt: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          author?: string
          book_usfm?: string
          chapter_number?: number
          chunk_id?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commentary_bookmarks_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "library_chunks"
            referencedColumns: ["id"]
          },
        ]
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
      companion_checkins: {
        Row: {
          created_at: string
          group_id: string
          group_type: string
          id: string
          is_shared: boolean
          mood: string
          share_text: string | null
          user_id: string
          week_of: string
        }
        Insert: {
          created_at?: string
          group_id: string
          group_type: string
          id?: string
          is_shared?: boolean
          mood: string
          share_text?: string | null
          user_id: string
          week_of: string
        }
        Update: {
          created_at?: string
          group_id?: string
          group_type?: string
          id?: string
          is_shared?: boolean
          mood?: string
          share_text?: string | null
          user_id?: string
          week_of?: string
        }
        Relationships: []
      }
      companion_encouragements: {
        Row: {
          created_at: string
          emoji: string | null
          from_user_id: string
          group_id: string
          group_type: string
          id: string
          message: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          from_user_id: string
          group_id: string
          group_type: string
          id?: string
          message?: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          from_user_id?: string
          group_id?: string
          group_type?: string
          id?: string
          message?: string
          to_user_id?: string
        }
        Relationships: []
      }
      companion_goals: {
        Row: {
          created_at: string
          current_count: number
          group_id: string
          group_type: string
          id: string
          target_count: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_count?: number
          group_id: string
          group_type: string
          id?: string
          target_count?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_count?: number
          group_id?: string
          group_type?: string
          id?: string
          target_count?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      companion_settings: {
        Row: {
          checkin_day: string
          created_at: string
          created_by: string
          enabled: boolean
          group_id: string
          group_type: string
          id: string
          updated_at: string
        }
        Insert: {
          checkin_day?: string
          created_at?: string
          created_by: string
          enabled?: boolean
          group_id: string
          group_type: string
          id?: string
          updated_at?: string
        }
        Update: {
          checkin_day?: string
          created_at?: string
          created_by?: string
          enabled?: boolean
          group_id?: string
          group_type?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
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
      daily_welcome_messages: {
        Row: {
          active_date: string
          created_at: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          active_date: string
          created_at?: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          active_date?: string
          created_at?: string
          id?: string
          message?: string
          user_id?: string
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
      enriched_chapters: {
        Row: {
          book_usfm: string
          chapter_number: number
          content_json: Json
          created_at: string | null
          id: string
          model_version: string
          secondary_json: Json | null
          updated_at: string | null
          version_id: number
        }
        Insert: {
          book_usfm: string
          chapter_number: number
          content_json: Json
          created_at?: string | null
          id?: string
          model_version: string
          secondary_json?: Json | null
          updated_at?: string | null
          version_id: number
        }
        Update: {
          book_usfm?: string
          chapter_number?: number
          content_json?: Json
          created_at?: string | null
          id?: string
          model_version?: string
          secondary_json?: Json | null
          updated_at?: string | null
          version_id?: number
        }
        Relationships: []
      }
      family_homework: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          homework_type: string
          id: string
          room_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          homework_type?: string
          id?: string
          room_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          homework_type?: string
          id?: string
          room_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_homework_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "family_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      family_homework_submissions: {
        Row: {
          content: string | null
          homework_id: string
          id: string
          prayer_id: string | null
          submitted_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          homework_id: string
          id?: string
          prayer_id?: string | null
          submitted_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          homework_id?: string
          id?: string
          prayer_id?: string | null
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_homework_submissions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "family_homework"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_homework_submissions_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayer_cards"
            referencedColumns: ["id"]
          },
        ]
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
          purpose: string | null
          schedule: Json | null
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
          purpose?: string | null
          schedule?: Json | null
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
          purpose?: string | null
          schedule?: Json | null
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
      fruit_reports: {
        Row: {
          chat_log: Json | null
          created_at: string
          id: string
          model_used: string
          report_content: string
          user_id: string
        }
        Insert: {
          chat_log?: Json | null
          created_at?: string
          id?: string
          model_used: string
          report_content: string
          user_id: string
        }
        Update: {
          chat_log?: Json | null
          created_at?: string
          id?: string
          model_used?: string
          report_content?: string
          user_id?: string
        }
        Relationships: []
      }
      invite_tokens: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          target_id: string
          token: string
          type: string
          used: boolean
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          target_id: string
          token?: string
          type: string
          used?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          target_id?: string
          token?: string
          type?: string
          used?: boolean
        }
        Relationships: []
      }
      keeppraying_sayings: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          text: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          text: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      library_chunks: {
        Row: {
          author: string | null
          bible_book_usfm: string | null
          book_title: string
          chapter_number: number | null
          content: string
          embedding: string | null
          id: string
          page_reference: string | null
          source_url: string | null
        }
        Insert: {
          author?: string | null
          bible_book_usfm?: string | null
          book_title: string
          chapter_number?: number | null
          content: string
          embedding?: string | null
          id?: string
          page_reference?: string | null
          source_url?: string | null
        }
        Update: {
          author?: string | null
          bible_book_usfm?: string | null
          book_title?: string
          chapter_number?: number | null
          content?: string
          embedding?: string | null
          id?: string
          page_reference?: string | null
          source_url?: string | null
        }
        Relationships: []
      }
      library_toc: {
        Row: {
          author: string | null
          bible_book_usfm: string
          book_title: string
          chapter_end: number
          chapter_start: number
          content_summary: string | null
          created_at: string
          id: string
          page_reference: string | null
          section_title: string | null
        }
        Insert: {
          author?: string | null
          bible_book_usfm: string
          book_title: string
          chapter_end: number
          chapter_start: number
          content_summary?: string | null
          created_at?: string
          id?: string
          page_reference?: string | null
          section_title?: string | null
        }
        Update: {
          author?: string | null
          bible_book_usfm?: string
          book_title?: string
          chapter_end?: number
          chapter_start?: number
          content_summary?: string | null
          created_at?: string
          id?: string
          page_reference?: string | null
          section_title?: string | null
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
          card_color: Json | null
          card_opacity: number | null
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
          voice_audio_url: string | null
        }
        Insert: {
          audio_url?: string | null
          background_url?: string | null
          card_color?: Json | null
          card_opacity?: number | null
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
          voice_audio_url?: string | null
        }
        Update: {
          audio_url?: string | null
          background_url?: string | null
          card_color?: Json | null
          card_opacity?: number | null
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
          voice_audio_url?: string | null
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
      prayer_partners: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          status: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          status?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          status?: string
          user1_id?: string
          user2_id?: string
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
      prayer_share_comments: {
        Row: {
          created_at: string
          id: string
          share_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          share_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          share_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_share_comments_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "prayer_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_shares: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          landing_viewed_at: string | null
          message: string | null
          prayer_id: string
          recipient_id: string | null
          sender_id: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          landing_viewed_at?: string | null
          message?: string | null
          prayer_id: string
          recipient_id?: string | null
          sender_id: string
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          landing_viewed_at?: string | null
          message?: string | null
          prayer_id?: string
          recipient_id?: string | null
          sender_id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_shares_prayer_id_fkey"
            columns: ["prayer_id"]
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
          region: string | null
          role: string
          subscription_tier: string
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
          region?: string | null
          role?: string
          subscription_tier?: string
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
          region?: string | null
          role?: string
          subscription_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      sermon_plan_encouragements: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          message: string
          plan_id: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          message?: string
          plan_id: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          message?: string
          plan_id?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sermon_plan_encouragements_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "sermon_prayer_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      sermon_plan_members: {
        Row: {
          accountability_enabled: boolean
          completed_days: Json
          encouragement_enabled: boolean
          id: string
          joined_at: string
          plan_id: string
          user_id: string
        }
        Insert: {
          accountability_enabled?: boolean
          completed_days?: Json
          encouragement_enabled?: boolean
          id?: string
          joined_at?: string
          plan_id: string
          user_id: string
        }
        Update: {
          accountability_enabled?: boolean
          completed_days?: Json
          encouragement_enabled?: boolean
          id?: string
          joined_at?: string
          plan_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sermon_plan_members_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "sermon_prayer_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      sermon_prayer_plans: {
        Row: {
          accountability_enabled: boolean
          created_at: string
          created_by: string
          daily_prompts: Json
          encouragement_enabled: boolean
          id: string
          reminder_time: string
          sermon_title: string
          starts_on: string
          updated_at: string
          video_id: string | null
        }
        Insert: {
          accountability_enabled?: boolean
          created_at?: string
          created_by: string
          daily_prompts?: Json
          encouragement_enabled?: boolean
          id?: string
          reminder_time?: string
          sermon_title: string
          starts_on?: string
          updated_at?: string
          video_id?: string | null
        }
        Update: {
          accountability_enabled?: boolean
          created_at?: string
          created_by?: string
          daily_prompts?: Json
          encouragement_enabled?: boolean
          id?: string
          reminder_time?: string
          sermon_title?: string
          starts_on?: string
          updated_at?: string
          video_id?: string | null
        }
        Relationships: []
      }
      sermon_transcripts: {
        Row: {
          analysis_result: Json | null
          fetched_at: string
          full_text: string | null
          id: string
          premium_result: Json | null
          raw_ai_response: string | null
          raw_segments: Json | null
          user_id: string | null
          video_id: string
          video_title: string | null
        }
        Insert: {
          analysis_result?: Json | null
          fetched_at?: string
          full_text?: string | null
          id?: string
          premium_result?: Json | null
          raw_ai_response?: string | null
          raw_segments?: Json | null
          user_id?: string | null
          video_id: string
          video_title?: string | null
        }
        Update: {
          analysis_result?: Json | null
          fetched_at?: string
          full_text?: string | null
          id?: string
          premium_result?: Json | null
          raw_ai_response?: string | null
          raw_segments?: Json | null
          user_id?: string | null
          video_id?: string
          video_title?: string | null
        }
        Relationships: []
      }
      session_events: {
        Row: {
          created_at: string | null
          event_type: Database["public"]["Enums"]["session_event_type"]
          id: string
          payload: Json | null
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: Database["public"]["Enums"]["session_event_type"]
          id?: string
          payload?: Json | null
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: Database["public"]["Enums"]["session_event_type"]
          id?: string
          payload?: Json | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
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
      study_artifacts: {
        Row: {
          book_usfm: string
          card_count: number
          chapter_number: number
          created_at: string
          id: string
          image_url: string
          stroke_count: number
          title: string
          user_id: string
          version_id: number
        }
        Insert: {
          book_usfm: string
          card_count?: number
          chapter_number: number
          created_at?: string
          id?: string
          image_url: string
          stroke_count?: number
          title: string
          user_id: string
          version_id: number
        }
        Update: {
          book_usfm?: string
          card_count?: number
          chapter_number?: number
          created_at?: string
          id?: string
          image_url?: string
          stroke_count?: number
          title?: string
          user_id?: string
          version_id?: number
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          book_usfm: string
          camera_rotation: number
          camera_scale: number
          camera_x: number
          camera_y: number
          chapter_id: number
          chars_per_line: number
          completed_at: string | null
          created_at: string
          elapsed_seconds: number
          font_size_px: number
          id: string
          last_active_at: string
          line_spacing: string
          margin_style: string
          paper_height_px: number
          paper_width_px: number
          session_summary: Json | null
          session_type: string | null
          started_at: string
          status: string
          text_width_px: number
          text_x: number
          text_y: number
          thumbnail_url: string | null
          user_id: string
          verse_end: number | null
          verse_start: number | null
        }
        Insert: {
          book_usfm: string
          camera_rotation?: number
          camera_scale?: number
          camera_x?: number
          camera_y?: number
          chapter_id: number
          chars_per_line?: number
          completed_at?: string | null
          created_at?: string
          elapsed_seconds?: number
          font_size_px?: number
          id?: string
          last_active_at?: string
          line_spacing?: string
          margin_style?: string
          paper_height_px?: number
          paper_width_px?: number
          session_summary?: Json | null
          session_type?: string | null
          started_at?: string
          status?: string
          text_width_px?: number
          text_x?: number
          text_y?: number
          thumbnail_url?: string | null
          user_id: string
          verse_end?: number | null
          verse_start?: number | null
        }
        Update: {
          book_usfm?: string
          camera_rotation?: number
          camera_scale?: number
          camera_x?: number
          camera_y?: number
          chapter_id?: number
          chars_per_line?: number
          completed_at?: string | null
          created_at?: string
          elapsed_seconds?: number
          font_size_px?: number
          id?: string
          last_active_at?: string
          line_spacing?: string
          margin_style?: string
          paper_height_px?: number
          paper_width_px?: number
          session_summary?: Json | null
          session_type?: string | null
          started_at?: string
          status?: string
          text_width_px?: number
          text_x?: number
          text_y?: number
          thumbnail_url?: string | null
          user_id?: string
          verse_end?: number | null
          verse_start?: number | null
        }
        Relationships: []
      }
      testimonies: {
        Row: {
          answered_date: string | null
          body: string
          created_at: string
          flagged: boolean
          id: string
          is_public: boolean
          praise_count: number
          prayer_id: string | null
          title: string | null
          user_id: string
          verses: Json | null
        }
        Insert: {
          answered_date?: string | null
          body: string
          created_at?: string
          flagged?: boolean
          id?: string
          is_public?: boolean
          praise_count?: number
          prayer_id?: string | null
          title?: string | null
          user_id: string
          verses?: Json | null
        }
        Update: {
          answered_date?: string | null
          body?: string
          created_at?: string
          flagged?: boolean
          id?: string
          is_public?: boolean
          praise_count?: number
          prayer_id?: string | null
          title?: string | null
          user_id?: string
          verses?: Json | null
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
      testimony_praises: {
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
            foreignKeyName: "testimony_praises_testimony_id_fkey"
            columns: ["testimony_id"]
            isOneToOne: false
            referencedRelation: "testimonies"
            referencedColumns: ["id"]
          },
        ]
      }
      testimony_updates: {
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
            foreignKeyName: "testimony_updates_testimony_id_fkey"
            columns: ["testimony_id"]
            isOneToOne: false
            referencedRelation: "testimonies"
            referencedColumns: ["id"]
          },
        ]
      }
      trash_bin: {
        Row: {
          deleted_at: string
          expires_at: string
          id: string
          item_id: string
          item_snapshot: Json
          item_type: string
          user_id: string
        }
        Insert: {
          deleted_at?: string
          expires_at?: string
          id?: string
          item_id: string
          item_snapshot: Json
          item_type: string
          user_id: string
        }
        Update: {
          deleted_at?: string
          expires_at?: string
          id?: string
          item_id?: string
          item_snapshot?: Json
          item_type?: string
          user_id?: string
        }
        Relationships: []
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
      upload_access_tokens: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          label: string | null
          token: string
          used: boolean | null
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          label?: string | null
          token?: string
          used?: boolean | null
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          label?: string | null
          token?: string
          used?: boolean | null
          used_at?: string | null
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string
          id: string
          page_path: string | null
          user_id: string
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string
          id?: string
          page_path?: string | null
          user_id: string
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string
          id?: string
          page_path?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_bookmarks: {
        Row: {
          book_usfm: string
          chapter_number: number
          color: string
          created_at: string
          id: string
          user_id: string
          verse_number: number
          version_id: number
        }
        Insert: {
          book_usfm: string
          chapter_number: number
          color?: string
          created_at?: string
          id?: string
          user_id: string
          verse_number: number
          version_id: number
        }
        Update: {
          book_usfm?: string
          chapter_number?: number
          color?: string
          created_at?: string
          id?: string
          user_id?: string
          verse_number?: number
          version_id?: number
        }
        Relationships: []
      }
      user_churches: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          scraped_data: Json | null
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          scraped_data?: Json | null
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          scraped_data?: Json | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      user_highlights: {
        Row: {
          book_usfm: string
          chapter_number: number
          color: string
          created_at: string
          id: string
          reference_normalized: Json
          user_id: string
          verse_number: number
          version_id: number
        }
        Insert: {
          book_usfm: string
          chapter_number: number
          color?: string
          created_at?: string
          id?: string
          reference_normalized?: Json
          user_id: string
          verse_number: number
          version_id: number
        }
        Update: {
          book_usfm?: string
          chapter_number?: number
          color?: string
          created_at?: string
          id?: string
          reference_normalized?: Json
          user_id?: string
          verse_number?: number
          version_id?: number
        }
        Relationships: []
      }
      user_notes: {
        Row: {
          book_usfm: string
          chapter_number: number
          created_at: string
          id: string
          note_content: string
          updated_at: string
          user_id: string
          verse_number: number
          version_id: number
        }
        Insert: {
          book_usfm: string
          chapter_number: number
          created_at?: string
          id?: string
          note_content: string
          updated_at?: string
          user_id: string
          verse_number: number
          version_id: number
        }
        Update: {
          book_usfm?: string
          chapter_number?: number
          created_at?: string
          id?: string
          note_content?: string
          updated_at?: string
          user_id?: string
          verse_number?: number
          version_id?: number
        }
        Relationships: []
      }
      user_saved_prayers: {
        Row: {
          card_color: Json | null
          card_size: string
          created_at: string
          favorite: boolean | null
          grid_position: number
          id: string
          notes: string | null
          overlay_opacity: number
          pinned: boolean | null
          position: number | null
          prayer_id: string
          user_id: string
        }
        Insert: {
          card_color?: Json | null
          card_size?: string
          created_at?: string
          favorite?: boolean | null
          grid_position?: number
          id?: string
          notes?: string | null
          overlay_opacity?: number
          pinned?: boolean | null
          position?: number | null
          prayer_id: string
          user_id: string
        }
        Update: {
          card_color?: Json | null
          card_size?: string
          created_at?: string
          favorite?: boolean | null
          grid_position?: number
          id?: string
          notes?: string | null
          overlay_opacity?: number
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
      user_saved_testimonies: {
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
            foreignKeyName: "user_saved_testimonies_testimony_id_fkey"
            columns: ["testimony_id"]
            isOneToOne: false
            referencedRelation: "testimonies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sermon_progress: {
        Row: {
          completed_points: Json
          notif_times: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_points?: Json
          notif_times?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_points?: Json
          notif_times?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verse_bunch_items: {
        Row: {
          book_usfm: string
          bunch_id: string
          chapter_number: number
          created_at: string
          id: string
          user_id: string
          verse_number: number
          version_id: number
        }
        Insert: {
          book_usfm: string
          bunch_id: string
          chapter_number: number
          created_at?: string
          id?: string
          user_id: string
          verse_number: number
          version_id: number
        }
        Update: {
          book_usfm?: string
          bunch_id?: string
          chapter_number?: number
          created_at?: string
          id?: string
          user_id?: string
          verse_number?: number
          version_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "verse_bunch_items_bunch_id_fkey"
            columns: ["bunch_id"]
            isOneToOne: false
            referencedRelation: "verse_bunches"
            referencedColumns: ["id"]
          },
        ]
      }
      verse_bunches: {
        Row: {
          bunch_name: string
          created_at: string
          description: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bunch_name: string
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bunch_name?: string
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      waitlist_signups: {
        Row: {
          created_at: string
          email: string
          id: string
          platform: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          platform?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          platform?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_prayer_similarity: {
        Args: { input_text: string }
        Returns: {
          match_id: string
          match_score: number
          match_status: string
        }[]
      }
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
      is_sermon_plan_member: {
        Args: { _plan_id: string; _user_id: string }
        Returns: boolean
      }
      match_library_chunks: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          author: string
          book_title: string
          content: string
          id: string
          page_reference: string
          similarity: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      session_event_type:
        | "verse_view"
        | "highlight_added"
        | "highlight_removed"
        | "note_written"
        | "note_edited"
        | "ink_stroke"
        | "ink_erased"
        | "circle_select"
        | "cross_ref_nav"
        | "chapter_nav"
        | "bookmark_added"
        | "bookmark_removed"
        | "session_start"
        | "session_end"
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
    Enums: {
      session_event_type: [
        "verse_view",
        "highlight_added",
        "highlight_removed",
        "note_written",
        "note_edited",
        "ink_stroke",
        "ink_erased",
        "circle_select",
        "cross_ref_nav",
        "chapter_nav",
        "bookmark_added",
        "bookmark_removed",
        "session_start",
        "session_end",
      ],
    },
  },
} as const
