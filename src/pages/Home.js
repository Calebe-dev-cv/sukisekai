import React, { useState, useEffect } from "react";
import '@fortawesome/fontawesome-free/css/all.min.css';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function Home() {
  const [search, setSearch] = useState("");
  const [animes, setAnimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchMode, setSearchMode] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [showGenreFilter, setShowGenreFilter] = useState(false);
  const [genreMode, setGenreMode] = useState(false);
  const [availableGenres, setAvailableGenres] = useState([]);
  const [loadingGenres, setLoadingGenres] = useState(false);
  const [watchedAnimes, setWatchedAnimes] = useState([]);
  const ageRatings = ['L', 'A10', 'A14', 'A16', 'A18'];
  const [showAgeRatingFilter, setShowAgeRatingFilter] = useState(false);
  const [selectedAgeRating, setSelectedAgeRating] = useState(null);

  const fetchGenres = async () => {
    setLoadingGenres(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/genres/list?_t=${new Date().getTime()}`);

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }

      const data = await response.json();

      if (Array.isArray(data)) {

        const genresArray = data.map(genre => {

          if (typeof genre === 'object' && genre !== null) {
            return genre.original || genre.translated || genre.name || '';
          }

          return String(genre);
        });
        setAvailableGenres(genresArray);
      } else {
        setAvailableGenres([]);
      }
    } catch (error) {

    } finally {
      setLoadingGenres(false);
    }
  };

  const handleAgeRatingClick = (rating) => {
    setSelectedAgeRating(rating);
    setSelectedGenres([]);
    setSearch("");
    setSearchMode(false);
    setGenreMode(false);
    setCurrentPage(1);
    setHasMore(true);
    fetchAnimes("", 1, true, [], rating);
  };

  const loadWatchedAnimes = async () => {
    try {
      if (auth.currentUser) {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data().watchedAnimes) {
          setWatchedAnimes(userDoc.data().watchedAnimes.map(anime => anime.id));
        } else {
          setWatchedAnimes([]);
        }
      } else {
        const localWatched = localStorage.getItem('@watchedAnimes');
        if (localWatched) {
          try {
            const parsed = JSON.parse(localWatched);
            setWatchedAnimes(parsed.map(anime => anime.id));
          } catch (e) {
            setWatchedAnimes([]);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao carregar animes assistidos:", error);
      setWatchedAnimes([]);
    }
  };
  const fetchAnimes = async (query, page = 1, resetResults = true, genresList = selectedGenres, classificacao = selectedAgeRating) => {
    setLoading(true);
    setError(null);

    try {
      let url = "";
      const genreNames = genresList;

      if (query) {
        url = `${BACKEND_URL}/api/animes/search?query=${encodeURIComponent(query)}&page=${page}`;
        setGenreMode(false);
      } else if (classificacao) {
        url = `${BACKEND_URL}/api/animes/populares?page=${page}&classificacao=${classificacao}`;
        setGenreMode(false);
      } else if (genreNames && genreNames.length === 1) {
        url = `${BACKEND_URL}/api/genres/${encodeURIComponent(genreNames[0])}?page=${page}`;
        setGenreMode(true);
      } else {
        url = `${BACKEND_URL}/api/animes/populares?page=${page}`;
        setGenreMode(false);
      }

      const urlWithTimestamp = `${url}&_t=${new Date().getTime()}`;

      const response = await fetch(urlWithTimestamp);

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Formato de resposta inválido da API");
      }

      if (data.length === 0) {
        setHasMore(false);

        if (page === 1) {
          setAnimes([]);
        }

        return;
      }

      if (resetResults) {
        setAnimes(data);
      } else {
        setAnimes(prevAnimes => {
          const existingIds = new Set(prevAnimes.map(anime => anime.id));
          const newAnimes = [...prevAnimes];

          data.forEach(anime => {
            if (anime.id && !existingIds.has(anime.id)) {
              newAnimes.push(anime);
              existingIds.add(anime.id);
            }
          });
          return newAnimes;
        });
      }

      setRetryCount(0);
      setHasMore(data.length > 0);
    } catch (error) {
      if (retryCount < 3) {
        setRetryCount(prevCount => prevCount + 1);
        setTimeout(() => {
          fetchAnimes(query, page, resetResults);
        }, 2000);
        return;
      }

      setError(`Falha ao carregar dados: ${error.message}`);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenres();
    loadWatchedAnimes();
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadWatchedAnimes();
      } else {
        setWatchedAnimes([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchAnimes("", 1, true);
    setSearchMode(false);
    setGenreMode(false);
  }, []);

  useEffect(() => {
    if (search === "" && searchMode) {
      setCurrentPage(1);
      setHasMore(true);
      setSearchMode(false);
      fetchAnimes("", 1, true);
    }
  }, [search, searchMode]);

  useEffect(() => {
    if (selectedGenres.length > 0 && !searchMode) {
      setCurrentPage(1);
      setHasMore(true);
      fetchAnimes("", 1, true, selectedGenres);
    }
  }, [selectedGenres]);

  const handleSearch = (e) => {
    e.preventDefault();

    if (search.trim()) {
      setCurrentPage(1);
      setHasMore(true);
      setSearchMode(true);
      setGenreMode(false);
      setSelectedGenres([]);
      fetchAnimes(search.trim(), 1, true);
    } else {
      setCurrentPage(1);
      setHasMore(true);
      setSearchMode(false);
      setGenreMode(false);
      fetchAnimes("", 1, true);
    }
  };

  const handleBackToPopular = () => {
    setSearch("");
    setSelectedGenres([]);
    setCurrentPage(1);
    setHasMore(true);
    setSearchMode(false);
    setGenreMode(false);
    fetchAnimes("", 1, true);
  };

  const getAgeRatingColor = (rating) => {
    switch (rating) {
      case "L":
        return "green";
      case "A10":
        return "deepskyblue";
      case "A14":
        return "orange";
      case "A16":
        return "red";
      case "A18":
        return "black";
      default:
        return "black";
    }
  };


  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);

      if (searchMode) {
        fetchAnimes(search, nextPage, false);
      } else if (selectedAgeRating) {
        fetchAnimes("", nextPage, false, [], selectedAgeRating);
      } else if (genreMode && selectedGenres.length === 1) {
        fetchAnimes("", nextPage, false, selectedGenres);
      } else {
        fetchAnimes("", nextPage, false);
      }
    }
  };

  const getImageUrl = (imageUrl, animeTitle) => {
    if (!imageUrl) {
      return `/padrao.png`;
    }
    return `${BACKEND_URL}/proxy?url=${encodeURIComponent(imageUrl)}&title=${encodeURIComponent(animeTitle)}`;
  };

  const toggleGenre = (genre) => {
    setSelectedGenres([genre]); 
    setCurrentPage(1);
    setHasMore(true);
    setGenreMode(true);
    fetchAnimes("", 1, true, [genre]);
    setShowGenreFilter(false);
  };

  const handleGenreClick = (genre) => {

    const ageRatings = ['L', 'A10', 'A14', 'A16', 'A18'];

    if (ageRatings.includes(genre)) {

      setSelectedGenres([]);
      setSearch("");
      setSearchMode(false);
      setGenreMode(false);
      setCurrentPage(1);
      setHasMore(true);


      fetchAnimesByAgeRating(genre, 1, true);
    } else {

      setSelectedGenres([genre]);
      setSearch("");
      setSearchMode(false);
      setGenreMode(true);
      setCurrentPage(1);
      setHasMore(true);
      fetchAnimes("", 1, true, [genre]);
    }
  };

  const fetchAnimesByAgeRating = async (ageRating, page = 1, resetResults = true) => {
    setLoading(true);
    setError(null);

    try {

      const url = `${BACKEND_URL}/api/animes/populares?page=${page}&classificacao=${ageRating}`;
      const urlWithTimestamp = `${url}&_t=${new Date().getTime()}`;

      const response = await fetch(urlWithTimestamp);

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Formato de resposta inválido da API");
      }

      if (data.length === 0) {
        setHasMore(false);

        if (page === 1) {
          setAnimes([]);
        }

        return;
      }

      if (resetResults) {
        setAnimes(data);
      } else {
        setAnimes(prevAnimes => {
          const existingIds = new Set(prevAnimes.map(anime => anime.id));
          const newAnimes = [...prevAnimes];

          data.forEach(anime => {
            if (anime.id && !existingIds.has(anime.id)) {
              newAnimes.push(anime);
              existingIds.add(anime.id);
            }
          });

          return newAnimes;
        });
      }

      setRetryCount(0);
      setHasMore(data.length > 0);
    } catch (error) {
      if (retryCount < 3) {
        setRetryCount(prevCount => prevCount + 1);
        setTimeout(() => {
          fetchAnimesByAgeRating(ageRating, page, resetResults);
        }, 2000);
        return;
      }

      setError(`Falha ao carregar dados: ${error.message}`);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const toggleGenreFilter = () => {
    setShowGenreFilter(!showGenreFilter);
  };

  const applyGenreFilters = () => {
    if (selectedGenres.length > 0) {
      setCurrentPage(1);
      setHasMore(true);
      setSearch("");
      setSearchMode(false);
      fetchAnimes("", 1, true, selectedGenres);
      setShowGenreFilter(false);
    }
  };


  const clearGenreFilters = () => {
    setSelectedGenres([]);
    setCurrentPage(1);
    setHasMore(true);
    setGenreMode(false);
    fetchAnimes("", 1, true, []);
  };

  return (
    <div className="container mt-5">
      {/* Formulário de busca */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="Buscar animes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar animes"
          />
          <div className="input-group-append">
            <button type="submit" className="button-buscar">
              Buscar
            </button>
          </div>
        </div>
      </form>

      {/* Card de filtro por gênero */}
      <div className="card mb-4">
        <div
          className={`card-header text-white d-flex justify-content-between align-items-center ${showGenreFilter ? 'bg-primary' : 'bg-secondary'}`}
          style={{ cursor: "pointer" }}
          onClick={toggleGenreFilter}
        >
          <h5 className="mb-0 color-black">Filtrar por Gênero</h5>
          <span className={`color-black fas fa-chevron-${showGenreFilter ? 'up' : 'down'}`}></span>
        </div>

        {showGenreFilter && (
          <div className="card-body">
            {loadingGenres ? (
              <div className="d-flex justify-content-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Carregando gêneros...</span>
                </div>
              </div>
            ) : (
              <div className="d-flex flex-wrap gap-2 mb-3">
                {availableGenres.map(genre => {

                  const genreName = typeof genre === 'object' ?
                    (genre.original || genre.translated || genre.name || '') :
                    String(genre);

                  return (
                    <button
                      key={genreName} 
                      className={`btn btn-sm ${selectedGenres.includes(genreName)
                        ? 'btn-primary'
                        : 'btn-outline-primary'
                        }`}
                      onClick={() => toggleGenre(genreName)}
                    >
                      {genreName}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="d-flex justify-content-between mt-3">
              <button
                className="btn btn-outline-danger"
                onClick={clearGenreFilters}
                disabled={selectedGenres.length === 0}
              >
                Limpar Filtros
              </button>
              <button
                className="btn btn-primary"
                onClick={applyGenreFilters}
                disabled={selectedGenres.length === 0}
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        )}

        {/* Mostrar filtros ativos */}
        {selectedGenres.length > 0 && !showGenreFilter && (
          <div className="card-footer bg-light">
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <span className="text-muted me-2">Filtros ativos:</span>
              {selectedGenres.map(genre => (
                <span
                  key={genre}
                  className="badge bg-primary d-flex align-items-center"
                >
                  {genre}
                  <button
                    className="btn-close btn-close-white ms-2"
                    style={{ fontSize: '0.5rem' }}
                    onClick={() => {
                      const newGenres = selectedGenres.filter(g => g !== genre);
                      setSelectedGenres(newGenres);
                      if (newGenres.length === 0) {
                        setGenreMode(false);
                        fetchAnimes("", 1, true, []);
                      } else {
                        fetchAnimes("", 1, true, newGenres);
                      }
                    }}
                  ></button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Adicionar após o card de filtro por gênero */}
      <div className="card mb-4">
        <div
          className={`card-header text-white d-flex justify-content-between align-items-center ${showAgeRatingFilter ? 'bg-primary' : 'bg-secondary'}`}
          style={{ cursor: "pointer" }}
          onClick={() => setShowAgeRatingFilter(!showAgeRatingFilter)}
        >
          <h5 className="mb-0 color-black">Filtrar por Faixa Etária</h5>
          <span className={`color-black fas fa-chevron-${showAgeRatingFilter ? 'up' : 'down'}`}></span>
        </div>

        {showAgeRatingFilter && (
          <div className="card-body">
            <div className="d-flex flex-wrap gap-2 mb-3">
              {ageRatings.map(rating => (
                <button
                  key={rating}
                  className={`btn btn-sm ${selectedAgeRating === rating
                    ? 'btn-primary'
                    : 'btn-outline-primary'
                    }`}
                  onClick={() => handleAgeRatingClick(rating)}
                >
                  {rating}
                </button>
              ))}
            </div>

            <div className="d-flex justify-content-between mt-3">
              <button
                className="btn btn-outline-danger"
                onClick={() => {
                  setSelectedAgeRating(null);
                  fetchAnimes("", 1, true);
                }}
                disabled={!selectedAgeRating}
              >

                Limpar Filtro
              </button>
            </div>
          </div>
        )}

        {/* Mostrar filtro ativo */}
        {selectedAgeRating && !showAgeRatingFilter && (
          <div className="card-footer bg-light">
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <span className="text-muted me-2">Filtro ativo:</span>
              <span
                className="badge bg-primary d-flex align-items-center"
              >
                Classificação: {selectedAgeRating}
                <button
                  className="btn-close btn-close-white ms-2"
                  style={{ fontSize: '0.5rem' }}
                  onClick={() => {
                    setSelectedAgeRating(null);
                    fetchAnimes("", 1, true);
                  }}
                ></button>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mostrar mensagem de erro */}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
          <div className="mt-2">
            <button className="btn btn-sm btn-outline-danger" onClick={() => {
              if (searchMode) {
                fetchAnimes(search, 1, true);
              } else if (genreMode && selectedGenres.length === 1) {
                fetchAnimes("", 1, true, selectedGenres);
              } else {
                fetchAnimes("", 1, true, selectedGenres);
              }
            }}>
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Título da seção */}
      <h2 className="mb-3">
        {searchMode ?
          `Resultados para "${search}"` :
          genreMode && selectedGenres.length === 1 ?
            `Animes do gênero: ${selectedGenres[0]}` :
            selectedGenres.length > 0 ?
              `Animes por gêneros: ${selectedGenres.join(', ')}` :
              selectedAgeRating ?
                `Animes com classificação: ${selectedAgeRating}` :
                "Animes Populares"}
      </h2>

      {/* Indicador de carregamento */}
      {loading && animes.length === 0 && (
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      )}

      {/* Mensagem se não encontrar animes */}
      {!loading && animes.length === 0 && (
        <div className="alert alert-info" role="alert">
          {searchMode ?
            `Nenhum anime encontrado para "${search}". Tente outra busca.` :
            genreMode && selectedGenres.length === 1 ?
              `Nenhum anime encontrado para o gênero "${selectedGenres[0]}".` :
              selectedGenres.length > 0 ?
                `Nenhum anime encontrado para os gêneros selecionados.` :
                "Nenhum anime popular disponível no momento."}

          {(searchMode || selectedGenres.length > 0) && (
            <div className="mt-2">
              <button className="btn btn-sm btn-outline-primary" onClick={handleBackToPopular}>
                Voltar para Animes Populares
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grid de animes */}
      <div className="row">
        {animes.map((anime) => (
          <div key={anime.id} className="col-md-3 mb-4">
            <div
              className="card h-100 shadow-sm"
              style={{
                border: watchedAnimes.includes(anime.id) ? "1px solid #74dcff" : "none",
              }}
            >
              <div className="position-relative">
                <img
                  src={getImageUrl(
                    anime.image.includes("http") ? anime.image : decodeURIComponent(anime.image),
                    anime.title || anime.name
                  )}
                  alt={anime.title || anime.name}
                  className="card-img-top"
                  style={{ height: "400px", objectFit: "cover" }}
                  onError={(e) => e.target.src = "/padrao.png"}
                />

                {watchedAnimes.includes(anime.id) && (
                  <span className="position-absolute badge bg-info"
                    style={{ bottom: "10px", right: "10px", zIndex: 1, fontSize: "15px" }}>
                    Assistido
                  </span>
                )}
              </div>

              <div className="card-body d-flex flex-column">
                <h5 className="card-title">{anime.title}</h5>
                {anime.releaseDate && (
                  <p className="card-text text-muted mb-2">{anime.releaseDate}</p>
                )}

                {anime.ageRating && (
                  <span
                    className="position-absolute badge"
                    style={{
                      top: "10px",
                      left: "10px",
                      zIndex: 1,
                      backgroundColor: getAgeRatingColor(anime.ageRating),

                    }}
                  >
                    {anime.ageRating}
                  </span>
                )}


                {anime.score && (
                  <span className="position-absolute badge bg-dark"
                    style={{
                      top: "10px",
                      right: "10px",
                      zIndex: 1
                    }}>
                    ⭐ {anime.score}
                  </span>
                )}

                <a href={`/anime/${anime.id}`} className="btn btn-outline-primary mt-auto">
                  {watchedAnimes.includes(anime.id) ? "Assistir Novamente" : "Assistir"}
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Botão de carregar mais ou mensagem de fim de resultados */}
      {animes.length > 0 && (
        <div className="text-center my-4">
          {hasMore ? (
            <button
              className="btn btn-lg btn-outline-primary w-100"
              onClick={loadMore}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Carregando...
                </>
              ) : 'Carregar mais animes'}
            </button>
          ) : (
            <p className="text-muted">Você chegou ao fim dos resultados.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default Home;