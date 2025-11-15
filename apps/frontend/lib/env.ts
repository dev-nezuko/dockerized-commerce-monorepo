export const env = {
  /** Browser-visible API base, fixed at build time. */
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api',
  /** Server-side API base used during rendering. */
  INTERNAL_API_URL: process.env.INTERNAL_API_URL || 'http://localhost:4000/api',
  CLOUDINARY_BASE: process.env.NEXT_PUBLIC_CLOUDINARY_BASE || 'https://res.cloudinary.com/demo/image/upload',
};
