export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface Review {
  id: string;
  author: string;
  content: string;
  created_at: string;
}

// Internal app review with social features
export interface LocalReview {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  movieId: number;
  rating: number;
  content: string;
  timestamp: number;
  likes: number;
  comments: Comment[];
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  content: string;
  timestamp: number;
}

export interface Track {
  title: string;
  artist: string;
  vibe: string;
}

export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  genres: string[];
  vibe_tags: string[];
  vibe_description?: string;
  rating: number;
  year: number;
  cast?: CastMember[];
  reviews?: Review[];
  soundtrack?: Track[];
}

export interface Playlist {
  id: string;
  userId: string;
  title: string;
  description: string;
  vibeTheme: string;
  movieIds: number[];
  isPublic: boolean;
  coverImage?: string;
  comments: Comment[]; // Discussion on playlist
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  selectedVibes: string[]; // IDs of vibes
  watchlist: Movie[];
  top5: Movie[]; // Top 5 favorite movies
  isOnboardingComplete: boolean;
}

export interface VibeCategory {
  id: string;
  name: string;
  color: string;
  image: string;
}

export enum ViewState {
  AUTH = 'AUTH',
  ONBOARDING = 'ONBOARDING',
  HOME = 'HOME',
  MOVIE_DETAIL = 'MOVIE_DETAIL',
  PROFILE = 'PROFILE',
  PLAYLIST = 'PLAYLIST',
  AI_ASSISTANT = 'AI_ASSISTANT',
  MY_MOVIES = 'MY_MOVIES',
  TRENDING = 'TRENDING'
}