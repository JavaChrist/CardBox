import CardItem from './CardItem';

interface Card {
  id: string;
  name: string;
  type: string;
  imageUrl: string;
  createdAt: Date;
  userId: string;
}

interface CardListProps {
  cards: Card[];
  onCardDeleted: (cardId: string) => void;
}

const CardList = ({ cards, onCardDeleted }: CardListProps) => {
  if (cards.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Mes cartes de fidélité ({cards.length})</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {cards.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            onCardDeleted={onCardDeleted}
          />
        ))}
      </div>
    </div>
  );
};

export default CardList; 