import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import MovieDetail from './pages/MovieDetail';
import Profile from './pages/Profile';
import AIAssistant from './pages/AIAssistant';
import MovieCard from './components/MovieCard';
import { ViewState, Movie, User } from './types';
import { getPlaylists, VIBES } from './services/dataService';
import { fetchPopularMovies, searchMovies, fetchMoviesByVibe, fetchTrendingMovies } from './services/tmdbService';
import { getCurrentUser, logoutUser, toggleWatchlist } from './services/authService';
import { recommendMoviesByVibe } from './services/geminiService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>(ViewState.AUTH);
  
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTimer, setSearchTimer] = useState<any>(null);
  
  // Static Playlists for MVP (mixed with dynamic Watchlist)
  const playlists = getPlaylists();

  // Check auth on mount
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      if (!currentUser.isOnboardingComplete) {
        setView(ViewState.ONBOARDING);
      } else {
        setView(ViewState.HOME);
        loadMovies(currentUser.selectedVibes);
      }
    } else {
      setView(ViewState.AUTH);
    }
  }, []);

  const loadMovies = async (vibes?: string[]) => {
    setLoading(true);
    
    // Improved Logic: Use AI to find movies matching ALL vibes if user has preferences
    if (vibes && vibes.length > 0) {
      try {
        // Map vibe IDs to names for the AI prompt
        const vibeNames = vibes.map(id => VIBES.find(v => v.id === id)?.name || id).join(', ');
        const prompt = `Find movies that specifically combine these vibes: ${vibeNames}.`;
        
        // 1. Get Recommendations
        const recommendedTitles = await recommendMoviesByVibe(prompt);
        
        if (recommendedTitles.length > 0) {
           // 2. Fetch details from TMDB for each recommendation
           const moviePromises = recommendedTitles.map(title => searchMovies(title));
           const searchResults = await Promise.all(moviePromises);
           
           // Flatten and take top result for each title
           const foundMovies = searchResults
             .map(res => res[0])
             .filter(m => !!m);
             
           if (foundMovies.length > 0) {
             setMovies(foundMovies);
             setLoading(false);
             return;
           }
        }
      } catch (e) {
        console.error("AI recommendation failed, falling back to standard fetch", e);
      }
      
      // Fallback to single category fetch if AI fails or returns nothing
      const data = await fetchMoviesByVibe(vibes[0]);
      setMovies(data);
    } else {
      const data = await fetchPopularMovies();
      setMovies(data);
    }
    setLoading(false);
  };

  const handleAuthSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    if (!loggedInUser.isOnboardingComplete) {
      setView(ViewState.ONBOARDING);
    } else {
      setView(ViewState.HOME);
      loadMovies(loggedInUser.selectedVibes);
    }
  };

  const handleOnboardingComplete = (updatedUser: User) => {
    setUser(updatedUser);
    setView(ViewState.HOME);
    loadMovies(updatedUser.selectedVibes);
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setView(ViewState.AUTH);
  };

  // Sections Logic
  const handleTrendingClick = async () => {
    setLoading(true);
    setView(ViewState.TRENDING);
    const data = await fetchTrendingMovies();
    setMovies(data);
    setLoading(false);
  };

  const handleMyMoviesClick = () => {
    if (!user) return;
    setView(ViewState.MY_MOVIES);
    setMovies(user.watchlist);
  };

  const handleSearch = (query: string) => {
    if (searchTimer) clearTimeout(searchTimer);
    
    setSearchTimer(setTimeout(async () => {
      if (query.trim().length === 0) {
        loadMovies(user?.selectedVibes);
        return;
      }
      setLoading(true);
      const results = await searchMovies(query);
      setMovies(results);
      setLoading(false);
      
      if (view !== ViewState.HOME && view !== ViewState.MY_MOVIES) {
          setView(ViewState.HOME);
      }
    }, 600));
  };

  const handleVibeClick = async (vibeId: string) => {
     setLoading(true);
     setView(ViewState.HOME);
     // For single click on homepage, simple category fetch is fine/faster
     const data = await fetchMoviesByVibe(vibeId);
     setMovies(data);
     setLoading(false);
  };

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie);
    setView(ViewState.MOVIE_DETAIL);
  };

  const handleBack = () => {
    setSelectedMovie(null);
    setView(ViewState.HOME);
  };

  const handleAddToWatchlist = (movie: Movie) => {
    if (!user) return;
    const updatedUser = toggleWatchlist(user, movie);
    setUser(updatedUser);
    
    // Simple visual feedback
    const exists = user.watchlist.find(m => m.id === movie.id);
    alert(exists ? `Удалено из "Мои фильмы"` : `Добавлено в "Мои фильмы"`);
  };

  if (view === ViewState.AUTH) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  if (view === ViewState.ONBOARDING && user) {
    return <Onboarding user={user} onComplete={handleOnboardingComplete} />;
  }

  // Render content based on current view
  const renderContent = () => {
    switch (view) {
      case ViewState.HOME:
        return (
          <Home 
            movies={movies} 
            vibes={VIBES} 
            onMovieClick={handleMovieClick}
            onVibeClick={handleVibeClick}
            isLoading={loading}
          />
        );
      case ViewState.TRENDING:
        return (
           <div className="p-6 md:p-12 animate-fade-in">
             <h2 className="text-2xl font-bold text-white mb-6">Сейчас в тренде</h2>
             {loading ? (
                <div className="text-primary animate-pulse">Загрузка...</div>
             ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {movies.map(m => <MovieCard key={m.id} movie={m} onClick={handleMovieClick} />)}
                </div>
             )}
           </div>
        );
      case ViewState.MY_MOVIES:
        return (
           <div className="p-6 md:p-12 animate-fade-in">
             <h2 className="text-2xl font-bold text-white mb-6">Мои фильмы</h2>
             {user?.watchlist.length === 0 ? (
                <div className="text-center py-20 text-textMuted">
                  <p className="text-lg">Ваш список пуст</p>
                  <p className="text-sm">Добавляйте фильмы, чтобы не потерять их</p>
                </div>
             ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {user?.watchlist.map(m => <MovieCard key={m.id} movie={m} onClick={handleMovieClick} />)}
                </div>
             )}
           </div>
        );
      case ViewState.MOVIE_DETAIL:
        return selectedMovie ? (
          <MovieDetail 
            movie={selectedMovie} 
            onBack={handleBack} 
            onAddToPlaylist={handleAddToWatchlist}
            onMovieClick={handleMovieClick}
          />
        ) : (
          <Home 
            movies={movies} 
            vibes={VIBES} 
            onMovieClick={handleMovieClick} 
            isLoading={loading}
          />
        );
      case ViewState.AI_ASSISTANT:
        return <AIAssistant onMovieClick={handleMovieClick} />;
      case ViewState.PROFILE:
        return user ? <Profile user={user} playlists={playlists} onLogout={handleLogout} /> : null;
      case ViewState.PLAYLIST:
        return user ? <Profile user={user} playlists={playlists} onLogout={handleLogout} /> : null;
      default:
        return <Home movies={movies} vibes={VIBES} onMovieClick={handleMovieClick} />;
    }
  };

  return (
    <Layout 
      currentView={view} 
      setView={(v) => {
        if (v === ViewState.TRENDING) handleTrendingClick();
        else if (v === ViewState.MY_MOVIES) handleMyMoviesClick();
        else setView(v);
      }} 
      userAvatar={user?.avatar}
      onSearch={handleSearch}
      onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;