/** Google Play logo (the four-colour triangle), for the download buttons. */
export function GooglePlayIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#2196F3" d="M3.6 1.8 13.7 12 3.6 22.2c-.4-.2-.6-.6-.6-1.1V2.9c0-.5.2-.9.6-1.1Z" />
      <path fill="#34A853" d="M3.6 1.8c.3-.2.8-.2 1.2 0l12.1 7L13.7 12Z" />
      <path fill="#EA4335" d="m3.6 22.2 10.1-10.2 3.2 3.2-12.1 7c-.4.2-.9.2-1.2 0Z" />
      <path fill="#FBBC04" d="m16.9 8.8 3.5 2c.9.5.9 1.9 0 2.4l-3.5 2-3.2-3.2Z" />
    </svg>
  );
}
