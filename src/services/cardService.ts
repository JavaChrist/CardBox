import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { db, storage } from './firebase';

export interface Card {
  id: string;
  name: string;
  type: string;
  imageUrl: string;
  createdAt: Date;
  userId: string;
}

export const cardService = {
  // Récupérer toutes les cartes d'un utilisateur
  async getUserCards(userId: string): Promise<Card[]> {
    try {
      const cardsRef = collection(db, 'cards');
      // Requête simplifiée sans orderBy pour éviter l'index
      const q = query(
        cardsRef,
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const cards: Card[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        cards.push({
          id: doc.id,
          name: data.name,
          type: data.type,
          imageUrl: data.imageUrl,
          createdAt: data.createdAt.toDate(),
          userId: data.userId,
        });
      });

      // Trier côté client par date de création (plus récent en premier)
      return cards.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Erreur lors de la récupération des cartes:', error);
      throw error;
    }
  },

  // Supprimer une carte avec son image
  async deleteCard(cardId: string, imageUrl: string): Promise<void> {
    try {
      // Supprimer l'image du Storage
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);

      // Supprimer le document de Firestore
      await deleteDoc(doc(db, 'cards', cardId));
    } catch (error) {
      console.error('Erreur lors de la suppression de la carte:', error);
      throw error;
    }
  },
}; 