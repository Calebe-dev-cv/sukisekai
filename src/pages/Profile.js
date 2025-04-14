import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, getDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { PencilFill } from 'react-bootstrap-icons';
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showConfirmModalHistory, setShowConfirmModalHistory] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [itemToRemove, setItemToRemove] = useState(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [profileImages, setProfileImages] = useState([
    'frieren_1.jpg',
    'frieren_2.jpg',
    'frieren_3.jpg',
    'frieren_4.jpg',
    'fern_1.jpg',
    'fern_2.jpg',
    'stark_1.jpg',
    'stark_2.jpg',
    'luffy_1.jpg',
    'luffy_2.jpg',
    'luffy_3.jpg',
    'luffy_4.jpg',
    'nami_1.jpg',
    'nami_2.jpg',
    'zoro_1.jpg',
    'zoro_2.jpg',
  ]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tabParam = queryParams.get('tab');

    if (tabParam) {
      setActiveTab(tabParam);
    } else {
      const savedTab = localStorage.getItem('@activeTab');
      if (savedTab) {
        setActiveTab(savedTab);
      }
    }

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      const userBasicData = localStorage.getItem('@userAnime');
      let basicUser = null;

      if (userBasicData) {
        try {
          basicUser = JSON.parse(userBasicData);
        } catch (e) {
          console.error("Erro ao analisar dados de usuário do localStorage:", e);
        }
      }

      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const firestoreData = userDoc.data();
          const displayName = firestoreData.displayName || basicUser?.displayName;

          setUser({
            ...basicUser,
            ...firestoreData,
            displayName
          });
        } else {
          setUser(basicUser);
        }
      } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
        setUser(basicUser);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate, location.search]);

  const handleLogout = () => {
    signOut(auth).then(() => {
      localStorage.removeItem('@userAnime'); 
      
      navigate('/');
    }).catch((error) => {
      console.error("Erro ao fazer logout:", error);
    });
  };

  const showConfirmation = (title, message, action, item) => {
    setModalTitle(title);
    setModalMessage(message);
    setConfirmAction(() => action);
    setItemToRemove(item);
    setShowConfirmModal(true);
  };

  const showConfirmationH = (title, message, action, item) => {
    setModalTitle(title);
    setModalMessage(message);
    setConfirmAction(() => action);
    setItemToRemove(item);
    setShowConfirmModalHistory(true);
  };

  const updateDisplayName = async () => {
    try {
      if (!auth.currentUser || !newDisplayName.trim()) return;

      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userDocRef, {
        displayName: newDisplayName.trim()
      });
      setUser({ ...user, displayName: newDisplayName.trim() });
      setIsEditingName(false);
    } catch (error) {
      console.error("Erro ao atualizar nome:", error);
      alert("Erro ao atualizar nome. Tente novamente.");
    }
  };

  const removeFromFavorites = async (animeId) => {
    if (!user || !user.favoriteAnimes) return;

    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const favoriteToRemove = user.favoriteAnimes.find(anime => anime.id === animeId);

        if (favoriteToRemove) {
          await updateDoc(userDocRef, {
            favoriteAnimes: arrayRemove(favoriteToRemove)
          });
          const updatedFavorites = user.favoriteAnimes.filter(anime => anime.id !== animeId);
          setUser({ ...user, favoriteAnimes: updatedFavorites });
        }
      }
    } catch (error) {
      console.error("Erro ao remover dos favoritos:", error);
      alert("Erro ao remover dos favoritos. Tente novamente.");
    }
  };

  const removeFromAnime = async (animeId) => {
    if (!user || !user.watchedAnimes) return;

    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const AnimeToRemove = user.watchedAnimes.find(anime => anime.id === animeId);

        if (AnimeToRemove) {
          await updateDoc(userDocRef, {
            watchedAnimes: arrayRemove(AnimeToRemove)
          });
          const updatedAnimes = user.watchedAnimes.filter(anime => anime.id !== animeId);
          setUser({ ...user, watchedAnimes: updatedAnimes });
        }
      }
    } catch (error) {
      console.error("Erro ao remover dos animes assistidos:", error);
      alert("Erro ao remover dos animes assistidos. Tente novamente.");
    }
  };

  const removeFromFavoritesMangas = async (mangaId) => {
    if (!user || !user.favoriteMangas) return;

    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const favoriteToRemove = user.favoriteMangas.find(manga => manga.id === mangaId);

        if (favoriteToRemove) {
          await updateDoc(userDocRef, {
            favoriteMangas: arrayRemove(favoriteToRemove)
          });
          const updatedFavorites = user.favoriteMangas.filter(manga => manga.id !== mangaId);
          setUser({ ...user, favoriteMangas: updatedFavorites });
        }
      }
    } catch (error) {
      console.error("Erro ao remover dos favoritos:", error);
      alert("Erro ao remover dos favoritos. Tente novamente.");
    }
  };

  const removeFromReadMangas = async (mangaId) => {
    if (!user || !user.readMangas) return;

    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const mangaToRemove = user.readMangas.find(manga => manga.id === mangaId);

        if (mangaToRemove) {
          await updateDoc(userDocRef, {
            readMangas: arrayRemove(mangaToRemove)
          });
          const updatedMangas = user.readMangas.filter(manga => manga.id !== mangaId);
          setUser({ ...user, readMangas: updatedMangas });
        }
      }
    } catch (error) {
      console.error("Erro ao remover dos mangás lidos:", error);
      alert("Erro ao remover dos mangás lidos. Tente novamente.");
    }
  };

  const removeFromMangaHistory = async (mangaId, chapterId) => {
    if (!user || !user.mangaReadingHistory) return;

    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const updatedHistory = user.mangaReadingHistory.filter(
          item => !(item.mangaId === mangaId && item.chapterId === chapterId)
        );

        await updateDoc(userDocRef, {
          mangaReadingHistory: updatedHistory
        });

        setUser({ ...user, mangaReadingHistory: updatedHistory });
      }
    } catch (error) {
      console.error("Erro ao remover do histórico de leitura:", error);
      alert("Erro ao remover do histórico de leitura. Tente novamente.");
    }
  };

  const removeFromAnimeHistory = async (animeId, episodeId) => {
    if (!user || !user.watchHistory) return;

    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const updatedHistory = user.watchHistory.filter(
          item => !(item.animeId === animeId && item.episodeId === episodeId)
        );

        await updateDoc(userDocRef, {
          watchHistory: updatedHistory
        });

        setUser({ ...user, watchHistory: updatedHistory });
      }
    } catch (error) {
      console.error("Erro ao remover do histórico de animes:", error);
      alert("Erro ao remover do histórico de animes. Tente novamente.");
    }
  };

  const getTimeElapsed = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return `${diffDays} dia(s) atrás`;

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours > 0) return `${diffHours} hora(s) atrás`;

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes > 0) return `${diffMinutes} minuto(s) atrás`;

    return 'Agora mesmo';
  };

  const updateProfilePhoto = async (imageName) => {
    try {
      if (!auth.currentUser) return;

      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userDocRef, {
        photoURL: imageName
      });
      setUser({ ...user, photoURL: imageName });
      setShowPhotoModal(false);
    } catch (error) {
      console.error("Erro ao atualizar foto:", error);
      alert("Erro ao atualizar foto. Tente novamente.");
    }
  };

  const getImageUrl = (imageUrl, title) => {
    if (!imageUrl) return '/padrao.png';

    if (imageUrl.startsWith('http')) {
      return `${BACKEND_URL}/proxy?url=${encodeURIComponent(imageUrl)}&title=${encodeURIComponent(title || '')}`;
    }

    return imageUrl;
  };

  if (loading) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
        <p className="mt-2">Carregando perfil...</p>
      </div>
    );
  }

  const getProfilePhotoUrl = (photoURL) => {
    if (!photoURL) return '/foto_perfil/padrao.jpg';
    if (photoURL.startsWith('/')) return photoURL;
    return `/foto_perfil/${photoURL}`;
  };

  return (
    <div className="container mt-5">
      <div className="row">
        <div className="col-md-4 mb-4">
          <div className="card shadow">
            <div className="card-body text-center">
              <img
                src={getProfilePhotoUrl(user?.photoURL)}
                alt={user?.displayName}
                className="rounded-circle mb-3"
                style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                onError={(e) => { e.target.onerror = null; e.target.src = '/foto_perfil/padrao.jpg' }}
              />
              <span className="ms-2" style={{ position: 'relative', top: '30px' }} data-tooltip-id="Alterar-foto">
                <PencilFill
                  size={12}
                  className="text-info cursor-pointer"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setShowPhotoModal(true)}
                />
              </span>
              <Tooltip id="Alterar-foto" place="right" content="Alterar Foto" style={{ backgroundColor: "#000", color: "#fff", fontSize: "16px", padding: "8px" }} />

              {isEditingName ? (
                <div className="mb-2">
                  <input
                    type="text"
                    className="form-control mb-2"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="Seu nome"
                  />
                  <div>
                    <button
                      className="btn btn-sm btn-primary me-2"
                      onClick={updateDisplayName}
                    >
                      Salvar
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setIsEditingName(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className='div-center'>
                    <h2 className="card-title">{user?.displayName || 'Usuário'}</h2>
                    <span className="ms-2" data-tooltip-id="Alterar-Nome">
                      <PencilFill
                        size={12}
                        className="text-info cursor-pointer"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setNewDisplayName(user?.displayName || '');
                          setIsEditingName(true);
                        }}
                      />
                    </span>
                    <Tooltip id="Alterar-Nome" place="right" content="Alterar Nome" style={{ backgroundColor: "#000", color: "#fff", fontSize: "16px", padding: "8px" }} />
                  </div>
                </div>
              )}
              <p className="text-muted">{user?.email}</p>

              <div className="d-grid gap-2 mt-4">
                <button
                  className="btn btn-outline-primary"
                  onClick={() => navigate('/')}
                >
                  Explorar Animes
                </button>
                <button
                  className="btn btn-outline-danger"
                  onClick={handleLogout}
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card shadow">
            <div className="card-header bg-white">
              <ul className="nav nav-tabs card-header-tabs">
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('profile');
                      localStorage.setItem('@activeTab', 'profile');
                      navigate('/profile?tab=profile', { replace: true });
                    }}
                  >
                    Meu Perfil
                  </button>
                </li>
              </ul>
              <ul className="nav nav-tabs card-header-tabs">
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'favorites' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('favorites');
                      localStorage.setItem('@activeTab', 'favorites');
                      navigate('/profile?tab=favorites', { replace: true });
                    }}
                  >
                    Animes Favoritos
                    {user?.favoriteAnimes?.length > 0 && (
                      <span className="badge bg-primary ms-2">{user.favoriteAnimes.length}</span>
                    )}
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'animeA' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('animeA');
                      localStorage.setItem('@activeTab', 'animeA');
                      navigate('/profile?tab=animeA', { replace: true });
                    }}
                  >
                    Animes Assistidos
                    {user?.watchedAnimes?.length > 0 && (
                      <span className="badge bg-primary ms-2">{user.watchedAnimes.length}</span>
                    )}
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('history');
                      localStorage.setItem('@activeTab', 'history');
                      navigate('/profile?tab=history', { replace: true });
                    }}
                  >
                    Histórico de Animes
                    {user?.watchHistory?.length > 0 && (
                      <span className="badge bg-primary ms-2">{user.watchHistory.length}</span>
                    )}
                  </button>
                </li>
              </ul>
            </div>

            <div className="card-body">
              {activeTab === 'profile' && (
                <div>
                  <h3 className="card-title">Informações do Perfil</h3>
                  <p className="card-text">Acompanhe seus animes favoritos, mangás e seu progresso de visualização.</p>

                  <div className="row mt-4">
                    <div className="col-md-4">
                      <div className="card bg-light mb-6">
                        <div className="card-body text-center">
                          <h5 className="card-title">Animes Favoritos</h5>
                          <h2>{user?.favoriteAnimes?.length || 0}</h2>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="card bg-light mb-6">
                        <div className="card-body text-center">
                          <h5 className="card-title">Episódios Assistidos</h5>
                          <h2>
                            {(() => {
                              const fromHistory = user?.watchHistory?.filter(episode => episode.progress >= 85).length || 0;
                              let fromManuallyMarked = 0;
                              if (user?.watchedEpisodes) {
                                Object.values(user.watchedEpisodes).forEach(episodesArray => {
                                  fromManuallyMarked += episodesArray.length;
                                });
                              }

                              return fromHistory + fromManuallyMarked;
                            })()}
                          </h2>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="card bg-light mb-6">
                        <div className="card-body text-center">
                          <h5 className="card-title">Animes Completos</h5>
                          <h2>{user?.watchedAnimes?.length || 0}</h2>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="alert alert-info mt-3">
                    <h5>Dica:</h5>
                    <p>Navegue pelas abas para ver seus animes favoritos, mangás e histórico de visualização.</p>
                  </div>
                </div>
              )}

              {activeTab === 'favorites' && (
                <div>
                  <h3 className="card-title">Meus Animes Favoritos</h3>

                  {!user?.favoriteAnimes?.length ? (
                    <div className="alert alert-warning">
                      <p className="mb-0">Você ainda não adicionou nenhum anime aos favoritos.</p>
                    </div>
                  ) : (
                    <div className="row">
                      {user.favoriteAnimes.map(anime => (
                        <div key={anime.id} className="col-md-6 mb-3">
                          <div className="card h-100">
                            <div className="row g-0">
                              <div className="col-4">
                                <img
                                  src={getImageUrl(anime.image, anime.title)}
                                  className="img-fluid rounded-start h-100"
                                  style={{ objectFit: 'cover' }}
                                  alt={anime.title}
                                  onError={(e) => { e.target.src = '/padrao.png' }}
                                />
                              </div>
                              <div className="col-8">
                                <div className="card-body">
                                  <h5 className="card-title">{anime.title}</h5>
                                  <div className="mt-auto">
                                    <a
                                      href={`/anime/${anime.id}`}
                                      className="btn btn-sm btn-outline-primary me-2"
                                    >
                                      Ver Anime
                                    </a>
                                    <button
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => showConfirmation(
                                        'Remover dos Favoritos',
                                        `Tem certeza que deseja remover "${anime.title}" dos seus favoritos?`,
                                        removeFromFavorites,
                                        anime.id
                                      )}
                                    >
                                      Remover
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'animeA' && (
                <div>
                  <h3 className="card-title">Meus Animes Assistidos</h3>

                  {!user?.watchedAnimes?.length ? (
                    <div className="alert alert-warning">
                      <p className="mb-0">Você ainda não assistiu nenhum anime.</p>
                    </div>
                  ) : (
                    <div className="row">
                      {user.watchedAnimes.map(anime => (
                        <div key={anime.id} className="col-md-6 mb-3">
                          <div className="card h-100">
                            <div className="row g-0">
                              <div className="col-4">
                                <img
                                  src={getImageUrl(anime.image, anime.title)}
                                  className="img-fluid rounded-start h-100"
                                  style={{ objectFit: 'cover' }}
                                  alt={anime.title}
                                  onError={(e) => { e.target.src = '/padrao.png' }}
                                />
                              </div>
                              <div className="col-8">
                                <div className="card-body">
                                  <h5 className="card-title">{anime.title}</h5>
                                  <div className="mt-auto">
                                    <a
                                      href={`/anime/${anime.id}`}
                                      className="btn btn-sm btn-outline-primary me-2"
                                    >
                                      Ver Anime
                                    </a>
                                    <button
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => showConfirmation(
                                        'Remover dos Assistidos',
                                        `Tem certeza que deseja remover "${anime.title}" dos seus assistidos?`,
                                        removeFromAnime,
                                        anime.id
                                      )}
                                    >
                                      Remover
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Nova aba para mangás favoritos */}
              {activeTab === 'favoriteMangas' && (
                <div>
                  <h3 className="card-title">Meus Mangás Favoritos</h3>

                  {!user?.favoriteMangas?.length ? (
                    <div className="alert alert-warning">
                      <p className="mb-0">Você ainda não adicionou nenhum mangá aos favoritos.</p>
                    </div>
                  ) : (
                    <div className="row">
                      {user.favoriteMangas.map(manga => (
                        <div key={manga.id} className="col-md-6 mb-3">
                          <div className="card h-100">
                            <div className="row g-0">
                              <div className="col-4">
                                <img
                                  src={getImageUrl(manga.image, manga.title)}
                                  className="img-fluid rounded-start h-100"
                                  style={{ objectFit: 'cover' }}
                                  alt={manga.title}
                                  onError={(e) => { e.target.src = '/padrao.png' }}
                                />
                              </div>
                              <div className="col-8">
                                <div className="card-body">
                                  <h5 className="card-title">{manga.title}</h5>
                                  <div className="mt-auto">
                                    <a
                                      href={`/manga/${manga.id}`}
                                      className="btn btn-sm btn-outline-primary me-2"
                                    >
                                      Ver Mangá
                                    </a>
                                    <button
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => showConfirmation(
                                        'Remover dos Favoritos',
                                        `Tem certeza que deseja remover "${manga.title}" dos seus favoritos?`,
                                        removeFromFavoritesMangas,
                                        manga.id
                                      )}
                                    >
                                      Remover
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'readMangas' && (
                <div>
                  <h3 className="card-title">Meus Mangás Lidos</h3>

                  {!user?.readMangas?.length ? (
                    <div className="alert alert-warning">
                      <p className="mb-0">Você ainda não leu nenhum mangá.</p>
                    </div>
                  ) : (
                    <div className="row">
                      {user.readMangas.map(manga => (
                        <div key={manga.id} className="col-md-6 mb-3">
                          <div className="card h-100">
                            <div className="row g-0">
                              <div className="col-4">
                                <img
                                  src={getImageUrl(manga.image, manga.title)}
                                  className="img-fluid rounded-start h-100"
                                  style={{ objectFit: 'cover' }}
                                  alt={manga.title}
                                  onError={(e) => { e.target.src = '/padrao.png' }}
                                />
                              </div>
                              <div className="col-8">
                                <div className="card-body">
                                  <h5 className="card-title">{manga.title}</h5>
                                  <div className="mt-auto">
                                    <a
                                      href={`/manga/${manga.id}`}
                                      className="btn btn-sm btn-outline-primary me-2"
                                    >
                                      Ver Mangá
                                    </a>
                                    <button
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => showConfirmation(
                                        'Remover dos Lidos',
                                        `Tem certeza que deseja remover "${manga.title}" dos seus mangás lidos?`,
                                        removeFromReadMangas,
                                        manga.id
                                      )}
                                    >
                                      Remover
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Nova aba para histórico de leitura de mangás */}
              {activeTab === 'mangaHistory' && (
                <div>
                  <h3 className="card-title">Histórico de Leitura de Mangás</h3>

                  {!user?.mangaReadingHistory?.length ? (
                    <div className="alert alert-warning">
                      <p className="mb-0">Você ainda não leu nenhum capítulo de mangá.</p>
                    </div>
                  ) : (
                    <div className="list-group">
                      {user.mangaReadingHistory
                        .sort((a, b) => new Date(b.readDate) - new Date(a.readDate))
                        .map((item, index) => (
                          <div key={index} className="list-group-item list-group-item-action">
                            <div className="d-flex w-100 justify-content-between">
                              <h5 className="mb-1">
                                {item.mangaTitle ?
                                  (item.mangaTitle.length > 20 ?
                                    item.mangaTitle.substring(0, 20) + '...' :
                                    item.mangaTitle) +
                                  ' - ' :
                                  ''}
                                Capítulo {item.chapterNumber}
                                {item.chapterTitle && item.chapterTitle !== `Capítulo ${item.chapterNumber}` &&
                                  `: ${item.chapterTitle}`}
                              </h5>
                              <small className="text-muted">{getTimeElapsed(item.readDate)}</small>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                              <a
                                href={`/manga/${item.mangaId}/chapter/${item.chapterId}`}
                                className="btn btn-sm btn-outline-primary"
                              >
                                Continuar Leitura
                              </a>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {item.progress >= 85 && (
                                  <span className="badge bg-info">Lido</span>
                                )}
                                <div className="progress" style={{ width: '120px' }}>
                                  <div
                                    className={`progress-bar ${item.progress >= 85 ? 'bg-success' : 'bg-primary'}`}
                                    role="progressbar"
                                    style={{ width: `${item.progress}%` }}
                                    aria-valuenow={item.progress}
                                    aria-valuemin="0"
                                    aria-valuemax="100"
                                  >
                                    {item.progress}%
                                  </div>
                                </div>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => showConfirmationH(
                                    'Remover do Histórico',
                                    `Tem certeza que deseja remover este capítulo do histórico?`,
                                    () => removeFromMangaHistory(item.mangaId, item.chapterId),
                                    null
                                  )}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div>
                  <h3 className="card-title">Histórico de Visualização</h3>

                  {!user?.watchHistory?.length ? (
                    <div className="alert alert-warning">
                      <p className="mb-0">Você ainda não assistiu nenhum episódio.</p>
                    </div>
                  ) : (
                    <div className="list-group">
                      {user.watchHistory
                        .sort((a, b) => new Date(b.watchDate) - new Date(a.watchDate))
                        .map((item, index) => (
                          <div key={index} className="list-group-item list-group-item-action">
                            <div className="d-flex w-100 justify-content-between">
                              <h5 className="mb-1">
                                {item.animeTitle ?
                                  (item.animeTitle.length > 20 ?
                                    item.animeTitle.substring(0, 20) + '...' :
                                    item.animeTitle) +
                                  ' - ' :
                                  ''}
                                Episódio {item.episodeNumber}
                              </h5>
                              <small className="text-muted">{getTimeElapsed(item.watchDate)}</small>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                              <a
                                href={`/anime/${item.animeId}?ep=${item.episodeId}`}
                                className="btn btn-sm btn-outline-primary"
                              >
                                Ver Episódio
                              </a>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {item.progress >= 85 && (
                                  <span className="badge bg-info">Assistido</span>
                                )}
                                <div className="progress" style={{ width: '120px' }}>
                                  <div
                                    className={`progress-bar ${item.progress >= 85 ? 'bg-success' : 'bg-primary'}`}
                                    role="progressbar"
                                    style={{ width: `${item.progress}%` }}
                                    aria-valuenow={item.progress}
                                    aria-valuemin="0"
                                    aria-valuemax="100"
                                  >
                                    {item.progress}%
                                  </div>
                                </div>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => showConfirmationH(
                                    'Remover do Histórico',
                                    `Tem certeza que deseja remover este episódio do histórico?`,
                                    () => removeFromAnimeHistory(item.animeId, item.episodeId),
                                    null
                                  )}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{modalTitle}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowConfirmModal(false)}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body">
                  <p>{modalMessage}</p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowConfirmModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      if (confirmAction && itemToRemove !== null) {
                        confirmAction(itemToRemove);
                        setShowConfirmModal(false);
                      }
                    }}
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1040 }}
            onClick={() => setShowConfirmModal(false)}
          ></div>
        </>
      )}

      {showConfirmModalHistory && (
        <>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{modalTitle}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowConfirmModalHistory(false)}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body">
                  <p>{modalMessage}</p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowConfirmModalHistory(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      if (confirmAction) {
                        confirmAction();
                        setShowConfirmModalHistory(false);
                      }
                    }}
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1040 }}
            onClick={() => setShowConfirmModalHistory(false)}
          ></div>
        </>
      )}

      {showPhotoModal && (
        <>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Escolha uma foto de perfil</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowPhotoModal(false)}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    {profileImages.map((img, index) => (
                      <div key={index} className="col-4 col-md-3 mb-3 text-center">
                        <div
                          className={`avatar-option p-2 ${user?.photoURL === img ? 'border border-primary rounded' : ''}`}
                          onClick={() => updateProfilePhoto(img)}
                          style={{ cursor: 'pointer' }}
                        >
                          <img
                            src={`/foto_perfil/${img}`}
                            alt={`Avatar ${index + 1}`}
                            className="img-fluid rounded-circle"
                            style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowPhotoModal(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1040 }}
            onClick={() => setShowPhotoModal(false)}
          ></div>
        </>
      )}
    </div>
  );
}

export default Profile;