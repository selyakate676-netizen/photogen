export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PhotoshootStatus = "pending" | "training" | "generating" | "completed" | "error";
export type PhotoshootGender = "woman" | "man";

export interface Database {
  public: {
    Tables: {
      photoshoots: {
        Row: {
          id: string;
          user_id: string;
          style_id: string;
          status: PhotoshootStatus;
          images: string[];
          result_images: string[];
          gender: PhotoshootGender;
          body_type: string;
          eye_color: string;
          hair_color: string;
          training_id: string | null;
          lora_url: string | null;
          generation_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          style_id: string;
          status?: PhotoshootStatus;
          images?: string[];
          result_images?: string[];
          gender?: PhotoshootGender;
          body_type?: string;
          eye_color?: string;
          hair_color?: string;
          training_id?: string | null;
          lora_url?: string | null;
          generation_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          style_id?: string;
          status?: PhotoshootStatus;
          images?: string[];
          result_images?: string[];
          gender?: PhotoshootGender;
          body_type?: string;
          eye_color?: string;
          hair_color?: string;
          training_id?: string | null;
          lora_url?: string | null;
          generation_id?: string | null;
          created_at?: string;
          updated_at?: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Photoshoot = Database["public"]["Tables"]["photoshoots"]["Row"];
export type PhotoshootInsert = Database["public"]["Tables"]["photoshoots"]["Insert"];
export type PhotoshootUpdate = Database["public"]["Tables"]["photoshoots"]["Update"];
