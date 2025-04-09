import React, { useState, useEffect } from "react";
import '@fortawesome/fontawesome-free/css/all.min.css';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import '../components/Manga.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function MangasHome() {
    const [search, setSearch] = useState("");
    const [mangas, setMangas] = useState([]);
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
    const [readMangas, setReadMangas] = useState([]);
    const [availableTags, setAvailableTags] = useState({
        genres: [],
        themes: [],
        formats: [],
        demographics: []
    });
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDemographics, setSelectedDemographics] = useState([]);
    const [selectedFormats, setSelectedFormats] = useState([]);
    const [selectedThemes, setSelectedThemes] = useState([]);
    const [orderBy, setOrderBy] = useState('popular');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const fetchAvailableTags = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${BACKEND_URL}/api/mangas/tags?_t=${new Date().getTime()}`);

            if (!response.ok) {
                throw new Error(`Erro na requisição: ${response.status}`);
            }

            const data = await response.json();

            if (data.genres && data.themes && data.formats && data.demographics) {
                setAvailableTags({
                    genres: data.genres.map(tag => ({
                        id: tag.id,
                        original: tag.name,
                        translated: translateGenre(tag.name)
                    })),
                    themes: data.themes.map(tag => ({
                        id: tag.id,
                        original: tag.name,
                        translated: translateTheme(tag.name)
                    })),
                    formats: data.formats.map(tag => ({
                        id: tag.id,
                        original: tag.name,
                        translated: translateFormat(tag.name)
                    })),
                    demographics: data.demographics.map(tag => ({
                        id: tag.id,
                        original: tag.name,
                        translated: translateDemographic(tag.name)
                    }))
                });
            }
        } catch (error) {
            console.error("Erro ao carregar tags:", error);

            setAvailableTags({
                genres: [
                    { id: "genre-action", original: "Action", translated: "Ação" },
                    { id: "genre-adventure", original: "Adventure", translated: "Aventura" },
                    { id: "genre-comedy", original: "Comedy", translated: "Comédia" }
                ],
                themes: [
                    { id: "theme-isekai", original: "Isekai", translated: "Isekai" },
                    { id: "theme-magic", original: "Magic", translated: "Magia" }
                ],
                formats: [
                    { id: "format-oneshot", original: "Oneshot", translated: "One-shot" },
                    { id: "format-long", original: "Long Strip", translated: "Tira Longa" }
                ],
                demographics: [
                    { id: "demo-shounen", original: "Shounen", translated: "Shounen" },
                    { id: "demo-seinen", original: "Seinen", translated: "Seinen" }
                ]
            });
        } finally {
            setIsLoading(false);
        }
    };

    const translateTheme = (theme) => {
        if (!theme) return '';

        const themeTranslations = {
            'isekai': 'Isekai',
            'magic': 'Magia',
            'school life': 'Vida Escolar',
            'harem': 'Harém',
            'supernatural': 'Sobrenatural',
            'monster girls': 'Garotas Monstro',
            'military': 'Militar',
            'sports': 'Esportes',
            'crossdressing': 'Cross-dressing',
            'ghosts': 'Fantasmas',
            'monsters': 'Monstros',
            'virtual reality': 'Realidade Virtual',
            'office workers': 'Trabalhadores de Escritório',
            'medical': 'Médico',
            'time travel': 'Viagem no Tempo',
            'cooking': 'Culinária',
            'music': 'Música',
            'martial arts': 'Artes Marciais'
        };

        const lowerTheme = theme.toLowerCase();
        return themeTranslations[lowerTheme] || theme;
    };

    const translateFormat = (format) => {
        if (!format) return '';

        const formatTranslations = {
            'oneshot': 'One-shot',
            'long strip': 'Tira Longa',
            'adaptation': 'Adaptação',
            'anthology': 'Antologia',
            'award winning': 'Premiado',
            'doujinshi': 'Doujinshi',
            'fan colored': 'Colorido por Fãs',
            'full color': 'Colorido',
            '4-koma': '4-koma',
            'web comic': 'Web Comic'
        };

        const lowerFormat = format.toLowerCase();
        return formatTranslations[lowerFormat] || format;
    };

    const translateDemographic = (demographic) => {
        if (!demographic) return '';

        const demographicTranslations = {
            'shounen': 'Shounen',
            'shoujo': 'Shoujo',
            'seinen': 'Seinen',
            'josei': 'Josei'
        };

        const lowerDemographic = demographic.toLowerCase();
        return demographicTranslations[lowerDemographic] || demographic;
    };

    const applyFilters = () => {
        setCurrentPage(1);
        setHasMore(true);
        setSearchMode(false);


        const genreIds = selectedGenres.map(g => g.id);
        const themeIds = selectedThemes.map(t => t.id);
        const formatIds = selectedFormats.map(f => f.id);
        const demographicIds = selectedDemographics.map(d => d.id);


        const filters = {
            genres: genreIds.length > 0 ? genreIds.join(',') : undefined,
            themes: themeIds.length > 0 ? themeIds.join(',') : undefined,
            formats: formatIds.length > 0 ? formatIds.join(',') : undefined,
            demographic: demographicIds.length > 0 ? demographicIds.join(',') : undefined,
            order: orderBy,
            status: selectedStatus || undefined,
            originalLanguage: selectedLanguage || undefined
        };


        Object.keys(filters).forEach(key => {
            if (filters[key] === undefined) {
                delete filters[key];
            }
        });


        fetchMangasWithFilters(filters);
    };

    const fetchMangasWithFilters = async (filters) => {
        setLoading(true);
        setError(null);

        try {

            let url = `${BACKEND_URL}/api/mangas/populares?page=1`;


            Object.keys(filters).forEach(key => {
                url += `&${key}=${encodeURIComponent(filters[key])}`;
            });


            url += `&_t=${new Date().getTime()}`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Erro na requisição: ${response.status}`);
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                throw new Error("Formato de resposta inválido da API");
            }

            if (data.length === 0) {
                setHasMore(false);
                setMangas([]);
                return;
            }

            const formattedResults = data.map(manga => {
                const preferredTitle = getPreferredTitle(manga);

                return {
                    id: manga.id,
                    title: preferredTitle,
                    image: manga.image,
                    releaseDate: manga.releaseDate || "",
                    genres: manga.genres || [],
                    status: manga.status,
                    originalLanguage: manga.originalLanguage
                }
            });

            setMangas(formattedResults);
            setHasMore(data.length >= 20);

        } catch (error) {
            console.error("Erro ao buscar mangás com filtros:", error);
            setError(`Falha ao carregar dados: ${error.message}`);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    };



    const fetchGenres = async () => {
        setLoadingGenres(true);
        setError(null);

        try {
            const response = await fetch(`${BACKEND_URL}/api/mangas/genres/list?_t=${new Date().getTime()}`);

            if (!response.ok) {
                throw new Error(`Erro na requisição: ${response.status}`);
            }

            const data = await response.json();

            if (Array.isArray(data)) {

                const translatedGenres = data.map(genre => ({
                    original: genre,
                    translated: translateGenre(genre)
                }));
                setAvailableGenres(translatedGenres);
            } else {
                setAvailableGenres([]);
            }
        } catch (error) {
            console.error("Erro ao carregar gêneros:", error);
            const fallbackGenres = [
                "Action", "Adventure", "Comedy", "Drama", "Fantasy",
                "Horror", "Romance", "Sci-Fi", "Slice of Life", "Seinen",
                "Shounen", "Shoujo", "Mystery", "Psychological", "Supernatural"
            ];
            const translatedFallback = fallbackGenres.map(genre => ({
                original: genre,
                translated: translateGenre(genre)
            }));
            setAvailableGenres(translatedFallback);
        } finally {
            setLoadingGenres(false);
        }
    };



    const getPreferredTitle = (manga) => {

        if (typeof manga.title === 'string') {
            return manga.title;
        }


        if (manga.title && typeof manga.title === 'object') {

            if (manga.title['pt-br']) return manga.title['pt-br'];
            if (manga.title['pt']) return manga.title['pt'];
            if (manga.title['en']) return manga.title['en'];


            const firstLang = Object.keys(manga.title)[0];
            return manga.title[firstLang];
        }


        return manga.title || 'Sem título';
    };

    const loadReadMangas = async () => {
        try {
            if (auth.currentUser) {
                const userDocRef = doc(db, "users", auth.currentUser.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists() && userDoc.data().readMangas) {
                    setReadMangas(userDoc.data().readMangas.map(manga => manga.id));
                } else {
                    setReadMangas([]);
                }
            } else {
                const localRead = localStorage.getItem('@readMangas');
                if (localRead) {
                    try {
                        const parsed = JSON.parse(localRead);
                        setReadMangas(parsed.map(manga => manga.id));
                    } catch (e) {
                        setReadMangas([]);
                    }
                }
            }
        } catch (error) {
            console.error("Erro ao carregar mangás lidos:", error);
            setReadMangas([]);
        }
    };

    const fetchMangas = async (query, page = 1, resetResults = true, genresList = selectedGenres) => {
        setLoading(true);
        setError(null);

        try {
            let url = "";

            if (query) {
                url = `${BACKEND_URL}/api/mangas/search?query=${encodeURIComponent(query)}&page=${page}`;
                setGenreMode(false);
            } else {
                url = `${BACKEND_URL}/api/mangas/populares?page=${page}`;
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
                    setMangas([]);
                }

                return;
            }

            const formattedResults = data.map(manga => {
                const preferredTitle = getPreferredTitle(manga);

                return {
                    id: manga.id,
                    title: preferredTitle,
                    image: manga.image,
                    releaseDate: manga.releaseDate || "",
                    genres: manga.genres || []
                }
            });

            if (resetResults) {
                setMangas(formattedResults);
            } else {
                setMangas(prevMangas => {
                    const existingIds = new Set(prevMangas.map(manga => manga.id));
                    const newMangas = [...prevMangas];

                    formattedResults.forEach(manga => {
                        if (manga.id && !existingIds.has(manga.id)) {
                            newMangas.push(manga);
                            existingIds.add(manga.id);
                        }
                    });

                    return newMangas;
                });
            }

            setRetryCount(0);
            setHasMore(data.length > 0);
        } catch (error) {
            if (retryCount < 3) {
                setRetryCount(prevCount => prevCount + 1);
                setTimeout(() => {
                    fetchMangas(query, page, resetResults);
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
        loadReadMangas();
        fetchAvailableTags();
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                loadReadMangas();
            } else {
                setReadMangas([]);
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        fetchMangas("", 1, true);
        setSearchMode(false);
        setGenreMode(false);
    }, []);

    useEffect(() => {
        if (search === "" && searchMode) {
            setCurrentPage(1);
            setHasMore(true);
            setSearchMode(false);
            fetchMangas("", 1, true);
        }
    }, [search, searchMode]);

    useEffect(() => {
        if (selectedGenres.length > 0 && !searchMode) {
            setCurrentPage(1);
            setHasMore(true);
            fetchMangas("", 1, true, selectedGenres);
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
            fetchMangas(search.trim(), 1, true);
        } else {
            setCurrentPage(1);
            setHasMore(true);
            setSearchMode(false);
            setGenreMode(false);
            fetchMangas("", 1, true);
        }
    };

    const clearAllFilters = () => {
        setSelectedGenres([]);
        setSelectedThemes([]);
        setSelectedFormats([]);
        setSelectedDemographics([]);
        setOrderBy('popular');
        setSelectedStatus('');
        setSelectedLanguage('');


        setCurrentPage(1);
        setHasMore(true);
        setSearchMode(false);
        setGenreMode(false);
        fetchMangas("", 1, true);
    };

    const toggleFilterItem = (item, category) => {
        let updatedItems = [];

        switch (category) {
            case 'genre':
                updatedItems = selectedGenres.some(g => g.id === item.id)
                    ? selectedGenres.filter(g => g.id !== item.id)
                    : [...selectedGenres, item];
                setSelectedGenres(updatedItems);
                break;
            case 'theme':
                updatedItems = selectedThemes.some(t => t.id === item.id)
                    ? selectedThemes.filter(t => t.id !== item.id)
                    : [...selectedThemes, item];
                setSelectedThemes(updatedItems);
                break;
            case 'format':
                updatedItems = selectedFormats.some(f => f.id === item.id)
                    ? selectedFormats.filter(f => f.id !== item.id)
                    : [...selectedFormats, item];
                setSelectedFormats(updatedItems);
                break;
            case 'demographic':
                updatedItems = selectedDemographics.some(d => d.id === item.id)
                    ? selectedDemographics.filter(d => d.id !== item.id)
                    : [...selectedDemographics, item];
                setSelectedDemographics(updatedItems);
                break;
            default:
                break;
        }
    };


    const handleBackToPopular = () => {
        setSearch("");
        setSelectedGenres([]);
        setCurrentPage(1);
        setHasMore(true);
        setSearchMode(false);
        setGenreMode(false);
        fetchMangas("", 1, true);
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            const nextPage = currentPage + 1;
            setCurrentPage(nextPage);

            if (searchMode) {
                fetchMangas(search, nextPage, false);
            } else if (genreMode && selectedGenres.length === 1) {
                fetchMangas("", nextPage, false, selectedGenres);
            } else {
                fetchMangas("", nextPage, false, selectedGenres);
            }
        }
    };

    const translateGenre = (genre) => {
        if (!genre) return '';

        const genreTranslations = {
            'action': 'Ação',
            'adventure': 'Aventura',
            'comedy': 'Comédia',
            'drama': 'Drama',
            'fantasy': 'Fantasia',
            'horror': 'Terror',
            'mystery': 'Mistério',
            'romance': 'Romance',
            'sci-fi': 'Ficção Científica',
            'slice of life': 'Slice of Life',
            'sports': 'Esportes',
            'supernatural': 'Sobrenatural',
            'thriller': 'Suspense',
            'school': 'Escolar',
            'seinen': 'Seinen',
            'shoujo': 'Shoujo',
            'shounen': 'Shounen',
            'martial arts': 'Artes Marciais',
            'historical': 'Histórico',
            'military': 'Militar',
            'psychological': 'Psicológico',
            'magic': 'Magia',
            'music': 'Música',
            'harem': 'Harém',
            'ecchi': 'Ecchi',
            'demons': 'Demônios',
            'game': 'Jogo',
            'josei': 'Josei',
            'kids': 'Infantil',
            'mecha': 'Mecha',
            'parody': 'Paródia',
            'police': 'Policial',
            'samurai': 'Samurai',
            'space': 'Espacial',
            'vampire': 'Vampiro',
        };
        const lowerGenre = genre.toLowerCase();
        return genreTranslations[lowerGenre] || genre;
    };

    const getImageUrl = (imageUrl, mangaTitle) => {
        console.log("Tentando carregar imagem 0:", imageUrl);
        if (!imageUrl) {
            console.log("Tentando carregar imagem 3:", imageUrl);
            return `/padrao.png`;
        }

        if (window.location.hostname === 'localhost') {
            console.log("Tentando carregar imagem 1:", imageUrl);
            return imageUrl;

        }

        if (imageUrl.includes('uploads.mangadex.org')) {
            console.log("Tentando carregar imagem 2:", imageUrl);
            return `${BACKEND_URL}/proxy?url=${encodeURIComponent(imageUrl)}&title=${encodeURIComponent(mangaTitle)}`;

        }

        console.log("Tentando carregar imagem 4:", imageUrl);

        return `${BACKEND_URL}/proxy?url=${encodeURIComponent(imageUrl)}&title=${encodeURIComponent(mangaTitle)}`;
    };


    const toggleGenre = (genreObj) => {
        setSelectedGenres(prev => {
            if (prev.some(g => g.original === genreObj.original)) {
                return prev.filter(g => g.original !== genreObj.original);
            } else {
                return [...prev, genreObj];
            }
        });
    };

    const applyGenreFilters = () => {
        if (selectedGenres.length > 0) {
            setCurrentPage(1);
            setHasMore(true);
            setSearch("");
            setSearchMode(false);
            fetchMangas("", 1, true, selectedGenres);
        }
    };

    const clearGenreFilters = () => {
        setSelectedGenres([]);
        setCurrentPage(1);
        setHasMore(true);
        setGenreMode(false);
        fetchMangas("", 1, true, []);
    };

    const renderAdvancedFilters = () => {
        return (
            <div className="card mb-4">
                <div
                    className={`card-header text-white d-flex justify-content-between align-items-center ${showAdvancedFilters ? 'bg-primary' : 'bg-secondary'}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                    <h5 className="mb-0 color-black">Filtros Avançados</h5>
                    <span className={`color-black fas fa-chevron-${showAdvancedFilters ? 'up' : 'down'}`}></span>
                </div>

                {showAdvancedFilters && (
                    <div className="card-body">
                        {isLoading ? (
                            <div className="d-flex justify-content-center my-3">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Carregando filtros...</span>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Ordenação */}
                                <div className="mb-4">
                                    <h6 className="fw-bold mb-2">Ordenar por:</h6>
                                    <select
                                        className="form-select"
                                        value={orderBy}
                                        onChange={(e) => setOrderBy(e.target.value)}
                                    >
                                        <option value="popular">Popularidade</option>
                                        <option value="latest">Mais Recentes</option>
                                        <option value="oldest">Mais Antigos</option>
                                        <option value="title_asc">Título (A-Z)</option>
                                        <option value="title_desc">Título (Z-A)</option>
                                    </select>
                                </div>

                                {/* Status */}
                                <div className="mb-4">
                                    <h6 className="fw-bold mb-2">Status:</h6>
                                    <select
                                        className="form-select"
                                        value={selectedStatus}
                                        onChange={(e) => setSelectedStatus(e.target.value)}
                                    >
                                        <option value="">Todos</option>
                                        <option value="ongoing">Em Publicação</option>
                                        <option value="completed">Concluído</option>
                                        <option value="hiatus">Em Hiato</option>
                                        <option value="cancelled">Cancelado</option>
                                    </select>
                                </div>

                                {/* Idioma Original */}
                                <div className="mb-4">
                                    <h6 className="fw-bold mb-2">Idioma da Tradução:</h6>
                                    <select
                                        className="form-select"
                                        value={selectedLanguage}
                                        onChange={(e) => setSelectedLanguage(e.target.value)}
                                    >
                                        <option value="">Todos</option>
                                        <option value="pt-br">Português Brasileiro</option>
                                        <option value="pt">Português (Portugal)</option>
                                        <option value="en">Inglês</option>
                                        <option value="es">Espanhol</option>
                                        <option value="zh">Chinês</option>
                                    </select>
                                </div>

                                {/* Demografia */}
                                <div className="mb-4">
                                    <h6 className="fw-bold mb-2">Demografia:</h6>
                                    <div className="d-flex flex-wrap gap-2">
                                        {availableTags.demographics.map(demo => (
                                            <button
                                                key={demo.id}
                                                className={`btn btn-sm ${selectedDemographics.some(d => d.id === demo.id)
                                                    ? 'btn-primary'
                                                    : 'btn-outline-primary'
                                                    }`}
                                                onClick={() => toggleFilterItem(demo, 'demographic')}
                                            >
                                                {demo.translated}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Formato */}
                                <div className="mb-4">
                                    <h6 className="fw-bold mb-2">Formato:</h6>
                                    <div className="d-flex flex-wrap gap-2">
                                        {availableTags.formats.map(format => (
                                            <button
                                                key={format.id}
                                                className={`btn btn-sm ${selectedFormats.some(f => f.id === format.id)
                                                    ? 'btn-primary'
                                                    : 'btn-outline-primary'
                                                    }`}
                                                onClick={() => toggleFilterItem(format, 'format')}
                                            >
                                                {format.translated}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Gêneros */}
                                <div className="mb-4">
                                    <h6 className="fw-bold mb-2">Gêneros:</h6>
                                    <div className="d-flex flex-wrap gap-2">
                                        {availableTags.genres.map(genre => (
                                            <button
                                                key={genre.id}
                                                className={`btn btn-sm ${selectedGenres.some(g => g.id === genre.id)
                                                    ? 'btn-primary'
                                                    : 'btn-outline-primary'
                                                    }`}
                                                onClick={() => toggleFilterItem(genre, 'genre')}
                                            >
                                                {genre.translated}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Temas */}
                                <div className="mb-4">
                                    <h6 className="fw-bold mb-2">Temas:</h6>
                                    <div className="d-flex flex-wrap gap-2">
                                        {availableTags.themes.map(theme => (
                                            <button
                                                key={theme.id}
                                                className={`btn btn-sm ${selectedThemes.some(t => t.id === theme.id)
                                                    ? 'btn-primary'
                                                    : 'btn-outline-primary'
                                                    }`}
                                                onClick={() => toggleFilterItem(theme, 'theme')}
                                            >
                                                {theme.translated}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Botões de ação */}
                                <div className="d-flex justify-content-between mt-4">
                                    <button
                                        className="btn btn-outline-danger"
                                        onClick={clearAllFilters}
                                    >
                                        Limpar Filtros
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={applyFilters}
                                    >
                                        Aplicar Filtros
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Mostrar filtros ativos */}
                {(selectedGenres.length > 0 || selectedThemes.length > 0 ||
                    selectedFormats.length > 0 || selectedDemographics.length > 0 ||
                    selectedStatus || selectedLanguage || orderBy !== 'popular') && !showAdvancedFilters && (
                        <div className="card-footer bg-light">
                            <div className="d-flex flex-wrap gap-2 align-items-center">
                                <span className="text-muted me-2">Filtros ativos:</span>

                                {/* Mostrar ordem selecionada se não for a padrão */}
                                {orderBy !== 'popular' && (
                                    <span className="badge bg-secondary d-flex align-items-center">
                                        Ordem: {orderBy === 'latest' ? 'Mais Recentes' :
                                            orderBy === 'oldest' ? 'Mais Antigos' :
                                                orderBy === 'title_asc' ? 'Título (A-Z)' :
                                                    orderBy === 'title_desc' ? 'Título (Z-A)' : orderBy}
                                        <button
                                            className="btn-close btn-close-white ms-2"
                                            style={{ fontSize: '0.5rem' }}
                                            onClick={() => {
                                                setOrderBy('popular');
                                                applyFilters();
                                            }}
                                        ></button>
                                    </span>
                                )}

                                {/* Mostrar status selecionado */}
                                {selectedStatus && (
                                    <span className="badge bg-secondary d-flex align-items-center">
                                        Status: {selectedStatus === 'ongoing' ? 'Em Publicação' :
                                            selectedStatus === 'completed' ? 'Concluído' :
                                                selectedStatus === 'hiatus' ? 'Em Hiato' :
                                                    selectedStatus === 'cancelled' ? 'Cancelado' : selectedStatus}
                                        <button
                                            className="btn-close btn-close-white ms-2"
                                            style={{ fontSize: '0.5rem' }}
                                            onClick={() => {
                                                setSelectedStatus('');
                                                applyFilters();
                                            }}
                                        ></button>
                                    </span>
                                )}

                                {/* Mostrar idioma selecionado */}
                                {selectedLanguage && (
                                    <span className="badge bg-secondary d-flex align-items-center">
                                        Idioma: {selectedLanguage === 'ja' ? 'Japonês' :
                                            selectedLanguage === 'ko' ? 'Coreano' :
                                                selectedLanguage === 'zh' ? 'Chinês' :
                                                    selectedLanguage === 'en' ? 'Inglês' : selectedLanguage}
                                        <button
                                            className="btn-close btn-close-white ms-2"
                                            style={{ fontSize: '0.5rem' }}
                                            onClick={() => {
                                                setSelectedLanguage('');
                                                applyFilters();
                                            }}
                                        ></button>
                                    </span>
                                )}

                                {/* Gêneros ativos */}
                                {selectedGenres.map(genre => (
                                    <span key={genre.id} className="badge bg-primary d-flex align-items-center">
                                        {genre.translated}
                                        <button
                                            className="btn-close btn-close-white ms-2"
                                            style={{ fontSize: '0.5rem' }}
                                            onClick={() => {
                                                setSelectedGenres(selectedGenres.filter(g => g.id !== genre.id));
                                                applyFilters();
                                            }}
                                        ></button>
                                    </span>
                                ))}

                                {/* Temas ativos */}
                                {selectedThemes.map(theme => (
                                    <span key={theme.id} className="badge bg-info d-flex align-items-center">
                                        {theme.translated}
                                        <button
                                            className="btn-close btn-close-white ms-2"
                                            style={{ fontSize: '0.5rem' }}
                                            onClick={() => {
                                                setSelectedThemes(selectedThemes.filter(t => t.id !== theme.id));
                                                applyFilters();
                                            }}
                                        ></button>
                                    </span>
                                ))}

                                {/* Formatos ativos */}
                                {selectedFormats.map(format => (
                                    <span key={format.id} className="badge bg-success d-flex align-items-center">
                                        {format.translated}
                                        <button
                                            className="btn-close btn-close-white ms-2"
                                            style={{ fontSize: '0.5rem' }}
                                            onClick={() => {
                                                setSelectedFormats(selectedFormats.filter(f => f.id !== format.id));
                                                applyFilters();
                                            }}
                                        ></button>
                                    </span>
                                ))}

                                {/* Demografias ativas */}
                                {selectedDemographics.map(demo => (
                                    <span key={demo.id} className="badge bg-warning text-dark d-flex align-items-center">
                                        {demo.translated}
                                        <button
                                            className="btn-close ms-2"
                                            style={{ fontSize: '0.5rem' }}
                                            onClick={() => {
                                                setSelectedDemographics(selectedDemographics.filter(d => d.id !== demo.id));
                                                applyFilters();
                                            }}
                                        ></button>
                                    </span>
                                ))}

                                {/* Botão para limpar todos os filtros */}
                                <button
                                    className="btn btn-sm btn-outline-danger ms-auto"
                                    onClick={clearAllFilters}
                                >
                                    Limpar Todos
                                </button>
                            </div>
                        </div>
                    )}
            </div>
        );
    };


    return (
        <div className="container mt-5">
            {/* Formulário de busca */}
            <form onSubmit={handleSearch} className="mb-4">
                <div className="input-group">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Buscar mangás..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="Buscar mangás"
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
                                {availableGenres.map(genreObj => (
                                    <button
                                        key={genreObj.original}
                                        className={`btn btn-sm ${selectedGenres.some(g => g.original === genreObj.original)
                                            ? 'btn-primary'
                                            : 'btn-outline-primary'
                                            }`}
                                        onClick={() => toggleGenre(genreObj)}
                                    >
                                        {genreObj.translated}
                                    </button>
                                ))}
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
                {renderAdvancedFilters()}
                {/* Mostrar filtros ativos */}
                {selectedGenres.length > 0 && !showGenreFilter && (
                    <div className="card-footer bg-light">
                        <div className="d-flex flex-wrap gap-2 align-items-center">
                            <span className="text-muted me-2">Filtros ativos:</span>
                            {selectedGenres.map(genreObj => (
                                <span
                                    key={genreObj.original}
                                    className="badge bg-primary d-flex align-items-center"
                                >
                                    {genreObj.translated}
                                    <button
                                        className="btn-close btn-close-white ms-2"
                                        style={{ fontSize: '0.5rem' }}
                                        onClick={() => {
                                            const newGenres = selectedGenres.filter(g => g.original !== genreObj.original);
                                            setSelectedGenres(newGenres);
                                            if (newGenres.length === 0) {
                                                setGenreMode(false);
                                                fetchMangas("", 1, true, []);
                                            } else {
                                                fetchMangas("", 1, true, newGenres.map(g => g.original));
                                            }
                                        }}
                                    ></button>
                                </span>
                            ))}
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
                                fetchMangas(search, 1, true);
                            } else if (genreMode && selectedGenres.length === 1) {
                                fetchMangas("", 1, true, selectedGenres);
                            } else {
                                fetchMangas("", 1, true, selectedGenres);
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
                        `Mangás do gênero: ${selectedGenres[0].translated}` :
                        selectedGenres.length > 0 ?
                            `Mangás por gêneros: ${selectedGenres.map(g => g.translated).join(', ')}` :
                            "Mangás Populares"}
            </h2>

            {/* Indicador de carregamento */}
            {loading && mangas.length === 0 && (
                <div className="d-flex justify-content-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Carregando...</span>
                    </div>
                </div>
            )}

            {/* Mensagem se não encontrar mangás */}
            {!loading && mangas.length === 0 && (
                <div className="alert alert-info" role="alert">
                    {searchMode ?
                        `Nenhum mangá encontrado para "${search}". Tente outra busca.` :
                        genreMode && selectedGenres.length === 1 ?
                            `Nenhum mangá encontrado para o gênero "${selectedGenres[0].translated}".` :
                            selectedGenres.length > 0 ?
                                `Nenhum mangá encontrado para os gêneros selecionados.` :
                                "Nenhum mangá popular disponível no momento."}

                    {(searchMode || selectedGenres.length > 0) && (
                        <div className="mt-2">
                            <button className="btn btn-sm btn-outline-primary" onClick={handleBackToPopular}>
                                Voltar para Mangás Populares
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Grid de mangás */}
            <div className="row">
                {mangas.map((manga) => (
                    <div key={manga.id} className="col-md-3 mb-4">
                        <div
                            className="card h-100 shadow-sm"
                            style={{
                                border: readMangas.includes(manga.id) ? "1px solid #74dcff" : "none",
                            }}
                        >
                            <img
                                src={getImageUrl(
                                    manga.image && manga.image.includes("http") ? manga.image : manga.image || '',
                                    manga.title
                                )}
                                alt={manga.title}
                                className="card-img-top"
                                style={{ height: "400px", objectFit: "cover" }}
                                onError={(e) => e.target.src = "/padrao.png"}
                            />

                            {readMangas.includes(manga.id) && (
                                <span className="position-absolute badge bg-info"
                                    style={{ top: "10px", right: "10px", zIndex: 1 }}>
                                    Lido
                                </span>
                            )}

                            <div className="card-body d-flex flex-column">
                                <h5 className="card-title">{manga.title}</h5>
                                {manga.releaseDate && (
                                    <p className="card-text text-muted mb-2">{manga.releaseDate}</p>
                                )}
                                <a href={`/manga/${manga.id}`} className="btn btn-outline-primary mt-auto">
                                    {readMangas.includes(manga.id) ? "Ler Novamente" : "Ler"}
                                </a>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Botão de carregar mais ou mensagem de fim de resultados */}
            {mangas.length > 0 && (
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
                            ) : 'Carregar mais mangás'}
                        </button>
                    ) : (
                        <p className="text-muted">Você chegou ao fim dos resultados.</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default MangasHome;