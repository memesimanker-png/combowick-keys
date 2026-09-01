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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_permissions: {
        Row: {
          tabs: string[]
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          tabs?: string[]
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          tabs?: string[]
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string
          enabled: boolean
          expires_at: string | null
          id: string
          message: string
          title: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          expires_at?: string | null
          id?: string
          message: string
          title?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          expires_at?: string | null
          id?: string
          message?: string
          title?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          discord_webhook_url: string | null
          id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          discord_webhook_url?: string | null
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          discord_webhook_url?: string | null
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          admin_reply: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          replied_at: string | null
          replied_by: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      hwid_key_ip_log: {
        Row: {
          created_at: string
          id: string
          ip: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip: string
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string
        }
        Relationships: []
      }
      key_ad_settings: {
        Row: {
          ad_type: string
          created_at: string
          enabled: boolean
          id: string
          page: string
          updated_at: string
        }
        Insert: {
          ad_type: string
          created_at?: string
          enabled?: boolean
          id?: string
          page: string
          updated_at?: string
        }
        Update: {
          ad_type?: string
          created_at?: string
          enabled?: boolean
          id?: string
          page?: string
          updated_at?: string
        }
        Relationships: []
      }
      key_discounts: {
        Row: {
          active: boolean
          label: string | null
          percent_off: number
          tier_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          label?: string | null
          percent_off?: number
          tier_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          label?: string | null
          percent_off?: number
          tier_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      key_extensions: {
        Row: {
          after_expires_at: string | null
          before_expires_at: string | null
          completed_at: string | null
          created_at: string
          expires_at: string
          hours: number
          hwid: string
          id: string
          ip: string | null
          key_value: string
          status: string
          token_hash: string
        }
        Insert: {
          after_expires_at?: string | null
          before_expires_at?: string | null
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          hours?: number
          hwid: string
          id?: string
          ip?: string | null
          key_value: string
          status?: string
          token_hash: string
        }
        Update: {
          after_expires_at?: string | null
          before_expires_at?: string | null
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          hours?: number
          hwid?: string
          id?: string
          ip?: string | null
          key_value?: string
          status?: string
          token_hash?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      paid_script_settings: {
        Row: {
          created_at: string
          features: string[] | null
          game_key: string
          hidden: boolean
          hide_lifetime: boolean
          hide_monthly: boolean
          id: string
          lifetime_note: string | null
          lifetime_price: number | null
          monthly_note: string | null
          monthly_price: number | null
          pause_message: string | null
          paused: boolean
          subtitle: string | null
          title: string | null
          updated_at: string
          warning: string | null
        }
        Insert: {
          created_at?: string
          features?: string[] | null
          game_key: string
          hidden?: boolean
          hide_lifetime?: boolean
          hide_monthly?: boolean
          id?: string
          lifetime_note?: string | null
          lifetime_price?: number | null
          monthly_note?: string | null
          monthly_price?: number | null
          pause_message?: string | null
          paused?: boolean
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          warning?: string | null
        }
        Update: {
          created_at?: string
          features?: string[] | null
          game_key?: string
          hidden?: boolean
          hide_lifetime?: boolean
          hide_monthly?: boolean
          id?: string
          lifetime_note?: string | null
          lifetime_price?: number | null
          monthly_note?: string | null
          monthly_price?: number | null
          pause_message?: string | null
          paused?: boolean
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          warning?: string | null
        }
        Relationships: []
      }
      premium_key_purchases: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string | null
          expires_at: string | null
          id: string
          key_generated: string
          payment_id: string
          status: string
          tier: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          expires_at?: string | null
          id?: string
          key_generated: string
          payment_id: string
          status?: string
          tier: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          expires_at?: string | null
          id?: string
          key_generated?: string
          payment_id?: string
          status?: string
          tier?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      roblox_account_purchases: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          package_size: number
          payment_id: string
          quantity: number
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          package_size: number
          payment_id: string
          quantity?: number
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          package_size?: number
          payment_id?: string
          quantity?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      roblox_accounts: {
        Row: {
          claimed: boolean
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          id: string
          package_size: number
          password: string
          purchase_id: string | null
          username: string
        }
        Insert: {
          claimed?: boolean
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          package_size: number
          password: string
          purchase_id?: string | null
          username: string
        }
        Update: {
          claimed?: boolean
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          package_size?: number
          password?: string
          purchase_id?: string | null
          username?: string
        }
        Relationships: []
      }
      scripts: {
        Row: {
          category: string
          code: string
          created_at: string | null
          description: string
          faqs: Json | null
          game: string
          game_universe_id: number | null
          game_url: string | null
          id: string
          is_paid: boolean | null
          long_description: string | null
          slug: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          trending: boolean | null
          updated_at: string | null
          verified: boolean | null
          youtube_url: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          description: string
          faqs?: Json | null
          game: string
          game_universe_id?: number | null
          game_url?: string | null
          id?: string
          is_paid?: boolean | null
          long_description?: string | null
          slug: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          trending?: boolean | null
          updated_at?: string | null
          verified?: boolean | null
          youtube_url?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          description?: string
          faqs?: Json | null
          game?: string
          game_universe_id?: number | null
          game_url?: string | null
          id?: string
          is_paid?: boolean | null
          long_description?: string | null
          slug?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          trending?: boolean | null
          updated_at?: string | null
          verified?: boolean | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      translations: {
        Row: {
          created_at: string
          id: string
          language: string
          source_text: string
          translated_text: string
        }
        Insert: {
          created_at?: string
          id?: string
          language: string
          source_text: string
          translated_text: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          source_text?: string
          translated_text?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verify_settings: {
        Row: {
          access_key_clicks: number
          direct_link_clicks: number
          extension_hours: number
          id: number
          linkvertise_link_1: string | null
          linkvertise_link_2: string | null
          linkvertise_link_3: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          access_key_clicks?: number
          direct_link_clicks?: number
          extension_hours?: number
          id?: number
          linkvertise_link_1?: string | null
          linkvertise_link_2?: string | null
          linkvertise_link_3?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          access_key_clicks?: number
          direct_link_clicks?: number
          extension_hours?: number
          id?: number
          linkvertise_link_1?: string | null
          linkvertise_link_2?: string | null
          linkvertise_link_3?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      verify_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip: string
          token_hash: string
          used: boolean
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip: string
          token_hash: string
          used?: boolean
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip?: string
          token_hash?: string
          used?: boolean
          used_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      broadcast_notification: {
        Args: { _body: string; _link: string; _title: string; _type?: string }
        Returns: number
      }
      check_contact_rate_limit: { Args: { _user_id: string }; Returns: boolean }
      check_email_rate_limit: {
        Args: { _recipient: string; _script_id: string }
        Returns: Json
      }
      claim_accounts_for_purchase: {
        Args: {
          _package_size: number
          _purchase_id: string
          _quantity: number
          _user_id: string
        }
        Returns: {
          claimed: boolean
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          id: string
          package_size: number
          password: string
          purchase_id: string | null
          username: string
        }[]
        SetofOptions: {
          from: "*"
          to: "roblox_accounts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_account_stock: { Args: { _package_size: number }; Returns: number }
      get_admin_tabs: { Args: { _user_id: string }; Returns: string[] }
      get_user_email: { Args: { _user_id: string }; Returns: string }
      grant_role_by_email: {
        Args: { _email: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      revoke_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      set_admin_tabs: {
        Args: { _tabs: string[]; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "super_admin"
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
      app_role: ["admin", "moderator", "user", "super_admin"],
    },
  },
} as const
