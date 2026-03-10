import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify calling user is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !caller) throw new Error("Invalid token");

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();
    if (roleData?.role !== "admin") throw new Error("Admin access required");

    const { action, userId, password } = await req.json();

    switch (action) {
      case "list": {
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        if (error) throw error;
        const userList = users.map((u: any) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
        }));
        return new Response(JSON.stringify({ users: userList }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reset-password": {
        if (!userId || !password) throw new Error("userId and password required");
        if (password.length < 6) throw new Error("Password must be at least 6 characters");
        const { error } = await supabase.auth.admin.updateUserById(userId, { password });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete": {
        if (!userId) throw new Error("userId required");
        if (userId === caller.id) throw new Error("Cannot delete your own account");
        // Delete profile and roles first (cascade should handle it but be safe)
        await supabase.from("user_roles").delete().eq("user_id", userId);
        await supabase.from("profiles").delete().eq("user_id", userId);
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
