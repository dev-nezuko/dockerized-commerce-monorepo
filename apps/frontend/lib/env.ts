export const env = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api',
  INTERNAL_API_URL: process.env.INTERNAL_API_URL || 'http://nginx:80/api',
  CLOUDINARY_BASE: process.env.NEXT_PUBLIC_CLOUDINARY_BASE || process.env.CLOUDINARY_BASE || 'https://res.cloudinary.com/demo/image/upload',
};
