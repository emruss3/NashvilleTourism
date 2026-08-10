/** Shared media asset shapes (kept separate to avoid circular imports with restored catalog). */

export interface MediaAsset {
  /** Path under /public. */
  src: string;
  /** Required alt text. Describes the photo, not the page. */
  alt: string;
  /** Photographer or agency. Displayed where the licence requires it. */
  credit?: string;
  /** Licence note kept for the record, e.g. "Unsplash Licence", "Licensed 2026". */
  licence?: string;
  /** Intrinsic size, used to reserve layout space and avoid CLS. */
  width: number;
  height: number;
  /** Tiny blurred placeholder (data URI) if one has been generated. */
  blurDataURL?: string;
  /** Focal point for art direction on tight crops. */
  focal?: 'center' | 'top' | 'bottom';
  /** Optional mobile/portrait crop for <picture> heroes. */
  srcMobile?: string;
  /** Responsive srcSet for desktop/default source. */
  srcSet?: string;
  /** Responsive srcSet for mobile art-directed crop. */
  srcMobileSet?: string;
  /** CSS object-position for desktop. */
  objectPosition?: string;
  /** CSS object-position for mobile crop. */
  objectPositionMobile?: string;
}

export interface VideoAsset {
  webm?: string;
  mp4?: string;
  poster?: string;
  alt: string;
  credit?: string;
  licence?: string;
}
