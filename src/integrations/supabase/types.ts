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
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      pumps: {
        Row: {
          capacity: number
          created_at: string
          current_volume: number
          id: string
          pump_number: number
          total_revenue: number
          total_sold: number
        }
        Insert: {
          capacity?: number
          created_at?: string
          current_volume?: number
          id?: string
          pump_number: number
          total_revenue?: number
          total_sold?: number
        }
        Update: {
          capacity?: number
          created_at?: string
          current_volume?: number
          id?: string
          pump_number?: number
          total_revenue?: number
          total_sold?: number
        }
        Relationships: []
      }
      refills: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          liters: number
          pump_after: number
          pump_before: number
          pump_id: string
          tank_after: number
          tank_before: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          liters: number
          pump_after: number
          pump_before: number
          pump_id: string
          tank_after: number
          tank_before: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          liters?: number
          pump_after?: number
          pump_before?: number
          pump_id?: string
          tank_after?: number
          tank_before?: number
        }
        Relationships: [
          {
            foreignKeyName: "refills_pump_id_fkey"
            columns: ["pump_id"]
            isOneToOne: false
            referencedRelation: "pumps"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          created_by: string | null
          customer_name: string | null
          id: string
          invoice_no: string
          liters: number
          price_per_liter: number
          pump_after: number
          pump_before: number
          pump_id: string
          pump_number: number
          total: number
          vehicle_plate: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          id?: string
          invoice_no?: string
          liters: number
          price_per_liter: number
          pump_after: number
          pump_before: number
          pump_id: string
          pump_number: number
          total: number
          vehicle_plate?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          id?: string
          invoice_no?: string
          liters?: number
          price_per_liter?: number
          pump_after?: number
          pump_before?: number
          pump_id?: string
          pump_number?: number
          total?: number
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_pump_id_fkey"
            columns: ["pump_id"]
            isOneToOne: false
            referencedRelation: "pumps"
            referencedColumns: ["id"]
          },
        ]
      }
      station_config: {
        Row: {
          currency: string
          fuel_price: number
          id: number
          station_name: string
          tank_capacity: number
          updated_at: string
        }
        Insert: {
          currency?: string
          fuel_price?: number
          id?: number
          station_name?: string
          tank_capacity?: number
          updated_at?: string
        }
        Update: {
          currency?: string
          fuel_price?: number
          id?: number
          station_name?: string
          tank_capacity?: number
          updated_at?: string
        }
        Relationships: []
      }
      tank: {
        Row: {
          current_volume: number
          id: number
          updated_at: string
        }
        Insert: {
          current_volume?: number
          id?: number
          updated_at?: string
        }
        Update: {
          current_volume?: number
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      tank_deliveries: {
        Row: {
          cost: number | null
          created_at: string
          created_by: string | null
          id: string
          liters: number
          new_volume: number
          previous_volume: number
          supplier: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          liters: number
          new_volume: number
          previous_volume: number
          supplier?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          liters?: number
          new_volume?: number
          previous_volume?: number
          supplier?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_delivery: {
        Args: { _cost: number; _liters: number; _supplier: string }
        Returns: {
          cost: number | null
          created_at: string
          created_by: string | null
          id: string
          liters: number
          new_volume: number
          previous_volume: number
          supplier: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tank_deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_refill: {
        Args: { _liters: number; _pump_id: string }
        Returns: {
          created_at: string
          created_by: string | null
          id: string
          liters: number
          pump_after: number
          pump_before: number
          pump_id: string
          tank_after: number
          tank_before: number
        }
        SetofOptions: {
          from: "*"
          to: "refills"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_sale: {
        Args: {
          _customer_name: string
          _liters: number
          _pump_id: string
          _vehicle_plate: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          customer_name: string | null
          id: string
          invoice_no: string
          liters: number
          price_per_liter: number
          pump_after: number
          pump_before: number
          pump_id: string
          pump_number: number
          total: number
          vehicle_plate: string | null
        }
        SetofOptions: {
          from: "*"
          to: "sales"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "staff"
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
      app_role: ["admin", "staff"],
    },
  },
} as const
