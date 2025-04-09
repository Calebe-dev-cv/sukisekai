import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { doc, setDoc, getDoc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import '../components/Manga.css'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function MangaDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [manga, setManga] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isMangaRead, setIsMangaRead] = useState(false);
    const [displayedChapters, setDisplayedChapters] = useState([]);
    const [chaptersPerPage, setChaptersPerPage] = useState(24);
    const [remainingChapters, setRemainingChapters] = useState(0);
    const [chapterOrder, setChapterOrder] = useState('asc');
    const [readChapters, setReadChapters] = useState({});

    useEffect(() => {
        setRemainingChapters(chapters.length - displayedChapters.length);
    }, [chapters.length, displayedChapters.length]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                const basicUserData = {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName || 'Usuário'
                };
                setUser(basicUserData);
                localStorage.setItem('@userManga', JSON.stringify(basicUserData));

                try {
                    const userDocRef = doc(db, "users", currentUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        const userData = userDoc.data();


                        if (userData.favoriteMangas && userData.favoriteMangas.some(manga => manga.id === id)) {
                            setIsFavorite(true);
                        }


                        if (userData.readMangas && userData.readMangas.some(manga => manga.id === id)) {
                            setIsMangaRead(true);
                        }


                        if (userData.readChapters && userData.readChapters[id]) {
                            setReadChapters({ [id]: userData.readChapters[id] });
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

    async function translateText(text, targetLang = 'pt-BR') {
        if (!text) return '';

        try {
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
                'seinen': 'Seinen',
                'shoujo': 'Shoujo',
                'shounen': 'Shounen',
                'psychological': 'Psicológico',
                'historical': 'Histórico',
                'school life': 'Vida Escolar',
                'harem': 'Harém',
                'ecchi': 'Ecchi'
            };

            if (Object.keys(genreTranslations).includes(text.toLowerCase())) {
                return genreTranslations[text.toLowerCase()];
            }

            const response = await fetch(`${BACKEND_URL}/api/translate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text, targetLang })
            });

            if (!response.ok) {
                throw new Error('Erro na tradução');
            }

            const data = await response.json();

            return data.translations;
        } catch (error) {
            console.error("Erro na tradução:", error);
            return text;
        }
    }

    useEffect(() => {
        const fetchMangaDetails = async () => {
            if (!id) return;

            try {
                setLoading(true);
                setError(null);

                const response = await fetch(`${BACKEND_URL}/api/mangas/${id}`);
                if (!response.ok) {
                    throw new Error(`Error ${response.status}: Unable to fetch manga details`);
                }

                const data = await response.json();

                if (!data || data.error) {
                    throw new Error(data.error || "Failed to load manga data");
                }


                if (data.altTitles && Array.isArray(data.altTitles)) {

                    const ptBrTitle = data.altTitles.find(title => title["pt-br"]);
                    if (ptBrTitle) {
                        data.displayTitle = ptBrTitle["pt-br"];
                    } else {

                        const ptTitle = data.altTitles.find(title => title["pt"]);
                        if (ptTitle) {
                            data.displayTitle = ptTitle["pt"];
                        } else {

                            const enTitle = data.altTitles.find(title => title["en"]);
                            if (enTitle) {
                                data.displayTitle = enTitle["en"];
                            } else {
                                data.displayTitle = data.title;
                            }
                        }
                    }
                } else {
                    data.displayTitle = data.title;
                }


                if (data.description) {
                    data.description = await translateText(data.description);
                }


                if (data.genres && Array.isArray(data.genres)) {
                    const translatedGenres = await Promise.all(
                        data.genres.map(genre => translateText(genre))
                    );
                    data.genres = translatedGenres;
                }


                if (data.status) {
                    const statusTranslations = {
                        'completed': 'Completo',
                        'ongoing': 'Em Andamento',
                        'hiatus': 'Em Hiato',
                        'cancelled': 'Cancelado',
                        'unknown': 'Desconhecido'
                    };

                    data.status = statusTranslations[data.status.toLowerCase()] ||
                        await translateText(data.status);
                }

                setManga(data);

                if (data.chapters && Array.isArray(data.chapters)) {

                    let allChapters = data.chapters;


                    allChapters = allChapters.sort((a, b) => {
                        const aNum = parseFloat(a.chapterNumber) || 0;
                        const bNum = parseFloat(b.chapterNumber) || 0;
                        return aNum - bNum;
                    });


                    const ptBrChapters = allChapters.filter(ch => ch.lang === 'pt-br');
                    const ptChapters = allChapters.filter(ch => ch.lang === 'pt');
                    const enChapters = allChapters.filter(ch => ch.lang === 'en');


                    let preferredChapters = [];
                    if (ptBrChapters.length > 0) {
                        preferredChapters = ptBrChapters;
                    } else if (ptChapters.length > 0) {
                        preferredChapters = ptChapters;
                    } else if (enChapters.length > 0) {
                        preferredChapters = enChapters;
                    } else {
                        preferredChapters = allChapters;
                    }

                    setChapters(preferredChapters);
                    setDisplayedChapters(preferredChapters.slice(0, chaptersPerPage));
                    setRemainingChapters(preferredChapters.length - chaptersPerPage);
                } else {
                    setChapters([]);
                    setDisplayedChapters([]);
                }


                if (auth.currentUser) {
                    try {
                        const userDocRef = doc(db, "users", auth.currentUser.uid);
                        const userDoc = await getDoc(userDocRef);

                        if (userDoc.exists()) {

                            if (userDoc.data().readMangas && userDoc.data().readMangas.some(manga => manga.id === id)) {
                                setIsMangaRead(true);
                            }


                            if (userDoc.data().readChapters && userDoc.data().readChapters[id]) {
                                setReadChapters({ [id]: userDoc.data().readChapters[id] });
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

        fetchMangaDetails();
    }, [id, auth.currentUser?.uid]);

    const toggleChapterOrder = () => {
        const newOrder = chapterOrder === 'asc' ? 'desc' : 'asc';
        setChapterOrder(newOrder);

        const sortedChapters = [...chapters].sort((a, b) => {
            const aNum = parseFloat(a.chapterNumber);
            const bNum = parseFloat(b.chapterNumber);
            if (newOrder === 'asc') {
                return aNum - bNum;
            } else {
                return bNum - aNum;
            }
        });

        setChapters(sortedChapters);
        setDisplayedChapters(sortedChapters.slice(0, displayedChapters.length));
    };


    const getChapterProgress = (chapterId) => {
        

        const isRead = isChapterRead(chapterId);
        if (isRead) return 100;
    

        if (user?.mangaReadingHistory && Array.isArray(user.mangaReadingHistory)) {
            

            user.mangaReadingHistory.forEach(entry => {
            });
            

            const historyEntry = user.mangaReadingHistory.find(
                entry => entry.chapterId === chapterId && entry.mangaId === id
            );
            
            
        }     
        return 0;
    };
    

    const markChapterAsRead = async (chapterId) => {
        if (!user) {
            navigate('/login');
            return;
        }

        try {
            const userDocRef = doc(db, "users", auth.currentUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                let readChaptersData = userDoc.data().readChapters || {};


                if (!readChaptersData[id]) {
                    readChaptersData[id] = [];
                }


                if (!readChaptersData[id].includes(chapterId)) {
                    readChaptersData[id].push(chapterId);

                    await updateDoc(userDocRef, {
                        readChapters: readChaptersData
                    });

                    setReadChapters({ ...readChapters, [id]: readChaptersData[id] });
                }


                const allChaptersRead = chapters.every(ch =>
                    readChaptersData[id].includes(ch.id)
                );

                if (allChaptersRead && !isMangaRead) {
                    markMangaAsRead();
                }
            }
        } catch (error) {
            console.error("Erro ao marcar capítulo como lido:", error);
        }
    };

    const markMangaAsRead = async () => {
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

            const mangaData = {
                id: id,
                title: manga.title,
                image: manga.image,
                addedAt: new Date().toISOString()
            };

            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                let readList = userDoc.data().readMangas || [];

                if (isMangaRead) {

                    await updateDoc(userDocRef, {
                        readMangas: arrayRemove(readList.find(m => m.id === id))
                    });
                } else {

                    if (!readList.some(m => m.id === id)) {
                        await updateDoc(userDocRef, {
                            readMangas: arrayUnion(mangaData)
                        });
                    }
                }
            } else {
                await setDoc(userDocRef, {
                    readMangas: [mangaData],
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName || 'Usuário'
                });
            }
            setIsMangaRead(!isMangaRead);
        } catch (error) {
            console.error("Erro ao marcar mangá como lido:", error);
            alert("Erro ao atualizar mangás lidos. Tente novamente.");
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

            const mangaData = {
                id: id,
                title: manga.title,
                image: manga.image,
                addedAt: new Date().toISOString()
            };

            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                let favorites = userDoc.data().favoriteMangas || [];

                if (isFavorite) {

                    await updateDoc(userDocRef, {
                        favoriteMangas: arrayRemove(favorites.find(m => m.id === id))
                    });
                } else {

                    if (!favorites.some(m => m.id === id)) {
                        await updateDoc(userDocRef, {
                            favoriteMangas: arrayUnion(mangaData)
                        });
                    }
                }
            } else {
                await setDoc(userDocRef, {
                    favoriteMangas: [mangaData],
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

    const loadMoreChapters = () => {
        const currentlyShowing = displayedChapters.length;
        const nextBatch = chapters.slice(
            currentlyShowing,
            currentlyShowing + chaptersPerPage
        );

        setDisplayedChapters([...displayedChapters, ...nextBatch]);
    };

    const getImageUrl = (imageUrl) => {
        if (!imageUrl) return '/padrao.png';
    
        if (window.location.hostname === 'localhost') {
            return imageUrl;
        }
    
        if (imageUrl.includes('uploads.mangadex.org')) {
            return `${BACKEND_URL}/proxy?url=${encodeURIComponent(imageUrl)}&title=${encodeURIComponent(manga?.title || '')}`;
        }
    
        if (imageUrl.startsWith('http')) {
            return `${BACKEND_URL}/proxy?url=${encodeURIComponent(imageUrl)}&title=${encodeURIComponent(manga?.title || '')}`;
        }
    
        return imageUrl;
    };

    const isChapterRead = (chapterId) => {

        const isManuallyMarked = readChapters[id] && Array.isArray(readChapters[id]) && readChapters[id].includes(chapterId);
        

        let hasHighProgress = false;
        if (user?.mangaReadingHistory && Array.isArray(user.mangaReadingHistory)) {
            const historyEntry = user.mangaReadingHistory.find(
                entry => entry.chapterId === chapterId && entry.mangaId === id
            );
            if (historyEntry && historyEntry.progress >= 90) {
                hasHighProgress = true;
            }
        }
        
        return isManuallyMarked || hasHighProgress;
    };

    if (loading) {
        return (
            <div className="container mt-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Carregando...</span>
                </div>
                <p className="mt-2">Carregando detalhes do mangá...</p>
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
                        <button className="btn btn-outline-primary" onClick={() => navigate('/mangas')}>
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

    if (!manga) {
        return (
            <div className="container mt-5">
                <div className="alert alert-warning" role="alert">
                    <h4 className="alert-heading">Mangá não encontrado</h4>
                    <p>Não conseguimos encontrar o mangá com o ID: {id}</p>
                    <button className="btn btn-primary" onClick={() => navigate('/mangas')}>
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
                            src={getImageUrl(manga.image)}
                            className="card-img-top"
                            alt={manga.title}
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
                                    className={`btn ${isMangaRead ? 'btn-info' : 'btn-outline-info'} mt-2`}
                                    onClick={markMangaAsRead}
                                >
                                    {isMangaRead ? 'Lido' : 'Marcar como lido'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-8">
                    <div className="card shadow">
                        <div className="card-body">
                            <h1 className="card-title">{manga.displayTitle || manga.title}</h1>

                            {manga.altTitles && manga.altTitles.length > 0 && (
                                <p className="text-muted">
                                    <strong>Também conhecido como:</strong> {
                                        (() => {

                                            const orderedTitles = [];


                                            const ptBrTitle = manga.altTitles.find(title => title["pt-br"]);
                                            if (ptBrTitle) {
                                                orderedTitles.push(ptBrTitle["pt-br"]);
                                            }


                                            const jaRoTitle = manga.altTitles.find(title => title["ja-ro"]);
                                            if (jaRoTitle) {
                                                orderedTitles.push(jaRoTitle["ja-ro"]);
                                            }


                                            const enTitle = manga.altTitles.find(title => title["en"]);
                                            if (enTitle) {
                                                orderedTitles.push(enTitle["en"]);
                                            }

                                            return orderedTitles.join(', ');
                                        })()
                                    }
                                </p>
                            )}


                            <div className="d-flex flex-wrap my-3">
                                {manga.genres && manga.genres.map((genre, index) => (
                                    <span key={index} className="badge bg-info me-2 mb-2" style={{fontSize: "14px"}}>
                                        {genre}
                                    </span>
                                ))}
                            </div>

                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <p><strong>Status:</strong> {manga.status || 'Desconhecido'}</p>
                                    <p><strong>Lançado em:</strong> {manga.releaseDate || 'Data desconhecida'}</p>
                                </div>
                                <div className="col-md-6">
                                    <p><strong>Total de Capítulos:</strong> {chapters.length || 'Desconhecido'}</p>
                                </div>
                            </div>

                            <h5 className="card-title mb-3">Descrição</h5>
                            <p className="card-text">
                                {manga.description || 'Sem descrição disponível.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow mb-4">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h3 className="mb-0 color-black">Capítulos</h3>
                    <div className="d-flex align-items-center">
                        <button
                            className="btn btn-light btn-sm ms-2 d-flex align-items-center"
                            onClick={toggleChapterOrder}
                            title={chapterOrder === 'asc' ? 'Ordem crescente (1 → 999)' : 'Ordem decrescente (999 → 1)'}
                        >
                            <span className="me-1">Ordenar: </span>
                            {chapterOrder === 'asc' ? (
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
                    {chapters.length === 0 ? (
                        <div className="alert alert-info">
                            Nenhum capítulo disponível para este mangá.
                        </div>
                    ) : (
                        <>
                            <div className="row">
                                {displayedChapters.map((chapter) => {
                                    const isRead = isChapterRead(chapter.id);
                                    const progress = getChapterProgress(chapter.id);

                                    return (
                                        <div key={chapter.id} className="col-md-6 mb-3">
                                            <div
                                                className={`card h-100 ${isRead ? 'border-info' : ''}`}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div className="card-body">
                                                    <h5 className="card-title">
                                                        Capítulo {chapter.chapterNumber}
                                                        {chapter.title && `: ${chapter.title}`}
                                                    </h5>
                                                    <p className="card-text small text-muted">
                                                        {chapter.pages} páginas
                                                    </p>
                                                    {chapter.scanGroup && (
                                                        <p className="card-text small text-muted">
                                                            Grupo: {chapter.scanGroup}
                                                        </p>
                                                    )}
                                                    {chapter.publishAt && (
                                                        <p className="card-text small text-muted">
                                                            Publicado em: {new Date(chapter.publishAt).toLocaleDateString('pt-BR')}
                                                        </p>
                                                    )}

                                                    {/* Botões e indicador de progresso */}
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        {(() => {
                                                            if (progress > 0 && progress < 100 && !isRead) {
                                                                return (
                                                                    <a
                                                                        href={`/manga/${id}/chapter/${chapter.id}`}
                                                                        className="btn btn-success btn-sm"
                                                                    >
                                                                        Continuar Leitura
                                                                    </a>
                                                                );
                                                            } else {
                                                                return (
                                                                    <a
                                                                        href={`/manga/${id}/chapter/${chapter.id}`}
                                                                        className="btn btn-primary btn-sm"
                                                                    >
                                                                        {isRead ? 'Reler Capítulo' : 'Ler Capítulo'}
                                                                    </a>
                                                                );
                                                            }
                                                        })()}

                                                        {isRead ? (
                                                            <span className="badge bg-info">Lido</span>
                                                        ) : (
                                                            <button
                                                                className="btn btn-outline-info btn-sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    markChapterAsRead(chapter.id);
                                                                }}
                                                            >
                                                                Marcar como lido
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Barra de progresso */}
                                                    {!isRead && progress > 0 && (
                                                        <div className="mt-2">
                                                            <div className="d-flex justify-content-between small text-muted">
                                                                <span>{progress}% lido</span>
                                                                {progress >= 90 && <span>Quase concluído</span>}
                                                            </div>
                                                            <div className="progress" style={{ height: '5px' }}>
                                                                <div
                                                                    className={`progress-bar ${progress >= 90 ? 'bg-success' : 'bg-primary'}`}
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
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {remainingChapters > 0 && (
                                <div className="text-center mt-4">
                                    <button
                                        className="btn btn-outline-primary w-100"
                                        onClick={loadMoreChapters}
                                    >
                                        Carregar Mais ({remainingChapters} restantes)
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MangaDetails;