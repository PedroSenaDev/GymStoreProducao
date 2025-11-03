export interface Policy {
  id: string;
  title: string;
  content: string;
  created_at: string;
  display_area: 'product' | 'footer' | 'both' | 'about_us';
  image_url?: string | null;
}