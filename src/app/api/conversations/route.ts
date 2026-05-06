import { supabase } from "@/lib/supabase";

export async function GET() {
  // Get all conversations with their latest message
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    const tableMissing =
      error.code === "PGRST205" ||
      error.message.includes("Could not find the table 'public.conversations'");
    if (tableMissing) {
      return Response.json(
        {
          error:
            "Missing Supabase schema. Run supabase-schema.sql in Supabase SQL Editor for this project.",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return Response.json({ error: error.message }, { status: 500 });
  }

  // Fetch last message for each conversation
  const withLastMessage = await Promise.all(
    (conversations || []).map(async (convo) => {
      const { data: messages } = await supabase
        .from("messages")
        .select("content, role, created_at")
        .eq("conversation_id", convo.id)
        .order("created_at", { ascending: false })
        .limit(1);

      return {
        ...convo,
        last_message: messages?.[0]?.content || null,
      };
    })
  );

  return Response.json(withLastMessage);
}
