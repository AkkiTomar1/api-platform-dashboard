const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Platform Admin",
  platform_dev: "Platform Developer",
  platform_viewer: "Platform Viewer",
  service_admin: "Service Admin",
  service_dev: "Service Developer",
  service_viewer: "Service Viewer",
  consumer_admin: "Consumer Admin",
};

export function prettifyRole(role: string): string {
  const label = ROLE_LABELS[role];
  if (label) return label;
  return role
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());
}