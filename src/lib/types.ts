export type Profile = {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  banner_url: string | null;
  location: string | null;
  website: string | null;
  status_text: string | null;
  is_public: boolean;
  show_location: boolean;
  show_discord: boolean;
  show_activity: boolean;
  show_socials: boolean;
  show_projects: boolean;
  show_music: boolean;
  show_media: boolean;
  theme_id: string;
  layout_id: string;
  profile_views: number;
  plan: string;
  custom_css: string;
  remove_branding: boolean;
  show_pro_badge: boolean;
  custom_font: string;
  background_type: string;
  background_config: Record<string, unknown>;
  accent_color: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_image: string | null;
  seo_indexable: boolean;
  created_at: string;
  updated_at: string;
};

export type Link = {
  id: string;
  profile_id: string;
  title: string;
  description: string;
  url: string;
  icon: string;
  thumbnail_url: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SocialLink = {
  id: string;
  profile_id: string;
  platform: string;
  username: string;
  url: string;
  icon: string;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  profile_id: string;
  title: string;
  description: string;
  image_url: string | null;
  project_url: string | null;
  github_url: string | null;
  technologies: string[];
  position: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
};

export type Widget = {
  id: string;
  profile_id: string;
  type: string;
  config: Record<string, unknown>;
  position: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
};

export type AnalyticsEvent = {
  id: string;
  profile_id: string;
  link_id: string | null;
  event_type: string;
  device: string | null;
  country: string | null;
  referrer: string | null;
  created_at: string;
};

export type Theme = {
  id: string;
  name: string;
  config: Record<string, string>;
};

export type DiscordConnection = {
  id: string;
  profile_id: string;
  discord_user_id: string;
  discord_username: string;
  display_name: string | null;
  avatar_url: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MediaItem = {
  id: string;
  profile_id: string;
  type: string;
  storage_path: string;
  url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
};

export type MusicTrack = {
  id: string;
  profile_id: string;
  title: string;
  artist: string;
  audio_url: string;
  cover_url: string | null;
  is_active: boolean;
  position: number;
  created_at: string;
};

export type Report = {
  id: string;
  profile_id: string;
  reporter_id: string | null;
  reason: string;
  status: string;
  created_at: string;
};

export type Plan = {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired' | 'incomplete';
  billing_cycle: 'monthly' | 'yearly';
  provider: 'stripe' | 'iyzico' | 'manual';
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_start: string | null;
  trial_end: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionFeature = {
  id: string;
  plan_id: string;
  feature_key: string;
  enabled: boolean;
  limit_value: number | null;
  created_at: string;
};

export type CustomDomain = {
  id: string;
  profile_id: string;
  domain: string;
  status: 'pending' | 'verified' | 'active' | 'disabled';
  verification_token: string;
  verified_at: string | null;
  created_at: string;
};

export type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: 'open' | 'resolved' | 'closed';
  priority: 'normal' | 'high';
  created_at: string;
  updated_at: string;
};

export type FeatureEntitlement = {
  enabled: boolean;
  limit: number | null;
  planSlug: string;
};

export type ProfileInsert = Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'profile_views'>;
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
