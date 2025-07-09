import React from 'react';

type Item = {
  slot: number;
  item: string;
  count: number;
};

type Props = {
  hotbar: Item[];
  armor: Item[];
};

const ItemSlot = ({ item }: { item: Item }) => {
  const itemName = item.item.replace('minecraft:', '');
  const imageSrc = `/items/${itemName}.png`;

  return (
    <div className="w-10 h-10 border bg-white relative flex justify-center items-center">
      <img src={imageSrc} alt={itemName} className="w-8 h-8" />
      {item.count > 1 && (
        <div className="absolute bottom-0 right-0 text-[10px] font-bold text-white bg-black bg-opacity-60 px-1 rounded">
          {item.count}
        </div>
      )}
    </div>
  );
};

export const PlayerHUD: React.FC<Props> = ({ hotbar, armor }) => {
  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* Armor */}
      <div className="flex gap-2">
        {armor.map((item, index) => (
          <ItemSlot key={`armor-${index}`} item={item} />
        ))}
      </div>
      {/* Hotbar */}
      <div className="flex gap-2">
        {hotbar.map((item, index) => (
          <ItemSlot key={`hotbar-${index}`} item={item} />
        ))}
      </div>
    </div>
  );
};
