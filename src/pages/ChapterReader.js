import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function ChapterReader() {
    const { id, chapterId } = useParams();
    const navigate = useNavigate();

    const [manga, setManga] = useState(null);
    const [chapter, setChapter] = useState(null);
    const [pages, setPages] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allChapters, setAllChapters] = useState([]);
    const [chapterIndex, setChapterIndex] = useState(-1);
    const [readingMode, setReadingMode] = useState('vertical');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isChapterMarkedAsRead, setIsChapterMarkedAsRead] = useState(false);
    const [visiblePages, setVisiblePages] = useState(new Set());
    const [isInitialized, setIsInitialized] = useState(false);
    const [viewedPages, setViewedPages] = useState(new Set());

    useEffect(() => {
        const fetchMangaDetails = async () => {
            if (!id) return;

            try {
                setLoading(true);


                const mangaResponse = await fetch(`${BACKEND_URL}/api/mangas/${id}`);
                if (!mangaResponse.ok) {
                    throw new Error(`Erro ${mangaResponse.status}: Não foi possível carregar os dados do mangá`);
                }

                const mangaData = await mangaResponse.json();


                if (mangaData.altTitles && Array.isArray(mangaData.altTitles)) {

                    const ptBrTitle = mangaData.altTitles.find(title => title["pt-br"]);
                    if (ptBrTitle) {
                        mangaData.displayTitle = ptBrTitle["pt-br"];
                    } else {

                        const ptTitle = mangaData.altTitles.find(title => title["pt"]);
                        if (ptTitle) {
                            mangaData.displayTitle = ptTitle["pt"];
                        } else {

                            const enTitle = mangaData.altTitles.find(title => title["en"]);
                            if (enTitle) {
                                mangaData.displayTitle = enTitle["en"];
                            } else {
                                mangaData.displayTitle = mangaData.title;
                            }
                        }
                    }
                } else {
                    mangaData.displayTitle = mangaData.title;
                }

                setManga(mangaData);

                if (mangaData.chapters && Array.isArray(mangaData.chapters)) {
                    setAllChapters(mangaData.chapters);


                    const index = mangaData.chapters.findIndex(ch => ch.id === chapterId);
                    setChapterIndex(index);


                    const chapterResponse = await fetch(`${BACKEND_URL}/api/mangas/capitulo/${chapterId}`);
                    if (!chapterResponse.ok) {
                        throw new Error(`Erro ${chapterResponse.status}: Não foi possível carregar as páginas do capítulo`);
                    }

                    const pageData = await chapterResponse.json();

                    if (Array.isArray(pageData)) {
                        setPages(pageData);
                        setChapter(mangaData.chapters.find(ch => ch.id === chapterId));


                        markChapterAsRead(chapterId);

                        setTimeout(() => {
                            fetchReadingProgress();
                        }, 500);
                    } else {
                        throw new Error("Formato de resposta inválido ou capítulo sem páginas");
                    }
                }
            } catch (error) {
                console.error("Erro ao carregar capítulo:", error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };
        fetchMangaDetails();
    }, [id, chapterId]);



    useEffect(() => {
        if (readingMode !== 'vertical' || !pages.length) return;


        let initialTimeoutId = null;
        let intervalId = null;
        let scrollTimeout = null;


        const checkVisiblePages = () => {

            const pageContainers = document.querySelectorAll('.page-container');
            if (!pageContainers.length) return;

            const windowHeight = window.innerHeight;
            const scrollTop = window.scrollY;
            const viewportBottom = scrollTop + windowHeight;


            const currentlyVisiblePages = new Set();
            let currentMaxPageIndex = -1;


            pageContainers.forEach((container, index) => {
                const rect = container.getBoundingClientRect();


                const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
                const visiblePercentage = visibleHeight / rect.height;

                if (visiblePercentage >= 0.4) {
                    currentlyVisiblePages.add(index);


                    if (index > currentMaxPageIndex) {
                        currentMaxPageIndex = index;
                    }
                }
            });


            const isNearBottom = scrollTop + windowHeight >= document.documentElement.scrollHeight - 200;
            if (isNearBottom) {

                const lastPageIndices = Array.from(
                    { length: Math.min(3, pageContainers.length) },
                    (_, i) => pageContainers.length - 1 - i
                );

                lastPageIndices.forEach(index => {
                    if (index >= 0) {
                        currentlyVisiblePages.add(index);


                        if (index > currentMaxPageIndex) {
                            currentMaxPageIndex = index;
                        }
                    }
                });
            }


            if (currentMaxPageIndex >= 0) {

                const updatedViewedPages = new Set([...viewedPages]);



                for (let i = 0; i <= currentMaxPageIndex; i++) {
                    updatedViewedPages.add(i);
                }


                if (updatedViewedPages.size > viewedPages.size) {
                    setViewedPages(updatedViewedPages);
                    setVisiblePages(currentlyVisiblePages);


                    const viewedCount = updatedViewedPages.size;
                    const totalPages = pages.length;
                    const progress = Math.round((viewedCount / totalPages) * 100);


                    const currentPageData = pages[currentMaxPageIndex];


                    saveReadingProgress(progress, currentMaxPageIndex, currentPageData?.url);


                    if (progress >= 90 && !isChapterMarkedAsRead) {
                        setIsChapterMarkedAsRead(true);
                        markChapterAsRead(chapterId);
                    }
                }
            }
        };


        if (!isInitialized) {
            initialTimeoutId = setTimeout(() => {
                setIsInitialized(true);


                checkVisiblePages();


                const handleScroll = () => {
                    clearTimeout(scrollTimeout);
                    scrollTimeout = setTimeout(() => {
                        checkVisiblePages();
                    }, 200);
                };

                window.addEventListener('scroll', handleScroll);


                intervalId = setInterval(checkVisiblePages, 3000);
            }, 3000);
        }

        return () => {
            if (initialTimeoutId) clearTimeout(initialTimeoutId);
            if (intervalId) clearInterval(intervalId);
            if (scrollTimeout) clearTimeout(scrollTimeout);
            window.removeEventListener('scroll', () => { });
        };
    }, [readingMode, pages, isChapterMarkedAsRead, chapterId, viewedPages, isInitialized]);

    const fetchReadingProgress = async () => {
        if (!auth.currentUser || !id || !chapterId) return;

        try {
            const userDocRef = doc(db, "users", auth.currentUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists() && userDoc.data().mangaReadingHistory) {
                const history = userDoc.data().mangaReadingHistory;
                const chapterHistory = history.find(
                    item => item.mangaId === id && item.chapterId === chapterId
                );

                if (chapterHistory) {


                    if (readingMode === 'single' && chapterHistory.currentPage) {

                        setCurrentPage(chapterHistory.currentPage - 1);
                    }

                    else if (readingMode === 'vertical' && chapterHistory.currentPage) {

                        setTimeout(() => {
                            scrollToPage(chapterHistory.currentPage - 1);
                        }, 600);
                    }
                }
            }
        } catch (error) {
            console.error("Erro ao recuperar progresso de leitura:", error);
        }
    };

    const scrollToPage = (pageIndex) => {
        const pageContainers = document.querySelectorAll('.page-container');

        if (pageContainers.length > pageIndex) {
            const targetPage = pageContainers[pageIndex];

            if (targetPage) {


                const targetPosition = targetPage.offsetTop - 50;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        }
    };




    const calculateProgress = () => {
        if (!pages || pages.length === 0) return 0;


        const viewedCount = visiblePages.size;
        const totalPages = pages.length;


        const percentage = Math.round((viewedCount / totalPages) * 100);

        return percentage;
    };

    const saveReadingProgress = async (progressValue, pageIndex, pageUrl) => {
        if (!auth.currentUser || !manga || !chapter) return;

        try {
            const progressToSave = Math.min(progressValue, 100);

            const userDocRef = doc(db, "users", auth.currentUser.uid);
            const userDoc = await getDoc(userDocRef);

            const historyEntry = {
                mangaId: id,
                mangaTitle: manga?.displayTitle || manga?.title || 'Sem título',
                chapterId: chapterId,
                chapterNumber: chapter?.chapterNumber || '0',
                chapterTitle: chapter?.title || `Capítulo ${chapter?.chapterNumber || '0'}`,
                progress: progressToSave,
                currentPage: pageIndex + 1,
                pageUrl: pageUrl || null,
                isRead: progressToSave >= 90,
                readDate: new Date().toISOString(),
            };

            if (userDoc.exists()) {
                let currentHistory = userDoc.data().mangaReadingHistory || [];


                currentHistory = currentHistory.filter(item =>
                    !(item.chapterId === chapterId && item.mangaId === id)
                );


                currentHistory.push(historyEntry);

                await updateDoc(userDocRef, {
                    mangaReadingHistory: currentHistory
                });

            } else {
                await setDoc(userDocRef, {
                    mangaReadingHistory: [historyEntry],
                    uid: auth.currentUser.uid
                });
            }
        } catch (error) {
            console.error("Erro ao salvar progresso de leitura:", error);
        }
    };


    const markChapterAsRead = async (chapterId) => {
        if (!auth.currentUser) return;

        try {
            const userDocRef = doc(db, "users", auth.currentUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                let readChapters = userDoc.data().readChapters || {};


                if (!readChapters[id]) {
                    readChapters[id] = [];
                }


                if (!readChapters[id].includes(chapterId)) {
                    readChapters[id].push(chapterId);

                    await updateDoc(userDocRef, {
                        readChapters: readChapters
                    });


                    saveReadingProgress(100);
                }


                checkAndMarkMangaAsRead(readChapters);
            }
        } catch (error) {
            console.error("Erro ao marcar capítulo como lido:", error);
        }
    };

    const checkAndMarkMangaAsRead = async (readChapters) => {
        if (!auth.currentUser || !manga || !allChapters || allChapters.length === 0) return;

        try {

            const allChaptersRead = allChapters.every(ch =>
                readChapters[id] && readChapters[id].includes(ch.id)
            );

            if (allChaptersRead) {
                const userDocRef = doc(db, "users", auth.currentUser.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const readMangas = userDoc.data().readMangas || [];
                    const isMangaRead = readMangas.some(m => m.id === id);

                    if (!isMangaRead) {

                        const mangaData = {
                            id: id,
                            title: manga.displayTitle || manga.title,
                            image: manga.image,
                            addedAt: new Date().toISOString()
                        };

                        await updateDoc(userDocRef, {
                            readMangas: [...readMangas, mangaData]
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Erro ao verificar mangá lido:", error);
        }
    };


    const navigateToChapter = (index) => {
        if (index >= 0 && index < allChapters.length) {
            navigate(`/manga/${id}/chapter/${allChapters[index].id}`);
        }
    };

    const handlePreviousChapter = () => {
        if (chapterIndex > 0) {
            navigateToChapter(chapterIndex - 1);
        }
    };

    const handleNextChapter = () => {
        if (chapterIndex < allChapters.length - 1) {
            navigateToChapter(chapterIndex + 1);
        }
    };

    const handlePreviousPage = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
            window.scrollTo(0, 0);
        }
    };

    const handleNextPage = () => {
        if (currentPage < pages.length - 1) {
            setCurrentPage(currentPage + 1);
            window.scrollTo(0, 0);
        } else {

            if (chapterIndex < allChapters.length - 1) {
                if (window.confirm('Ir para o próximo capítulo?')) {
                    handleNextChapter();
                }
            }
        }
    };

    const toggleReadingMode = (e) => {
        e.stopPropagation();
        setReadingMode(readingMode === 'vertical' ? 'single' : 'vertical');
        setCurrentPage(0);
        window.scrollTo(0, 0);
    };

    const toggleFullscreen = (e) => {
        e.stopPropagation();
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => {
                console.error(`Erro ao entrar em modo de tela cheia: ${e.message}`);
            });
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    const toggleControls = () => {
        setShowControls(!showControls);
    };

    const getImageUrl = (page) => {
        if (!page || !page.url) return '/padrao.png';

        if (window.location.hostname === 'localhost') {
            return page.url;
        }

        if (page.url.includes('mangadex.org') || page.url.includes('uploads.mangadex.org')) {
            return `${BACKEND_URL}/proxy?url=${encodeURIComponent(page.url)}&title=${encodeURIComponent(manga?.title || '')}`;
        }

        return `${BACKEND_URL}/proxy?url=${encodeURIComponent(page.url)}&title=${encodeURIComponent(manga?.title || '')}`;
    };

    if (loading) {
        return (
            <div className="container mt-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Carregando...</span>
                </div>
                <p className="mt-2">Carregando capítulo...</p>
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
                        <button className="btn btn-outline-primary" onClick={() => navigate(`/manga/${id}`)}>
                            Voltar para o mangá
                        </button>
                        <button className="btn btn-danger" onClick={() => window.location.reload()}>
                            Tentar novamente
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!manga || !chapter || pages.length === 0) {
        return (
            <div className="container mt-5">
                <div className="alert alert-warning" role="alert">
                    <h4 className="alert-heading">Capítulo não encontrado</h4>
                    <p>Não conseguimos encontrar as páginas para este capítulo.</p>
                    <button className="btn btn-primary" onClick={() => navigate(`/manga/${id}`)}>
                        Voltar para o mangá
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`reader-container ${isFullscreen ? 'fullscreen' : ''}`} onClick={toggleControls}>
            <div className={`reader-controls ${showControls ? 'visible' : 'hidden'}`}>
                <div className="container-fluid py-2">
                    <div className="row align-items-center">
                        <div className="col">
                            <h3 className="m-0 text-truncate">
                                {manga.displayTitle || manga.title} - Capítulo {chapter.chapterNumber}
                                {chapter.title && `: ${chapter.title}`}
                            </h3>
                        </div>
                        <div className="col-auto">
                            <div className="btn-group">
                                <button
                                    className="btn btn-outline-secondary"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/manga/${id}`);
                                    }}
                                    title="Voltar para o mangá"
                                >
                                    <i className="fas fa-arrow-left"></i>
                                </button>
                                <button
                                    className="btn btn-outline-secondary"
                                    onClick={toggleReadingMode}
                                    title={`Modo ${readingMode === 'vertical' ? 'página a página' : 'vertical'}`}
                                >
                                    <i className={`fas fa-${readingMode === 'vertical' ? 'book-open' : 'stream'}`}></i>
                                </button>
                                <button
                                    className="btn btn-outline-secondary"
                                    onClick={toggleFullscreen}
                                    title={`${isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}`}
                                >
                                    <i className={`fas fa-${isFullscreen ? 'compress' : 'expand'}`}></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="reader-content">
                {readingMode === 'vertical' ? (

                    <div className="vertical-reader">
                        {pages.map((page, index) => (
                            <div key={index} className="page-container" data-page-index={index}>
                                <img
                                    src={getImageUrl(page)}
                                    alt={`Página ${page.page || index + 1}`}
                                    className="img-fluid"
                                    onError={(e) => { e.target.src = '/padrao.png' }}
                                />
                            </div>
                        ))}

                        <div className="navigation-buttons mt-4 mb-5 d-flex justify-content-between">
                            <button
                                className="btn btn-primary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePreviousChapter();
                                }}
                                disabled={chapterIndex <= 0}
                            >
                                <i className="fas fa-chevron-left me-2"></i>
                                Capítulo Anterior
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleNextChapter();
                                }}
                                disabled={chapterIndex >= allChapters.length - 1}
                            >
                                Próximo Capítulo
                                <i className="fas fa-chevron-right ms-2"></i>
                            </button>
                        </div>
                    </div>
                ) : (

                    <div className="single-page-reader text-center">
                        <div className="page-navigation">
                            <button
                                className="btn btn-lg btn-outline-light page-nav-btn prev"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePreviousPage();
                                }}
                                disabled={currentPage <= 0}
                            >
                                <i className="fas fa-chevron-left"></i>
                            </button>

                            <div className="page-container">
                                <img
                                    src={pages[currentPage]?.url}
                                    alt={`Página ${currentPage + 1}`}
                                    className="img-fluid"
                                    onError={(e) => { e.target.src = '/padrao.png' }}
                                />
                            </div>

                            <button
                                className="btn btn-lg btn-outline-light page-nav-btn next"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleNextPage();
                                }}
                                disabled={currentPage >= pages.length - 1 && chapterIndex >= allChapters.length - 1}
                            >
                                <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>

                        <div className="page-info mt-3">
                            <span>Página {currentPage + 1} de {pages.length}</span>
                        </div>

                        <div className="chapter-navigation mt-3 d-flex justify-content-between">
                            <button
                                className="btn btn-outline-primary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePreviousChapter();
                                }}
                                disabled={chapterIndex <= 0}
                            >
                                <i className="fas fa-chevron-left me-2"></i>
                                Capítulo Anterior
                            </button>

                            <button
                                className="btn btn-outline-primary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleNextChapter();
                                }}
                                disabled={chapterIndex >= allChapters.length - 1}
                            >
                                Próximo Capítulo
                                <i className="fas fa-chevron-right ms-2"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ChapterReader;