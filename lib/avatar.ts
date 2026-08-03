export function minecraftAvatarUrl(username?: string | null, size = 40): string {
  return username?.trim()
    ? `https://minotar.net/helm/${encodeURIComponent(username)}/${size}.png`
    : '/images/pet-placeholder.svg';
}
