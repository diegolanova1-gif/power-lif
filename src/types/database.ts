// Database types - Generated from Supabase
// Run: npx supabase gen types typescript --project-id <ref> > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          organization_id: string | null
          role: 'coach' | 'athlete'
          full_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          organization_id?: string | null
          role: 'coach' | 'athlete'
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          role?: 'coach' | 'athlete'
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
      }
      coach_athletes: {
        Row: {
          coach_id: string
          athlete_id: string
          assigned_at: string
        }
        Insert: {
          coach_id: string
          athlete_id: string
          assigned_at?: string
        }
        Update: {
          coach_id?: string
          athlete_id?: string
          assigned_at?: string
        }
      }
      routines: {
        Row: {
          id: string
          coach_id: string
          name: string
          description: string | null
          is_template: boolean
          structure: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          name: string
          description?: string | null
          is_template?: boolean
          structure: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          name?: string
          description?: string | null
          is_template?: boolean
          structure?: Json
          created_at?: string
          updated_at?: string
        }
      }
      athlete_routines: {
        Row: {
          id: string
          athlete_id: string
          routine_id: string
          started_at: string
          current_week: number
          current_day: number
          status: 'active' | 'paused' | 'completed'
          assigned_at: string
        }
        Insert: {
          id?: string
          athlete_id: string
          routine_id: string
          started_at?: string
          current_week?: number
          current_day?: number
          status?: 'active' | 'paused' | 'completed'
          assigned_at?: string
        }
        Update: {
          id?: string
          athlete_id?: string
          routine_id?: string
          started_at?: string
          current_week?: number
          current_day?: number
          status?: 'active' | 'paused' | 'completed'
          assigned_at?: string
        }
      }
      exercises: {
        Row: {
          id: string
          name: string
          category: 'squat' | 'bench' | 'deadlift' | 'accessory' | 'olympic' | 'other'
          muscle_groups: string[] | null
          is_competition_lift: boolean
        }
        Insert: {
          id?: string
          name: string
          category?: 'squat' | 'bench' | 'deadlift' | 'accessory' | 'olympic' | 'other'
          muscle_groups?: string[] | null
          is_competition_lift?: boolean
        }
        Update: {
          id?: string
          name?: string
          category?: 'squat' | 'bench' | 'deadlift' | 'accessory' | 'olympic' | 'other'
          muscle_groups?: string[] | null
          is_competition_lift?: boolean
        }
      }
      sets_log: {
        Row: {
          id: string
          athlete_id: string
          athlete_routine_id: string
          exercise_id: string
          week: number
          day: number
          set_number: number
          weight_kg: number
          reps: number
          rpe: number | null
          rir: number | null
          completed_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          athlete_id: string
          athlete_routine_id: string
          exercise_id: string
          week: number
          day: number
          set_number: number
          weight_kg: number
          reps: number
          rpe?: number | null
          rir?: number | null
          completed_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          athlete_id?: string
          athlete_routine_id?: string
          exercise_id?: string
          week?: number
          day?: number
          set_number?: number
          weight_kg?: number
          reps?: number
          rpe?: number | null
          rir?: number | null
          completed_at?: string
          notes?: string | null
        }
      }
      estimated_1rm: {
        Row: {
          id: string
          athlete_id: string
          exercise_id: string
          estimated_1rm: number
          calculated_at: string
          source_set_id: string | null
        }
        Insert: {
          id?: string
          athlete_id: string
          exercise_id: string
          estimated_1rm: number
          calculated_at?: string
          source_set_id?: string | null
        }
        Update: {
          id?: string
          athlete_id?: string
          exercise_id?: string
          estimated_1rm?: number
          calculated_at?: string
          source_set_id?: string | null
        }
      }
      bodyweight_log: {
        Row: {
          id: string
          athlete_id: string
          weight_kg: number
          logged_at: string
        }
        Insert: {
          id?: string
          athlete_id: string
          weight_kg: number
          logged_at?: string
        }
        Update: {
          id?: string
          athlete_id?: string
          weight_kg?: number
          logged_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database['public']['Tables'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'])
    : never = PublicTableNameOrOptions extends keyof (Database['public']['Tables'])
    ? PublicTableNameOrOptions
    : never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : (Database['public']['Tables'])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never

export type InsertTables<
  PublicTableNameOrOptions extends
    | keyof (Database['public']['Tables'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'])
    : never = PublicTableNameOrOptions extends keyof (Database['public']['Tables'])
    ? PublicTableNameOrOptions
    : never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'])[TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : (Database['public']['Tables'])[PublicTableNameOrOptions] extends {
      Insert: infer I
    }
  ? I
  : never

export type UpdateTables<
  PublicTableNameOrOptions extends
    | keyof (Database['public']['Tables'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'])
    : never = PublicTableNameOrOptions extends keyof (Database['public']['Tables'])
    ? PublicTableNameOrOptions
    : never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'])[TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : (Database['public']['Tables'])[PublicTableNameOrOptions] extends {
      Update: infer U
    }
  ? U
  : never