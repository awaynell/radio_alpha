// src/hooks/useTrackVotes.ts
import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

const supabase = createClient(
  import.meta.env.VITE_SUPA_URL!,
  import.meta.env.VITE_SUPA_KEY!
);

type VoteValue = 1 | -1;

/** через сколько миллисекунд опрашиваем БД (резерв на случай потери WebSocket) */
const POLL_INTERVAL = 10_000; // 10 секунд

export const useTrackVotes = (track: string | null) => {
  /* ───────── state ──────────────────────────────────────────────────── */
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [alreadyVoted, setAlready] = useState(false);
  const [userIP, setUserIP] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /* ───────── helpers ────────────────────────────────────────────────── */
  /** один раз узнаём внешний IP */
  useEffect(() => {
    (async () => {
      const ip = (
        await fetch("https://radioalpha.mooo.com/ip").then((r) => r.text())
      ).trim();
      setUserIP(ip);
    })();
  }, []);

  /** загружаем голоса + проверяем, голосовал ли этот IP */
  const getVotes = useCallback(async () => {
    if (!track) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from("votes")
      .select("vote, ip")
      .eq("track", track);

    setIsLoading(false);
    if (error || !data) return;

    setLikes(data.filter((r) => r.vote === 1).length);
    setDislikes(data.filter((r) => r.vote === -1).length);
    if (userIP) setAlready(data.some((r) => r.ip === userIP));
  }, [track, userIP]);

  /* ───────── initial load ───────────────────────────────────────────── */
  useEffect(() => {
    getVotes();
  }, [getVotes]);

  // /* ───────── realtime via WebSocket ─────────────────────────────────── */
  // useEffect(() => {
  //   if (!track) return;

  //   const channel = supabase
  //     .channel("votes")
  //     .on(
  //       "postgres_changes",
  //       {
  //         event: "INSERT",
  //         schema: "public",
  //         table: "votes",
  //         filter: `track=eq.${track}`,
  //       },
  //       (payload) => {
  //         if (payload.new.vote === 1) setLikes((l) => l + 1);
  //         if (payload.new.vote === -1) setDislikes((d) => d + 1);
  //         if (payload.new.ip === userIP) setAlready(true);
  //       }
  //     )
  //     .subscribe();

  //   return () => {
  //     supabase.removeChannel(channel);
  //   };
  // }, [track, userIP]);

  /* ───────── fallback polling ───────────────────────────────────────── */
  useEffect(() => {
    if (!track) return;

    // первый вызов, чтобы не ждать 10 с
    getVotes();

    const id = setInterval(getVotes, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [track, getVotes]);

  /* ───────── vote action ────────────────────────────────────────────── */
  const vote = useCallback(
    async (value: VoteValue) => {
      if (!track || alreadyVoted || !userIP) return;

      const { error } = await supabase
        .from("votes")
        .insert({ track, vote: value, ip: userIP });

      if (error?.code === "23505") {
        // уникальный индекс: уже голосовал
        setAlready(true);
      } else if (!error) {
        setAlready(true);
        value === 1 ? setLikes((l) => l + 1) : setDislikes((d) => d + 1);
      }
    },
    [track, userIP, alreadyVoted]
  );

  /* ───────── public API ─────────────────────────────────────────────── */
  return { likes, dislikes, alreadyVoted, vote, isLoading, userIP };
};
