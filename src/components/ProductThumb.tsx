interface ProductThumbProps {
  /** Empty when the catalogue has no picture for the product. */
  src: string;
  className: string;
  /** Intrinsic size, so a row does not reflow when the picture arrives. */
  size?: number;
  /** Empty by default: the product name is already next to it in every list. */
  alt?: string;
  loading?: 'lazy' | 'eager';
}

/**
 * A product picture, or the space it would take.
 *
 * An empty `src` is not "no image": browsers read it as a request for the
 * current page, which is both a spurious network call and a broken-image box.
 * The catalogue genuinely has products without pictures, so the placeholder is
 * the normal case rather than an error path.
 */
export function ProductThumb({
  src,
  className,
  size,
  alt = '',
  loading = 'lazy',
}: ProductThumbProps) {
  if (src === '') return <span className={className} aria-hidden="true" />;

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading={loading}
    />
  );
}
