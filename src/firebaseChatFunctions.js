import { db } from './firebaseConfig';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  limit,
  where
} from 'firebase/firestore';

/**
 * Cria um novo chat para um usuário
 * @param {string} userId - ID do usuário
 * @param {Array} initialMessages - Mensagens iniciais (se houver)
 * @returns {Promise<string>} - ID do chat criado
 */
export const createChat = async (userId, initialMessages = []) => {
  try {

    const title = initialMessages && initialMessages.length > 0 
      ? initialMessages.find(msg => msg.sender === 'user')?.text.substring(0, 30) + '...' 
      : 'Nova conversa';
    


    const now = new Date();
    const messagesWithTimestamps = initialMessages.map(msg => ({
      ...msg,
      timestamp: {
        seconds: Math.floor(now.getTime() / 1000),
        nanoseconds: 0
      }
    }));
    

    const chatRef = collection(db, `users/${userId}/chats`);
    const newChatDoc = await addDoc(chatRef, {
      title,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      messages: messagesWithTimestamps
    });
    
    return newChatDoc.id;
  } catch (error) {
    console.error('Erro ao criar chat:', error);
    throw error;
  }
};

/**
 * Obtém a lista de chats de um usuário
 * @param {string} userId - ID do usuário
 * @returns {Promise<Array>} - Lista de chats
 */
export const getUserChats = async (userId) => {
  try {
    const chatsRef = collection(db, `users/${userId}/chats`);
    const q = query(chatsRef, orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const chats = [];
    querySnapshot.forEach((doc) => {
      const chatData = doc.data();
      chats.push({
        id: doc.id,
        title: chatData.title,
        createdAt: chatData.createdAt?.toDate(),
        updatedAt: chatData.updatedAt?.toDate(),
        lastMessage: chatData.messages && chatData.messages.length > 0 
          ? chatData.messages[chatData.messages.length - 1] 
          : null
      });
    });
    
    return chats;
  } catch (error) {
    console.error('Erro ao obter chats:', error);
    throw error;
  }
};

/**
 * Obtém um chat específico pelo ID
 * @param {string} userId - ID do usuário
 * @param {string} chatId - ID do chat
 * @returns {Promise<Object>} - Dados do chat
 */
export const getChatById = async (userId, chatId) => {
  try {
    const chatRef = doc(db, `users/${userId}/chats/${chatId}`);
    const chatDoc = await getDoc(chatRef);
    
    if (chatDoc.exists()) {
      const chatData = chatDoc.data();
      return {
        id: chatDoc.id,
        title: chatData.title,
        createdAt: chatData.createdAt?.toDate(),
        updatedAt: chatData.updatedAt?.toDate(),
        messages: chatData.messages || []
      };
    } else {
      throw new Error('Chat não encontrado');
    }
  } catch (error) {
    console.error('Erro ao obter chat:', error);
    throw error;
  }
};

/**
 * Adiciona uma mensagem a um chat existente
 * @param {string} userId - ID do usuário
 * @param {string} chatId - ID do chat
 * @param {Object} message - Mensagem a ser adicionada
 * @returns {Promise<void>}
 */
export const addMessageToChat = async (userId, chatId, message) => {
  try {
    const chatRef = doc(db, `users/${userId}/chats/${chatId}`);
    const chatDoc = await getDoc(chatRef);
    
    if (chatDoc.exists()) {
      const chatData = chatDoc.data();
      const messages = chatData.messages || [];
      

      const now = new Date();
      const messageWithTimestamp = {
        ...message,
        timestamp: {
          seconds: Math.floor(now.getTime() / 1000),
          nanoseconds: 0
        }
      };
      

      await updateDoc(chatRef, {
        messages: [...messages, messageWithTimestamp],
        updatedAt: serverTimestamp()
      });
      

      if (messages.length <= 1 && message.sender === 'user') {
        await updateDoc(chatRef, {
          title: message.text.substring(0, 30) + '...'
        });
      }
    } else {
      throw new Error('Chat não encontrado');
    }
  } catch (error) {
    console.error('Erro ao adicionar mensagem:', error);
    throw error;
  }
};

/**
 * Atualiza o título de um chat
 * @param {string} userId - ID do usuário
 * @param {string} chatId - ID do chat
 * @param {string} title - Novo título
 * @returns {Promise<void>}
 */
export const updateChatTitle = async (userId, chatId, title) => {
  try {
    const chatRef = doc(db, `users/${userId}/chats/${chatId}`);
    await updateDoc(chatRef, { title });
  } catch (error) {
    console.error('Erro ao atualizar título do chat:', error);
    throw error;
  }
};

/**
 * Exclui um chat
 * @param {string} userId - ID do usuário
 * @param {string} chatId - ID do chat
 * @returns {Promise<void>}
 */
export const deleteChat = async (userId, chatId) => {
  try {
    const chatRef = doc(db, `users/${userId}/chats/${chatId}`);
    await deleteDoc(chatRef);
  } catch (error) {
    console.error('Erro ao excluir chat:', error);
    throw error;
  }
};

/**
 * Limpa todas as mensagens de um chat mantendo o chat
 * @param {string} userId - ID do usuário
 * @param {string} chatId - ID do chat
 * @returns {Promise<void>}
 */
export const clearChatMessages = async (userId, chatId) => {
  try {
    const chatRef = doc(db, `users/${userId}/chats/${chatId}`);
    await updateDoc(chatRef, { 
      messages: [],
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Erro ao limpar mensagens do chat:', error);
    throw error;
  }
};