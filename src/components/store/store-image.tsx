import Image from "next/image";

const SAFE_BLOB = /(\.public\.blob\.vercel-storage\.com|blob\.vercel-storage\.com)$/i;

function isSafeSource(src: string): boolean {
  if (src.startsWith("/")) return true;
  try {
    const host = new URL(src).hostname;
    return host === "" || SAFE_BLOB.test(host);
  } catch {
    return false;
  }
}

export function StoreImage({
  src,
  alt,
  fill = false,
  priority = false,
  sizes,
  className,
  width,
  height,
}: {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
  width?: number;
  height?: number;
}) {
  if (!isSafeSource(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading="lazy" className={className} />;
  }
  if (fill) {
    return (
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={className} />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 36}
      height={height ?? 36}
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
}