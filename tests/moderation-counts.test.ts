// @vitest-environment node
import { expect, it, vi } from "vitest";
import { db, review } from "@/lib/player-chat/server";

it("counts the entire moderation queue while keeping overview lists bounded", () => {
  vi.stubEnv("PLAYER_CHAT_DB", ":memory:");
  try {
    const database = db();
    const addPlayer = database.prepare(
      "INSERT INTO players(id,name,seen,mute,ban) VALUES(?,?,0,?,?)",
    );
    const addReport = database.prepare(
      "INSERT INTO reports(reporter,user,message,text,reason,created,resolved) VALUES('reporter',?,?,'sample','reason',0,?)",
    );
    const until = Date.now() + 60000;
    for (let i = 0; i < 110; i++) {
      addPlayer.run(
        String(i),
        "Player" + i,
        i < 105 ? until : 0,
        i === 3 ? until : 0,
      );
      addReport.run(String(i), i, Number(i >= 72));
    }
    const result = review();
    expect(result.restricted).toHaveLength(100);
    expect(result.reports).toHaveLength(65);
    expect(result.totals).toMatchObject({
      openReports: 72,
      restrictedPlayers: 105,
    });
  } finally {
    vi.unstubAllEnvs();
  }
});
