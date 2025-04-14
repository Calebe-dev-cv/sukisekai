import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createChat,
  getUserChats,
  getChatById,
  addMessageToChat,
  deleteChat,
  updateChatTitle,
  clearChatMessages
} from '../firebaseChatFunctions.js';
import { MdDeleteForever } from "react-icons/md";
import { FaPlus } from "react-icons/fa";
import { GrSend } from "react-icons/gr";
import { CiEdit } from "react-icons/ci";
import { FaCheck } from "react-icons/fa";
import { MdOutlineCancel } from "react-icons/md";
import { IoMdArrowRoundBack } from "react-icons/io";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function Chat() {
  const { chatId } = useParams();
  const [currentChatId, setCurrentChatId] = useState(chatId || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [userAnimes, setUserAnimes] = useState({
    watched: [],
    favorites: []
  });
  const [allAnimes, setAllAnimes] = useState([]);
  const [animeGenres, setAnimeGenres] = useState([]);
  const [loadingContent, setLoadingContent] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [userChats, setUserChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
  const [editingTitle, setEditingTitle] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        const basicUserData = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || 'Usuário'
        };
        setUser(basicUserData);

        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({ ...basicUserData, ...userData });

            let watched = [];
            let favorites = [];

            if (userData.watchedAnimes && userData.watchedAnimes.length > 0) {
              watched = await fetchAnimesById(userData.watchedAnimes);
            }

            if (userData.favoriteAnimes && userData.favoriteAnimes.length > 0) {
              favorites = await fetchAnimesById(userData.favoriteAnimes);
            }

            setUserAnimes({
              watched: watched,
              favorites: favorites
            });
          }
        } catch (err) {
          console.error("Erro ao carregar dados do usuário:", err);
        }
      } else {
        navigate('/login', { state: { returnPath: '/chat' } });
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const loadUserChats = async () => {
      if (!user) return;

      setLoadingChats(true);
      try {
        const chats = await getUserChats(user.uid);
        setUserChats(chats);

        if (!currentChatId && chats.length > 0) {
          setCurrentChatId(chats[0].id);
        }
      } catch (error) {
        console.error("Erro ao carregar chats do usuário:", error);
      } finally {
        setLoadingChats(false);
      }
    };

    loadUserChats();
  }, [user, currentChatId]);

  useEffect(() => {
    const loadChat = async () => {
      if (!user || !currentChatId) return;

      try {
        const chat = await getChatById(user.uid, currentChatId);
        setMessages(chat.messages || []);
        setSessionStarted(true);
      } catch (error) {
        console.error("Erro ao carregar chat:", error);
        handleNewChat();
      }
    };

    loadChat();
  }, [user, currentChatId]);

  const fetchAnimesById = async (animeIds) => {
    try {
      const animes = [];

      for (const id of animeIds) {
        const animeId = typeof id === 'object' ? id.id : id;

        if (!animeId) {
          console.error('ID de anime inválido:', id);
          continue;
        }

        try {
          const response = await fetch(`${BACKEND_URL}/api/animes/${animeId}`);
          if (response.ok) {
            const data = await response.json();
            animes.push(data);
          }
        } catch (error) {
          console.error(`Erro ao buscar anime ${animeId}:`, error);
        }
      }

      return animes;
    } catch (error) {
      console.error("Erro ao buscar animes por ID:", error);
      return [];
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoadingContent(true);
      try {
        const animeResponse = await fetch(`${BACKEND_URL}/api/animes/populares?page=1`);
        if (animeResponse.ok) {
          const animeData = await animeResponse.json();
          setAllAnimes(animeData);
        }

        const animeGenreResponse = await fetch(`${BACKEND_URL}/api/genres/list`);
        if (animeGenreResponse.ok) {
          const animeGenreData = await animeGenreResponse.json();
          setAnimeGenres(animeGenreData);
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setLoadingContent(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (user && !currentChatId && !loadingContent && !sessionStarted) {
      handleNewChat(true);
    }
  }, [user, loadingContent, sessionStarted, currentChatId]);

  const handleNewChat = async (withWelcome = false) => {
    if (!user) return;

    let initialMessages = [];

    if (withWelcome) {
      let suggestedAnime = 'Naruto';

      if (userAnimes.watched.length > 0) {
        suggestedAnime = userAnimes.watched[0].title;
      } else if (allAnimes.length > 0) {
        suggestedAnime = allAnimes[0].title;
      }

      const welcomeMessage = {
        id: Date.now(),
        text: `Olá ${user.displayName || 'otaku'}! 👋 
Me chamo Suki, bem vindo(a) ao Suki Sekai, meu mundo de Animes e Mangás. Estou aqui para ajudar com recomendações, informações sobre lançamentos, e responder suas dúvidas sobre o mundo otaku.

Você pode me perguntar coisas como:
- Me recomende animes de fantasia e magia
- Quando lança a segunda temporada de ${suggestedAnime}?
- Quero ver algo parecido com ${suggestedAnime}
- Quais são os animes mais populares de ação?
- Me sugira mangás de drama ou romance
- Existe algum mangá popular de aventura?
- Qual é a diferença entre o anime e o mangá de ${suggestedAnime}?
- Quando sai o próximo capítulo de um mangá popular?
Como posso te ajudar hoje? 😊`,
        sender: 'ai'
      };

      initialMessages = [welcomeMessage];
    }

    try {
      const newChatId = await createChat(user.uid, initialMessages);

      setCurrentChatId(newChatId);
      setMessages(initialMessages);
      setSessionStarted(true);

      const chats = await getUserChats(user.uid);
      setUserChats(chats);

      navigate(`/chat/${newChatId}`);

      inputRef.current?.focus();
    } catch (error) {
      console.error("Erro ao criar novo chat:", error);
    }
  };

  const handleSelectChat = (chatId) => {
    setCurrentChatId(chatId);
    navigate(`/chat/${chatId}`);
  };

  const handleDeleteChat = async (chatId, event) => {
    event.stopPropagation();

    if (!user) return;

    if (window.confirm('Tem certeza que deseja excluir esta conversa? Esta ação não pode ser desfeita.')) {
      try {
        await deleteChat(user.uid, chatId);

        const chats = await getUserChats(user.uid);
        setUserChats(chats);

        if (chatId === currentChatId) {
          if (chats.length > 0) {
            setCurrentChatId(chats[0].id);
            navigate(`/chat/${chats[0].id}`);
          } else {
            handleNewChat(true);
          }
        }
      } catch (error) {
        console.error("Erro ao excluir chat:", error);
      }
    }
  };

  const handleEditTitle = (chatId, currentTitle, event) => {
    event.stopPropagation();
    setEditingTitle(chatId);
    setNewTitle(currentTitle);
  };

  const handleSaveTitle = async (chatId, event) => {
    event.stopPropagation();

    if (!user || !newTitle.trim()) return;

    try {
      await updateChatTitle(user.uid, chatId, newTitle);

      const chats = await getUserChats(user.uid);
      setUserChats(chats);

      setEditingTitle(null);
      setNewTitle('');
    } catch (error) {
      console.error("Erro ao atualizar título do chat:", error);
    }
  };

  const simulateTyping = (message) => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    setIsTyping(true);

    const typingTime = Math.min(1500, message.length * 10);

    const timeout = setTimeout(() => {
      setIsTyping(false);
    }, typingTime);

    setTypingTimeout(timeout);
  };

  const handleSend = async () => {
    if (!input.trim() || !user || !currentChatId) return;

    const userMessage = {
      id: Date.now(),
      text: input,
      sender: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    simulateTyping(input);

    try {
      await addMessageToChat(user.uid, currentChatId, userMessage);

      const userData = {
        watchedAnimes: userAnimes.watched.map(anime => ({
          id: anime.id,
          title: anime.title
        })),
        favoriteAnimes: userAnimes.favorites.map(anime => ({
          id: anime.id,
          title: anime.title
        }))
      };

      const allAnimeGenres = new Set(animeGenres);
      allAnimes.forEach(anime => {
        if (anime.genres && Array.isArray(anime.genres)) {
          anime.genres.forEach(genre => allAnimeGenres.add(genre));
        }
      });

      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          userData: userData,
          availableAnimes: allAnimes,
          availableGenres: Array.from(allAnimeGenres),
          chatHistory: messages.map(msg => ({
            text: msg.text,
            sender: msg.sender
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Erro na comunicação com a IA');
      }

      const data = await response.json();

      const aiMessage = {
        id: Date.now(),
        text: data.response,
        sender: 'ai'
      };

      setMessages(prev => [...prev, aiMessage]);

      await addMessageToChat(user.uid, currentChatId, aiMessage);

      const chats = await getUserChats(user.uid);
      setUserChats(chats);
    } catch (error) {
      console.error("Erro ao processar mensagem:", error);

      const errorMessage = {
        id: Date.now(),
        text: "Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente? Se o problema persistir, pode ser que eu esteja com dificuldades de conexão.",
        sender: 'ai',
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);

      await addMessageToChat(user.uid, currentChatId, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!user || !currentChatId) return;

    if (window.confirm('Tem certeza que deseja limpar todas as mensagens desta conversa?')) {
      try {
        await clearChatMessages(user.uid, currentChatId);
        setMessages([]);

        const chats = await getUserChats(user.uid);
        setUserChats(chats);
      } catch (error) {
        console.error("Erro ao limpar mensagens do chat:", error);
      }
    }
  };

  const handleContentClick = (contentId, contentType) => {
    if (contentType === 'anime') {
      navigate(`/anime/${contentId}`);
    }
  };

  const processMessageText = (text) => {
    if (!text) return '';

    const paragraphs = text.split('\n');

    return paragraphs.map((paragraph, index) => {
      if (!paragraph.trim()) {
        return <br key={index} />;
      }

      let processedText = paragraph;

      const sortedAnimes = [...allAnimes].sort((a, b) =>
        b.title?.length - a.title?.length
      );

      let parts = [processedText];

      sortedAnimes.forEach(anime => {
        const animeTitle = anime.title;
        if (!animeTitle) return;

        let newParts = [];

        parts.forEach(part => {
          if (typeof part !== 'string') {
            newParts.push(part);
            return;
          }

          const regex = new RegExp(`(${escapeRegExp(animeTitle)})`, 'gi');
          const splitPart = part.split(regex);

          splitPart.forEach(subPart => {
            if (subPart.toLowerCase() === animeTitle.toLowerCase()) {
              newParts.push(
                <span
                  key={`anime-${anime.id}-${Math.random()}`}
                  className="anime-link"
                  onClick={() => handleContentClick(anime.id, 'anime')}
                >
                  {subPart}
                </span>
              );
            } else {
              newParts.push(subPart);
            }
          });
        });

        parts = newParts;
      });

      return <p key={index}>{parts}</p>;
    });
  };

  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const renderMessage = (message) => {
    const isAi = message.sender === 'ai';

    return (
      <div
        key={message.id}
        className={`message ${isAi ? 'ai-message' : 'user-message'} ${message.isError ? 'error-message' : ''}`}
      >
        <div className="message-avatar">
          {isAi ?
            <img
              src="/ai-avatar.jpg"
              alt="AI"
              onError={(e) => { e.target.onerror = null; e.target.src = '/padrao.jpg' }}
            /> :
            <img
              src={user?.photoURL ? `/foto_perfil/${user.photoURL}` : '/foto_perfil/padrao.jpg'}
              alt={user?.displayName || 'Usuário'}
              onError={(e) => { e.target.onerror = null; e.target.src = '/foto_perfil/padrao.jpg' }}
            />
          }
        </div>
        <div className="message-content">
          <div className="message-bubble">
            {processMessageText(message.text)}
          </div>
          <div className="message-time">
            {message.timestamp ?
              new Date(message.timestamp.seconds * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) :
              new Date(message.id).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
      return 'Hoje';
    }

    if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    }

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (!user) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
        <p className="mt-3">Carregando chat...</p>
      </div>
    );
  }

  return (
    <div className="chat-page-container">
      {window.innerWidth <= 768 && (
        <button
          className="chat-history-toggle"
          onClick={() => setShowSidebar(true)}
        >
          <i className="bi bi-clock-history"></i>
          <span>Histórico de Conversas</span>
        </button>
      )}
      {/* Sidebar com histórico de chats */}
      <div className={`chat-sidebar ${showSidebar ? 'show' : 'hide'}`}>
        <div className="drag-indicator"></div> {/* Indicador de arrasto para mobile */}
        {window.innerWidth <= 768 && (
          <IoMdArrowRoundBack
            onClick={() => setShowSidebar(false)}
            className='chat-back'
            size={30}
          />
        )}
        <div className="sidebar-header">
          <button
            className="btn btn-outline-primary"
            onClick={() => handleNewChat(true)}
          >
            Nova Conversa
          </button>
          <h4 className='div-center'>Conversas</h4>

        </div>

        <div className="chats-list">
          {loadingChats ? (
            <div className="text-center p-3">
              <div className="spinner-border spinner-border-sm text-primary" role="status">
                <span className="visually-hidden">Carregando...</span>
              </div>
              <p className="mt-2">Carregando conversas...</p>
            </div>
          ) : userChats.length === 0 ? (
            <div className="no-chats-message">
              <p>Nenhuma conversa ainda.</p>
              <p>Inicie uma nova conversa com Suki!</p>
            </div>
          ) : (
            userChats.map(chat => (
              <div
                key={chat.id}
                className={`chat-item ${currentChatId === chat.id ? 'active' : ''}`}
                onClick={() => {
                  handleSelectChat(chat.id);

                  if (window.innerWidth <= 768) {
                    setShowSidebar(false);
                  }
                }}
              >
                <div className="chat-item-content">
                  {editingTitle === chat.id ? (
                    <div className="edit-title-form" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        autoFocus
                      />
                      <FaCheck
                        className="button-chat-check"
                        size={16}
                        onClick={(e) => handleSaveTitle(chat.id, e)}
                        data-tooltip-id="Salvar-Titulo"
                      />
                      <Tooltip id="Salvar-Titulo" place="left" content="Salvar" style={{ backgroundColor: "#000", color: "#fff", fontSize: "16px", padding: "8px" }} />

                      <MdOutlineCancel
                        className="button-chat-delete"
                        size={18}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTitle(null);
                        }}
                        data-tooltip-id="Cancelar-Titulo"
                      />
                      <Tooltip id="Cancelar-Titulo" place="left" content="Cancelar" style={{ backgroundColor: "#000", color: "#fff", fontSize: "16px", padding: "8px" }} />

                    </div>
                  ) : (
                    <div className="chat-item-title">
                      {chat.title || 'Nova conversa'}
                    </div>
                  )}
                  {chat.lastMessage && (
                    <div className="chat-item-preview">
                      {chat.lastMessage.text.substring(0, 40)}
                      {chat.lastMessage.text.length > 40 ? '...' : ''}
                    </div>
                  )}
                  <div className="chat-item-date">
                    {formatDate(chat.updatedAt)}
                  </div>
                </div>
                <div className="chat-item-actions">
                  <CiEdit
                    className="button-chat"
                    onClick={(e) => handleEditTitle(chat.id, chat.title, e)}
                    data-tooltip-id="Editar-Titulo"
                    size={18}
                  />
                  <Tooltip id="Editar-Titulo" place="left" content="Editar Título" style={{ backgroundColor: "#000", color: "#fff", fontSize: "16px", padding: "8px" }} />
                  <MdDeleteForever
                    className="button-chat-delete"
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    data-tooltip-id="Deletar-Conversa"
                    size={18}
                  />
                  <Tooltip id="Deletar-Conversa" place="left" content="Excluir Chat" style={{ backgroundColor: "#000", color: "#fff", fontSize: "16px", padding: "8px" }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Área principal do chat */}
      <div className="chat-main-area">
        <div className="container p-0">
          <div className="card shadow mb-4 chat-card">
            <div className="card-header d-flex justify-content-between align-items-center chat-header">
              <div className="d-flex align-items-center">
                <h3 className="mb-0">Chat com Suki</h3>
              </div>
              <div className="chat-actions">
                <MdDeleteForever
                  onClick={handleClearChat}
                  data-tooltip-id="Limpar-Conversa"
                  className='button-chat'
                  size={25} />
              </div>
              <Tooltip id="Limpar-Conversa" place="bottom" content="Limpar Conversa" style={{ backgroundColor: "#000", color: "#fff", fontSize: "16px", padding: "8px" }} />

            </div>

            <div className="card-body">
              <div className="chat-container">
                {!currentChatId || messages.length === 0 ? (
                  <div className="empty-chat-message">
                    <div className="empty-chat-icon">
                      <i className="bi bi-chat-square-text"></i>
                    </div>
                    <h4>Comece uma nova conversa com Suki</h4>
                    <p>Pergunte sobre animes, mangás, recomendações e muito mais!</p>
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => handleNewChat(true)}
                    >
                      Nova Conversa
                    </button>
                  </div>
                ) : (
                  <div className="messages-container">
                    {messages.map(message => renderMessage(message))}
                    <div ref={messagesEndRef} />

                    {(loading || isTyping) && (
                      <div className="typing-indicator">
                        <div className="dot"></div>
                        <div className="dot"></div>
                        <div className="dot"></div>
                      </div>
                    )}
                  </div>
                )}

                <div className="input-container div-center div-right">
                  <textarea
                    ref={inputRef}
                    className="form-control chat-digite"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={loading || !currentChatId}
                    rows={2}
                  />
                  <div className="button-container">
                    {input.trim() ? (
                      <button
                        className="btn btn-primary send-button"
                        onClick={handleSend}
                        disabled={loading || !currentChatId}
                      >
                        <GrSend
                          data-tooltip-id="Enviar-Mensagem"
                          size={25} />
                        <Tooltip id="Enviar-Mensagem" place="left" content="Enviar" style={{ backgroundColor: "#000", color: "#fff", fontSize: "16px", padding: "8px" }} />

                      </button>
                    ) : (
                      <button
                        className="btn btn-primary send-button"
                        onClick={() => handleNewChat(true)}
                        disabled={loading || !currentChatId}
                      >
                        <FaPlus
                          data-tooltip-id="Nova-Conversa"
                          size={25} />
                        <Tooltip id="Nova-Conversa" place="left" content="Novo Chat" style={{ backgroundColor: "#000", color: "#fff", fontSize: "16px", padding: "8px" }} />

                      </button>

                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;