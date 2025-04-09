import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import * as bootstrap from 'bootstrap';

const API_URL = process.env.REACT_APP_API_URL;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function AnimeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [anime, setAnime] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [watchProgress, setWatchProgress] = useState({});
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const queryParams = new URLSearchParams(window.location.search);
  const episodeIdFromUrl = queryParams.get('ep');
  const [isAnimeWatched, setIsAnimeWatched] = useState(false);
  const [displayedEpisodes, setDisplayedEpisodes] = useState([]);
  const [episodesPerPage, setEpisodesPerPage] = useState(24);
  const [remainingEpisodes, setRemainingEpisodes] = useState(0);
  const [episodeOrder, setEpisodeOrder] = useState('asc');

  useEffect(() => {
    setRemainingEpisodes(episodes.length - displayedEpisodes.length);
  }, [episodes.length, displayedEpisodes.length]);

  useEffect(() => {
    const dropdownElementList = document.querySelectorAll('[data-bs-toggle="dropdown"]');
    dropdownElementList.forEach(dropdownToggle => {
      new bootstrap.Dropdown(dropdownToggle);
    });
  }, [episodes]);

  useEffect(() => {
    if (!loading && episodes.length > 0 && episodeIdFromUrl) {
      const episodeToOpen = episodes.find(ep => ep.id === episodeIdFromUrl);
      if (episodeToOpen) {

        handleEpisodeClick(episodeToOpen, true);
      }
    }
  }, [loading, episodes, episodeIdFromUrl]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        const basicUserData = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || 'Usuário'
        };
        setUser(basicUserData);
        localStorage.setItem('@userAnime', JSON.stringify(basicUserData));

        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();

            if (userData.favoriteAnimes && userData.favoriteAnimes.some(anime => anime.id === id)) {
              setIsFavorite(true);
            }

            if (userData.watchedAnimes && userData.watchedAnimes.some(anime => anime.id === id)) {
              setIsAnimeWatched(true);
            }

            setUser({ ...basicUserData, ...userData });
          }
        } catch (err) {
          console.error("Erro ao carregar dados do usuário:", err);
        }
      }
    });

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    const fetchAnimeDetails = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);


        const response = await fetch(`${API_URL}/api/anime?id=${id}`);
        if (!response.ok) {
          throw new Error(`Error ${response.status}: Unable to fetch anime details`);
        }

        const data = await response.json();

        if (!data || data.error) {
          throw new Error(data.error || "Failed to load anime data");
        }


        setAnime({
          id: data.id,
          title: data.name,
          image: data.image,
          description: data.synopsis,
          genres: data.categories,
          status: data.status,
          studio: data.studio,
          audio: data.audio,
          votes: data.votes,
          releaseDate: data.year,
          type: "TV",
          totalEpisodes: data.episodiosCount,
          score: data.score,
          season: data.season
        });


        if (data.episodios && Array.isArray(data.episodios)) {
          let allEpisodes = data.episodios.map(ep => ({
            id: ep.numero.toString(),
            number: ep.numero,
            title: ep.nome,
            link: ep.link,
            image: data.image
          }));


          allEpisodes = allEpisodes.sort((a, b) => a.number - b.number);

          setEpisodes(allEpisodes);
          setDisplayedEpisodes(allEpisodes.slice(0, episodesPerPage));
          setRemainingEpisodes(allEpisodes.length - episodesPerPage);
        } else {
          setEpisodes([]);
          setDisplayedEpisodes([]);
        }

        if (auth.currentUser) {
          try {
            const userDocRef = doc(db, "users", auth.currentUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
              if (userDoc.data().watchedAnimes && userDoc.data().watchedAnimes.some(anime => anime.id === id)) {
                setIsAnimeWatched(true);
              }

              if (userDoc.data().watchHistory) {
                const firestoreWatchHistory = userDoc.data().watchHistory;

                const updatedProgress = {};
                firestoreWatchHistory.forEach(entry => {
                  if (entry.animeId === id) {
                    updatedProgress[entry.episodeId] = entry.progress;
                  }
                });

                setWatchProgress(updatedProgress);
              }

              if (userDoc.data().watchedEpisodes && userDoc.data().watchedEpisodes[id]) {
                const manuallyWatched = userDoc.data().watchedEpisodes[id];

                const updatedProgress = { ...watchProgress };
                manuallyWatched.forEach(epId => {
                  updatedProgress[epId] = 100;
                });

                setWatchProgress(updatedProgress);
              }
            }
          } catch (error) {
            console.error("Erro ao carregar dados do usuário:", error);
          }
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnimeDetails();
  }, [id, auth.currentUser?.uid, episodeIdFromUrl]);

  const getAgeRatingColor = (rating) => {
    switch (rating) {
      case "L":
        return "green";
      case "A10":
        return "blue";
      case "A14":
        return "orange";
      case "A16":
        return "red";
      case "A18":
        return "black";
      default:
        return "#0dcaf0";
    }
  };

  const toggleEpisodeOrder = () => {
    const newOrder = episodeOrder === 'asc' ? 'desc' : 'asc';
    setEpisodeOrder(newOrder);

    const sortedEpisodes = [...episodes].sort((a, b) => {
      if (newOrder === 'asc') {
        return a.number - b.number;
      } else {
        return b.number - a.number;
      }
    });

    setEpisodes(sortedEpisodes);
    setDisplayedEpisodes(sortedEpisodes.slice(0, displayedEpisodes.length));
  };

  const markEpisodeAsWatched = async (episodeId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const updatedWatchProgress = {
          ...watchProgress,
          [episodeId]: 100
        };
        setWatchProgress(updatedWatchProgress);

        let watchedEpisodes = userDoc.data().watchedEpisodes || {};

        watchedEpisodes[id] = watchedEpisodes[id] || [];
        if (!watchedEpisodes[id].includes(episodeId)) {
          watchedEpisodes[id].push(episodeId);
        }

        await updateDoc(userDocRef, {
          watchedEpisodes: watchedEpisodes
        });

        const allEpisodesWatched = episodes.every(ep =>
          updatedWatchProgress[ep.id] >= 85 ||
          (watchedEpisodes[id] && watchedEpisodes[id].includes(ep.id))
        );

        if (allEpisodesWatched && !isAnimeWatched) {
          markAnimeAsWatched();
        }
      }
    } catch (error) {
      console.error("Erro ao marcar episódio como assistido:", error);
    }
  };

  const markAnimeAsWatched = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        navigate('/login');
        return;
      }

      const userDocRef = doc(db, "users", currentUser.uid);

      const animeData = {
        id: id,
        title: anime.title,
        image: anime.image,
        addedAt: new Date().toISOString()
      };

      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        let watcheds = userDoc.data().watchedAnimes || [];

        if (isAnimeWatched) {
          watcheds = watcheds.filter(anime => anime.id !== id);
        } else {
          if (!watcheds.some(anime => anime.id === id)) {
            watcheds.push(animeData);
          }
        }

        await updateDoc(userDocRef, {
          watchedAnimes: watcheds
        });
      } else {
        await setDoc(userDocRef, {
          watchedAnimes: [animeData],
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || 'Usuário'
        });
      }
      setIsAnimeWatched(!isAnimeWatched);
    } catch (error) {
      console.error("Erro ao marcar anime como assistido:", error);
      alert("Erro ao atualizar animes assistidos. Tente novamente.");
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        navigate('/login');
        return;
      }

      const userDocRef = doc(db, "users", currentUser.uid);

      const animeData = {
        id: id,
        title: anime.title,
        image: anime.image,
        addedAt: new Date().toISOString()
      };

      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        let favorites = userDoc.data().favoriteAnimes || [];

        if (isFavorite) {
          favorites = favorites.filter(anime => anime.id !== id);
        } else {
          if (!favorites.some(anime => anime.id === id)) {
            favorites.push(animeData);
          }
        }

        await updateDoc(userDocRef, {
          favoriteAnimes: favorites
        });
      } else {
        await setDoc(userDocRef, {
          favoriteAnimes: [animeData],
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || 'Usuário'
        });
      }

      setIsFavorite(!isFavorite);
    } catch (error) {
      alert("Erro ao atualizar favoritos. Tente novamente.");
    }
  };

  const updateWatchProgress = async (episodeId, progressPercent) => {
    if (!user || !episodeId) return;

    try {
      if (auth.currentUser) {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const episode = episodes.find(ep => ep.id === episodeId);

        if (!episode) return;

        const watchData = {
          animeId: id,
          animeTitle: anime.title,
          episodeId: episodeId,
          episodeNumber: episode.number,
          episodeTitle: episode.title || `Episódio ${episode.number}`,
          progress: progressPercent,
          isWatched: progressPercent >= 85,
          watchDate: new Date().toISOString(),
        };

        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          let currentHistory = userDoc.data().watchHistory || [];


          currentHistory = currentHistory.filter(item =>
            !(item.episodeId === episodeId && item.animeId === id)
          );


          currentHistory.push(watchData);


          await updateDoc(userDocRef, {
            watchHistory: currentHistory
          });


          setWatchProgress({
            ...watchProgress,
            [episodeId]: progressPercent
          });


          if (progressPercent >= 85) {
            const allEpisodesWatched = episodes.every(ep => {
              const epProgress = ep.id === episodeId ? progressPercent : (watchProgress[ep.id] || 0);
              return epProgress >= 85;
            });

            if (allEpisodesWatched && !isAnimeWatched) {
              markAnimeAsWatched();
            }
          }
        } else {

          await setDoc(userDocRef, {
            watchHistory: [watchData],
            uid: auth.currentUser.uid
          });
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar progresso de visualização:", error);
    }
  };

  const handleEpisodeClick = async (episode) => {
    if (episodeLoading) return;

    setEpisodeLoading(true);
    setSelectedEpisode(null);

    try {
      const streamId = `${id.replace('-todos-os-episodios', '')}/${episode.number}`;


      let savedProgress = 0;
      if (user && auth.currentUser) {
        try {
          const userDocRef = doc(db, "users", auth.currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists() && userDoc.data().watchHistory) {
            const historyEntry = userDoc.data().watchHistory.find(
              entry => entry.animeId === id && entry.episodeId === episode.id
            );

            if (historyEntry && historyEntry.progress) {
              savedProgress = historyEntry.progress;
            }
          }
        } catch (error) {
          console.error("Erro ao buscar progresso salvo:", error);
        }
      }

      const response = await fetch(
        `${API_URL}/api/stream?id=${streamId}`
      );

      if (!response.ok) {
        throw new Error(`Erro ao buscar o vídeo: ${response.status}`);
      }

      const videoData = await response.json();

      let videoUrl = null;


      if (videoData.streams && videoData.streams.length > 0) {
       
        const originalUrl = videoData.streams[0].url;

        videoUrl = `${BACKEND_URL}/video-proxy?url=${encodeURIComponent(originalUrl)}`;
        
      } else {
        
      }

      setTimeout(() => {
        if (videoUrl) {
          setSelectedEpisode({
            ...episode,
            url: videoUrl,
            savedProgress: savedProgress
          });
        } else {
          setSelectedEpisode({
            ...episode,
            url: null
          });
        }
        setEpisodeLoading(false);
      }, 200);
    } catch (error) {
      console.error("Erro ao carregar episódio:", error);
      setSelectedEpisode({
        ...episode,
        url: null
      });
      setEpisodeLoading(false);
    }
  };

  const loadMoreEpisodes = () => {
    const currentlyShowing = displayedEpisodes.length;
    const nextBatch = episodes.slice(
      currentlyShowing,
      currentlyShowing + episodesPerPage
    );

    setDisplayedEpisodes([...displayedEpisodes, ...nextBatch]);
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return '/padrao.png';

    if (imageUrl.startsWith('http')) {
      return `${BACKEND_URL}/proxy?url=${encodeURIComponent(imageUrl)}&title=${encodeURIComponent(anime?.title || '')}`;
    }

    return imageUrl;
  };

  const VideoPlayer = ({ url, episodeId, onProgress, onEnded }) => {
    const [error, setError] = useState(false);
    const [fallbackIndex, setFallbackIndex] = useState(0);
    const videoRef = useRef(null);


    const fallbackUrls = useMemo(() => {
      if (!url) return [];


      const match = url.match(/\/([^\/]+)\/(\d+)\/(.+)\.mp4$/);

      if (!match) return [];

      const [, animeId, episodeNumber, quality] = match;


      return [
        url,
        url.replace('s6', 's7'),
        url.replace('s7', 's6'),
        url.replace('/mp4_temp/', '/mp4/'),
        url.replace('/mp4/', '/mp4_temp/'),
        url.replace('720p.mp4', '480p.mp4'),
        url.replace('480p.mp4', '720p.mp4'),
        `https://lightspeedst.net/s6/mp4_temp/${animeId}/${episodeNumber}/720p.mp4`,
        `https://lightspeedst.net/s7/mp4/${animeId}/hd/${episodeNumber}.mp4`,
        `https://lightspeedst.net/s6/mp4_temp/${animeId}/${episodeNumber}/480p.mp4`,
        `https://lightspeedst.net/s7/mp4/${animeId}/sd/${episodeNumber}.mp4`
      ].filter((item, index, self) => self.indexOf(item) === index);
    }, [url]);

    if (error) {
      return (
        <div className="d-flex justify-content-center align-items-center bg-dark text-white h-100">
          <div className="text-center p-3">
            <h5>Erro ao reproduzir vídeo</h5>
            <p>Não foi possível reproduzir este episódio após várias tentativas.</p>
            <div className="d-flex justify-content-center gap-2 mt-3">
              <button
                className="btn btn-sm btn-outline-light"
                onClick={() => {
                  setFallbackIndex(0);
                  setError(false);
                }}
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (

      <video
        src={selectedEpisode.url}
        controls
        autoPlay
        className="w-100 h-100"
        onError={(e) => {
          console.error("Erro ao carregar vídeo:", e);
          console.error("URL do vídeo:", selectedEpisode.url);
          console.error("Detalhes do erro:", e.target.error);
        }}
        onTimeUpdate={(e) => {

          const currentTime = e.target.currentTime;
          const duration = e.target.duration;


          if (duration && duration > 0) {

            const currentProgress = Math.floor((currentTime / duration) * 100);



            if (
              Math.floor(currentTime) % 5 === 0 ||
              currentProgress === 25 ||
              currentProgress === 50 ||
              currentProgress === 75
            ) {
              updateWatchProgress(selectedEpisode.id, currentProgress);
            }
          }
        }}
        onEnded={() => {

          updateWatchProgress(selectedEpisode.id, 100);
        }}
      />
    );
  };

  if (loading) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
        <p className="mt-2">Carregando detalhes do anime...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Erro!</h4>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-between">
            <button className="btn btn-outline-primary" onClick={() => navigate('/')}>
              Voltar para a página inicial
            </button>
            <button className="btn btn-danger" onClick={() => window.location.reload()}>
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="container mt-5">
        <div className="alert alert-warning" role="alert">
          <h4 className="alert-heading">Anime não encontrado</h4>
          <p>Não conseguimos encontrar o anime com o ID: {id}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Voltar para a página inicial
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-5">
      <div className="row mb-4">
        <div className="col-md-4 mb-4">
          <div className="card shadow">
            <img
              src={getImageUrl(anime.image)}
              className="card-img-top"
              alt={anime.title}
              onError={(e) => { e.target.src = '/padrao.png' }}
            />
            <div className="card-body">
              <div className="d-grid gap-2">
                <button
                  className={`btn ${isFavorite ? 'btn-danger' : 'btn-outline-danger'}`}
                  onClick={toggleFavorite}
                >
                  {isFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
                </button>
                <button
                  className={`btn ${isAnimeWatched ? 'btn-info' : 'btn-outline-info'} mt-2`}
                  onClick={markAnimeAsWatched}
                >
                  {isAnimeWatched ? 'Assistido' : 'Marcar como assistido'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card shadow">
            <div className="card-body">
              <h1 className="card-title">{anime.title}</h1>

              {anime.otherNames && anime.otherNames.length > 0 && (
                <p className="text-muted">
                  <strong>Também conhecido como:</strong> {anime.otherNames.join(', ')}
                </p>
              )}

              <div className="d-flex flex-wrap my-3">
                {anime.genres &&
                  anime.genres.map((genre, index) => {
                    const isAgeRating = ["L", "A10", "A14", "A16", "A18"].includes(genre);
                    return (
                      <span
                        key={index}
                        className={`badge me-2 mb-2`}
                        style={{
                          backgroundColor: isAgeRating ? getAgeRatingColor(genre) : "",
                          ...(isAgeRating ? {} : { backgroundColor: "#0dcaf0" }),
                          opacity: 0.8,
                          fontSize: "14px",
                          color: isAgeRating ? "white" : "black",
                        }}
                      >
                        {genre}
                      </span>
                    );
                  })}
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Status:</strong> {anime.status || 'Desconhecido'}</p>
                  <p><strong>Estúdio:</strong> {anime.studio || 'Desconhecido'} </p>
                </div>
                <div className="col-md-6">
                  <p><strong>Total de Episódios:</strong> {anime.totalEpisodes || episodes.length || 'Desconhecido'}</p>
                  {anime.rating && <p><strong>Classificação:</strong> {anime.rating}</p>}
                  <p>
                    <strong>Lançado em:</strong>{" "}
                    {anime.season && anime.releaseDate
                      ? `${anime.season} de ${anime.releaseDate}`
                      : anime.season || anime.releaseDate || "Data desconhecida"}
                  </p>
                </div>
                <div className="col-md-6">
                  <p><strong>Áudio:</strong> {anime.audio || 'Desconhecido'}</p>
                </div>
                <div className="col-md-6">
                  <p>
                    <strong>Nota:</strong> {anime.score && `${anime.score}/10` || 'Sem nota'} &nbsp;
                    {anime.votes ? `(${Number(anime.votes).toLocaleString('pt-BR')} votos)` : ''}
                  </p>
                </div>
              </div>

              <h5 className="card-title mb-3">Descrição</h5>
              <p className="card-text">
                {anime.description || 'Sem descrição disponível.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow mb-4">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h3 className="mb-0 color-black">Episódios</h3>
          <div className="d-flex align-items-center">
            <button
              className="btn btn-light btn-sm ms-2 d-flex align-items-center"
              onClick={toggleEpisodeOrder}
              title={episodeOrder === 'asc' ? 'Ordem crescente (1 → 999)' : 'Ordem decrescente (999 → 1)'}
            >
              <span className="me-1">Ordenar: </span>
              {episodeOrder === 'asc' ? (
                <>
                  <i className="bi bi-sort-numeric-down"></i>
                  <span className="ms-1">Crescente</span>
                </>
              ) : (
                <>
                  <i className="bi bi-sort-numeric-up"></i>
                  <span className="ms-1">Decrescente</span>
                </>
              )}
            </button>
          </div>
        </div>
        <div className="card-body">
          {episodes.length === 0 ? (
            <div className="alert alert-info">
              Nenhum episódio disponível para este anime.
            </div>
          ) : (
            <>
              <div className="row">
                {displayedEpisodes.map((episode) => {
                  const progress = watchProgress[episode.id] || 0;
                  const isWatched = progress >= 85 ||
                    (user?.watchedEpisodes?.[id] &&
                      user.watchedEpisodes[id].includes(episode.id));

                  return (
                    <div key={episode.id} className="col-md-4 col-lg-3 mb-3">
                      <div
                        className={`card h-100 ${isWatched ? 'border-info' : ''}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleEpisodeClick(episode)}
                      >
                        <div className="position-relative">
                          <img
                            src={getImageUrl(episode.image || anime.image)}
                            className="card-img-top"
                            alt={`Episódio ${episode.number}`}
                            style={{ height: "200px", objectFit: "cover" }}
                            onError={(e) => { e.target.src = '/padrao.png' }}
                          />
                          {isWatched && (
                            <span className="position-absolute badge bg-info" style={{ top: '10px', right: '10px' }}>
                              Assistido
                            </span>
                          )}
                          {progress > 0 && progress < 85 && (
                            <div className="position-absolute" style={{ bottom: '0', left: '0', right: '0' }}>
                              <div className="progress" style={{ height: '5px', borderRadius: '0' }}>
                                <div
                                  className="progress-bar bg-primary"
                                  role="progressbar"
                                  style={{ width: `${progress}%` }}
                                  aria-valuenow={progress}
                                  aria-valuemin="0"
                                  aria-valuemax="100"
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="card-body">
                          <h5 className="card-title">Episódio {episode.number}</h5>
                          <p className="card-text small text-muted">
                            {episode.title || `Episódio ${episode.number}`}
                          </p>
                          <div className="dropdown position-absolute" style={{ bottom: '10px', right: '10px' }}>
                            <button
                              className="btn btn-dark btn-sm d-flex align-items-center"
                              type="button"
                              data-bs-toggle="dropdown"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="me-1">Ações</span>
                              <i className="bi bi-caret-down-fill"></i>
                            </button>
                            <ul
                              className="dropdown-menu"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <li>
                                <button
                                  className="dropdown-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markEpisodeAsWatched(episode.id);
                                  }}
                                >
                                  Marcar como assistido
                                </button>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {remainingEpisodes > 0 && (
                <div className="text-center mt-4">
                  <button
                    className="btn btn-outline-primary w-100"
                    onClick={loadMoreEpisodes}
                  >
                    Carregar Mais ({remainingEpisodes} restantes)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {/* Video Player Modal */}
      {selectedEpisode && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {anime.title} - Episódio {selectedEpisode.number}
                  {selectedEpisode.title && ` - ${selectedEpisode.title}`}
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setSelectedEpisode(null);
                  }}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <div className="ratio ratio-16x9">
                  {episodeLoading ? (
                    <div className="d-flex justify-content-center align-items-center bg-dark">
                      <div className="spinner-border text-light" role="status">
                        <span className="visually-hidden">Carregando...</span>
                      </div>
                    </div>
                  ) : selectedEpisode.url ? (
                    <video
                      src={selectedEpisode.url}
                      controls
                      autoPlay
                      className="w-100 h-100"
                      onError={(e) => {
                        console.error("Erro ao carregar vídeo:", e);
                        console.error("URL do vídeo:", selectedEpisode.url);
                        console.error("Detalhes do erro:", e.target.error);
                      }}

                      onLoadedMetadata={(e) => {
                        if (selectedEpisode.savedProgress && selectedEpisode.savedProgress > 0) {

                          const duration = e.target.duration;
                          if (duration) {
                            const startTimeSeconds = (selectedEpisode.savedProgress / 100) * duration;

                            e.target.currentTime = startTimeSeconds;
                          }
                        }
                      }}
                      onTimeUpdate={(e) => {
                        const currentTime = e.target.currentTime;
                        const duration = e.target.duration;
                        if (duration && duration > 0) {
                          const currentProgress = Math.floor((currentTime / duration) * 100);
                          if (
                            Math.floor(currentTime) % 5 === 0 ||
                            currentProgress === 25 ||
                            currentProgress === 50 ||
                            currentProgress === 75
                          ) {
                            updateWatchProgress(selectedEpisode.id, currentProgress);
                          }
                        }
                      }}
                      onEnded={() => {
                        updateWatchProgress(selectedEpisode.id, 100);
                      }}
                    />
                  ) : (
                    <div className="d-flex justify-content-center align-items-center bg-dark text-white">
                      <div className="text-center">
                        <h5>Episódio não disponível para reprodução</h5>
                        <p className="mb-0">Não foi possível carregar o vídeo deste episódio.</p>
                        <button
                          className="btn btn-outline-light mt-3"
                          onClick={() => handleEpisodeClick(selectedEpisode)}
                        >
                          Tentar novamente
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer d-flex justify-content-between">
                {episodes.findIndex(ep => ep.id === selectedEpisode.id) > 0 && (
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => {
                      const currentIndex = episodes.findIndex(ep => ep.id === selectedEpisode.id);
                      if (currentIndex > 0) {
                        handleEpisodeClick(episodes[currentIndex - 1]);
                      }
                    }}
                  >
                    Episódio Anterior
                  </button>
                )}

                <button
                  className="btn btn-outline-danger"
                  onClick={() => {
                    setSelectedEpisode(null);
                  }}
                >
                  Fechar
                </button>

                {episodes.findIndex(ep => ep.id === selectedEpisode.id) < episodes.length - 1 && (
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => {
                      const currentIndex = episodes.findIndex(ep => ep.id === selectedEpisode.id);
                      if (currentIndex < episodes.length - 1) {
                        handleEpisodeClick(episodes[currentIndex + 1]);
                      }
                    }}
                  >
                    Próximo Episódio
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedEpisode && <div className="modal-backdrop fade show"></div>}
    </div>
  );
}

export default AnimeDetails;