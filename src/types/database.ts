export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PhotoshootStatus = "pending" | "awaiting_payment" | "paid" | "queued" | "generating" | "completed" | "failed" | "cancelled";
export type PhotoshootGender = "woman" | "man";
export type PhotoshootHeightClass = "petite" | "average" | "tall";
export type PhotoshootBodyShape = "hourglass" | "rectangle" | "pear" | "inverted_triangle" | "oval";
export type PhotoshootBodyBuild = "slim" | "average" | "full";

export interface Database {
  public: {
    Tables: {
      photoshoots: {
        Row: {
          id: string;
          user_id: string;
          persona_id: string | null;
          persona_snapshot: Json | null;
          style_id: string;
          status: PhotoshootStatus;
          images: string[];
          result_images: string[];
          gender: PhotoshootGender;
          body_type: string;
          eye_color: string;
          hair_color: string;
          height_cm: number | null;
          weight_kg: number | null;
          height_class: PhotoshootHeightClass | null;
          body_shape: PhotoshootBodyShape | null;
          body_build: PhotoshootBodyBuild | null;
          training_id: string | null;
          lora_url: string | null;
          generation_id: string | null;
          safe_error: string | null;
          requested_images_count: number | null;
          package_snapshot: Json | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          persona_id: string;
          persona_snapshot: Json;
          style_id: string;
          status?: PhotoshootStatus;
          images?: string[];
          result_images?: string[];
          gender?: PhotoshootGender;
          body_type?: string;
          eye_color?: string;
          hair_color?: string;
          height_cm?: number | null;
          weight_kg?: number | null;
          height_class?: PhotoshootHeightClass | null;
          body_shape?: PhotoshootBodyShape | null;
          body_build?: PhotoshootBodyBuild | null;
          training_id?: string | null;
          lora_url?: string | null;
          generation_id?: string | null;
          safe_error?: string | null;
          requested_images_count?: number | null;
          package_snapshot?: Json | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          persona_id?: string;
          persona_snapshot?: Json;
          style_id?: string;
          status?: PhotoshootStatus;
          images?: string[];
          result_images?: string[];
          gender?: PhotoshootGender;
          body_type?: string;
          eye_color?: string;
          hair_color?: string;
          height_cm?: number | null;
          weight_kg?: number | null;
          training_id?: string | null;
          lora_url?: string | null;
          generation_id?: string | null;
          height_class?: PhotoshootHeightClass | null;
          body_shape?: PhotoshootBodyShape | null;
          body_build?: PhotoshootBodyBuild | null;
          safe_error?: string | null;
          requested_images_count?: number | null;
          package_snapshot?: Json | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "photoshoots_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      wallets: {
        Row: {
          user_id: string;
          balance_crystals: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          balance_crystals?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          balance_crystals?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      wallet_transactions: {
        Row: {
          id: string;
          user_id: string;
          delta_crystals: number;
          balance_after_crystals: number;
          transaction_type: string;
          idempotency_key: string;
          reference_type: string | null;
          reference_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          delta_crystals: number;
          balance_after_crystals: number;
          transaction_type: string;
          idempotency_key: string;
          reference_type?: string | null;
          reference_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          delta_crystals?: number;
          balance_after_crystals?: number;
          transaction_type?: string;
          idempotency_key?: string;
          reference_type?: string | null;
          reference_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_photoshoot_with_persona: {
        Args: {
          p_persona_id: string;
          p_style_id: string;
          p_images: string[];
          p_gender: string;
          p_body_type: string;
          p_eye_color: string;
          p_hair_color: string;
          p_height_cm: number | null;
          p_weight_kg: number | null;
          p_height_class: string | null;
          p_body_shape: string | null;
          p_body_build: string | null;
          p_requested_images_count: number;
          p_package_snapshot: Json;
        };
        Returns: Database['public']['Tables']['photoshoots']['Row'][];
      };
      transition_photoshoot_status: {
        Args: {
          p_photoshoot_id: string;
          p_next_status: PhotoshootStatus;
          p_safe_error?: string | null;
        };
        Returns: Database['public']['Tables']['photoshoots']['Row'][];
      };
      confirm_mock_photoshoot_payment: {
        Args: { p_photoshoot_id: string };
        Returns: Database['public']['Tables']['photoshoots']['Row'][];
      };
      finish_photoshoot_generation: {
        Args: {
          p_photoshoot_id: string;
          p_succeeded: boolean;
          p_safe_error?: string | null;
        };
        Returns: Database['public']['Tables']['photoshoots']['Row'][];
      };
      claim_photoshoot_generation: {
        Args: { p_photoshoot_id: string };
        Returns: boolean;
      };
      record_photoshoot_result_images: {
        Args: {
          p_photoshoot_id: string;
          p_result_images: string[];
        };
        Returns: Database['public']['Tables']['photoshoots']['Row'][];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Photoshoot = Database["public"]["Tables"]["photoshoots"]["Row"];
export type PhotoshootInsert = Database["public"]["Tables"]["photoshoots"]["Insert"];
export type PhotoshootUpdate = Database["public"]["Tables"]["photoshoots"]["Update"];
