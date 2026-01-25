import { groq } from "next-sanity";

// Fetch recent log entries for homepage
export const RECENT_POSTS_QUERY = groq`*[
  _type == "logEntry"
  && defined(slug.current)
]|order(publishedAt desc)[0...3]{
  _id,
  title,
  slug,
  publishedAt,
  category,
  excerpt,
  "location": location.name,
  heroImage
}`;

// Fetch all log entries for the log page
export const ALL_POSTS_QUERY = groq`*[
  _type == "logEntry"
  && defined(slug.current)
]|order(publishedAt desc){
  _id,
  title,
  slug,
  publishedAt,
  category,
  excerpt,
  "location": location.name,
  heroImage
}`;

// Fetch single log entry by slug
export const POST_BY_SLUG_QUERY = groq`*[
  _type == "logEntry"
  && slug.current == $slug
][0]{
  _id,
  title,
  slug,
  publishedAt,
  category,
  excerpt,
  body,
  heroImage,
  gallery,
  location,
  weather,
  "voyage": voyage->title
}`;

// Fetch featured gallery images
export const FEATURED_GALLERY_QUERY = groq`*[
  _type == "galleryImage"
  && featured == true
]|order(takenAt desc)[0...5]{
  _id,
  image,
  caption,
  category
}`;

// Fetch all gallery images
export const ALL_GALLERY_QUERY = groq`*[
  _type == "galleryImage"
]|order(_createdAt desc){
  _id,
  image,
  caption,
  category,
  takenAt,
  exif,
  "voyage": voyage->title
}`;

// Fetch site settings
export const SITE_SETTINGS_QUERY = groq`*[_type == "siteSettings"][0]{
  siteName,
  tagline,
  description,
  currentPosition,
  stats,
  socialLinks,
  sailloggerUrl,
  "currentVoyage": currentVoyage->title
}`;

// Fetch all voyages
export const VOYAGES_QUERY = groq`*[
  _type == "voyage"
]|order(startDate desc){
  _id,
  title,
  slug,
  description,
  startDate,
  endDate,
  status,
  heroImage
}`;

// Fetch crew members
export const CREW_QUERY = groq`*[
  _type == "crew"
]|order(order asc){
  _id,
  name,
  role,
  bio,
  photo
}`;
