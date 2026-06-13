import { supabase } from "./supabase";

export async function fetchShortsComments(videoId) {
  const { data, error } = await supabase
    .from("shorts_comments")
    .select("*")
    .eq("video_id", String(videoId))
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Error fetching comments:", error);
    return [];
  }
  return data || [];
}

export async function postShortsComment({ videoId, userId, username, text }) {
  const trimmed = (text || "").trim();
  if (!trimmed) return { error: new Error("Empty comment") };
  return supabase
    .from("shorts_comments")
    .insert({
      video_id: String(videoId),
      user_id: userId,
      username,
      text: trimmed,
    })
    .select()
    .single();
}

export function subscribeToShortsComments(videoId, onInsert) {
  const channel = supabase
    .channel("shorts-comments:" + videoId)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "shorts_comments",
        filter: `video_id=eq.${String(videoId)}`,
      },
      (payload) => onInsert(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
