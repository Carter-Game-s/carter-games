import { AchievementGallery } from "@/components/features/gaming-dashboard";
export default function AchievementsPage() {
  return (
    <div className="page">
      <h1>Achievements</h1>
      <p className="muted">
        Earned through your real play and favorites, saved only on this device.
      </p>
      <AchievementGallery />
    </div>
  );
}
