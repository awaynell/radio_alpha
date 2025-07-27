// src/hooks/useGetTopSongs.ts
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

const supabase = createClient(
  import.meta.env.VITE_SUPA_URL!,
  import.meta.env.VITE_SUPA_KEY!
);

type SongStats = {
  track: string;
  likes: number;
};

export const useGetTopSongs = () => {
  const [topAllTime, setTopAllTime] = useState<SongStats[]>([]);
  const [topToday, setTopToday] = useState<SongStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTopSongs = async () => {
      setIsLoading(true);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();

      // Запрос топа за всё время
      const { data: allTimeData, error: allTimeError } = await supabase
        .from("votes")
        .select("track, vote")
        .eq("vote", 1);

      // Запрос топа за сегодня
      const { data: todayData, error: todayError } = await supabase
        .from("votes")
        .select("track, vote, created_at")
        .eq("vote", 1)
        .gte("created_at", todayISO);

      setIsLoading(false);

      if (allTimeError || !allTimeData || todayError || !todayData) return;

      const countByTrack = (records: { track: string }[]) => {
        const map = new Map<string, number>();
        for (const row of records) {
          map.set(row.track, (map.get(row.track) || 0) + 1);
        }
        return [...map.entries()]
          .map(([track, likes]) => ({ track, likes }))
          .sort((a, b) => b.likes - a.likes);
      };

      setTopAllTime(countByTrack(allTimeData));
      setTopToday(countByTrack(todayData));
    };

    fetchTopSongs();

    const interval = setInterval(fetchTopSongs, 60_000);
    return () => clearInterval(interval);
  }, []);

  return {
    topAllTime,
    topToday,
    isLoading,
  };
};
