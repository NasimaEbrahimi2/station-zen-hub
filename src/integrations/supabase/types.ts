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
      accounts: {
        Row: {
          balance: number
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          subtype: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          balance?: number
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          subtype?: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          balance?: number
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          subtype?: string | null
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          work_date: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          work_date?: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profile: {
        Row: {
          address: string | null
          created_at: string
          currency: string
          email: string | null
          id: number
          logo_url: string | null
          name: string
          owner_name: string | null
          phone: string | null
          tax_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id?: number
          logo_url?: string | null
          name: string
          owner_name?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id?: number
          logo_url?: string | null
          name?: string
          owner_name?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          full_name_fa: string | null
          id: string
          notes: string | null
          phone: string | null
          updated_at: string
          vehicle_plate: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          full_name_fa?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          vehicle_plate?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          full_name_fa?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          vehicle_plate?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          email: string | null
          full_name: string
          full_name_fa: string | null
          hired_at: string | null
          id: string
          notes: string | null
          phone: string | null
          position: string | null
          salary: number
          salary_pay_day: number | null
          schedule: string | null
          status: string
          updated_at: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          full_name_fa?: string | null
          hired_at?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          salary?: number
          salary_pay_day?: number | null
          schedule?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          full_name_fa?: string | null
          hired_at?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          salary?: number
          salary_pay_day?: number | null
          schedule?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          expense_account_id: string
          expense_date: string
          expense_no: number
          id: string
          journal_entry_id: string | null
          memo: string | null
          payment_account_id: string
          reference: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          expense_account_id: string
          expense_date?: string
          expense_no?: number
          id?: string
          journal_entry_id?: string | null
          memo?: string | null
          payment_account_id: string
          reference?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          expense_account_id?: string
          expense_date?: string
          expense_no?: number
          id?: string
          journal_entry_id?: string | null
          memo?: string | null
          payment_account_id?: string
          reference?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_payment_account_id_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          created_by: string | null
          entry_date: string
          entry_no: number
          id: string
          memo: string | null
          reference: string | null
          source_id: string | null
          source_type: string | null
          total: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_no?: number
          id?: string
          memo?: string | null
          reference?: string | null
          source_id?: string | null
          source_type?: string | null
          total?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_no?: number
          id?: string
          memo?: string | null
          reference?: string | null
          source_id?: string | null
          source_type?: string | null
          total?: number
        }
        Relationships: []
      }
      journal_lines: {
        Row: {
          account_id: string
          created_at: string
          credit: number
          debit: number
          description: string | null
          entry_id: string
          id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_id: string
          id?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
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
      salary_payments: {
        Row: {
          amount: number
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          pay_date: string
          period: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          pay_date?: string
          period?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          pay_date?: string
          period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          fuel_type: string | null
          id: string
          invoice_no: string
          liters: number
          operator_id: string | null
          operator_name: string | null
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
          customer_id?: string | null
          customer_name?: string | null
          fuel_type?: string | null
          id?: string
          invoice_no?: string
          liters: number
          operator_id?: string | null
          operator_name?: string | null
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
          customer_id?: string | null
          customer_name?: string | null
          fuel_type?: string | null
          id?: string
          invoice_no?: string
          liters?: number
          operator_id?: string | null
          operator_name?: string | null
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
          arabic_pct: number
          auto_refill: boolean
          currency: string
          fuel_price: number
          fuel_type: string
          id: number
          iranian_pct: number
          low_threshold: number
          russian_pct: number
          station_name: string
          tank_capacity: number
          updated_at: string
        }
        Insert: {
          arabic_pct?: number
          auto_refill?: boolean
          currency?: string
          fuel_price?: number
          fuel_type?: string
          id?: number
          iranian_pct?: number
          low_threshold?: number
          russian_pct?: number
          station_name?: string
          tank_capacity?: number
          updated_at?: string
        }
        Update: {
          arabic_pct?: number
          auto_refill?: boolean
          currency?: string
          fuel_price?: number
          fuel_type?: string
          id?: number
          iranian_pct?: number
          low_threshold?: number
          russian_pct?: number
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
      vendors: {
        Row: {
          address: string | null
          balance: number
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          balance?: number
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          balance?: number
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
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
      post_journal_entry: {
        Args: {
          _entry_date: string
          _lines: Json
          _memo: string
          _reference: string
          _source_id: string
          _source_type: string
        }
        Returns: string
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
      record_expense: {
        Args: {
          _amount: number
          _expense_account_id: string
          _expense_date: string
          _memo: string
          _payment_account_id: string
          _reference: string
          _vendor_id: string
          _vendor_name: string
        }
        Returns: {
          amount: number
          created_at: string
          created_by: string | null
          expense_account_id: string
          expense_date: string
          expense_no: number
          id: string
          journal_entry_id: string | null
          memo: string | null
          payment_account_id: string
          reference: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        SetofOptions: {
          from: "*"
          to: "expenses"
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
      record_sale:
        | {
            Args: {
              _customer_name: string
              _liters: number
              _pump_id: string
              _vehicle_plate: string
            }
            Returns: {
              created_at: string
              created_by: string | null
              customer_id: string | null
              customer_name: string | null
              fuel_type: string | null
              id: string
              invoice_no: string
              liters: number
              operator_id: string | null
              operator_name: string | null
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
        | {
            Args: {
              _customer_id?: string
              _customer_name: string
              _fuel_type?: string
              _liters: number
              _operator_id?: string
              _operator_name?: string
              _pump_id: string
              _vehicle_plate: string
            }
            Returns: {
              created_at: string
              created_by: string | null
              customer_id: string | null
              customer_name: string | null
              fuel_type: string | null
              id: string
              invoice_no: string
              liters: number
              operator_id: string | null
              operator_name: string | null
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
      refill_pump_to_full: {
        Args: { _pump_id: string }
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
    }
    Enums: {
      account_type: "asset" | "liability" | "equity" | "income" | "expense"
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
      account_type: ["asset", "liability", "equity", "income", "expense"],
      app_role: ["admin", "staff"],
    },
  },
} as const
